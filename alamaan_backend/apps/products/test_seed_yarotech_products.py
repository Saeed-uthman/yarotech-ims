from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from apps.products.management.commands.seed_yarotech_products import PRODUCTS
from apps.products.models import PriceAdjustmentHistory, Product, ProductVariant


class SeedYarotechProductsTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='importer@example.com', password='test-password', is_active=True
        )

    def run_command(self, *extra):
        output = StringIO()
        call_command(
            'seed_yarotech_products', '--actor-email', self.user.email,
            *extra, stdout=output,
        )
        return output.getvalue()

    def test_creates_complete_catalogue_without_inventing_cost_or_stock(self):
        output = self.run_command()
        self.assertEqual(len(PRODUCTS), 84)
        self.assertEqual(Product.objects.count(), 84)
        self.assertEqual(ProductVariant.objects.count(), 84)
        self.assertEqual(PriceAdjustmentHistory.objects.count(), 84)
        cat6 = Product.objects.get(barcode='YTG-0001')
        self.assertEqual(cat6.name, 'CAT6 OUTDOOR')
        self.assertEqual(cat6.variants.get().base_price, 0)
        self.assertEqual(cat6.variants.get().current_stock, 0)
        self.assertEqual(cat6.variants.get().default_selling_price, 105000)
        self.assertEqual(
            Product.objects.get(barcode='YTG-0075').category.name,
            'Surveillance Equipment',
        )
        self.assertEqual(
            Product.objects.get(barcode='YTG-0080').category.name,
            'Network Switches',
        )
        self.assertIn('Prices requiring confirmation: YTG-0081 and YTG-0084', output)

    def test_is_idempotent_and_preserves_manually_added_stock(self):
        self.run_command()
        variant = ProductVariant.objects.get(product__barcode='YTG-0001')
        variant.current_stock = 7
        variant.save(update_fields=('current_stock',))
        output = self.run_command()
        self.assertEqual(Product.objects.count(), 84)
        self.assertEqual(ProductVariant.objects.count(), 84)
        self.assertEqual(PriceAdjustmentHistory.objects.count(), 84)
        self.assertEqual(ProductVariant.objects.get(product__barcode='YTG-0001').current_stock, 7)
        self.assertIn('Products: 0 created, 84 updated', output)

    def test_dry_run_rolls_back_all_catalogue_records(self):
        output = self.run_command('--dry-run')
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(ProductVariant.objects.count(), 0)
        self.assertIn('changes rolled back', output)
