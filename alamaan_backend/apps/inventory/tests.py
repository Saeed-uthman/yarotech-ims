from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.inventory.models import InventoryMovement
from apps.products.models import Category, Company, Product, ProductVariant


class InventoryApiTests(APITestCase):
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
        category = Category.objects.create(name='Analgesics')
        company = Company.objects.create(name='Emzor')
        product = Product.objects.create(
            name='Paracetamol 500mg',
            generic_name='Acetaminophen',
            category=category,
            dosage='500mg',
            dosage_form=Product.DosageForm.TABLET,
        )
        self.variant = ProductVariant.objects.create(
            product=product,
            company=company,
            base_price='80.00',
            min_selling_price='100.00',
            default_selling_price='120.00',
            max_selling_price='150.00',
            current_stock=10,
            reorder_level=5,
        )

    def test_cashier_can_view_inventory_without_cost_value(self):
        self.client.force_authenticate(self.cashier)

        response = self.client.get(reverse('inventory-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data['data'][0]
        self.assertNotIn('base_price', item)
        self.assertNotIn('inventory_cost_value', item)

    def test_admin_can_adjust_stock_and_records_movement(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('inventory-adjust'), {
            'variant_id': self.variant.id,
            'adjustment_type': 'INCREMENT',
            'quantity': 5,
            'reason': 'Physical count correction',
            'notes': 'Shelf count was higher.',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 15)
        movement = InventoryMovement.objects.get()
        self.assertEqual(movement.quantity, 5)
        self.assertEqual(movement.previous_stock, 10)
        self.assertEqual(movement.new_stock, 15)

    def test_cashier_cannot_adjust_stock(self):
        self.client.force_authenticate(self.cashier)

        response = self.client.post(reverse('inventory-adjust'), {
            'variant_id': self.variant.id,
            'adjustment_type': 'INCREMENT',
            'quantity': 5,
            'reason': 'Physical count correction',
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_adjustment_cannot_make_stock_negative(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('inventory-adjust'), {
            'variant_id': self.variant.id,
            'adjustment_type': 'DECREMENT',
            'quantity': 11,
            'reason': 'Damaged stock removal',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 10)
        self.assertEqual(InventoryMovement.objects.count(), 0)

    def test_admin_can_view_movement_log(self):
        InventoryMovement.objects.create(
            variant=self.variant,
            movement_type=InventoryMovement.MovementType.ADJUSTMENT,
            quantity=2,
            previous_stock=8,
            new_stock=10,
            reason='Opening stock correction',
            reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
            created_by=self.admin,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get(reverse('inventory-movements'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
