from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.products.models import Category, Product, ProductVariant


class SeedNigerianMedicinesCommandTests(TestCase):
    def test_command_imports_catalogue_without_fabricating_inventory(self):
        output = StringIO()

        call_command('seed_nigerian_medicines', stdout=output)

        self.assertEqual(Product.objects.count(), 132)
        self.assertEqual(Category.objects.count(), 17)
        self.assertEqual(ProductVariant.objects.count(), 0)
        paracetamol = Product.objects.get(
            generic_name='Paracetamol',
            dosage='500 mg',
            dosage_form=Product.DosageForm.TABLET,
        )
        self.assertEqual(paracetamol.barcode, '')
        self.assertIn('Confirm the physical pack', paracetamol.description)
        self.assertIn('IMPORT COMPLETE', output.getvalue())

    def test_command_is_idempotent(self):
        call_command('seed_nigerian_medicines', stdout=StringIO())

        second_output = StringIO()
        call_command('seed_nigerian_medicines', stdout=second_output)

        self.assertEqual(Product.objects.count(), 132)
        self.assertEqual(Category.objects.count(), 17)
        self.assertIn('Existing matching products skipped: 132', second_output.getvalue())

    def test_dry_run_rolls_back_products_and_categories(self):
        output = StringIO()

        call_command('seed_nigerian_medicines', '--dry-run', stdout=output)

        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(Category.objects.count(), 0)
        self.assertIn('DRY RUN - changes rolled back', output.getvalue())

    def test_category_filter_and_limit_can_create_a_small_trial_catalogue(self):
        call_command(
            'seed_nigerian_medicines',
            '--category',
            'Antimalarial Medicines',
            '--limit',
            '2',
            stdout=StringIO(),
        )

        self.assertEqual(Product.objects.count(), 2)
        self.assertEqual(Category.objects.count(), 1)
        self.assertEqual(
            Product.objects.filter(category__name='Antimalarial Medicines').count(),
            2,
        )
