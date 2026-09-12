"""Create the 50 generic sample products without replacing existing catalogue data."""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.products.models import Category, Company, Product, ProductVariant, PriceAdjustmentHistory


PRODUCT_GROUPS = (
    ('Switch', (
        '5-Port Gigabit Network Switch', '8-Port Gigabit Network Switch',
        '16-Port Gigabit Network Switch', '24-Port Gigabit Network Switch',
        '8-Port PoE Network Switch', '16-Port PoE Network Switch',
    )),
    ('Router', (
        'Dual-Band Wi-Fi Router', '4G LTE SIM Router', '5G SIM Router',
        'Gigabit VPN Router', 'Fibre Router with SFP Port', 'Portable MiFi Router',
    )),
    ('Access Point', (
        'Indoor Ceiling Access Point', 'Outdoor Wireless Access Point',
        'Wall-Mount Access Point', 'Outdoor Point-to-Point Radio', 'Mesh Wi-Fi Unit',
    )),
    ('Accessory', ('USB Wi-Fi Adapter',)),
    ('Battery', (
        '12V 7Ah Backup Battery', '12V 18Ah Backup Battery',
        '12V 100Ah Deep-Cycle Battery', '12V 200Ah Deep-Cycle Battery',
        '12.8V 100Ah Lithium Battery', '25.6V 100Ah Lithium Battery',
        '51.2V 100Ah Lithium Battery',
    )),
    ('Inverter', (
        '1kVA Pure Sine Wave Inverter', '1.5kVA Pure Sine Wave Inverter',
        '3kVA Pure Sine Wave Inverter', '5kVA Hybrid Solar Inverter',
        '10kVA Hybrid Solar Inverter',
    )),
    ('Solar Panel', (
        '100W Monocrystalline Solar Panel', '200W Monocrystalline Solar Panel',
        '300W Monocrystalline Solar Panel', '450W Monocrystalline Solar Panel',
        '550W Monocrystalline Solar Panel',
    )),
    ('Charge Controller', (
        '20A PWM Solar Charge Controller', '30A MPPT Solar Charge Controller',
        '60A MPPT Solar Charge Controller', '100A MPPT Solar Charge Controller',
    )),
    ('Cable', (
        'Cat6 Ethernet Cable - 305m Box', 'Cat6 Ethernet Patch Cable - 1m',
        'Cat6 Ethernet Patch Cable - 3m', 'Outdoor Cat6 Cable - 305m Box',
        '4mm2 Solar Cable - Per Metre', '6mm2 Solar Cable - Per Metre',
    )),
    ('Accessory', (
        'RJ45 Connector - Pack of 100', 'MC4 Solar Connector Pair',
        '48V PoE Injector', 'Network Cable Tester',
    )),
    ('Other IT Equipment', ('650VA UPS',)),
)
PRODUCTS = tuple((name, category) for category, names in PRODUCT_GROUPS for name in names)


class Command(BaseCommand):
    help = 'Add 50 sample products with zero prices/stock and VAT disabled. Existing records are skipped.'

    def add_arguments(self, parser):
        parser.add_argument('--actor-email', required=True, help='Existing active user for audit records.')
        parser.add_argument('--dry-run', action='store_true', help='Preview counts and roll back all changes.')

    def handle(self, *args, **options):
        actor = get_user_model().objects.filter(email__iexact=options['actor_email'].strip(), is_active=True).first()
        if actor is None:
            raise CommandError('The --actor-email user does not exist or is inactive.')
        created = skipped = 0
        with transaction.atomic():
            # Serializes concurrent runs on databases supporting row locks.
            company, _ = Company.objects.get_or_create(name='Generic / Unbranded', defaults={'code': 'GENERIC'})
            Company.objects.select_for_update().get(pk=company.pk)
            for number, (name, category_name) in enumerate(PRODUCTS, 1):
                barcode = f'YTG-SAMPLE-{number:03d}'
                if Product.objects.filter(barcode=barcode).exists() or Product.objects.filter(name__iexact=name).exists():
                    skipped += 1
                    continue
                category, _ = Category.objects.get_or_create(name=category_name)
                product = Product(
                    name=name, generic_name=category_name, category=category,
                    dosage='N/A', dosage_form=category_name, barcode=barcode,
                    description='Sample catalogue entry. Set actual brand, prices, stock and VAT before selling.',
                    vat_enabled=False, created_by=actor, updated_by=actor,
                )
                product.full_clean()
                product.save()
                variant = ProductVariant(
                    product=product, company=company, base_price=0,
                    min_selling_price=0, default_selling_price=0, max_selling_price=0,
                    current_stock=0, reorder_level=0,
                    created_by=actor, updated_by=actor,
                )
                variant.full_clean()
                variant.save()
                PriceAdjustmentHistory.objects.create(
                    variant=variant, old_base_price=0, new_base_price=0,
                    old_min_selling_price=0, new_min_selling_price=0,
                    old_default_selling_price=0, new_default_selling_price=0,
                    old_max_selling_price=0, new_max_selling_price=0,
                    change_type=PriceAdjustmentHistory.ChangeType.INITIAL,
                    reason='Sample catalogue placeholder prices; actual prices must be entered.',
                    adjusted_by=actor,
                )
                created += 1
            if options['dry_run']:
                transaction.set_rollback(True)
        self.stdout.write(self.style.SUCCESS(
            f'{"DRY RUN (rolled back)" if options["dry_run"] else "IMPORT COMPLETE"}: '
            f'{created} products created, {skipped} existing products skipped.'
        ))
        self.stdout.write('New products: zero prices, zero stock, VAT disabled. Set actual values before selling.')
