from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
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

    def _create_cashbook_transaction(self, *, number, direction, tx_type, amount, status=None):
        return AccountabilityTransaction.objects.create(
            transaction_number=number,
            direction=direction,
            type=tx_type,
            category=tx_type,
            amount=Decimal(amount),
            payment_method=AccountabilityTransaction.PaymentMethod.CASH,
            reference_type='DashboardTest',
            reference_id=number,
            status=status or AccountabilityTransaction.Status.COMPLETED,
            created_by=self.admin,
            updated_by=self.admin,
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

    def test_net_cash_generated_uses_collections_recoveries_and_completed_outflows(self):
        self.sale.total_amount = Decimal('100.00')
        self.sale.amount_paid = Decimal('40.00')
        self.sale.outstanding_amount = Decimal('60.00')
        self.sale.payment_status = Sale.PaymentStatus.PARTIAL
        self.sale.save(
            update_fields=['total_amount', 'amount_paid', 'outstanding_amount', 'payment_status']
        )
        sale_transaction = AccountabilityTransaction.objects.get(
            reference_type='Sale',
            reference_id=str(self.sale.id),
        )
        sale_transaction.amount = Decimal('40.00')
        sale_transaction.save(update_fields=['amount'])

        self._create_cashbook_transaction(
            number='ACC-NET-000001',
            direction=AccountabilityTransaction.Direction.IN,
            tx_type=AccountabilityTransaction.TxType.DEBT_PAYMENT,
            amount='20.00',
        )
        self._create_cashbook_transaction(
            number='ACC-NET-000002',
            direction=AccountabilityTransaction.Direction.OUT,
            tx_type=AccountabilityTransaction.TxType.STOCK_PURCHASE,
            amount='15.00',
        )
        self._create_cashbook_transaction(
            number='ACC-NET-000003',
            direction=AccountabilityTransaction.Direction.OUT,
            tx_type=AccountabilityTransaction.TxType.OTHER_EXPENSE,
            amount='5.00',
        )
        self._create_cashbook_transaction(
            number='ACC-NET-CANCELLED',
            direction=AccountabilityTransaction.Direction.IN,
            tx_type=AccountabilityTransaction.TxType.SALE,
            amount='999.00',
            status=AccountabilityTransaction.Status.CANCELLED,
        )
        self._create_cashbook_transaction(
            number='ACC-NET-CANCELLED-PURCHASE',
            direction=AccountabilityTransaction.Direction.OUT,
            tx_type=AccountabilityTransaction.TxType.STOCK_PURCHASE,
            amount='777.00',
            status=AccountabilityTransaction.Status.CANCELLED,
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get(reverse('dashboard'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data['data']['summary']
        self.assertEqual(Decimal(summary['total_sales']), Decimal('100.00'))
        self.assertEqual(Decimal(summary['sales_collected']), Decimal('40.00'))
        self.assertEqual(Decimal(summary['debt_recovered']), Decimal('20.00'))
        self.assertEqual(Decimal(summary['stock_purchase_spend']), Decimal('15.00'))
        self.assertEqual(Decimal(summary['operating_expenses']), Decimal('5.00'))
        self.assertEqual(Decimal(summary['net_cash_generated']), Decimal('40.00'))
        self.assertEqual(Decimal(summary['money_in']), Decimal('60.00'))
        self.assertEqual(Decimal(summary['money_out']), Decimal('20.00'))
        self.assertEqual(Decimal(summary['net_money_movement']), Decimal('40.00'))

    def test_net_cash_generated_follows_dashboard_period_filters(self):
        last_month_purchase = self._create_cashbook_transaction(
            number='ACC-PERIOD-000001',
            direction=AccountabilityTransaction.Direction.OUT,
            tx_type=AccountabilityTransaction.TxType.STOCK_PURCHASE,
            amount='25.00',
        )
        now = timezone.now()
        last_month_date = (now.replace(day=1) - timedelta(days=1)).replace(hour=12)
        AccountabilityTransaction.objects.filter(pk=last_month_purchase.pk).update(
            created_at=last_month_date
        )

        self.client.force_authenticate(self.admin)
        for period in ('today', 'this_week', 'this_month'):
            response = self.client.get(reverse('dashboard'), {'period': period})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(
                Decimal(response.data['data']['summary']['stock_purchase_spend']),
                Decimal('0.00'),
            )

        today = timezone.localdate().isoformat()
        custom_response = self.client.get(
            reverse('dashboard'),
            {'period': 'custom', 'start_date': today, 'end_date': today},
        )
        self.assertEqual(
            Decimal(custom_response.data['data']['summary']['stock_purchase_spend']),
            Decimal('0.00'),
        )

        last_month_response = self.client.get(reverse('dashboard'), {'period': 'last_month'})
        last_month_summary = last_month_response.data['data']['summary']
        self.assertEqual(Decimal(last_month_summary['stock_purchase_spend']), Decimal('25.00'))
        self.assertEqual(Decimal(last_month_summary['net_cash_generated']), Decimal('-25.00'))

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
