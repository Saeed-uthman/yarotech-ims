from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accountability.models import AccountabilityTransaction
from apps.accounts.models import User
from apps.inventory.models import InventoryMovement
from apps.products.models import Category, Company, Product, ProductVariant

from .models import StockPurchase


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
