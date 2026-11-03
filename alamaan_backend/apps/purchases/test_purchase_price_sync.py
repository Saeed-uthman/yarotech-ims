from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.products.models import Category, Company, Product, ProductVariant, PriceAdjustmentHistory
from apps.purchases.models import StockPurchase


class PurchasePriceSyncTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin_sync@example.com',
            password='StrongPass123!',
            full_name='Admin Sync',
            phone='08000000099',
        )
        self.client.force_authenticate(user=self.admin)

        self.category = Category.objects.create(name='Networking')
        self.company = Company.objects.create(name='Cisco')
        self.product = Product.objects.create(
            name='Router X1',
            generic_name='Router',
            category=self.category,
            dosage='N/A',
            dosage_form=Product.DosageForm.ROUTER,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            company=self.company,
            base_price=Decimal('10000.00'),
            min_selling_price=Decimal('12000.00'),
            default_selling_price=Decimal('13000.00'),
            max_selling_price=Decimal('15000.00'),
            current_stock=10,
            reorder_level=5,
        )

    def test_purchase_updates_base_and_selling_price_and_logs_history(self):
        url = reverse('purchases-list')
        payload = {
            'items': [
                {
                    'product_variant_id': self.variant.id,
                    'quantity': '5.00',
                    'unit_purchase_price': '11000.00',
                    'new_selling_price': '14500.00',
                    'update_catalog_prices': True,
                }
            ],
            'amount_paid': '55000.00',
            'payment_method': 'TRANSFER',
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.base_price, Decimal('11000.00'))
        self.assertEqual(self.variant.default_selling_price, Decimal('14500.00'))
        self.assertGreater(self.variant.min_selling_price, Decimal('11000.00'))
        self.assertLessEqual(self.variant.min_selling_price, Decimal('14500.00'))
        self.assertGreaterEqual(self.variant.max_selling_price, Decimal('14500.00'))

        purchase = StockPurchase.objects.get(id=response.data['data']['id'])
        history = PriceAdjustmentHistory.objects.filter(variant=self.variant).order_by('-created_at').first()
        self.assertIsNotNone(history)
        self.assertEqual(history.new_base_price, Decimal('11000.00'))
        self.assertEqual(history.new_default_selling_price, Decimal('14500.00'))
        self.assertIn(purchase.purchase_number, history.reason)

    def test_purchase_with_explicit_min_max_prices(self):
        url = reverse('purchases-list')
        payload = {
            'items': [
                {
                    'product_variant_id': self.variant.id,
                    'quantity': '2.00',
                    'unit_purchase_price': '12000.00',
                    'new_selling_price': '16000.00',
                    'new_min_selling_price': '14000.00',
                    'new_max_selling_price': '18000.00',
                    'update_catalog_prices': True,
                }
            ],
            'amount_paid': '24000.00',
            'payment_method': 'CASH',
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.base_price, Decimal('12000.00'))
        self.assertEqual(self.variant.min_selling_price, Decimal('14000.00'))
        self.assertEqual(self.variant.default_selling_price, Decimal('16000.00'))
        self.assertEqual(self.variant.max_selling_price, Decimal('18000.00'))

    def test_purchase_rejects_selling_price_less_than_cost(self):
        url = reverse('purchases-list')
        payload = {
            'items': [
                {
                    'product_variant_id': self.variant.id,
                    'quantity': '1.00',
                    'unit_purchase_price': '15000.00',
                    'new_selling_price': '14000.00',
                    'update_catalog_prices': True,
                }
            ],
            'amount_paid': '15000.00',
            'payment_method': 'CASH',
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('items', response.data.get('errors', response.data))

    def test_purchase_without_catalog_update_preserves_old_prices(self):
        url = reverse('purchases-list')
        payload = {
            'items': [
                {
                    'product_variant_id': self.variant.id,
                    'quantity': '3.00',
                    'unit_purchase_price': '9500.00',
                    'new_selling_price': '14000.00',
                    'update_catalog_prices': False,
                }
            ],
            'amount_paid': '28500.00',
            'payment_method': 'POS',
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.variant.refresh_from_db()
        # Should stay at the initial 10000 / 13000
        self.assertEqual(self.variant.base_price, Decimal('10000.00'))
        self.assertEqual(self.variant.default_selling_price, Decimal('13000.00'))
