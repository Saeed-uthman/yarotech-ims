import re
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction

from apps.accounts.models import User
from apps.inventory.models import InventoryMovement
from apps.products.models import (
    Category,
    Company,
    PriceAdjustmentHistory,
    Product,
    ProductVariant,
)


SOURCE_COLUMNS = (
    'id', 'name', 'sku', 'category', 'short_description', 'full_description',
    'cost_price', 'selling_price', 'stock_quantity', 'minimum_stock',
    'warranty_info', 'status', 'max_markup',
)


def clean_text(value):
    return '' if value is None else str(value).strip()


def decimal_value(value, *, field, row_id):
    try:
        result = Decimal(value or 0).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise CommandError(f'Legacy row {row_id}: invalid {field} value {value!r}.') from exc
    if result < 0:
        raise CommandError(f'Legacy row {row_id}: {field} cannot be negative.')
    return result


def integer_value(value, *, field, row_id):
    try:
        result = int(value or 0)
    except (TypeError, ValueError) as exc:
        raise CommandError(f'Legacy row {row_id}: invalid {field} value {value!r}.') from exc
    if result < 0:
        raise CommandError(f'Legacy row {row_id}: {field} cannot be negative.')
    return result


def infer_dosage_form(name):
    value = name.lower()
    if 'inverter' in value:
        return Product.DosageForm.INVERTER
    if 'solar panel' in value or re.search(r'\bpanel\b', value):
        return Product.DosageForm.SOLAR_PANEL
    if 'charge controller' in value or 'charger controller' in value:
        return Product.DosageForm.CHARGE_CONTROLLER
    if any(term in value for term in ('battery', 'power bank', 'solar generator', 'ups')):
        return Product.DosageForm.BATTERY
    if any(term in value for term in ('cat5', 'cat6', 'fiber cable', 'fibre cable')):
        return Product.DosageForm.CABLE
    if 'switch' in value or re.search(r'\bs(?:110|310)-', value):
        return Product.DosageForm.SWITCH
    if any(term in value for term in ('router', 'archer', 'mikrotik', 'mikrotic', 'udm-pro')):
        return Product.DosageForm.ROUTER
    if any(term in value for term in ('access point', 'eap', 'litebeam', 'nanostation', 'loco 5ac')):
        return Product.DosageForm.ACCESS_POINT
    if any(term in value for term in ('laptop', 'desktop', 'monitor', 'printer', 'hdd', 'ssd')):
        return Product.DosageForm.COMPUTER_EQUIPMENT
    if any(term in value for term in ('rj45', 'adapter', 'connector', 'rack', 'cabinet')):
        return Product.DosageForm.ACCESSORY
    return Product.DosageForm.OTHER_IT_EQUIPMENT


def price_values(cost, selling, policy, *, row_id):
    cost = decimal_value(cost, field='cost_price', row_id=row_id)
    selling = decimal_value(selling, field='selling_price', row_id=row_id)
    warning = ''
    if cost > 0 and selling <= cost:
        if policy == 'error':
            raise CommandError(
                f'Legacy row {row_id}: selling price {selling} must be greater than cost {cost}. '
                'Correct the source price or select --price-conflict zero-cost/bump-selling.'
            )
        if policy == 'zero-cost':
            warning = f'cost {cost} imported as 0.00 because selling price is {selling}'
            cost = Decimal('0.00')
        else:
            old_selling = selling
            selling = cost + Decimal('1.00')
            warning = f'selling price {old_selling} raised to {selling} because cost is {cost}'
    return cost, selling, warning


class Command(BaseCommand):
    help = 'Import or update products from the legacy products table.'

    def add_arguments(self, parser):
        parser.add_argument('--legacy-database', default='legacy')
        parser.add_argument('--target-database', default='default')
        parser.add_argument('--source-table', default='products')
        parser.add_argument('--company', default='Legacy Import')
        parser.add_argument('--actor-email', required=True)
        parser.add_argument(
            '--price-conflict', choices=('error', 'zero-cost', 'bump-selling'), default='error'
        )
        parser.add_argument('--limit', type=int)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        source_alias = options['legacy_database']
        target_alias = options['target_database']
        table = options['source_table']
        limit = options['limit']
        if not re.fullmatch(r'[A-Za-z0-9_]+', table):
            raise CommandError('Invalid source table name.')
        if source_alias not in connections:
            raise CommandError(
                f'Database alias {source_alias!r} is not configured. Set LEGACY_DB_* variables first.'
            )
        if target_alias not in connections:
            raise CommandError(f'Unknown target database alias {target_alias!r}.')
        if limit is not None and limit < 1:
            raise CommandError('--limit must be greater than zero.')

        actor = User.objects.using(target_alias).filter(
            email__iexact=options['actor_email'].strip(), is_active=True
        ).first()
        if not actor:
            raise CommandError('The --actor-email user does not exist or is inactive in the target database.')

        source_connection = connections[source_alias]
        quoted_table = source_connection.ops.quote_name(table)
        query = f"SELECT {', '.join(SOURCE_COLUMNS)} FROM {quoted_table} ORDER BY id"
        if limit:
            query += f' LIMIT {limit}'
        try:
            with source_connection.cursor() as cursor:
                cursor.execute(query)
                rows = [dict(zip(SOURCE_COLUMNS, row)) for row in cursor.fetchall()]
        except Exception as exc:
            raise CommandError(f'Could not read legacy table {table!r}: {exc}') from exc
        if not rows:
            self.stdout.write(self.style.WARNING('No legacy products found.'))
            return

        identities = []
        for row in rows:
            identity = clean_text(row['sku']) or f"LEGACY-{row['id']}"
            if identity in identities:
                raise CommandError(f'Duplicate source SKU/import identity: {identity!r}.')
            identities.append(identity)

        counts = {'products_created': 0, 'products_updated': 0, 'variants_created': 0, 'variants_updated': 0}
        warnings = []
        with transaction.atomic(using=target_alias):
            company, _ = Company.objects.using(target_alias).get_or_create(
                name=options['company'].strip(), defaults={'code': 'LEGACY'}
            )
            for row, identity in zip(rows, identities):
                self._import_row(
                    row=row, identity=identity, company=company, actor=actor,
                    target_alias=target_alias, policy=options['price_conflict'],
                    counts=counts, warnings=warnings,
                )
            if options['dry_run']:
                transaction.set_rollback(True, using=target_alias)

        for warning in warnings:
            self.stdout.write(self.style.WARNING(f'WARNING: {warning}'))
        result = 'DRY RUN completed; changes rolled back' if options['dry_run'] else 'Import completed'
        self.stdout.write(self.style.SUCCESS(result))
        self.stdout.write(
            f"Products: {counts['products_created']} created, {counts['products_updated']} updated\n"
            f"Variants: {counts['variants_created']} created, {counts['variants_updated']} updated\n"
            f'Warnings: {len(warnings)}'
        )

    def _import_row(self, *, row, identity, company, actor, target_alias, policy, counts, warnings):
        row_id = row['id']
        name = clean_text(row['name'])
        if not name:
            raise CommandError(f'Legacy row {row_id}: name is required.')
        matches = Product.objects.using(target_alias).filter(barcode=identity)
        if matches.count() > 1:
            raise CommandError(f'Multiple target products use barcode/SKU {identity!r}; resolve them first.')

        category, _ = Category.objects.using(target_alias).get_or_create(
            name=clean_text(row['category']) or 'Uncategorized',
            defaults={'description': 'Imported from the legacy product database.'},
        )
        form = infer_dosage_form(name)
        warranty = clean_text(row['warranty_info'])
        description = clean_text(row['full_description']) or clean_text(row['short_description'])
        if warranty:
            description = f'{description.rstrip()} Warranty: {warranty}.'.strip()
        product_values = {
            'name': name[:200], 'generic_name': form.label[:200], 'category': category,
            'dosage': 'N/A', 'dosage_form': form, 'description': description,
            'subtitle': warranty[:255],
            'status': Product.Status.ACTIVE if clean_text(row['status']).lower() == 'active' else Product.Status.INACTIVE,
            'updated_by': actor,
        }
        product = matches.first()
        if product:
            for field, value in product_values.items():
                setattr(product, field, value)
            product.full_clean(exclude=('barcode',), validate_unique=False)
            product.save(using=target_alias)
            counts['products_updated'] += 1
        else:
            product = Product(barcode=identity, created_by=actor, **product_values)
            product.full_clean(validate_unique=False)
            product.save(using=target_alias)
            counts['products_created'] += 1

        base_price, selling_price, price_warning = price_values(
            row['cost_price'], row['selling_price'], policy, row_id=row_id
        )
        if price_warning:
            warnings.append(f'{row_id} {name}: {price_warning}')
        stock = integer_value(row['stock_quantity'], field='stock_quantity', row_id=row_id)
        reorder = integer_value(row['minimum_stock'], field='minimum_stock', row_id=row_id)
        variant = ProductVariant.objects.using(target_alias).filter(product=product, company=company).first()
        created = variant is None
        previous_stock = 0 if created else variant.current_stock
        old_prices = None if created else (
            variant.base_price, variant.min_selling_price,
            variant.default_selling_price, variant.max_selling_price,
        )
        if created:
            variant = ProductVariant(product=product, company=company, created_by=actor)
        variant.base_price = base_price
        variant.min_selling_price = selling_price
        variant.default_selling_price = selling_price
        variant.max_selling_price = selling_price
        variant.current_stock = stock
        variant.reorder_level = reorder
        variant.status = ProductVariant.Status.AVAILABLE if clean_text(row['status']).lower() == 'active' else ProductVariant.Status.INACTIVE
        variant.updated_by = actor
        variant.full_clean(validate_unique=False)
        variant.save(using=target_alias)
        counts['variants_created' if created else 'variants_updated'] += 1

        new_prices = (base_price, selling_price, selling_price, selling_price)
        if created or old_prices != new_prices:
            old = old_prices or (Decimal('0'),) * 4
            PriceAdjustmentHistory.objects.using(target_alias).create(
                variant=variant, old_base_price=old[0], new_base_price=base_price,
                old_min_selling_price=old[1], new_min_selling_price=selling_price,
                old_default_selling_price=old[2], new_default_selling_price=selling_price,
                old_max_selling_price=old[3], new_max_selling_price=selling_price,
                change_type=(PriceAdjustmentHistory.ChangeType.INITIAL if created else PriceAdjustmentHistory.ChangeType.CORRECTION),
                reason='Legacy product import.', adjusted_by=actor,
            )
        if previous_stock != stock:
            InventoryMovement.objects.using(target_alias).create(
                variant=variant,
                movement_type=(InventoryMovement.MovementType.STOCK_IN if stock >= previous_stock else InventoryMovement.MovementType.ADJUSTMENT),
                quantity=stock - previous_stock, previous_stock=previous_stock, new_stock=stock,
                reason='Legacy product import.', reference_type=InventoryMovement.ReferenceType.INITIAL_SETUP,
                reference_id=f'legacy-product-{row_id}', created_by=actor,
            )
