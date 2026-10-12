import json
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.management import call_command, CommandError
from django.test import TestCase
from django.utils import timezone

from apps.inventory import test_stock_reconciliation as fixtures
from apps.inventory.models import InventoryBatch, InventoryMovement
from apps.products.models import Product, ProductVariant


class BatchPlanTests(TestCase):
    def setUp(self):
        fixtures.StockReconciliationTests.setUp(self)
        self.variant.current_stock = 3
        self.variant.save()
        product = Product.objects.create(name='Second switch', generic_name='Switch',
            category=self.product.category, dosage='N/A', dosage_form='Switch')
        self.extra = ProductVariant.objects.create(product=product, company=self.company,
            base_price=1500, min_selling_price=1700, default_selling_price=1800,
            max_selling_price=2000, current_stock=1)
        self.batch = InventoryBatch.objects.create(variant=self.extra, batch_number='old',
            received_quantity=8, remaining_quantity=8, unit_cost=1500, received_at=timezone.now())
        self.plan = {'plan_id': 'confirmed-test', 'reason': 'Confirmed count', 'items': [
            {'variant_id': self.variant.pk, 'name': self.product.name, 'company': self.company.name,
             'stock': 3, 'batch_stock': 0, 'unit_cost': '150.00'},
            {'variant_id': self.extra.pk, 'name': product.name, 'company': self.company.name,
             'stock': 1, 'batch_stock': 8},
        ]}

    def run_plan(self, **options):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'plan.json'
            path.write_text(json.dumps(self.plan), encoding='utf-8')
            call_command('reconcile_stock_batch_plan', plan=str(path),
                actor_email=options.pop('actor_email', self.admin.email), stdout=StringIO(), **options)

    def test_preview_apply_and_repeat_after_later_stock_changes(self):
        self.run_plan()
        self.assertEqual(InventoryBatch.objects.count(), 1)
        self.run_plan(apply=True)
        self.variant.refresh_from_db()
        self.extra.refresh_from_db()
        self.batch.refresh_from_db()
        self.assertEqual((self.variant.current_stock, self.extra.current_stock), (3, 1))
        self.assertEqual(self.batch.remaining_quantity, 1)
        self.assertEqual(self.batch.received_quantity, 8)
        new = self.variant.inventory_batches.get()
        self.assertEqual((new.remaining_quantity, new.unit_cost), (3, 150))
        self.assertEqual(InventoryMovement.objects.count(), 2)
        self.variant.current_stock = 2
        self.variant.save()
        new.remaining_quantity = 2
        new.save()
        self.run_plan(apply=True)
        self.assertEqual(InventoryMovement.objects.count(), 2)
        self.assertEqual(InventoryBatch.objects.count(), 2)

    def test_later_variant_change_prevents_all_repairs(self):
        self.extra.current_stock = 2
        self.extra.save()
        with self.assertRaises(CommandError):
            self.run_plan(apply=True)
        self.assertEqual(InventoryBatch.objects.count(), 1)
        self.assertEqual(InventoryMovement.objects.count(), 0)

    def test_audit_failure_rolls_back_all_batches(self):
        with patch('apps.inventory.management.commands.reconcile_stock_batch_plan.InventoryMovement.objects.create', side_effect=RuntimeError('audit failed')):
            with self.assertRaises(RuntimeError):
                self.run_plan(apply=True)
        self.assertEqual(InventoryBatch.objects.count(), 1)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.remaining_quantity, 8)

    def test_rejects_quarantine_nonadmin_and_invalid_cost(self):
        with self.assertRaises(CommandError):
            self.run_plan(apply=True, actor_email=self.cashier.email)
        self.batch.status = 'QUARANTINED'
        self.batch.save()
        with self.assertRaises(CommandError):
            self.run_plan(apply=True)
        self.plan['items'][0]['unit_cost'] = '-1'
        with self.assertRaises(CommandError):
            self.run_plan(apply=True)
        self.assertEqual(InventoryMovement.objects.count(), 0)

    def test_rejects_modified_plan_after_application(self):
        self.run_plan(apply=True)
        self.plan['items'][0]['unit_cost'] = '250.00'
        with self.assertRaises(CommandError):
            self.run_plan(apply=True)
        self.assertEqual(InventoryMovement.objects.count(), 2)
