from decimal import Decimal
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.products.models import Category, Company, Product, ProductVariant, BundleComponent
from apps.inventory.models import InventoryBatch, InventoryMovement
from apps.sales.services import process_pos_sale
from apps.settings_app.models import SystemSettings

User = get_user_model()

class ServicesAndBundlesSaleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            email='admin@yarotech.ng',
            password='password123',
            full_name='Tech Admin',
            phone='08000000000'
        )
        self.settings = SystemSettings.load()
        self.settings.allow_walking_sales = True
        self.settings.vat_enabled = False
        self.settings.save()

        self.category = Category.objects.create(name='Solar Equipment')
        self.brand = Company.objects.create(name='Felicity Solar')

        # 1. Physical Component 1: 5kVA Inverter
        self.inverter_prod = Product.objects.create(
            name='5kVA Hybrid Inverter',
            generic_name='IV-5KVA-48V',
            category=self.category,
            dosage='48V / 5000W',
            dosage_form=Product.DosageForm.INVERTER,
            status=Product.Status.ACTIVE,
            created_by=self.user,
            updated_by=self.user,
        )
        self.inverter_var = ProductVariant.objects.create(
            product=self.inverter_prod,
            company=self.brand,
            base_price=Decimal('400000.00'),
            min_selling_price=Decimal('450000.00'),
            default_selling_price=Decimal('500000.00'),
            max_selling_price=Decimal('600000.00'),
            current_stock=Decimal('5.00'),
            status=ProductVariant.Status.AVAILABLE,
            created_by=self.user,
            updated_by=self.user,
        )
        InventoryBatch.objects.create(
            variant=self.inverter_var,
            batch_number='BATCH-INV-01',
            received_quantity=Decimal('5.00'),
            remaining_quantity=Decimal('5.00'),
            unit_cost=Decimal('400000.00'),
            received_at=timezone.now(),
            created_by=self.user,
        )

        # 2. Physical Component 2: 200Ah Lithium Battery
        self.battery_prod = Product.objects.create(
            name='200Ah Lithium Battery',
            generic_name='BAT-200AH-LITH',
            category=self.category,
            dosage='48V / 200Ah',
            dosage_form=Product.DosageForm.BATTERY,
            status=Product.Status.ACTIVE,
            created_by=self.user,
            updated_by=self.user,
        )
        self.battery_var = ProductVariant.objects.create(
            product=self.battery_prod,
            company=self.brand,
            base_price=Decimal('800000.00'),
            min_selling_price=Decimal('900000.00'),
            default_selling_price=Decimal('1000000.00'),
            max_selling_price=Decimal('1200000.00'),
            current_stock=Decimal('10.00'),
            status=ProductVariant.Status.AVAILABLE,
            created_by=self.user,
            updated_by=self.user,
        )
        InventoryBatch.objects.create(
            variant=self.battery_var,
            batch_number='BATCH-BAT-01',
            received_quantity=Decimal('10.00'),
            remaining_quantity=Decimal('10.00'),
            unit_cost=Decimal('800000.00'),
            received_at=timezone.now(),
            created_by=self.user,
        )

        # 3. Service Product: Installation & Commissioning (Non-stock item)
        self.service_prod = Product.objects.create(
            name='Solar Installation & Commissioning',
            generic_name='SRV-SOLAR-INST',
            category=self.category,
            dosage='Standard Site Setup',
            dosage_form=Product.DosageForm.SERVICE,
            is_service=True,
            status=Product.Status.ACTIVE,
            created_by=self.user,
            updated_by=self.user,
        )
        self.service_var = ProductVariant.objects.create(
            product=self.service_prod,
            company=self.brand,
            base_price=Decimal('0.00'),
            min_selling_price=Decimal('50000.00'),
            default_selling_price=Decimal('80000.00'),
            max_selling_price=Decimal('150000.00'),
            current_stock=Decimal('0.00'), # Zero stock, but service!
            status=ProductVariant.Status.AVAILABLE,
            created_by=self.user,
            updated_by=self.user,
        )

        # 4. Bundle / Kit Product: Complete 5kVA Solar Power Kit
        self.bundle_prod = Product.objects.create(
            name='5kVA Complete Solar System Kit',
            generic_name='KIT-5KVA-COMPLETE',
            category=self.category,
            dosage='Full Hybrid Backup Kit',
            dosage_form=Product.DosageForm.BUNDLE,
            is_bundle=True,
            status=Product.Status.ACTIVE,
            created_by=self.user,
            updated_by=self.user,
        )
        self.bundle_var = ProductVariant.objects.create(
            product=self.bundle_prod,
            company=self.brand,
            base_price=Decimal('1200000.00'),
            min_selling_price=Decimal('1400000.00'),
            default_selling_price=Decimal('1550000.00'),
            max_selling_price=Decimal('1800000.00'),
            current_stock=Decimal('0.00'),
            status=ProductVariant.Status.AVAILABLE,
            created_by=self.user,
            updated_by=self.user,
        )
        # Components: 1x Inverter + 1x Battery
        BundleComponent.objects.create(
            bundle=self.bundle_prod,
            component_variant=self.inverter_var,
            quantity=Decimal('1.00')
        )
        BundleComponent.objects.create(
            bundle=self.bundle_prod,
            component_variant=self.battery_var,
            quantity=Decimal('1.00')
        )

    def test_sale_of_service_item_requires_no_inventory(self):
        """Service items have 0 stock and no batches, but can be sold cleanly."""
        sale = process_pos_sale(
            user=self.user,
            items=[{
                'product_variant_id': self.service_var.id,
                'quantity': Decimal('1.00'),
                'actual_selling_price': Decimal('80000.00'),
            }],
            payment_method='CASH',
            amount_paid=Decimal('80000.00'),
        )
        self.assertEqual(sale.total_amount, Decimal('80000.00'))
        self.assertEqual(sale.items.count(), 1)
        item = sale.items.first()
        self.assertEqual(item.actual_selling_price, Decimal('80000.00'))
        # No stock movements created for service
        self.assertFalse(InventoryMovement.objects.filter(variant=self.service_var).exists())

    def test_sale_of_bundle_deducts_component_inventories(self):
        """Selling a bundle kit checks and deducts stock from each component."""
        initial_inv_stock = self.inverter_var.current_stock
        initial_bat_stock = self.battery_var.current_stock

        sale = process_pos_sale(
            user=self.user,
            items=[{
                'product_variant_id': self.bundle_var.id,
                'quantity': Decimal('2.00'),
                'actual_selling_price': Decimal('1550000.00'),
            }],
            payment_method='TRANSFER',
            amount_paid=Decimal('3100000.00'),
        )
        self.assertEqual(sale.total_amount, Decimal('3100000.00'))

        # Refresh component stocks
        self.inverter_var.refresh_from_db()
        self.battery_var.refresh_from_db()

        # 2 kits sold -> 2 inverters and 2 batteries deducted
        self.assertEqual(self.inverter_var.current_stock, initial_inv_stock - Decimal('2.00'))
        self.assertEqual(self.battery_var.current_stock, initial_bat_stock - Decimal('2.00'))

        # Check stock movements created for components
        inv_movements = InventoryMovement.objects.filter(variant=self.inverter_var, reference_id=str(sale.id))
        self.assertTrue(inv_movements.exists())
        self.assertEqual(inv_movements.first().quantity, Decimal('-2.00'))

