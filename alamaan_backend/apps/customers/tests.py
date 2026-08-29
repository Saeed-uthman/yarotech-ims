from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accountability.models import AccountabilityTransaction
from apps.inventory.models import InventoryMovement
from apps.products.models import Category, Company, Product, ProductVariant
from apps.sales.models import Sale, SaleItem

from .models import Customer, CustomerDebtPayment


class CustomerApiTests(APITestCase):
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

    def _customer_payload(self, **overrides):
        data = {
            'name': 'John Doe',
            'phone': '08012345678',
            'email': 'john@example.com',
            'address': '123 Main St',
            'notes': 'Regular customer',
        }
        data.update(overrides)
        return data

    def test_register_customer(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('customers-list'), self._customer_payload())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        customer = Customer.objects.get(phone='08012345678')
        self.assertEqual(customer.name, 'John Doe')
        self.assertEqual(customer.status, Customer.Status.ACTIVE)
        self.assertEqual(customer.created_by, self.cashier)

    def test_duplicate_phone_rejected(self):
        Customer.objects.create(
            name='Existing',
            phone='08012345678',
            created_by=self.admin,
            updated_by=self.admin,
        )
        self.client.force_authenticate(self.cashier)

        response = self.client.post(reverse('customers-list'), self._customer_payload())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_can_register_customer(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('customers-list'), self._customer_payload())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cashier_cannot_edit_customer(self):
        customer = Customer.objects.create(
            name='John Doe',
            phone='08012345678',
            created_by=self.admin,
            updated_by=self.admin,
        )
        self.client.force_authenticate(self.cashier)

        response = self.client.patch(
            reverse('customers-detail', args=[customer.id]),
            {'name': 'Jane Doe'},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_edit_customer(self):
        customer = Customer.objects.create(
            name='John Doe',
            phone='08012345678',
            created_by=self.admin,
            updated_by=self.admin,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse('customers-detail', args=[customer.id]),
            {'name': 'Jane Doe'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customer.refresh_from_db()
        self.assertEqual(customer.name, 'Jane Doe')
        self.assertEqual(customer.updated_by, self.admin)

    def test_admin_can_toggle_status(self):
        customer = Customer.objects.create(
            name='John Doe',
            phone='08012345678',
            status=Customer.Status.ACTIVE,
            created_by=self.admin,
            updated_by=self.admin,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('customers-toggle-status', args=[customer.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customer.refresh_from_db()
        self.assertEqual(customer.status, Customer.Status.INACTIVE)

    def test_customer_list_search(self):
        Customer.objects.create(name='Alice Smith', phone='08011111111', created_by=self.admin, updated_by=self.admin)
        Customer.objects.create(name='Bob Jones', phone='08022222222', created_by=self.admin, updated_by=self.admin)
        self.client.force_authenticate(self.cashier)

        response = self.client.get(reverse('customers-list'), {'search': 'Alice'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['name'], 'Alice Smith')

    def test_customer_kpis(self):
        Customer.objects.create(name='A', phone='08011111111', status=Customer.Status.ACTIVE, created_by=self.admin, updated_by=self.admin)
        Customer.objects.create(name='B', phone='08022222222', status=Customer.Status.ACTIVE, created_by=self.admin, updated_by=self.admin)
        Customer.objects.create(name='C', phone='08033333333', status=Customer.Status.INACTIVE, created_by=self.admin, updated_by=self.admin)
        self.client.force_authenticate(self.cashier)

        response = self.client.get(reverse('customers-summary-kpis'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['total_customers'], 3)
        self.assertEqual(data['active_customers'], 2)
        self.assertEqual(data['inactive_customers'], 1)


class DebtPaymentApiTests(APITestCase):
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

    def _create_credit_sale(self, amount_paid=Decimal('2000.00')):
        from apps.sales.services import process_pos_sale
        return process_pos_sale(
            user=self.cashier,
            customer_id=self.customer.id,
            items=[{
                'product_variant_id': self.variant.id,
                'quantity': 2,
                'actual_selling_price': Decimal('1800.00'),
            }],
            discount=Decimal('0.00'),
            amount_paid=amount_paid,
            payment_method='CASH',
            notes='',
        )

    def test_fifo_allocation(self):
        sale_a = self._create_credit_sale(amount_paid=Decimal('0.00'))
        sale_b = self._create_credit_sale(amount_paid=Decimal('0.00'))

        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('debt-payment-create'), {
            'customer_id': self.customer.id,
            'amount': '5000.00',
            'payment_method': 'CASH',
            'reference_notes': 'Partial payment',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        sale_a.refresh_from_db()
        sale_b.refresh_from_db()

        self.assertEqual(sale_a.payment_status, Sale.PaymentStatus.PAID)
        self.assertEqual(sale_a.outstanding_amount, Decimal('0.00'))
        self.assertEqual(sale_b.payment_status, Sale.PaymentStatus.PARTIAL)
        self.assertEqual(sale_b.outstanding_amount, Decimal('2200.00'))

    def test_payment_exceeding_debt_fails(self):
        self._create_credit_sale(amount_paid=Decimal('0.00'))

        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('debt-payment-create'), {
            'customer_id': self.customer.id,
            'amount': '5000.00',
            'payment_method': 'CASH',
            'reference_notes': '',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accountability_transaction_created(self):
        self._create_credit_sale(amount_paid=Decimal('0.00'))

        from apps.accountability.models import AccountabilityTransaction
        tx_count_before = AccountabilityTransaction.objects.count()

        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('debt-payment-create'), {
            'customer_id': self.customer.id,
            'amount': '1000.00',
            'payment_method': 'CASH',
            'reference_notes': '',
        }, format='json')

        self.assertEqual(AccountabilityTransaction.objects.count(), tx_count_before + 1)
        tx = AccountabilityTransaction.objects.latest('created_at')
        self.assertEqual(tx.direction, AccountabilityTransaction.Direction.IN)
        self.assertEqual(tx.type, AccountabilityTransaction.TxType.DEBT_PAYMENT)
        self.assertEqual(tx.amount, Decimal('1000.00'))

    def test_debt_payment_idempotency_key_prevents_duplicate_allocation(self):
        sale = self._create_credit_sale(amount_paid=Decimal('0.00'))
        self.client.force_authenticate(self.cashier)
        payload = {
            'customer_id': self.customer.id,
            'amount': '1000.00',
            'payment_method': 'CASH',
            'reference_notes': '',
        }
        headers = {'HTTP_IDEMPOTENCY_KEY': 'debt-payment-test-key'}

        first = self.client.post(reverse('debt-payment-create'), payload, format='json', **headers)
        second = self.client.post(reverse('debt-payment-create'), payload, format='json', **headers)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data['data']['id'], second.data['data']['id'])
        self.assertEqual(CustomerDebtPayment.objects.count(), 1)
        sale.refresh_from_db()
        self.assertEqual(sale.outstanding_amount, Decimal('2600.00'))

    def test_debt_payment_receipt_endpoint(self):
        self._create_credit_sale(amount_paid=Decimal('0.00'))
        self.client.force_authenticate(self.cashier)
        payment_response = self.client.post(reverse('debt-payment-create'), {
            'customer_id': self.customer.id,
            'amount': '1000.00',
            'payment_method': 'CASH',
            'reference_notes': '',
        }, format='json')
        payment_id = payment_response.data['data']['id']

        response = self.client.get(reverse('debt-payment-receipt', args=[payment_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['amount'], '1000.00')

    def test_admin_can_reverse_debt_payment_with_allocation_and_cash_out(self):
        sale = self._create_credit_sale(amount_paid=Decimal('0.00'))
        self.client.force_authenticate(self.cashier)
        payment_response = self.client.post(reverse('debt-payment-create'), {
            'customer_id': self.customer.id,
            'amount': '1000.00',
            'payment_method': 'CASH',
            'reference_notes': 'Entered in error',
        }, format='json')
        payment_id = payment_response.data['data']['id']

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('debt-payment-reverse', args=[payment_id]),
            {'reason': 'Cashier selected the wrong customer'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sale.refresh_from_db()
        payment = CustomerDebtPayment.objects.get(pk=payment_id)
        self.assertTrue(payment.is_reversed)
        self.assertEqual(sale.amount_paid, Decimal('0.00'))
        self.assertEqual(sale.outstanding_amount, Decimal('3600.00'))
        reversal_tx = AccountabilityTransaction.objects.get(
            type=AccountabilityTransaction.TxType.DEBT_PAYMENT_REVERSAL,
        )
        self.assertEqual(reversal_tx.direction, AccountabilityTransaction.Direction.OUT)
        self.assertEqual(reversal_tx.amount, Decimal('1000.00'))

    def test_cashier_cannot_view_another_cashiers_debt_payment_receipt(self):
        self._create_credit_sale(amount_paid=Decimal('0.00'))
        other_cashier = User.objects.create_user(
            email='other-cashier@example.com',
            password='StrongPass123!',
            full_name='Other Cashier',
            phone='08000000009',
            status=User.Status.ACTIVE,
            is_active=True,
        )
        self.client.force_authenticate(other_cashier)
        payment_response = self.client.post(reverse('debt-payment-create'), {
            'customer_id': self.customer.id,
            'amount': '500.00',
            'payment_method': 'CASH',
            'reference_notes': '',
        }, format='json')
        payment_id = payment_response.data['data']['id']

        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('debt-payment-receipt', args=[payment_id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('debt-payment-receipt', args=[payment_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_customer_sales_history_endpoint(self):
        self._create_credit_sale(amount_paid=Decimal('2000.00'))

        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('customers-sales-history', args=[self.customer.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)

    def test_customer_payments_history_endpoint(self):
        self._create_credit_sale(amount_paid=Decimal('0.00'))
        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('debt-payment-create'), {
            'customer_id': self.customer.id,
            'amount': '500.00',
            'payment_method': 'CASH',
            'reference_notes': '',
        }, format='json')

        response = self.client.get(reverse('customers-payments-history', args=[self.customer.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)

    def test_customer_detail_shows_debt_fields(self):
        self._create_credit_sale(amount_paid=Decimal('0.00'))

        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('customers-detail', args=[self.customer.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertIn('outstanding_debt', data)
        self.assertIn('total_purchases', data)
        self.assertIn('amount_paid', data)
        self.assertEqual(Decimal(data['outstanding_debt']), Decimal('3600.00'))
        self.assertEqual(data['total_purchases'], 1)
