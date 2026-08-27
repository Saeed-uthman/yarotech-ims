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
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.pharmacy_name, 'Al-Amaan Medical Store')
        self.assertEqual(self.settings.phone, '+234 801 234 5678')

    def test_settings_singleton_enforced(self):
        settings1 = SystemSettings.load()
        settings2 = SystemSettings.load()
        self.assertEqual(settings1.pk, settings2.pk)
        self.assertEqual(settings1.pk, 1)

    def test_cannot_delete_settings(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(reverse('system-settings'))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
