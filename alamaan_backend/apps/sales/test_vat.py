from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.db.models import Sum
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.customers.models import Customer
from apps.customers.services import record_customer_debt_payment, reverse_customer_debt_payment
from apps.products.models import Product, ProductVariant
from apps.settings_app.models import SystemSettings
from .models import Sale, VatMovement
from .services import cancel_sale, process_sale_return
from . import tests as sale_fixtures
from .vat import price_lines


class VatTests(APITestCase):
    _sale_payload = sale_fixtures.SalesApiTests._sale_payload

    def setUp(self):
        sale_fixtures.SalesApiTests.setUp(self)
        settings = SystemSettings.load()
        settings.vat_enabled = True
        settings.vat_rate = Decimal('7.50')
        settings.save()
        self.product.vat_enabled = True
        self.product.save()
        self.client.force_authenticate(self.cashier)

    def sale(self, **overrides):
        response = self.client.post(reverse('sales-list'), self._sale_payload(
            **{'customer_id': self.customer.pk, 'amount_paid': '3870.00', **overrides}
        ), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return Sale.objects.get(pk=response.data['data']['id'])

    def totals(self, sale):
        return sale.vat_movements.aggregate(billed=Sum('vat_billed'), collected=Sum('vat_collected'))

    def test_vat_snapshot_receipt_and_complete_customer_history(self):
        sale = self.sale(amount_paid='1000.00')
        self.assertEqual(sale.vat_amount, Decimal('270.00'))
        self.assertEqual(sale.total_amount, Decimal('3870.00'))
        self.assertEqual(sale.outstanding_amount, Decimal('2870.00'))
        self.assertEqual(sale.items.get().profit, Decimal('600.00'))
        SystemSettings.objects.update(vat_rate=20, vat_enabled=False)
        self.product.vat_enabled = False
        self.product.save()
        receipt = self.client.get(reverse('sales-receipt', args=[sale.pk])).data['data']
        self.assertEqual(Decimal(receipt['vat_amount']), Decimal('270'))
        self.assertEqual(Decimal(receipt['items'][0]['vat_rate']), Decimal('7.5'))
        history = self.client.get(reverse('customers-sales-history', args=[self.customer.pk])).data['data'][0]
        self.assertEqual(history['customer'], self.customer.pk)
        self.assertEqual(Decimal(history['amount_paid']), Decimal('1000'))
        self.assertEqual(Decimal(history['outstanding_amount']), Decimal('2870'))
        self.assertEqual(history['items'][0]['product_name'], self.product.name)
        self.assertEqual(history['items'][0]['quantity'], 2)
        self.assertNotIn('profit', history['items'][0])
        other = Customer.objects.create(name='Other')
        self.assertEqual(self.client.get(reverse('customers-sales-history', args=[other.pk])).data['data'], [])

    def test_global_and_product_disable_preserve_old_totals(self):
        self.product.vat_enabled = False
        self.product.save()
        sale = self.sale(amount_paid='3600.00')
        self.assertEqual(sale.vat_amount, 0)
        self.assertFalse(sale.vat_movements.exists())
        self.product.vat_enabled = True
        self.product.save()
        SystemSettings.objects.update(vat_enabled=False)
        self.assertEqual(self.sale(amount_paid='3600.00').vat_amount, 0)

    def test_mixed_products_discount_and_nontaxable_return(self):
        product = Product.objects.create(name='Non VAT', category=self.category)
        variant = ProductVariant.objects.create(product=product, company=self.company, base_price=500,
            min_selling_price=1000, default_selling_price=1000, max_selling_price=1100, current_stock=5)
        sale = self.sale(items=[
            {'product_variant_id': self.variant.pk, 'quantity': 1, 'actual_selling_price': '1800'},
            {'product_variant_id': variant.pk, 'quantity': 1, 'actual_selling_price': '1000'},
        ], discount='280.00', amount_paid='2641.50')
        self.assertEqual(sale.vat_amount, Decimal('121.50'))
        self.assertEqual(sale.items.get(variant=self.variant).line_discount, 180)
        self.assertEqual(sale.items.get(variant=variant).vat_amount, 0)
        returned = process_sale_return(sale=sale, items=[{'sale_item_id': sale.items.get(variant=variant).pk, 'quantity': 1}],
            refund_method='CASH', reason='Return non-VAT item', processed_by=self.admin)
        self.assertEqual(returned.total_amount, Decimal('900'))
        self.assertEqual(returned.vat_amount, 0)
        self.assertEqual(self.totals(sale)['collected'], Decimal('121.50'))

    def test_debt_recovery_reversal_and_event_date_reporting(self):
        sale = self.sale(amount_paid='0', payment_method='CREDIT')
        yesterday = timezone.now() - timedelta(days=1)
        sale.vat_movements.update(created_at=yesterday)
        payment = record_customer_debt_payment(user=self.cashier, customer=self.customer,
            amount=Decimal('1935'), payment_method='CASH')
        self.assertEqual(self.totals(sale)['collected'], Decimal('135'))
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-vat'), {'date_range': 'today'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data['data']['vat_billed']), 0)
        self.assertEqual(Decimal(response.data['data']['vat_collected']), 135)
        self.assertEqual(Decimal(response.data['data']['vat_awaiting_payment']), 135)
        reverse_customer_debt_payment(payment=payment, reversed_by=self.admin, reason='Wrong receipt')
        self.assertEqual(self.totals(sale)['collected'], 0)
        sale.refresh_from_db()
        self.assertEqual(sale.outstanding_amount, 3870)

    def test_returns_and_cancellation_reverse_vat_without_changing_saved_rate(self):
        sale = self.sale()
        SystemSettings.objects.update(vat_rate=20)
        item = sale.items.get()
        for _ in range(2):
            returned = process_sale_return(sale=sale, items=[{'sale_item_id': item.pk, 'quantity': 1}],
                refund_method='CASH', reason='Returned', processed_by=self.admin)
            self.assertEqual(returned.vat_amount, 135)
            self.assertEqual(returned.refund_amount, 1935)
        self.assertEqual(self.totals(sale), {'billed': 0, 'collected': 0})
        SystemSettings.objects.update(vat_rate=Decimal('7.50'))
        second = self.sale()
        cancel_sale(sale=second, cancelled_by=self.admin, reason='Cancelled')
        self.assertEqual(self.totals(second), {'billed': 0, 'collected': 0})

    def test_stale_total_and_failed_vat_ledger_roll_back_sale(self):
        response = self.client.post(reverse('sales-list'), self._sale_payload(expected_total='3600'), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Sale.objects.exists())
        with patch('apps.sales.services.record_vat_position', side_effect=RuntimeError('ledger unavailable')):
            with self.assertRaises(RuntimeError):
                self.sale()
        self.assertFalse(Sale.objects.exists())
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 50)
        self.assertFalse(VatMovement.objects.exists())

    def test_admin_controls_rate_and_product_vat_and_reports_are_private(self):
        settings_url = reverse('system-settings')
        self.assertEqual(self.client.patch(settings_url, {'vat_rate': 10}, format='json').status_code, 403)
        self.assertEqual(self.client.get(reverse('reports-vat')).status_code, 403)
        self.client.force_authenticate(self.admin)
        for rate in (-1, 101):
            self.assertEqual(self.client.patch(settings_url, {'vat_rate': rate}, format='json').status_code, 400)
        response = self.client.patch(settings_url, {'vat_enabled': True, 'vat_rate': '8.25'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data['data']['vat_rate']), Decimal('8.25'))
        response = self.client.patch(f'/api/v1/products/{self.product.pk}/', {'vat_enabled': False}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['data']['vat_enabled'])

    def test_discount_rounding_allocates_every_kobo(self):
        result = price_lines([{'subtotal': Decimal('0.05'), 'vat_enabled': True}] * 3, Decimal('0.01'), Decimal('10'))
        self.assertEqual(sum(line['line_discount'] for line in result), Decimal('0.01'))
        self.assertEqual(sum(line['vat_amount'] for line in result), Decimal('0.02'))
