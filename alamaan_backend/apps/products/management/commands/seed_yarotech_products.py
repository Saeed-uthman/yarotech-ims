from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User
from apps.products.models import Category, Company, PriceAdjustmentHistory, Product, ProductVariant


# Selling prices are the figures supplied by Yarotech. Cost and stock were not
# supplied, so the command deliberately initializes both to zero.
PRODUCTS = (
    ('CAT6 OUTDOOR', 'Outdoor-grade CAT6 Ethernet/network cable.', '105000.00'),
    ('Inverter Haisic 1.5kva', 'Haisic 1.5 kVA inverter for backup power applications.', '200000.00'),
    ('t AR730, 2*GE combo WAN, 1*10GE(SFP+) WAN, 8*GE LAN, 1*GE comb', 'AR730 networking router with multiple Gigabit and 10GE interfaces; product name is truncated in the source.', '899999.00'),
    ('Tiandy NVR 32chl', 'Tiandy 32-channel network video recorder for IP cameras.', '180000.00'),
    ('Lutian 1kwh battery all in one', 'Lutian 1 kWh all-in-one battery/power storage unit.', '340000.00'),
    ('Inverter Must 6kva', 'MUST 6 kVA inverter for backup or solar power systems.', '400000.00'),
    ('FIRE EXTINGUISHER BALL', 'Fire-extinguishing ball designed for rapid fire suppression.', '30000.00'),
    ('cat6 20meter', '20-metre CAT6 Ethernet network cable.', '10000.00'),
    ('Tiandy POE switch 4ports', 'Tiandy 4-port PoE network switch for powered IP devices.', '45000.00'),
    ('MUST battery 1kwh all in one', 'MUST 1 kWh all-in-one battery/power storage system.', '375000.00'),
    ('Circuit Breaker DC 100A', '100A DC circuit breaker for electrical protection.', '11000.00'),
    ('RJ45', 'RJ45 connector for terminating Ethernet/network cables.', '65.00'),
    ('Tiandy ip camera 4MP Outdoor', 'Tiandy 4MP outdoor IP surveillance camera.', '40000.00'),
    ('Litebeam 5AC', 'LiteBeam 5AC wireless networking/CPE device.', '150000.00'),
    ('MEDIA-CONVERTER RJ45-FIBER', 'Media converter for connecting RJ45 Ethernet to fiber-optic networks.', '35000.00'),
    ('HDD 500GB', '500GB hard disk drive for data or surveillance storage.', '14000.00'),
    ('TPlink archer C80', 'TP-Link Archer C80 wireless router.', '130000.00'),
    ('AP761', 'Network access point/device, model AP761.', '280000.00'),
    ('STARLINK V4', 'Starlink V4 satellite internet hardware.', '540000.00'),
    ('Ubiquiti USW-Flex', 'Compact Ubiquiti network switch from the USW-Flex series.', '80000.00'),
    ('tiandy smart mini battery camera', 'Compact Tiandy battery-powered smart surveillance camera.', '72000.00'),
    ('Switch 10port TPlink', 'TP-Link 10-port Ethernet network switch.', '130000.00'),
    ('UDM-PRO', 'Network gateway/controller device, model UDM-Pro.', '850000.00'),
    ('Ethernet Power Adaptor second used 24V', 'Second-hand 24V Ethernet power adapter.', '14000.00'),
    ('Mikrotik RB952UI-5ac2nD-Tc', 'MikroTik router/access point, model RB952Ui-5ac2nD-TC.', '130000.00'),
    ('wireless intercome non display', 'Wireless intercom unit without a display screen.', '45000.00'),
    ('Tiandy NVR 4chl', 'Tiandy 4-channel network video recorder.', '50000.00'),
    ('panasonic intercome wired display', 'Panasonic wired intercom unit with display.', '18000.00'),
    ('TPlink archer AX23', 'TP-Link Archer AX23 wireless router.', '150000.00'),
    ('TPlink Omada EAP110 Outdoor', 'TP-Link Omada outdoor wireless access point.', '75000.00'),
    ('MIKROTIC RB4011', 'MikroTik high-performance network router, model RB4011.', '350000.00'),
    ('Circuit Breaker DC/AC', 'Circuit breaker for DC/AC electrical protection.', '8000.00'),
    ('U4 RACK', '4U equipment/network rack for mounting devices.', '85000.00'),
    ('Telephone sim card slot', 'Telephone device designed to operate with a SIM card.', '40000.00'),
    ('WIFI camera socket', 'Socket-style Wi-Fi surveillance camera.', '20000.00'),
    ('DLINK DIR-650IN', 'D-Link wireless router, model DIR-650IN.', '35000.00'),
    ('Hikvision attendance (fingerprint only)', 'Hikvision biometric attendance terminal using fingerprint authentication.', '160000.00'),
    ('LOCO 5AC', 'Wireless networking/CPE device, model LOCO 5AC.', '95000.00'),
    ('HUAWEI S380 4PORT', 'Huawei S380 4-port networking device.', '200000.00'),
    ('Dahua ups 600va', 'Dahua 600VA uninterruptible power supply.', '65000.00'),
    ('Tiandy NVR 8chl', 'Tiandy 8-channel network video recorder.', '65000.00'),
    ('Huewei LAN access point AP361', 'Wireless LAN access point, model AP361.', '70000.00'),
    ('Switch 8port Net-pro', 'Net-Pro 8-port Ethernet network switch.', '100000.00'),
    ('cat6 2meter', '2-metre CAT6 Ethernet network cable.', '1500.00'),
    ('intercome non display wired', 'Wired intercom unit without a display screen.', '15000.00'),
    ('Itel 1kwh battery all in one', 'Itel 1 kWh all-in-one battery/power storage system.', '315000.00'),
    ('Ethernet Adaptor', 'Adapter for connecting devices to an Ethernet network.', '17000.00'),
    ('MIKROTIC RB951ui', 'MikroTik router/access point, model RB951Ui.', '100000.00'),
    ('tiandy smart stand mini 355 camera', 'Compact Tiandy smart stand-mounted surveillance camera.', '35000.00'),
    ('smart mini dc ups pro', 'Compact DC UPS for powering small electronic/network devices.', '40000.00'),
    ('IP Tiandy ptz WIFI', 'Tiandy Wi-Fi IP PTZ surveillance camera.', '80000.00'),
    ('Tiandy 2mp Indoor', 'Tiandy 2MP indoor surveillance camera.', '19000.00'),
    ('7.5kwh solar generator', '7.5 kWh solar generator/power storage system.', '1150000.00'),
    ('Hikvision attendance (face recognition and finger print)', 'Hikvision attendance terminal with face and fingerprint recognition.', '170000.00'),
    ('TPlink Omada EAP225-Outdoor', 'TP-Link Omada EAP225 outdoor wireless access point.', '140000.00'),
    ('TPlink Switch 8 port non poe', 'TP-Link 8-port Ethernet switch without PoE.', '18000.00'),
    ('S310-24P4S', 'Network switch, model S310-24P4S.', '600000.00'),
    ('wireless intercome display', 'Wireless intercom unit with display screen.', '52000.00'),
    ('Itel Power Go DC battery Bank', 'Itel Power Go DC battery bank for backup power.', '120000.00'),
    ('Tiandy 2mp Outdoor', 'Tiandy 2MP outdoor surveillance camera.', '19000.00'),
    ('Dahua poe switch 8port', 'Dahua 8-port PoE network switch.', '75000.00'),
    ('1U socket 8way', '1U rack-mounted 8-way power socket/PDU.', '45000.00'),
    ('Mikrotik AX2', 'MikroTik AX2 wireless router/access point.', '140000.00'),
    ('S110-24P2ST', 'Network switch, model S110-24P2ST.', '330000.00'),
    ('Tenda N301', 'Tenda N301 wireless router.', '25000.00'),
    ('Smoke detector', 'Smoke detection sensor/alarm for fire safety.', '15000.00'),
    ('HDD 1TB', '1TB hard disk drive for storage or surveillance systems.', '40000.00'),
    ('HUAWEI S110 8PORT', 'Huawei S110 8-port network switch.', '130000.00'),
    ('HUAWEI S110 16PORT', 'Huawei S110 16-port network switch.', '250000.00'),
    ('Tiandy NVR 20chl', 'Tiandy 20-channel network video recorder.', '100000.00'),
    ('Ethernet Power Bank 24V', '24V power bank/power source for Ethernet/network equipment.', '50000.00'),
    ('Tiandy NVR 80chl', 'Tiandy 80-channel network video recorder.', '900000.00'),
    ('TPlink 8port Gigabit Switch non poe', 'TP-Link 8-port Gigabit Ethernet switch without PoE.', '30000.00'),
    ('LAP-GPS', 'Device/model listed as LAP-GPS; specification requires confirmation.', '200000.00'),
    ('IP Solar Tiandy ptz sim slot', 'Solar-powered Tiandy IP PTZ camera with SIM-card slot.', '150000.00'),
    ('CAT6 INDOOR', 'Indoor CAT6 Ethernet/network cable.', '140000.00'),
    ('TPlink archer C20', 'TP-Link Archer C20 wireless router.', '100000.00'),
    ('STARLINK MINI', 'Compact Starlink satellite internet hardware.', '440000.00'),
    ('MIKROTIC L009', 'MikroTik network router, model L009.', '215000.00'),
    ('huawei ekit engine S110 -8 port', 'Huawei eKitEngine S110 8-port network switch.', '120000.00'),
    ('TPlink router AX23', 'TP-Link AX23 wireless router; selling price requires confirmation.', '0.00'),
    ('Huewei wireless LAN point AP263', 'Wireless LAN access point, model AP263.', '115000.00'),
    ('huawei ekit engine S110 -16 port', 'Huawei eKitEngine S110 16-port network switch.', '180000.00'),
    ('Huawei AR180 Dual Band Wifi 7 Router', 'Huawei AR180 dual-band Wi-Fi 7 router; selling price requires confirmation.', '0.00'),
)


def classify(name):
    value = name.lower()
    if 'inverter' in value:
        return 'Inverters', Product.DosageForm.INVERTER
    if any(term in value for term in ('camera', 'nvr', 'tiandy ptz')):
        return 'Surveillance Equipment', Product.DosageForm.OTHER_IT_EQUIPMENT
    if 'solar' in value:
        return 'Solar & Backup Power', Product.DosageForm.BATTERY
    if any(term in value for term in ('battery', 'power bank', 'ups')):
        return 'Batteries & Backup Power', Product.DosageForm.BATTERY
    if 'cat6' in value:
        return 'Network Cables', Product.DosageForm.CABLE
    if 'switch' in value or any(model in value for model in ('s110', 's310', 's380')):
        return 'Network Switches', Product.DosageForm.SWITCH
    if any(term in value for term in ('router', 'archer', 'mikrotik', 'mikrotic', 'udm-pro', 'ar730')):
        return 'Routers & Gateways', Product.DosageForm.ROUTER
    if any(term in value for term in ('access point', 'wireless lan', 'litebeam', 'loco 5ac', 'ap761')):
        return 'Wireless Networking', Product.DosageForm.ACCESS_POINT
    if 'hdd' in value:
        return 'Storage Equipment', Product.DosageForm.COMPUTER_EQUIPMENT
    if any(term in value for term in ('rack', 'rj45', 'adaptor', 'adapter', 'media-converter', 'socket')):
        return 'Networking Accessories', Product.DosageForm.ACCESSORY
    if any(term in value for term in ('fire', 'smoke detector', 'circuit breaker')):
        return 'Safety & Electrical Equipment', Product.DosageForm.ACCESSORY
    return 'Other IT Equipment', Product.DosageForm.OTHER_IT_EQUIPMENT


class Command(BaseCommand):
    help = 'Seed the supplied Yarotech networking, solar, safety, and IT products.'

    def add_arguments(self, parser):
        parser.add_argument('--actor-email', required=True)
        parser.add_argument('--company', default='Yarotech Group')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        actor = User.objects.filter(email__iexact=options['actor_email'].strip(), is_active=True).first()
        if not actor:
            raise CommandError('The --actor-email user does not exist or is inactive.')

        created_products = updated_products = created_variants = updated_variants = 0
        with transaction.atomic():
            company, _ = Company.objects.get_or_create(
                name=options['company'].strip(), defaults={'code': 'YAROTECH'}
            )
            for number, (name, description, price_text) in enumerate(PRODUCTS, start=1):
                sku = f'YTG-{number:04d}'
                category_name, equipment_type = classify(name)
                category, _ = Category.objects.get_or_create(
                    name=category_name,
                    defaults={'description': f'Yarotech {category_name.lower()} catalogue.'},
                )
                product = Product.objects.filter(barcode=sku).first()
                product_created = product is None
                if product_created:
                    product = Product(barcode=sku, created_by=actor)
                product.name = name
                product.generic_name = equipment_type.label
                product.category = category
                product.dosage = 'N/A'
                product.dosage_form = equipment_type
                product.description = description
                product.status = Product.Status.ACTIVE
                product.updated_by = actor
                product.full_clean(validate_unique=False)
                product.save()
                if product_created:
                    created_products += 1
                else:
                    updated_products += 1

                price = Decimal(price_text)
                variant = ProductVariant.objects.filter(product=product, company=company).first()
                variant_created = variant is None
                if variant_created:
                    variant = ProductVariant(product=product, company=company, created_by=actor)
                old_prices = None if variant_created else (
                    variant.base_price, variant.min_selling_price,
                    variant.default_selling_price, variant.max_selling_price,
                )
                variant.base_price = Decimal('0.00')
                variant.min_selling_price = price
                variant.default_selling_price = price
                variant.max_selling_price = price
                variant.current_stock = 0 if variant_created else variant.current_stock
                variant.reorder_level = 0 if variant_created else variant.reorder_level
                variant.status = ProductVariant.Status.AVAILABLE
                variant.updated_by = actor
                variant.full_clean(validate_unique=False)
                variant.save()
                if variant_created:
                    created_variants += 1
                else:
                    updated_variants += 1

                new_prices = (Decimal('0.00'), price, price, price)
                if variant_created or old_prices != new_prices:
                    old = old_prices or (Decimal('0.00'),) * 4
                    PriceAdjustmentHistory.objects.create(
                        variant=variant,
                        old_base_price=old[0], new_base_price=Decimal('0.00'),
                        old_min_selling_price=old[1], new_min_selling_price=price,
                        old_default_selling_price=old[2], new_default_selling_price=price,
                        old_max_selling_price=old[3], new_max_selling_price=price,
                        change_type=(PriceAdjustmentHistory.ChangeType.INITIAL if variant_created else PriceAdjustmentHistory.ChangeType.CORRECTION),
                        reason='Initial Yarotech product catalogue.', adjusted_by=actor,
                    )

            if options['dry_run']:
                transaction.set_rollback(True)

        action = 'DRY RUN - changes rolled back' if options['dry_run'] else 'YAROTECH PRODUCT IMPORT COMPLETE'
        self.stdout.write(self.style.SUCCESS(action))
        self.stdout.write(f'Products: {created_products} created, {updated_products} updated')
        self.stdout.write(f'Variants: {created_variants} created, {updated_variants} updated')
        self.stdout.write('Initial stock: 0 for newly created variants')
        self.stdout.write('Prices requiring confirmation: YTG-0081 and YTG-0084')
