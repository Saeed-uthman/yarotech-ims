from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.customers.models import Customer
from apps.inventory.models import InventoryMovement
from apps.products.models import Category, Company, Product, ProductVariant

from .models import Sale, SaleItem


class SalesApiTests(APITestCase):
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

    def _sale_payload(self, **overrides):
        data = {
            'customer_id': None,
            'items': [
                {
                    'product_variant_id': self.variant.id,
                    'quantity': 2,
                    'actual_selling_price': '1800.00',
                }
            ],
            'discount': '0.00',
            'amount_paid': '3600.00',
            'payment_method': 'CASH',
            'notes': '',
        }
        data.update(overrides)
        return data

    def test_successful_paid_sale(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 48)

        sale = Sale.objects.first()
        self.assertEqual(sale.payment_status, Sale.PaymentStatus.PAID)
        self.assertEqual(sale.total_amount, Decimal('3600.00'))
        self.assertEqual(sale.amount_paid, Decimal('3600.00'))
        self.assertEqual(sale.outstanding_amount, Decimal('0.00'))
        self.assertEqual(sale.served_by, self.cashier)

        movement = InventoryMovement.objects.first()
        self.assertEqual(movement.movement_type, InventoryMovement.MovementType.STOCK_OUT)
        self.assertEqual(movement.quantity, -2)
        self.assertEqual(movement.previous_stock, 50)
        self.assertEqual(movement.new_stock, 48)

    def test_credit_sale_without_customer_fails(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload(customer_id=None, amount_paid='0.00', payment_method='CREDIT')
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_selling_price_below_minimum_fails(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload()
        payload['items'][0]['actual_selling_price'] = '1650.00'
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_selling_price_above_maximum_fails(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload()
        payload['items'][0]['actual_selling_price'] = '2100.00'
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_insufficient_stock_fails(self):
        self.variant.current_stock = 1
        self.variant.save(update_fields=['current_stock'])

        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload()
        payload['items'][0]['quantity'] = 5
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_historical_price_integrity(self):
        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        sale_item = SaleItem.objects.first()
        self.assertEqual(sale_item.actual_selling_price, Decimal('1800.00'))
        self.assertEqual(sale_item.historical_base_price, Decimal('1500.00'))
        self.assertEqual(sale_item.profit, Decimal('600.00'))

        self.variant.base_price = Decimal('1600.00')
        self.variant.min_selling_price = Decimal('1800.00')
        self.variant.default_selling_price = Decimal('1900.00')
        self.variant.max_selling_price = Decimal('2200.00')
        self.variant.save()

        sale_item.refresh_from_db()
        self.assertEqual(sale_item.actual_selling_price, Decimal('1800.00'))
        self.assertEqual(sale_item.historical_base_price, Decimal('1500.00'))
        self.assertEqual(sale_item.profit, Decimal('600.00'))

    def test_admin_can_cancel_sale(self):
        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        sale = Sale.objects.first()
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse('sales-cancel', args=[sale.id]),
            {'reason': 'Customer return'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sale.refresh_from_db()
        self.assertEqual(sale.status, Sale.Status.CANCELLED)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 50)

    def test_cashier_cannot_cancel_sale(self):
        self.client.force_authenticate(self.cashier)
        self.client.post(reverse('sales-list'), self._sale_payload(), format='json')

        sale = Sale.objects.first()
        response = self.client.post(
            reverse('sales-cancel', args=[sale.id]),
            {'reason': 'Customer return'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_walk_in_sale_must_be_fully_paid(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload(customer_id=None, amount_paid='3000.00', payment_method='CASH')
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_credit_sale_with_customer_succeeds(self):
        self.client.force_authenticate(self.cashier)
        payload = self._sale_payload(
            customer_id=self.customer.id,
            amount_paid='2000.00',
            payment_method='CASH',
        )
        response = self.client.post(reverse('sales-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        sale = Sale.objects.first()
        self.assertEqual(sale.payment_status, Sale.PaymentStatus.PARTIAL)
        self.assertEqual(sale.outstanding_amount, Decimal('1600.00'))
        self.assertEqual(sale.customer, self.customer)
