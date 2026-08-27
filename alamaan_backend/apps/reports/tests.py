from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accountability.models import AccountabilityTransaction
from apps.customers.models import Customer
from apps.inventory.models import InventoryMovement
from apps.products.models import Category, Company, Product, ProductVariant
from apps.purchases.models import PurchaseItem, StockPurchase
from apps.sales.models import Sale, SaleItem


class ReportApiTests(APITestCase):
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
            base_price=Decimal('1000.00'),
            min_selling_price=Decimal('1200.00'),
            default_selling_price=Decimal('1500.00'),
            max_selling_price=Decimal('1800.00'),
            current_stock=100,
            reorder_level=10,
        )

        self.customer = Customer.objects.create(
            name='Test Customer',
            phone='08012345678',
            created_by=self.admin,
            updated_by=self.admin,
        )

        self.sale = Sale.objects.create(
            invoice_number='INV-202608-000001',
            customer=self.customer,
            subtotal=Decimal('15000.00'),
            discount=Decimal('0.00'),
            total_amount=Decimal('15000.00'),
            amount_paid=Decimal('10000.00'),
            outstanding_amount=Decimal('5000.00'),
            payment_status=Sale.PaymentStatus.PARTIAL,
            payment_method='CASH',
            served_by=self.cashier,
            created_by=self.cashier,
            updated_by=self.cashier,
        )
        SaleItem.objects.create(
            sale=self.sale,
            variant=self.variant,
            quantity=10,
            actual_selling_price=Decimal('1500.00'),
            unit_selling_price=Decimal('1500.00'),
            historical_base_price=Decimal('1000.00'),
            unit_base_price=Decimal('1000.00'),
            min_selling_price=Decimal('1200.00'),
            default_selling_price=Decimal('1500.00'),
            max_selling_price=Decimal('1800.00'),
            subtotal=Decimal('15000.00'),
            profit=Decimal('5000.00'),
        )

        AccountabilityTransaction.objects.create(
            transaction_number='ACC-202608-000001',
            direction='IN',
            type='SALE',
            category='Sales Revenue',
            amount=Decimal('10000.00'),
            payment_method='CASH',
            reference_type='Sale',
            reference_id=str(self.sale.id),
            description='Test sale',
            created_by=self.admin,
            updated_by=self.admin,
        )

    def test_cashier_cannot_view_reports(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('reports-overview'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_overview_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-overview'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['total_sales_count'], 1)
        self.assertEqual(Decimal(data['total_revenue']), Decimal('15000.00'))

    def test_sales_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-sales'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['total_sales'], 1)
        self.assertEqual(Decimal(data['total_revenue']), Decimal('15000.00'))

    def test_profit_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-profit'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(Decimal(data['total_revenue']), Decimal('15000.00'))
        self.assertEqual(Decimal(data['total_profit']), Decimal('5000.00'))

    def test_purchases_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-purchases'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_financial_movement_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-financial-movement'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(Decimal(data['total_inflow']), Decimal('10000.00'))

    def test_inventory_movement_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-inventory-movement'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_debt_report(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('reports-debt'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
