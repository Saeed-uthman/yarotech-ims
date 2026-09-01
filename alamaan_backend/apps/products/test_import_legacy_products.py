from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connection
from django.test import TransactionTestCase

from apps.inventory.models import InventoryMovement
from apps.products.models import PriceAdjustmentHistory, Product, ProductVariant


class ImportLegacyProductsTests(TransactionTestCase):
    table = 'legacy_products_test_source'

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='importer@example.com', password='test-password', is_active=True
        )
        with connection.cursor() as cursor:
            cursor.execute(f'DROP TABLE IF EXISTS {self.table}')
            cursor.execute(
                f'''CREATE TABLE {self.table} (
                    id integer primary key, name varchar(200), sku varchar(64), category varchar(100),
                    short_description text, full_description text, cost_price decimal(12,2),
                    selling_price decimal(12,2), stock_quantity integer, minimum_stock integer,
                    warranty_info varchar(255), status varchar(20), max_markup decimal(12,2)
                )'''
            )
            cursor.execute(
                f'''INSERT INTO {self.table} VALUES
                (1, 'TP-Link Router', 'RTR-1', 'Routers', '', 'Office router', 100, 150, 4, 2, '1 year', 'active', 0)'''
            )

    def tearDown(self):
        with connection.cursor() as cursor:
            cursor.execute(f'DROP TABLE IF EXISTS {self.table}')

    def run_import(self, *extra):
        output = StringIO()
        call_command(
            'import_legacy_products', '--legacy-database', 'default',
            '--source-table', self.table, '--actor-email', self.user.email,
            *extra, stdout=output,
        )
        return output.getvalue()

    def test_import_creates_audited_product_stock_and_price(self):
        output = self.run_import()
        product = Product.objects.get(barcode='RTR-1')
        variant = ProductVariant.objects.get(product=product)
        self.assertEqual(product.dosage_form, Product.DosageForm.ROUTER)
        self.assertEqual(variant.current_stock, 4)
        self.assertEqual(InventoryMovement.objects.get().new_stock, 4)
        self.assertEqual(PriceAdjustmentHistory.objects.get().new_default_selling_price, 150)
        self.assertIn('Products: 1 created', output)

    def test_import_is_idempotent(self):
        self.run_import()
        output = self.run_import()
        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(ProductVariant.objects.count(), 1)
        self.assertEqual(InventoryMovement.objects.count(), 1)
        self.assertEqual(PriceAdjustmentHistory.objects.count(), 1)
        self.assertIn('Products: 0 created, 1 updated', output)

    def test_dry_run_rolls_everything_back(self):
        output = self.run_import('--dry-run')
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(ProductVariant.objects.count(), 0)
        self.assertEqual(InventoryMovement.objects.count(), 0)
        self.assertIn('changes rolled back', output)
