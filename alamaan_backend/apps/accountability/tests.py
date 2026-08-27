from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User

from .models import AccountabilityTransaction, ManualExpense


class AccountabilityApiTests(APITestCase):
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
        AccountabilityTransaction.objects.create(
            transaction_number='ACC-202608-000001',
            direction='IN',
            type='SALE',
            category='Sales Revenue',
            amount=Decimal('5000.00'),
            payment_method='CASH',
            reference_type='Sale',
            reference_id='1',
            description='Test sale',
            created_by=self.admin,
            updated_by=self.admin,
        )

    def test_cashier_cannot_view_cashbook(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('accountability-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_cannot_view_summary(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('accountability-summary'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_cannot_create_expense(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.post(
            reverse('accountability-expenses-create'),
            {
                'category': 'Transport',
                'amount': '500.00',
                'payment_method': 'CASH',
                'description': 'Fuel',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_cashbook(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('accountability-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)

    def test_admin_can_view_summary(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('accountability-summary'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(Decimal(data['total_inflow']), Decimal('5000.00'))
        self.assertEqual(Decimal(data['total_outflow']), Decimal('0.00'))
        self.assertEqual(Decimal(data['net_movement']), Decimal('5000.00'))
        self.assertEqual(data['total_transactions_count'], 1)
        self.assertEqual(Decimal(data['sales_income']), Decimal('5000.00'))

    def test_admin_can_view_transaction_detail(self):
        self.client.force_authenticate(self.admin)
        transaction = AccountabilityTransaction.objects.first()
        response = self.client.get(reverse('accountability-detail', args=[transaction.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['transaction_number'], transaction.transaction_number)

    def test_admin_can_create_expense(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('accountability-expenses-create'),
            {
                'category': 'Transport',
                'amount': '500.00',
                'payment_method': 'CASH',
                'description': 'Fuel for delivery',
                'note': 'Monthly fuel',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['expense']['category'], 'Transport')
        self.assertEqual(response.data['data']['transaction']['direction'], 'OUT')

        expense = ManualExpense.objects.first()
        self.assertIsNotNone(expense)
        self.assertEqual(expense.amount, Decimal('500.00'))

        tx = AccountabilityTransaction.objects.filter(
            reference_type='ManualExpense'
        ).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.direction, AccountabilityTransaction.Direction.OUT)
        self.assertEqual(tx.amount, Decimal('500.00'))
        self.assertEqual(tx.category, 'Transport')

        detail_response = self.client.get(reverse('accountability-detail', args=[tx.id]))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            detail_response.data['data']['reference_number'],
            expense.expense_number,
        )
        self.assertEqual(
            detail_response.data['data']['source_details']['note'],
            'Monthly fuel',
        )

    def test_expense_validation_negative_amount(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('accountability-expenses-create'),
            {
                'category': 'Transport',
                'amount': '-100.00',
                'payment_method': 'CASH',
                'description': 'Invalid',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expense_create_is_idempotent(self):
        self.client.force_authenticate(self.admin)
        payload = {
            'category': 'Transport',
            'amount': '500.00',
            'payment_method': 'CASH',
            'description': 'Fuel for delivery',
        }
        headers = {'HTTP_IDEMPOTENCY_KEY': 'expense-request-1'}

        first = self.client.post(
            reverse('accountability-expenses-create'),
            payload,
            format='json',
            **headers,
        )
        replay = self.client.post(
            reverse('accountability-expenses-create'),
            payload,
            format='json',
            **headers,
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(replay.status_code, status.HTTP_201_CREATED)
        self.assertEqual(replay['Idempotency-Replayed'], 'true')
        self.assertEqual(ManualExpense.objects.count(), 1)
        self.assertEqual(AccountabilityTransaction.objects.filter(type='OTHER_EXPENSE').count(), 1)
