import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.products.models import Category, Product


CATALOG_PATH = Path(__file__).resolve().parents[2] / 'data' / 'nigeria_medicines_starter.json'
CATALOG_NOTICE = (
    'Generic starter-catalogue record based on Nigeria essential-medicines references. '
    'Confirm the physical pack, current NAFDAC registration, manufacturer, barcode, '
    'supplier, price, storage conditions, and applicable prescription requirements before stocking.'
)


class Command(BaseCommand):
    help = (
        'Idempotently seed generic Nigerian essential-medicine product records. '
        'The command does not create manufacturer variants, prices, barcodes, or stock.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate and show the result, then roll back every database change.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Load only the first N medicines (useful for a small trial import).',
        )
        parser.add_argument(
            '--category',
            action='append',
            default=[],
            help='Load one category only. Repeat this option to select more categories.',
        )
        parser.add_argument(
            '--admin-email',
            help='Attribute newly created products to an existing staff user by email.',
        )

    def handle(self, *args, **options):
        payload = self._load_catalog()
        medicines = self._validate_catalog(payload)
        medicines = self._select_medicines(
            medicines,
            category_names=options['category'],
            limit=options['limit'],
        )
        audit_user = self._get_audit_user(options.get('admin_email'))

        created_products = 0
        existing_products = 0
        created_categories = 0

        with transaction.atomic():
            categories = {}
            category_descriptions = payload.get('categories', {})

            for record in medicines:
                category_name = record['category'].strip()
                category = categories.get(category_name.casefold())
                if category is None:
                    category = Category.objects.filter(name__iexact=category_name).first()
                    if category is None:
                        category = Category.objects.create(
                            name=category_name,
                            description=category_descriptions.get(category_name, ''),
                            is_active=True,
                        )
                        created_categories += 1
                    elif not category.is_active:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Category "{category.name}" is inactive; imported products will still reference it.'
                            )
                        )
                    categories[category_name.casefold()] = category

                existing = (
                    Product.objects.filter(
                        generic_name__iexact=record['generic_name'].strip(),
                        dosage__iexact=record['dosage'].strip(),
                        dosage_form=record['dosage_form'],
                    )
                    .order_by('id')
                    .first()
                )
                if existing:
                    existing_products += 1
                    continue

                Product.objects.create(
                    name=record['name'].strip(),
                    generic_name=record['generic_name'].strip(),
                    category=category,
                    dosage=record['dosage'].strip(),
                    dosage_form=record['dosage_form'],
                    barcode='',
                    description=CATALOG_NOTICE,
                    subtitle='Nigeria generic starter catalogue - verify pack before stocking',
                    status=Product.Status.ACTIVE,
                    created_by=audit_user,
                    updated_by=audit_user,
                )
                created_products += 1

            if options['dry_run']:
                transaction.set_rollback(True)

        mode = 'DRY RUN - changes rolled back' if options['dry_run'] else 'IMPORT COMPLETE'
        self.stdout.write(self.style.SUCCESS(mode))
        self.stdout.write(f'Catalogue: {payload["catalogue"]["name"]}')
        self.stdout.write(f'Selected medicine records: {len(medicines)}')
        self.stdout.write(f'Products that would be/are created: {created_products}')
        self.stdout.write(f'Existing matching products skipped: {existing_products}')
        self.stdout.write(f'Categories that would be/are created: {created_categories}')
        self.stdout.write(
            self.style.WARNING(
                'No manufacturer variants, NAFDAC numbers, barcodes, prices, or opening stock were created.'
            )
        )

    def _load_catalog(self):
        try:
            with CATALOG_PATH.open(encoding='utf-8') as catalog_file:
                return json.load(catalog_file)
        except FileNotFoundError as exc:
            raise CommandError(f'Medicine catalogue was not found at {CATALOG_PATH}.') from exc
        except json.JSONDecodeError as exc:
            raise CommandError(f'Medicine catalogue contains invalid JSON: {exc}.') from exc

    def _validate_catalog(self, payload):
        if not isinstance(payload, dict):
            raise CommandError('Medicine catalogue root must be an object.')
        catalogue = payload.get('catalogue')
        if not isinstance(catalogue, dict) or not str(catalogue.get('name', '')).strip():
            raise CommandError('Medicine catalogue must include catalogue.name.')
        if not isinstance(payload.get('categories'), dict):
            raise CommandError('Medicine catalogue must contain a "categories" object.')

        medicines = payload.get('medicines')
        if not isinstance(medicines, list) or not medicines:
            raise CommandError('Medicine catalogue must contain a non-empty "medicines" list.')

        required_fields = {'name', 'generic_name', 'category', 'dosage', 'dosage_form'}
        allowed_forms = {value for value, _label in Product.DosageForm.choices}
        seen_keys = set()

        for index, record in enumerate(medicines, start=1):
            if not isinstance(record, dict):
                raise CommandError(f'Medicine record {index} must be an object.')
            missing_fields = sorted(required_fields - record.keys())
            if missing_fields:
                raise CommandError(
                    f'Medicine record {index} is missing: {", ".join(missing_fields)}.'
                )
            if any(not str(record[field]).strip() for field in required_fields):
                raise CommandError(f'Medicine record {index} contains an empty required value.')
            if record['dosage_form'] not in allowed_forms:
                raise CommandError(
                    f'Medicine record {index} uses unsupported dosage form '
                    f'"{record["dosage_form"]}".'
                )

            key = (
                record['generic_name'].strip().casefold(),
                record['dosage'].strip().casefold(),
                record['dosage_form'],
            )
            if key in seen_keys:
                raise CommandError(
                    f'Duplicate generic/strength/form combination at medicine record {index}.'
                )
            seen_keys.add(key)

        return medicines

    def _select_medicines(self, medicines, *, category_names, limit):
        if limit is not None and limit <= 0:
            raise CommandError('--limit must be greater than zero.')

        selected = medicines
        requested_categories = {name.strip().casefold() for name in category_names if name.strip()}
        if requested_categories:
            available_categories = {record['category'].strip().casefold() for record in medicines}
            unknown_categories = requested_categories - available_categories
            if unknown_categories:
                available_display = ', '.join(sorted({record['category'] for record in medicines}))
                raise CommandError(
                    f'Unknown category: {", ".join(sorted(unknown_categories))}. '
                    f'Available categories: {available_display}.'
                )
            selected = [
                record
                for record in medicines
                if record['category'].strip().casefold() in requested_categories
            ]

        if limit is not None:
            selected = selected[:limit]
        return selected

    def _get_audit_user(self, email):
        if not email:
            return None

        user = get_user_model().objects.filter(email__iexact=email.strip()).first()
        if user is None:
            raise CommandError(f'No user exists with email "{email}".')
        return user
