from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

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

    def test_authenticated_user_can_change_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('auth-change-password'),
            {
                'current_password': 'StrongPass123!',
                'new_password': 'NewStrongPass456!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password('NewStrongPass456!'))

    def test_change_password_rejects_wrong_current_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('auth-change-password'),
            {
                'current_password': 'WrongPassword123!',
                'new_password': 'NewStrongPass456!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_blacklists_refresh_token(self):
        refresh = RefreshToken.for_user(self.admin)

        response = self.client.post(
            reverse('auth-logout'),
            {'refresh': str(refresh)},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        with self.assertRaises(TokenError):
            RefreshToken(str(refresh)).check_blacklist()

    def test_refresh_rotates_and_blacklists_submitted_token(self):
        refresh = RefreshToken.for_user(self.admin)

        response = self.client.post(
            reverse('token-refresh'),
            {'refresh': str(refresh)},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])
        replay_response = self.client.post(
            reverse('token-refresh'),
            {'refresh': str(refresh)},
            format='json',
        )
        self.assertEqual(replay_response.status_code, status.HTTP_401_UNAUTHORIZED)
