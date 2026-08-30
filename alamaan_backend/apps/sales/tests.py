from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accountability.models import AccountabilityTransaction
from apps.customers.models import Customer
from apps.inventory.models import InventoryBatch, InventoryMovement, SaleBatchAllocation
from apps.products.models import Category, Company, Product, ProductVariant
from apps.settings_app.models import SystemSettings

from .models import Sale, SaleItem, SaleReturn


class SalesApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='StrongPass123!',
            full_name='Admin User',
            phone='08000000000',
        )
        self.cashier = User.objects.create_user(
            email='cashier@example.com',
            password='StrongPass123!',
            full_name='Cashier User',
            phone='08000000001',
            status=User.Status.ACTIVE,
            is_active=True,
        )
        self.category = Category.objects.create(name='Tablets')
        self.company = Company.objects.create(name='Emzor')
        self.product = Product.objects.create(
            name='Amoxicillin',
            generic_name='Amoxicillin',
            category=self.category,
            dosage='500mg',
            dosage_form=Product.DosageForm.CAPSULE,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            company=self.company,
            base_price=Decimal('1500.00'),
            min_selling_price=Decimal('1700.00'),
            default_selling_price=Decimal('1800.00'),
            max_selling_price=Decimal('2000.00'),
            current_stock=50,
            reorder_level=10,
        )
        self.customer = Customer.objects.create(
            name='John Doe',
            phone='08012345678',
            created_by=self.admin,
            updated_by=self.admin,
        )

    def _sale_payload(self, **overrides):
        data = {
            'customer_id': None,
            'items': [
                {
                    'product_variant_id': self.variant.id,
                    'quantity': 2,
                    'actual_selling_price': '1800.00',
                }
            ],
            'discount': '0.00',
            'amount_paid': '3600.00',
            'payment_method': 'CASH',
            'notes': '',
        }
        data.update(overrides)
        return data

    def test_successful_paid_sale(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 48)

        sale = Sale.objects.first()
        self.assertEqual(sale.payment_status, Sale.PaymentStatus.PAID)
        self.assertEqual(sale.total_amount, Decimal('3600.00'))
        self.assertEqual(sale.amount_paid, Decimal('3600.00'))
        self.assertEqual(sale.outstanding_amount, Decimal('0.00'))
        self.assertEqual(sale.served_by, self.cashier)

        movement = InventoryMovement.objects.first()
        self.assertEqual(movement.movement_type, InventoryMovement.MovementType.STOCK_OUT)
        self.assertEqual(movement.quantity, -2)
        self.assertEqual(movement.previous_stock, 50)
        self.assertEqual(movement.new_stock, 48)

    def test_sales_summary_matches_created_transactions(self):
        self.client.force_authenticate(self.cashier)
        create_response = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        summary_response = self.client.get(reverse('sales-summary-kpis'), {'date_range': 'today'})
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK)
        data = summary_response.data['data']
        self.assertEqual(data['total_transactions'], 1)
        self.assertEqual(data['paid_count'], 1)
        self.assertEqual(data['partial_count'], 0)
        self.assertEqual(data['unpaid_count'], 0)
        self.assertEqual(Decimal(data['total_revenue']), Decimal('3600.00'))
        self.assertEqual(Decimal(data['total_outstanding']), Decimal('0.00'))

    def test_cashier_only_sees_sales_they_recorded(self):
        other_cashier = User.objects.create_user(
            email='other-cashier@example.com',
            password='StrongPass123!',
            full_name='Other Cashier',
            phone='08000000009',
            status=User.Status.ACTIVE,
            is_active=True,
        )
        self.client.force_authenticate(other_cashier)
        create_response = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        sale_id = create_response.data['data']['id']

        self.client.force_authenticate(self.cashier)
        list_response = self.client.get(reverse('sales-list'))
        detail_response = self.client.get(reverse('sales-detail', args=[sale_id]))
        receipt_response = self.client.get(reverse('sales-receipt', args=[sale_id]))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['data']), 0)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(receipt_response.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.get(reverse('sales-detail', args=[sale_id])).status_code,
            status.HTTP_200_OK,
        )

    def test_cashier_sales_kpis_only_include_their_sales(self):
        other_cashier = User.objects.create_user(
            email='other-kpi-cashier@example.com',
            password='StrongPass123!',
            full_name='Other KPI Cashier',
            phone='08000000008',
            status=User.Status.ACTIVE,
            is_active=True,
        )
        self.client.force_authenticate(other_cashier)
        self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('sales-summary-kpis'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['total_transactions'], 0)

    def test_transaction_preflight_allows_idempotency_header(self):
        response = self.client.options(
            reverse('sales-list'),
            HTTP_ORIGIN='http://localhost:3000',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='authorization, content-type, idempotency-key',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        allowed_headers = response['Access-Control-Allow-Headers'].lower()
        self.assertIn('idempotency-key', allowed_headers)

    def test_sale_idempotency_key_replays_without_duplicate_stock_deduction(self):
        self.client.force_authenticate(self.cashier)
        headers = {'HTTP_IDEMPOTENCY_KEY': 'sale-checkout-test-key'}

        first = self.client.post(reverse('sales-list'), self._sale_payload(), format='json', **headers)
        second = self.client.post(reverse('sales-list'), self._sale_payload(), format='json', **headers)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data['data']['id'], second.data['data']['id'])
        self.assertEqual(second['Idempotency-Replayed'], 'true')
        self.assertEqual(Sale.objects.count(), 1)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 48)

    def test_reused_idempotency_key_with_different_payload_returns_conflict(self):
        self.client.force_authenticate(self.cashier)
        headers = {'HTTP_IDEMPOTENCY_KEY': 'sale-conflict-test-key'}

        self.client.post(reverse('sales-list'), self._sale_payload(), format='json', **headers)
        changed_payload = self._sale_payload(amount_paid='1800.00')
        response = self.client.post(reverse('sales-list'), changed_payload, format='json', **headers)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data['error'], 'IDEMPOTENCY_KEY_REUSED')
        self.assertEqual(Sale.objects.count(), 1)

    def test_credit_sale_without_customer_fails(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload(customer_id=None, amount_paid='0.00', payment_method='CREDIT')
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_selling_price_below_minimum_fails(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload()
        payload['items'][0]['actual_selling_price'] = '1650.00'
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_selling_price_above_maximum_fails(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload()
        payload['items'][0]['actual_selling_price'] = '2100.00'
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_insufficient_stock_fails(self):
        self.variant.current_stock = 1
        self.variant.save(update_fields=['current_stock'])

        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload()
        payload['items'][0]['quantity'] = 5
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_historical_price_integrity(self):
        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        sale_item = SaleItem.objects.first()
        self.assertEqual(sale_item.actual_selling_price, Decimal('1800.00'))
        self.assertEqual(sale_item.historical_base_price, Decimal('1500.00'))
        self.assertEqual(sale_item.profit, Decimal('600.00'))

        self.variant.base_price = Decimal('1600.00')
        self.variant.min_selling_price = Decimal('1800.00')
        self.variant.default_selling_price = Decimal('1900.00')
        self.variant.max_selling_price = Decimal('2200.00')
        self.variant.save()

        sale_item.refresh_from_db()
        self.assertEqual(sale_item.actual_selling_price, Decimal('1800.00'))
        self.assertEqual(sale_item.historical_base_price, Decimal('1500.00'))
        self.assertEqual(sale_item.profit, Decimal('600.00'))

    def test_sale_allocates_non_expired_batches_by_earliest_expiry(self):
        self.variant.current_stock = 3
        self.variant.save(update_fields=['current_stock'])
        later_batch = InventoryBatch.objects.create(
            variant=self.variant,
            batch_number='LATER',
            expiry_date=date.today() + timedelta(days=180),
            received_quantity=2,
            remaining_quantity=2,
            unit_cost=Decimal('1400.00'),
            received_at=self.variant.created_at,
            created_by=self.admin,
        )
        earlier_batch = InventoryBatch.objects.create(
            variant=self.variant,
            batch_number='EARLIER',
            expiry_date=date.today() + timedelta(days=30),
            received_quantity=1,
            remaining_quantity=1,
            unit_cost=Decimal('1000.00'),
            received_at=self.variant.created_at,
            created_by=self.admin,
        )
        self.client.force_authenticate(self.cashier)

        response = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        allocations = list(SaleBatchAllocation.objects.order_by('id'))
        self.assertEqual([(row.batch_id, row.quantity) for row in allocations], [
            (earlier_batch.id, 1),
            (later_batch.id, 1),
        ])
        sale_item = SaleItem.objects.get()
        self.assertEqual(sale_item.historical_base_price, Decimal('1200.00'))
        self.assertEqual(sale_item.profit, Decimal('1200.00'))

    def test_admin_can_cancel_sale(self):
        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        sale = Sale.objects.first()
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('sales-cancel', args=[sale.id]),
            {'reason': 'Customer return'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sale.refresh_from_db()
        self.assertEqual(sale.status, Sale.Status.CANCELLED)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 50)

    def test_cashier_cannot_cancel_sale(self):
        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        sale = Sale.objects.first()
        response = self.client.post(
            reverse('sales-cancel', args=[sale.id]),
            {'reason': 'Customer return'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sale_with_allocated_debt_payment_cannot_be_cancelled(self):
        self.client.force_authenticate(self.cashier)
        create_response = self.client.post(
            reverse('sales-list'),
            self._sale_payload(
                customer_id=self.customer.id,
                amount_paid='2000.00',
                payment_method='CASH',
            ),
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        sale = Sale.objects.get()

        payment_response = self.client.post(
            reverse('debt-payment-create'),
            {
                'customer_id': self.customer.id,
                'amount': '500.00',
                'payment_method': 'CASH',
                'reference_notes': 'Part payment',
            },
            format='json',
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.admin)
        cancel_response = self.client.post(
            reverse('sales-cancel', args=[sale.id]),
            {'reason': 'Customer return'},
            format='json',
        )

        self.assertEqual(cancel_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('received a debt payment', cancel_response.data['message'])

        sale.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual(sale.status, Sale.Status.COMPLETED)
        self.assertEqual(sale.amount_paid, Decimal('2500.00'))
        self.assertEqual(sale.outstanding_amount, Decimal('1100.00'))
        self.assertEqual(self.variant.current_stock, 48)
        self.assertEqual(
            AccountabilityTransaction.objects.filter(
                type=AccountabilityTransaction.TxType.DEBT_PAYMENT,
                status=AccountabilityTransaction.Status.COMPLETED,
            ).count(),
            1,
        )

    def test_walk_in_sale_must_be_fully_paid(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload(customer_id=None, amount_paid='3000.00', payment_method='CASH')
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_credit_sale_with_customer_succeeds(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload(
            customer_id=self.customer.id,
            amount_paid='2000.00',
            payment_method='CASH',
        )
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sale = Sale.objects.first()
        self.assertEqual(sale.payment_status, Sale.PaymentStatus.PARTIAL)
        self.assertEqual(sale.outstanding_amount, Decimal('1600.00'))
        self.assertEqual(sale.customer, self.customer)

    def test_walk_in_sales_setting_is_enforced(self):
        settings = SystemSettings.load()
        settings.allow_walking_sales = False
        settings.save(update_fields=['allow_walking_sales'])
        self.client.force_authenticate(self.cashier)

        response = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Sale.objects.count(), 0)

    def test_credit_sales_setting_is_enforced(self):
        settings = SystemSettings.load()
        settings.allow_credit_sales = False
        settings.save(update_fields=['allow_credit_sales'])
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload(
            customer_id=self.customer.id,
            amount_paid='2000.00',
            payment_method='CASH',
        )

        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Sale.objects.count(), 0)

    def test_admin_can_return_paid_sale_item_and_restore_its_batch(self):
        self.client.force_authenticate(self.cashier)
        created = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')
        sale = Sale.objects.get(pk=created.data['data']['id'])
        sale_item = sale.items.get()
        batch = sale_item.batch_allocations.get().batch

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('sales-return', args=[sale.id]),
            {'items': [{'sale_item_id': sale_item.id, 'quantity': 1}], 'refund_method': 'CASH', 'reason': 'Damaged pack'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sale.refresh_from_db()
        self.variant.refresh_from_db()
        batch.refresh_from_db()
        return_record = SaleReturn.objects.get()
        self.assertEqual(return_record.refund_amount, Decimal('1800.00'))
        self.assertEqual(return_record.debt_reduction, Decimal('0.00'))
        self.assertEqual(sale.amount_paid, Decimal('1800.00'))
        self.assertEqual(self.variant.current_stock, 49)
        self.assertEqual(batch.remaining_quantity, 49)
        self.assertTrue(AccountabilityTransaction.objects.filter(
            type=AccountabilityTransaction.TxType.SALE_REFUND,
            direction=AccountabilityTransaction.Direction.OUT,
            amount=Decimal('1800.00'),
        ).exists())

    def test_credit_return_reduces_debt_before_refunding_cash(self):
        self.client.force_authenticate(self.cashier)
        created = self.client.post(
            reverse('sales-list'),
            self._sale_payload(customer_id=self.customer.id, amount_paid='2000.00'),
            format='json',
        )
        sale = Sale.objects.get(pk=created.data['data']['id'])
        sale_item = sale.items.get()

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('sales-return', args=[sale.id]),
            {'items': [{'sale_item_id': sale_item.id, 'quantity': 1}], 'refund_method': 'CASH', 'reason': 'Customer return'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sale.refresh_from_db()
        return_record = SaleReturn.objects.get()
        self.assertEqual(return_record.debt_reduction, Decimal('1600.00'))
        self.assertEqual(return_record.refund_amount, Decimal('200.00'))
        self.assertEqual(sale.outstanding_amount, Decimal('0.00'))
        self.assertEqual(sale.amount_paid, Decimal('1800.00'))

    def test_return_cannot_exceed_unreturned_quantity_or_be_followed_by_cancellation(self):
        self.client.force_authenticate(self.cashier)
        created = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')
        sale = Sale.objects.get(pk=created.data['data']['id'])
        sale_item = sale.items.get()
        self.client.force_authenticate(self.admin)
        payload = {'items': [{'sale_item_id': sale_item.id, 'quantity': 1}], 'refund_method': 'CASH', 'reason': 'Return'}
        self.assertEqual(self.client.post(reverse('sales-return', args=[sale.id]), payload, format='json').status_code, status.HTTP_201_CREATED)
        over_return = self.client.post(
            reverse('sales-return', args=[sale.id]),
            {'items': [{'sale_item_id': sale_item.id, 'quantity': 2}], 'refund_method': 'CASH', 'reason': 'Again'},
            format='json',
        )
        cancel = self.client.post(reverse('sales-cancel', args=[sale.id]), {'reason': 'Cancel'}, format='json')
        self.assertEqual(over_return.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(cancel.status_code, status.HTTP_400_BAD_REQUEST)
