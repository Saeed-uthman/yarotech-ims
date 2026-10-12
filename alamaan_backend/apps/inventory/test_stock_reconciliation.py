from io import StringIO
from unittest.mock import patch

from django.core.management import call_command, CommandError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.sales import tests as sales_fixtures
from apps.products.services import create_product_variant, update_variant_prices
from apps.products.models import ProductVariant, Product, Category, Company
from apps.accounts.models import User
from apps.inventory.models import InventoryBatch, InventoryMovement


class StockReconciliationTests(APITestCase):
    _sale_payload = sales_fixtures.SalesApiTests._sale_payload

    def setUp(self):
        self.admin = User.objects.create_superuser(email='admin@example.com', password='test-pass', phone='08000000000')
        self.cashier = User.objects.create_user(email='cashier@example.com', password='test-pass', phone='08000000001', is_active=True, role='cashier')
        self.company = Company.objects.create(name='HUEWUEI')
        self.product = Product.objects.create(name='S110 8 port', generic_name='Switch',
            category=Category.objects.create(name='Switches'), dosage='N/A', dosage_form=Product.DosageForm.SWITCH)
        self.variant = ProductVariant.objects.create(product=self.product, company=self.company,
            base_price=1500, min_selling_price=1700, default_selling_price=1800,
            max_selling_price=2000, current_stock=50)

    def prepare_gap(self):
        self.variant.current_stock = 5
        self.variant.save()
        InventoryBatch.objects.create(
            variant=self.variant, batch_number='old', received_quantity=10,
            remaining_quantity=0, unit_cost=1500, status='EXHAUSTED', received_at=timezone.now(),
        )

    def repair(self, **kwargs):
        options = dict(variant_id=self.variant.pk, expected_stock=5,
                       actor_email=self.admin.email, unit_cost='1500.00',
                       reason='Physically verified five units', stdout=StringIO())
        options.update(kwargs)
        call_command('reconcile_stock_batches', **options)

    def test_preview_repair_repeat_and_sale(self):
        self.prepare_gap()
        self.repair()
        self.assertEqual(InventoryBatch.objects.count(), 1)
        self.repair(apply=True)
        self.repair(apply=True)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 5)
        self.assertEqual(InventoryBatch.objects.count(), 2)
        movement = InventoryMovement.objects.get()
        self.assertEqual((movement.quantity, movement.previous_stock, movement.new_stock), (0, 5, 5))
        self.client.force_authenticate(self.admin)
        response = self.client.post('/api/v1/sales/', self._sale_payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 3)
        self.assertEqual(sum(InventoryBatch.objects.values_list('remaining_quantity', flat=True)), 3)

    def test_repair_rejects_changed_count_and_nonadmin(self):
        self.prepare_gap()
        for options in ({'expected_stock': 6}, {'actor_email': self.cashier.email}, {'unit_cost': '-1'}):
            with self.assertRaises(CommandError):
                self.repair(apply=True, **options)
        self.assertEqual(InventoryBatch.objects.count(), 1)

    def test_repair_does_not_release_quarantined_units(self):
        self.prepare_gap()
        InventoryBatch.objects.filter(variant=self.variant).update(status='QUARANTINED', remaining_quantity=2)
        with self.assertRaises(CommandError):
            self.repair(apply=True)

    def test_audit_failure_rolls_back_repair(self):
        self.prepare_gap()
        with patch('apps.inventory.management.commands.reconcile_stock_batches.InventoryMovement.objects.create', side_effect=RuntimeError('audit failed')):
            with self.assertRaises(RuntimeError):
                self.repair(apply=True)
        self.assertEqual(InventoryBatch.objects.count(), 1)

    def test_product_edit_cannot_change_stock(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(reverse('products-variant-detail', args=[self.variant.pk]), {'current_stock': 100}, format='json')
        self.assertEqual(response.status_code, 400)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 50)

    def test_stale_price_object_does_not_restore_stock(self):
        ProductVariant.objects.filter(pk=self.variant.pk).update(current_stock=47)
        update_variant_prices(variant=self.variant, updated_by=self.admin, reason='price only', default_selling_price=1900)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 47)
        self.assertEqual(self.variant.default_selling_price, 1900)

    def test_initial_stock_creates_batch_and_movement(self):
        self.variant.delete()
        variant = create_product_variant(product=self.product, created_by=self.admin, company=self.company,
            base_price=1500, min_selling_price=1700, default_selling_price=1800, max_selling_price=2000,
            current_stock=5, reorder_level=1)
        self.assertEqual(variant.inventory_batches.get().remaining_quantity, 5)
        self.assertEqual(variant.inventory_movements.get().quantity, 5)
