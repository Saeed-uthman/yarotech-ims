from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command, CommandError
from django.test import TestCase

from apps.products.models import Category, Company, Product, ProductVariant, PriceAdjustmentHistory


class SampleProductsTests(TestCase):
    def setUp(self):
        self.actor = get_user_model().objects.create_user(email='sample@example.com', password='test-password', is_active=True)

    def run_seed(self, **kwargs):
        call_command('seed_sample_products', actor_email=self.actor.email, stdout=StringIO(), **kwargs)

    def test_catalogue_and_rerun_preserve_user_edits(self):
        self.run_seed()
        self.assertEqual(Product.objects.count(), 50)
        self.assertEqual(ProductVariant.objects.count(), 50)
        self.assertEqual(PriceAdjustmentHistory.objects.count(), 50)
        self.assertFalse(Product.objects.filter(vat_enabled=True).exists())
        self.assertFalse(ProductVariant.objects.exclude(current_stock=0, default_selling_price=0).exists())
        product = Product.objects.get(barcode='YTG-SAMPLE-001')
        product.name = 'My edited switch'
        product.vat_enabled = True
        product.save()
        variant = product.variants.get()
        variant.current_stock = 7
        variant.default_selling_price = variant.max_selling_price = 15000
        variant.save()
        self.run_seed()
        product.refresh_from_db()
        variant.refresh_from_db()
        self.assertEqual(Product.objects.count(), 50)
        self.assertEqual(PriceAdjustmentHistory.objects.count(), 50)
        self.assertEqual(product.name, 'My edited switch')
        self.assertTrue(product.vat_enabled)
        self.assertEqual(variant.current_stock, 7)
        self.assertEqual(variant.default_selling_price, 15000)

    def test_dry_run_leaves_no_data(self):
        self.run_seed(dry_run=True)
        for model in (Product, ProductVariant, PriceAdjustmentHistory, Category, Company):
            self.assertEqual(model.objects.count(), 0)

    def test_existing_name_is_skipped_even_with_another_barcode(self):
        self.run_seed()
        product = Product.objects.get(barcode='YTG-SAMPLE-001')
        product.barcode = 'CUSTOM-CODE'
        product.save()
        self.run_seed()
        self.assertEqual(Product.objects.count(), 50)

    def test_invalid_actor_does_not_write(self):
        self.actor.is_active = False
        self.actor.save()
        with self.assertRaises(CommandError):
            self.run_seed()
        self.assertEqual(Product.objects.count(), 0)
