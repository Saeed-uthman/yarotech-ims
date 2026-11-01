from decimal import Decimal
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.customers.models import Customer
from apps.inventory.models import InventoryBatch
from apps.products.models import Category, Company, Product, ProductVariant
from apps.sales.models import Quote, Sale, SaleItem


class QuoteAndWarrantyApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@yarotech.com',
            password='StrongPass123!',
            full_name='Admin User',
            phone='08000000000',
        )
        self.cashier = User.objects.create_user(
            email='cashier@yarotech.com',
            password='StrongPass123!',
            full_name='Cashier User',
            phone='08000000001',
            status=User.Status.ACTIVE,
            is_active=True,
        )
        self.category = Category.objects.create(name='Networking')
        self.company = Company.objects.create(name='MikroTik', code='MTK')
        self.product = Product.objects.create(
            name='hEX S Router',
            generic_name='RB760iGS',
            dosage='5x Gigabit Ethernet, SFP, Dual Core 880MHz',
            dosage_form=Product.DosageForm.ROUTER,
            unit_of_measure=Product.UnitOfMeasure.PCS,
            category=self.category,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            company=self.company,
            base_price=Decimal('50000.00'),
            min_selling_price=Decimal('60000.00'),
            default_selling_price=Decimal('65000.00'),
            max_selling_price=Decimal('75000.00'),
            current_stock=Decimal('10.00'),
            reorder_level=Decimal('2.00'),
        )
        # Create an available inventory batch
        self.batch = InventoryBatch.objects.create(
            variant=self.variant,
            batch_number='BATCH-MTK-001',
            received_quantity=Decimal('10.00'),
            remaining_quantity=Decimal('10.00'),
            unit_cost=Decimal('50000.00'),
            received_at=timezone.now(),
            created_by=self.admin,
        )
        self.customer = Customer.objects.create(
            name='SolarTech Kano Ltd',
            phone='08033333333',
            address='10 Airport Road Kano',
        )

    def test_create_and_convert_quote(self):
        self.client.force_authenticate(self.cashier)

        # 1. Create Quote
        response = self.client.post(reverse('quotes-list-create'), {
            'customer_id': self.customer.id,
            'items': [{
                'product_variant_id': self.variant.id,
                'quantity': '2.00',
                'unit_price': '65000.00',
            }],
            'notes': 'Office network project quotation',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        quote_data = response.data['data']
        self.assertEqual(quote_data['status'], 'DRAFT')
        self.assertEqual(Decimal(str(quote_data['total_amount'])), Decimal('130000.00'))
        quote_id = quote_data['id']

        # Quote should not decrement inventory
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, Decimal('10.00'))

        # 2. Convert Quote to Sale
        convert_response = self.client.post(
            reverse('quotes-convert', kwargs={'pk': quote_id}),
            {
                'payment_method': Sale.PaymentMethod.CASH,
                'amount_paid': '130000.00',
                'serial_numbers_map': {
                    str(self.variant.id): 'SN-RB760-001, SN-RB760-002',
                },
            },
            format='json',
        )
        self.assertEqual(convert_response.status_code, status.HTTP_201_CREATED)

        # Check stock decremented
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, Decimal('8.00'))

        # Check quote marked converted
        quote = Quote.objects.get(pk=quote_id)
        self.assertEqual(quote.status, Quote.Status.CONVERTED)
        self.assertIsNotNone(quote.converted_sale)

    def test_warranty_verification(self):
        self.client.force_authenticate(self.cashier)

        # Complete a sale with serial numbers
        sale_res = self.client.post(reverse('sales-list'), {
            'customer_id': self.customer.id,
            'items': [{
                'product_variant_id': self.variant.id,
                'quantity': '1.00',
                'actual_selling_price': '65000.00',
                'serial_numbers': 'SN-RB760-UNIQUE99',
                'warranty_months': 12,
            }],
            'amount_paid': '65000.00',
            'payment_method': Sale.PaymentMethod.TRANSFER,
        }, format='json')
        self.assertEqual(sale_res.status_code, status.HTTP_201_CREATED)

        # Verify warranty via query
        verify_res = self.client.get(
            reverse('sales-verify-warranty'),
            {'query': 'SN-RB760-UNIQUE99'},
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        results = verify_res.data['data']['results']
        self.assertEqual(len(results), 1)
        record = results[0]
        self.assertEqual(record['product_name'], 'hEX S Router')
        self.assertTrue(record['is_warranty_valid'])
        self.assertGreater(record['days_remaining'], 350)

