from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class AccountsApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='StrongPass123!',
            full_name='Admin User',
            phone='08000000000',
        )

    def test_staff_registration_creates_pending_inactive_user(self):
        response = self.client.post(reverse('auth-register'), {
            'email': 'cashier@example.com',
            'password': 'StrongPass123!',
            'full_name': 'Cashier User',
            'phone': '08000000001',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='cashier@example.com')
        self.assertEqual(user.status, User.Status.PENDING)
        self.assertFalse(user.is_active)
        self.assertEqual(user.role, User.Role.CASHIER)

    def test_pending_user_cannot_login(self):
        User.objects.create_user(
            email='pending@example.com',
            password='StrongPass123!',
            full_name='Pending User',
            phone='08000000002',
        )

        response = self.client.post(reverse('auth-login'), {
            'email': 'pending@example.com',
            'password': 'StrongPass123!',
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'ACCOUNT_PENDING_APPROVAL')

    def test_admin_can_approve_pending_user(self):
        pending_user = User.objects.create_user(
            email='pending@example.com',
            password='StrongPass123!',
            full_name='Pending User',
            phone='08000000003',
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('users-approve', args=[pending_user.id]), {
            'assigned_role': User.Role.CASHIER,
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pending_user.refresh_from_db()
        self.assertEqual(pending_user.status, User.Status.ACTIVE)
        self.assertTrue(pending_user.is_active)
        self.assertEqual(pending_user.approved_by, self.admin)

    def test_cashier_cannot_list_staff_accounts(self):
        cashier = User.objects.create_user(
            email='cashier@example.com',
            password='StrongPass123!',
            full_name='Cashier User',
            phone='08000000004',
            status=User.Status.ACTIVE,
            is_active=True,
        )
        self.client.force_authenticate(cashier)

        response = self.client.get(reverse('users-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
