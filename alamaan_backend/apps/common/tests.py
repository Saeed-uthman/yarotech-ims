from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier
from unittest.mock import patch

from django.db import close_old_connections, connection
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient, APITestCase

from apps.accountability.models import AccountabilityTransaction, ManualExpense
from apps.accountability.sequences import next_accountability_transaction_number
from apps.accountability.services import record_manual_expense
from apps.accounts.models import User
from apps.customers.models import Customer, CustomerDebtPayment
from apps.customers.services import record_customer_debt_payment
from apps.inventory.models import InventoryMovement
from apps.products.models import Category, Company, Product, ProductVariant
from apps.purchases.models import StockPurchase
from apps.purchases.services import create_stock_purchase
from apps.sales.models import Sale
from apps.sales.services import process_pos_sale
from apps.settings_app.models import SystemSettings

from .models import DocumentSequence, IdempotencyRecord


class DocumentSequenceContinuityTests(TestCase):
    def test_shared_ledger_sequence_continues_from_existing_references(self):
        now = timezone.now()
        prefix = f'ACC-{now:%Y%m}-'
        AccountabilityTransaction.objects.create(
            transaction_number=f'{prefix}000007',
            direction=AccountabilityTransaction.Direction.IN,
            type=AccountabilityTransaction.TxType.SALE,
            category='Sales Revenue',
            amount=Decimal('100.00'),
            payment_method=AccountabilityTransaction.PaymentMethod.CASH,
            reference_type='sale',
            reference_id='existing-sale',
        )

        number = next_accountability_transaction_number()

        self.assertEqual(number, f'{prefix}000008')
        self.assertEqual(
            DocumentSequence.objects.get(name=f'accountability:{now:%Y%m}').value,
            8,
        )


class HealthCheckTests(TestCase):
    def test_health_check_confirms_database_readiness(self):
        response = self.client.get(reverse('health-check'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'status': 'ok'})


class WorkflowFixtureMixin:
    def create_workflow_fixture(self):
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
            min_selling_price=Decimal('1500.00'),
            default_selling_price=Decimal('1800.00'),
            max_selling_price=Decimal('2000.00'),
            current_stock=5,
            reorder_level=2,
        )
        self.customer = Customer.objects.create(
            name='John Doe',
            phone='08012345678',
            created_by=self.admin,
            updated_by=self.admin,
        )
        SystemSettings.load()


class CriticalWorkflowApiTests(WorkflowFixtureMixin, APITestCase):
    def setUp(self):
        self.create_workflow_fixture()

    def test_purchase_sale_debt_recovery_and_dashboard_remain_consistent(self):
        self.client.force_authenticate(self.admin)
        purchase_response = self.client.post(
            reverse('purchases-list'),
            {
                'items': [{
                    'product_variant_id': self.variant.id,
                    'quantity': 10,
                    'unit_purchase_price': '1000.00',
                }],
                'payment_method': 'CASH',
                'note': 'End-to-end restock',
            },
            format='json',
            HTTP_IDEMPOTENCY_KEY='e2e-purchase',
        )
        self.assertEqual(purchase_response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.cashier)
        sale_response = self.client.post(
            reverse('sales-list'),
            {
                'customer_id': self.customer.id,
                'items': [{
                    'product_variant_id': self.variant.id,
                    'quantity': 4,
                    'actual_selling_price': '1800.00',
                }],
                'discount': '0.00',
                'amount_paid': '2000.00',
                'payment_method': 'CASH',
                'notes': 'End-to-end credit sale',
            },
            format='json',
            HTTP_IDEMPOTENCY_KEY='e2e-sale',
        )
        self.assertEqual(sale_response.status_code, status.HTTP_201_CREATED)
        sale = Sale.objects.get(pk=sale_response.data['data']['id'])
        self.assertEqual(sale.outstanding_amount, Decimal('5200.00'))

        payment_response = self.client.post(
            reverse('debt-payment-create'),
            {
                'customer_id': self.customer.id,
                'amount': '5200.00',
                'payment_method': 'CASH',
                'reference_notes': 'Clear remaining balance',
            },
            format='json',
            HTTP_IDEMPOTENCY_KEY='e2e-debt-payment',
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)

        sale.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual(sale.payment_status, Sale.PaymentStatus.PAID)
        self.assertEqual(sale.outstanding_amount, Decimal('0.00'))
        self.assertEqual(self.variant.current_stock, 11)
        self.assertEqual(InventoryMovement.objects.filter(variant=self.variant).count(), 2)

        transactions = AccountabilityTransaction.objects.order_by('transaction_number')
        self.assertEqual(transactions.count(), 3)
        self.assertEqual(len(set(transactions.values_list('transaction_number', flat=True))), 3)
        self.assertEqual(
            sum(
                transactions.filter(direction=AccountabilityTransaction.Direction.IN)
                .values_list('amount', flat=True),
                Decimal('0.00'),
            ),
            Decimal('7200.00'),
        )

        self.client.force_authenticate(self.admin)
        dashboard_response = self.client.get(reverse('dashboard'), {'period': 'today'})
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        summary = dashboard_response.data['data']['summary']
        self.assertEqual(Decimal(summary['total_sales']), Decimal('7200.00'))
        self.assertEqual(Decimal(summary['total_profit']), Decimal('3200.00'))
        self.assertEqual(Decimal(summary['money_in']), Decimal('7200.00'))
        self.assertEqual(Decimal(summary['money_out']), Decimal('10000.00'))
        self.assertEqual(Decimal(summary['outstanding_debt']), Decimal('0.00'))
        self.assertEqual(Decimal(summary['total_purchases_amount']), Decimal('10000.00'))


class ListQueryGrowthTests(WorkflowFixtureMixin, APITestCase):
    def setUp(self):
        self.create_workflow_fixture()
        self.variant.current_stock = 100
        self.variant.save(update_fields=['current_stock'])

    def _get_query_count(self, url):
        with CaptureQueriesContext(connection) as captured:
            response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return len(captured)

    def _create_paid_sale(self):
        return process_pos_sale(
            user=self.cashier,
            items=[{
                'product_variant_id': self.variant.id,
                'quantity': 1,
                'actual_selling_price': Decimal('1800.00'),
            }],
            amount_paid=Decimal('1800.00'),
            payment_method='CASH',
        )

    def _create_purchase(self):
        return create_stock_purchase(
            user=self.admin,
            items=[{
                'product_variant_id': self.variant.id,
                'quantity': 1,
                'unit_purchase_price': Decimal('1000.00'),
            }],
            payment_method='CASH',
        )

    def test_sales_list_query_count_does_not_grow_per_row(self):
        self._create_paid_sale()
        self.client.force_authenticate(self.admin)
        one_row_queries = self._get_query_count(reverse('sales-list'))
        for _ in range(4):
            self._create_paid_sale()

        five_row_queries = self._get_query_count(reverse('sales-list'))

        self.assertLessEqual(five_row_queries, one_row_queries + 1)

    def test_purchase_list_query_count_does_not_grow_per_row(self):
        self._create_purchase()
        self.client.force_authenticate(self.admin)
        one_row_queries = self._get_query_count(reverse('purchases-list'))
        for _ in range(4):
            self._create_purchase()

        five_row_queries = self._get_query_count(reverse('purchases-list'))

        self.assertLessEqual(five_row_queries, one_row_queries + 1)

    def test_customer_list_query_count_does_not_grow_per_row(self):
        self._create_paid_sale()
        self.client.force_authenticate(self.admin)
        one_row_queries = self._get_query_count(reverse('customers-list'))
        for index in range(4):
            Customer.objects.create(
                name=f'Customer {index}',
                phone=f'0809999000{index}',
                created_by=self.admin,
                updated_by=self.admin,
            )

        five_row_queries = self._get_query_count(reverse('customers-list'))

        self.assertLessEqual(five_row_queries, one_row_queries + 1)


class CriticalAtomicRollbackTests(WorkflowFixtureMixin, TestCase):
    def setUp(self):
        self.create_workflow_fixture()

    def test_sale_rolls_back_when_financial_posting_fails(self):
        with patch(
            'apps.sales.services.AccountabilityTransaction.objects.create',
            side_effect=RuntimeError('ledger unavailable'),
        ):
            with self.assertRaises(RuntimeError):
                process_pos_sale(
                    user=self.cashier,
                    items=[{
                        'product_variant_id': self.variant.id,
                        'quantity': 1,
                        'actual_selling_price': Decimal('1800.00'),
                    }],
                    amount_paid=Decimal('1800.00'),
                    payment_method='CASH',
                )

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 5)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(InventoryMovement.objects.count(), 0)
        self.assertEqual(DocumentSequence.objects.count(), 0)

    def test_purchase_rolls_back_when_financial_posting_fails(self):
        with patch(
            'apps.purchases.services.AccountabilityTransaction.objects.create',
            side_effect=RuntimeError('ledger unavailable'),
        ):
            with self.assertRaises(RuntimeError):
                create_stock_purchase(
                    user=self.admin,
                    items=[{
                        'product_variant_id': self.variant.id,
                        'quantity': 10,
                        'unit_purchase_price': Decimal('1000.00'),
                    }],
                    payment_method='CASH',
                )

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 5)
        self.assertEqual(StockPurchase.objects.count(), 0)
        self.assertEqual(InventoryMovement.objects.count(), 0)
        self.assertEqual(DocumentSequence.objects.count(), 0)

    def test_debt_allocation_rolls_back_when_financial_posting_fails(self):
        sale = process_pos_sale(
            user=self.cashier,
            customer_id=self.customer.id,
            items=[{
                'product_variant_id': self.variant.id,
                'quantity': 1,
                'actual_selling_price': Decimal('1800.00'),
            }],
            amount_paid=Decimal('0.00'),
            payment_method='CREDIT',
        )
        sequence_count = DocumentSequence.objects.count()

        with patch(
            'apps.customers.services.AccountabilityTransaction.objects.create',
            side_effect=RuntimeError('ledger unavailable'),
        ):
            with self.assertRaises(RuntimeError):
                record_customer_debt_payment(
                    user=self.cashier,
                    customer=self.customer,
                    amount=Decimal('1000.00'),
                    payment_method='CASH',
                )

        sale.refresh_from_db()
        self.assertEqual(sale.amount_paid, Decimal('0.00'))
        self.assertEqual(sale.outstanding_amount, Decimal('1800.00'))
        self.assertEqual(CustomerDebtPayment.objects.count(), 0)
        self.assertEqual(AccountabilityTransaction.objects.count(), 0)
        self.assertEqual(DocumentSequence.objects.count(), sequence_count)

    def test_expense_rolls_back_when_financial_posting_fails(self):
        with patch(
            'apps.accountability.services.AccountabilityTransaction.objects.create',
            side_effect=RuntimeError('ledger unavailable'),
        ):
            with self.assertRaises(RuntimeError):
                record_manual_expense(
                    user=self.admin,
                    category=ManualExpense.Category.UTILITIES,
                    amount=Decimal('2500.00'),
                    payment_method='CASH',
                    description='Electricity',
                )

        self.assertEqual(ManualExpense.objects.count(), 0)
        self.assertEqual(AccountabilityTransaction.objects.count(), 0)
        self.assertEqual(DocumentSequence.objects.count(), 0)


class ConcurrentTransactionTests(WorkflowFixtureMixin, TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.create_workflow_fixture()
        self.second_cashier = User.objects.create_user(
            email='cashier2@example.com',
            password='StrongPass123!',
            full_name='Second Cashier',
            phone='08000000002',
            status=User.Status.ACTIVE,
            is_active=True,
        )

    def _direct_sale_worker(self, *, user_id, variant_id, barrier):
        close_old_connections()
        try:
            user = User.objects.get(pk=user_id)
            barrier.wait(timeout=15)
            sale = process_pos_sale(
                user=user,
                items=[{
                    'product_variant_id': variant_id,
                    'quantity': 1,
                    'actual_selling_price': Decimal('1800.00'),
                }],
                amount_paid=Decimal('1800.00'),
                payment_method='CASH',
            )
            return {'result': 'created', 'sale_id': sale.id, 'invoice_number': sale.invoice_number}
        except ValidationError as exc:
            return {'result': 'rejected', 'detail': exc.detail}
        except Exception as exc:  # surfaced as a clear assertion failure in the parent thread
            return {'result': 'error', 'detail': repr(exc)}
        finally:
            close_old_connections()

    @skipUnlessDBFeature('has_select_for_update')
    def test_two_cashiers_cannot_oversell_the_last_unit(self):
        self.variant.current_stock = 1
        self.variant.save(update_fields=['current_stock'])
        barrier = Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(
                    self._direct_sale_worker,
                    user_id=user_id,
                    variant_id=self.variant.id,
                    barrier=barrier,
                )
                for user_id in (self.cashier.id, self.second_cashier.id)
            ]
            results = [future.result(timeout=30) for future in futures]

        self.assertEqual([row['result'] for row in results].count('created'), 1, results)
        self.assertEqual([row['result'] for row in results].count('rejected'), 1, results)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 0)
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(InventoryMovement.objects.count(), 1)

    @skipUnlessDBFeature('has_select_for_update')
    def test_parallel_sales_get_unique_invoice_and_ledger_numbers(self):
        second_company = Company.objects.create(name='Fidson')
        second_variant = ProductVariant.objects.create(
            product=self.product,
            company=second_company,
            base_price=Decimal('1000.00'),
            min_selling_price=Decimal('1500.00'),
            default_selling_price=Decimal('1800.00'),
            max_selling_price=Decimal('2000.00'),
            current_stock=5,
            reorder_level=2,
        )
        barrier = Barrier(2)
        work = (
            (self.cashier.id, self.variant.id),
            (self.second_cashier.id, second_variant.id),
        )
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(
                    self._direct_sale_worker,
                    user_id=user_id,
                    variant_id=variant_id,
                    barrier=barrier,
                )
                for user_id, variant_id in work
            ]
            results = [future.result(timeout=30) for future in futures]

        self.assertTrue(all(row['result'] == 'created' for row in results), results)
        self.assertEqual(Sale.objects.count(), 2)
        self.assertEqual(Sale.objects.values('invoice_number').distinct().count(), 2)
        self.assertEqual(AccountabilityTransaction.objects.count(), 2)
        self.assertEqual(
            AccountabilityTransaction.objects.values('transaction_number').distinct().count(),
            2,
        )

    def _idempotent_api_worker(self, *, barrier):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(User.objects.get(pk=self.cashier.id))
            barrier.wait(timeout=15)
            response = client.post(
                reverse('sales-list'),
                {
                    'customer_id': None,
                    'items': [{
                        'product_variant_id': self.variant.id,
                        'quantity': 1,
                        'actual_selling_price': '1800.00',
                    }],
                    'discount': '0.00',
                    'amount_paid': '1800.00',
                    'payment_method': 'CASH',
                    'notes': '',
                },
                format='json',
                HTTP_IDEMPOTENCY_KEY='concurrent-sale-key',
            )
            return {
                'status': response.status_code,
                'data': response.data,
                'replayed': response.get('Idempotency-Replayed'),
            }
        except Exception as exc:
            return {'status': 0, 'error': repr(exc)}
        finally:
            close_old_connections()

    @skipUnlessDBFeature('has_select_for_update')
    def test_simultaneous_identical_idempotency_keys_mutate_once(self):
        barrier = Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(self._idempotent_api_worker, barrier=barrier)
                for _ in range(2)
            ]
            results = [future.result(timeout=30) for future in futures]

        self.assertEqual([row['status'] for row in results], [status.HTTP_201_CREATED] * 2, results)
        self.assertEqual(
            len({row['data']['data']['id'] for row in results}),
            1,
            results,
        )
        self.assertEqual({row['replayed'] for row in results}, {'false', 'true'})
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 4)
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(IdempotencyRecord.objects.count(), 1)
