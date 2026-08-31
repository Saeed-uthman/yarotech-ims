from decimal import Decimal
from datetime import date, timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accountability.models import AccountabilityTransaction
from apps.accounts.models import User
from apps.inventory.models import InventoryBatch, InventoryMovement
from apps.products.models import Category, Company, Product, ProductVariant

from .models import PurchaseReturn, StockPurchase, SupplierPayment


class PurchaseApiTests(APITestCase):
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

    def _purchase_payload(self, **overrides):
        data = {
            'items': [
                {
                    'product_variant_id': self.variant.id,
                    'quantity': 50,
                    'unit_purchase_price': '1500.00',
                }
            ],
            'payment_method': 'CASH',
            'purchase_date': None,
            'note': 'Restocking order',
        }
        data.update(overrides)
        return data

    def test_successful_purchase_increments_stock(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 100)

        movement = InventoryMovement.objects.filter(
            reference_type=InventoryMovement.ReferenceType.STOCK_PURCHASE
        ).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.movement_type, InventoryMovement.MovementType.STOCK_IN)
        self.assertEqual(movement.quantity, 50)
        self.assertEqual(movement.previous_stock, 50)
        self.assertEqual(movement.new_stock, 100)
        batch = InventoryBatch.objects.get(purchase_item__purchase=StockPurchase.objects.get())
        self.assertEqual(batch.remaining_quantity, 50)
        self.assertTrue(batch.batch_number)

    def test_purchase_records_supplier_batch_and_expiry(self):
        self.client.force_authenticate(self.admin)
        expiry = date.today() + timedelta(days=365)
        payload = self._purchase_payload(supplier_name='Trusted Medical Supplies')
        payload['items'][0]['batch_number'] = 'AMOX-2027-A'
        payload['items'][0]['expiry_date'] = expiry.isoformat()

        response = self.client.post(reverse('purchases-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        batch = InventoryBatch.objects.get(batch_number='AMOX-2027-A')
        self.assertEqual(batch.supplier_name, 'Trusted Medical Supplies')
        self.assertEqual(batch.expiry_date, expiry)
        self.assertEqual(response.data['data']['supplier_name'], 'Trusted Medical Supplies')

    def test_purchase_idempotency_key_prevents_duplicate_restock(self):
        self.client.force_authenticate(self.admin)
        headers = {'HTTP_IDEMPOTENCY_KEY': 'purchase-create-test-key'}

        first = self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json', **headers)
        second = self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json', **headers)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data['data']['id'], second.data['data']['id'])
        self.assertEqual(StockPurchase.objects.count(), 1)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 100)

    def test_accountability_transaction_created(self):
        self.client.force_authenticate(self.admin)
        self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')

        tx = AccountabilityTransaction.objects.filter(
            type=AccountabilityTransaction.TxType.STOCK_PURCHASE
        ).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.direction, AccountabilityTransaction.Direction.OUT)
        self.assertEqual(tx.amount, Decimal('75000.00'))
        self.assertEqual(tx.reference_type, 'StockPurchase')

    def test_partial_purchase_posts_only_amount_paid(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('purchases-list'),
            self._purchase_payload(amount_paid='25000.00'),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        purchase = StockPurchase.objects.get()
        self.assertEqual(purchase.amount_paid, Decimal('25000.00'))
        self.assertEqual(purchase.outstanding_amount, Decimal('50000.00'))
        self.assertEqual(purchase.payment_status, StockPurchase.PaymentStatus.PARTIAL)
        self.assertEqual(
            AccountabilityTransaction.objects.get(type=AccountabilityTransaction.TxType.STOCK_PURCHASE).amount,
            Decimal('25000.00'),
        )

    def test_unpaid_purchase_creates_no_cash_outflow(self):
        self.client.force_authenticate(self.admin)
        payload = self._purchase_payload(amount_paid='0.00')
        payload['payment_method'] = None
        response = self.client.post(reverse('purchases-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        purchase = StockPurchase.objects.get()
        self.assertEqual(purchase.payment_status, StockPurchase.PaymentStatus.UNPAID)
        self.assertEqual(purchase.outstanding_amount, purchase.total_amount)
        self.assertFalse(AccountabilityTransaction.objects.filter(type=AccountabilityTransaction.TxType.STOCK_PURCHASE).exists())

    def test_purchase_rejects_amount_paid_above_total(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('purchases-list'),
            self._purchase_payload(amount_paid='75000.01'),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(StockPurchase.objects.exists())

    def test_admin_can_pay_outstanding_supplier_balance(self):
        self.client.force_authenticate(self.admin)
        purchase_response = self.client.post(
            reverse('purchases-list'), self._purchase_payload(amount_paid='25000.00'), format='json'
        )
        purchase_id = purchase_response.data['data']['id']

        response = self.client.post(reverse('purchases-payments', args=[purchase_id]), {
            'amount': '10000.00',
            'payment_method': 'TRANSFER',
            'note': 'Second instalment',
        }, format='json', HTTP_IDEMPOTENCY_KEY='supplier-payment-test')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        purchase = StockPurchase.objects.get(pk=purchase_id)
        self.assertEqual(purchase.amount_paid, Decimal('35000.00'))
        self.assertEqual(purchase.outstanding_amount, Decimal('40000.00'))
        self.assertEqual(purchase.payment_status, StockPurchase.PaymentStatus.PARTIAL)
        payment = SupplierPayment.objects.get()
        self.assertEqual(payment.balance_before, Decimal('50000.00'))
        self.assertEqual(payment.balance_after, Decimal('40000.00'))
        tx = AccountabilityTransaction.objects.get(type=AccountabilityTransaction.TxType.SUPPLIER_PAYMENT)
        self.assertEqual(tx.amount, Decimal('10000.00'))
        dashboard = self.client.get(reverse('dashboard'))
        self.assertEqual(
            Decimal(dashboard.data['data']['summary']['stock_purchase_spend']),
            Decimal('35000.00'),
        )
        cashbook = self.client.get(reverse('accountability-summary'))
        self.assertEqual(
            Decimal(cashbook.data['data']['purchases_expense']),
            Decimal('35000.00'),
        )

    def test_supplier_payment_is_idempotent_and_cannot_overpay(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            reverse('purchases-list'), self._purchase_payload(amount_paid='0.00', payment_method=None), format='json'
        )
        purchase_id = created.data['data']['id']
        payload = {'amount': '75000.00', 'payment_method': 'CASH'}
        headers = {'HTTP_IDEMPOTENCY_KEY': 'supplier-final-payment'}

        first = self.client.post(reverse('purchases-payments', args=[purchase_id]), payload, format='json', **headers)
        second = self.client.post(reverse('purchases-payments', args=[purchase_id]), payload, format='json', **headers)
        overpay = self.client.post(
            reverse('purchases-payments', args=[purchase_id]),
            {'amount': '1.00', 'payment_method': 'CASH'},
            format='json',
            HTTP_IDEMPOTENCY_KEY='supplier-overpay',
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(overpay.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SupplierPayment.objects.count(), 1)
        purchase = StockPurchase.objects.get(pk=purchase_id)
        self.assertEqual(purchase.payment_status, StockPurchase.PaymentStatus.PAID)
        self.assertEqual(purchase.outstanding_amount, Decimal('0.00'))

    def test_cancel_purchase_reverses_stock(self):
        self.client.force_authenticate(self.admin)
        self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')

        purchase = StockPurchase.objects.first()
        response = self.client.post(
            reverse('purchases-cancel', args=[purchase.id]),
            {'reason': 'Supplier error'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, StockPurchase.Status.CANCELLED)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 50)

    def test_cashier_cannot_create_purchase(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_cannot_view_purchases(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('purchases-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_purchase_kpis(self):
        self.client.force_authenticate(self.admin)
        self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')

        response = self.client.get(reverse('purchases-summary-kpis'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['total_purchases'], 1)
        self.assertEqual(Decimal(data['total_spend']), Decimal('75000.00'))

    def test_purchase_detail(self):
        self.client.force_authenticate(self.admin)
        self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')

        purchase = StockPurchase.objects.first()
        response = self.client.get(reverse('purchases-detail', args=[purchase.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['purchase_number'], purchase.purchase_number)
        self.assertEqual(len(response.data['data']['items']), 1)
        self.assertEqual(
            Decimal(response.data['data']['items'][0]['unit_purchase_price']),
            Decimal('1500.00'),
        )
        self.assertEqual(
            Decimal(response.data['data']['items'][0]['subtotal']),
            Decimal('75000.00'),
        )

        list_response = self.client.get(reverse('purchases-list'))
        listed_item = list_response.data['data'][0]['items_summary'][0]
        self.assertEqual(Decimal(listed_item['unit_purchase_price']), Decimal('1500.00'))
        self.assertEqual(Decimal(listed_item['subtotal']), Decimal('75000.00'))

    def test_admin_can_return_unsold_purchase_stock(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')
        purchase = StockPurchase.objects.get(pk=created.data['data']['id'])
        purchase_item = purchase.items.get()
        batch = purchase_item.inventory_batch

        response = self.client.post(
            reverse('purchases-return', args=[purchase.id]),
            {'items': [{'purchase_item_id': purchase_item.id, 'quantity': 10}], 'refund_method': 'TRANSFER', 'reason': 'Supplier recall'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.variant.refresh_from_db()
        batch.refresh_from_db()
        return_record = PurchaseReturn.objects.get()
        self.assertEqual(return_record.total_amount, Decimal('15000.00'))
        self.assertEqual(self.variant.current_stock, 90)
        self.assertEqual(batch.remaining_quantity, 40)
        self.assertTrue(AccountabilityTransaction.objects.filter(
            type=AccountabilityTransaction.TxType.PURCHASE_RETURN,
            direction=AccountabilityTransaction.Direction.IN,
            amount=Decimal('15000.00'),
        ).exists())

    def test_unpaid_purchase_return_reduces_payable_without_cash_inflow(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            reverse('purchases-list'), self._purchase_payload(amount_paid='0.00', payment_method=None), format='json'
        )
        purchase = StockPurchase.objects.get(pk=created.data['data']['id'])
        item = purchase.items.get()

        response = self.client.post(reverse('purchases-return', args=[purchase.id]), {
            'items': [{'purchase_item_id': item.id, 'quantity': 10}],
            'reason': 'Supplier credit note',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        purchase.refresh_from_db()
        returned = PurchaseReturn.objects.get()
        self.assertEqual(returned.cash_refund_amount, Decimal('0.00'))
        self.assertEqual(returned.payable_credit_amount, Decimal('15000.00'))
        self.assertEqual(purchase.outstanding_amount, Decimal('60000.00'))
        self.assertEqual(purchase.credited_amount, Decimal('15000.00'))
        self.assertFalse(AccountabilityTransaction.objects.filter(type=AccountabilityTransaction.TxType.PURCHASE_RETURN).exists())

    def test_partial_purchase_return_splits_payable_credit_and_cash_refund(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            reverse('purchases-list'), self._purchase_payload(amount_paid='25000.00'), format='json'
        )
        purchase = StockPurchase.objects.get(pk=created.data['data']['id'])
        item = purchase.items.get()

        response = self.client.post(reverse('purchases-return', args=[purchase.id]), {
            'items': [{'purchase_item_id': item.id, 'quantity': 40}],
            'refund_method': 'TRANSFER',
            'reason': 'Large supplier return',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        purchase.refresh_from_db()
        returned = PurchaseReturn.objects.get()
        self.assertEqual(returned.payable_credit_amount, Decimal('50000.00'))
        self.assertEqual(returned.cash_refund_amount, Decimal('10000.00'))
        self.assertEqual(purchase.outstanding_amount, Decimal('0.00'))
        self.assertEqual(purchase.amount_paid, Decimal('15000.00'))
        self.assertEqual(purchase.credited_amount, Decimal('60000.00'))
        self.assertTrue(AccountabilityTransaction.objects.filter(
            type=AccountabilityTransaction.TxType.PURCHASE_RETURN,
            amount=Decimal('10000.00'),
        ).exists())

    def test_purchase_return_cannot_remove_stock_already_used(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')
        purchase = StockPurchase.objects.get(pk=created.data['data']['id'])
        purchase_item = purchase.items.get()
        batch = purchase_item.inventory_batch
        batch.remaining_quantity = 5
        batch.save(update_fields=['remaining_quantity', 'updated_at'])

        response = self.client.post(
            reverse('purchases-return', args=[purchase.id]),
            {'items': [{'purchase_item_id': purchase_item.id, 'quantity': 6}], 'refund_method': 'CASH', 'reason': 'Return'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PurchaseReturn.objects.count(), 0)

    def test_purchase_with_return_cannot_be_cancelled(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(reverse('purchases-list'), self._purchase_payload(), format='json')
        purchase = StockPurchase.objects.get(pk=created.data['data']['id'])
        purchase_item = purchase.items.get()
        self.client.post(
            reverse('purchases-return', args=[purchase.id]),
            {'items': [{'purchase_item_id': purchase_item.id, 'quantity': 1}], 'refund_method': 'CASH', 'reason': 'Return'},
            format='json',
        )
        response = self.client.post(reverse('purchases-cancel', args=[purchase.id]), {'reason': 'Cancel'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
