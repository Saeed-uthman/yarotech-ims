from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accountability.models import AccountabilityTransaction
from apps.customers.models import Customer
from apps.products.models import Category, Company, Product, ProductVariant
from apps.sales.models import Sale, SaleItem
from apps.settings_app.models import SystemSettings


class DashboardApiTests(APITestCase):
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

        self.sale = Sale.objects.create(
            invoice_number='INV-202608-000001',
            subtotal=Decimal('15000.00'),
            discount=Decimal('0.00'),
            total_amount=Decimal('15000.00'),
            amount_paid=Decimal('15000.00'),
            outstanding_amount=Decimal('0.00'),
            payment_status=Sale.PaymentStatus.PAID,
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
            direction=AccountabilityTransaction.Direction.IN,
            type=AccountabilityTransaction.TxType.SALE,
            category='Sales Revenue',
            amount=Decimal('15000.00'),
            payment_method='CASH',
            reference_type='Sale',
            reference_id=str(self.sale.id),
            description='Dashboard test sale',
            created_by=self.cashier,
            updated_by=self.cashier,
        )

    def test_unauthenticated_user_cannot_access_dashboard(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_gets_admin_dashboard(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['total_sales'], 1)
        self.assertIn('total_profit', data)
        self.assertIn('low_stock_alerts', data)
        self.assertEqual(Decimal(data['summary']['total_sales']), Decimal('15000.00'))
        self.assertEqual(Decimal(data['summary']['total_profit']), Decimal('5000.00'))
        self.assertEqual(Decimal(data['summary']['money_in']), Decimal('15000.00'))
        self.assertEqual(len(data['top_products']), 1)
        self.assertEqual(len(data['recent_sales']), 1)

    def test_cashier_gets_cashier_dashboard(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['total_checkouts'], 1)
        self.assertIn('total_units_dispensed', data)
        self.assertIn('active_debtors', data)
        self.assertEqual(Decimal(data['summary']['total_profit']), Decimal('0.00'))
        self.assertEqual(Decimal(data['summary']['inventory_value']), Decimal('0.00'))
        self.assertEqual(data['recent_purchases'], [])

    def test_cashier_summary_endpoint_uses_period_contract(self):
        self.client.force_authenticate(self.cashier)
        response = self.client.get(reverse('dashboard-cashier-summary'), {'period': 'today'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('total_profit', response.data['data'])
        self.assertIn('total_checkouts', response.data['data'])

    def test_configured_low_stock_threshold_drives_dashboard_alerts(self):
        settings = SystemSettings.load()
        settings.low_stock_threshold = 20
        settings.save(update_fields=['low_stock_threshold'])
        self.variant.current_stock = 15
        self.variant.reorder_level = 5
        self.variant.save(update_fields=['current_stock', 'reorder_level'])
        self.client.force_authenticate(self.admin)

        response = self.client.get(reverse('dashboard'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['low_stock_threshold'], 20)
        self.assertEqual(data['summary']['low_stock_count'], 1)
        self.assertEqual(len(data['stock_alerts']), 1)
        self.assertEqual(data['stock_alerts'][0]['reorder_level'], 20)
