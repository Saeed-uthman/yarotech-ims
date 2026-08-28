from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User

from .models import SystemSettings


class SystemSettingsApiTests(APITestCase):
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
        self.settings = SystemSettings.load()

    def test_any_authenticated_user_can_view_settings(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('system-settings'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['pharmacy_name'], 'Al-Amaan Pharmacy')

    def test_cashier_cannot_update_settings(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.put(
            reverse('system-settings'),
            {'pharmacy_name': 'Hacked Pharmacy'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], 'PERMISSION_DENIED')

    def test_admin_can_update_settings(self):
        self.client.force_authenticate(self.admin)
        response = self.client.put(
            reverse('system-settings'),
            {
                'pharmacy_name': 'Al-Amaan Medical Store',
                'phone': '+234 801 234 5678',
                'email': 'info@alamaan.com',
                'require_sale_confirmation': True,
                'receipt_cashier': False,
                'large_transaction_threshold': '250000.00',
                'theme': 'dark',
                'session_timeout': '60m',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.pharmacy_name, 'Al-Amaan Medical Store')
        self.assertEqual(self.settings.phone, '+234 801 234 5678')
        self.assertTrue(self.settings.require_sale_confirmation)
        self.assertFalse(self.settings.receipt_cashier)
        self.assertEqual(self.settings.updated_by, self.admin)
        self.assertEqual(response.data['data']['updated_by_name'], self.admin.full_name)

    def test_admin_can_reset_settings(self):
        self.settings.pharmacy_name = 'Changed Name'
        self.settings.theme = SystemSettings.Theme.DARK
        self.settings.receipt_cashier = False
        self.settings.save()
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('system-settings-reset'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.pharmacy_name, 'Al-Amaan Pharmacy')
        self.assertEqual(self.settings.theme, SystemSettings.Theme.SYSTEM)
        self.assertTrue(self.settings.receipt_cashier)
        self.assertEqual(self.settings.updated_by, self.admin)

    def test_cashier_cannot_reset_settings(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('system-settings-reset'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_receipt_footer_length_is_validated(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            reverse('system-settings'),
            {'receipt_footer': 'x' * 151},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_large_transaction_threshold_cannot_be_negative(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            reverse('system-settings'),
            {'large_transaction_threshold': '-1.00'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inventory_and_debt_safeguards_cannot_be_disabled(self):
        self.client.force_authenticate(self.admin)

        negative_stock = self.client.patch(
            reverse('system-settings'),
            {'allow_negative_stock': True},
            format='json',
        )
        anonymous_credit = self.client.patch(
            reverse('system-settings'),
            {'require_customer_for_credit': False},
            format='json',
        )
        cashier_adjustment = self.client.patch(
            reverse('system-settings'),
            {'require_admin_stock_adjustment': False},
            format='json',
        )

        self.assertEqual(negative_stock.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(anonymous_credit.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(cashier_adjustment.status_code, status.HTTP_400_BAD_REQUEST)

    def test_settings_singleton_enforced(self):
        settings1 = SystemSettings.load()
        settings2 = SystemSettings.load()
        self.assertEqual(settings1.pk, settings2.pk)
        self.assertEqual(settings1.pk, 1)

    def test_cannot_delete_settings(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(reverse('system-settings'))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
