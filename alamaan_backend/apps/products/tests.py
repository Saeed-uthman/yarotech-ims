from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.products.models import Category, Company, PriceAdjustmentHistory, Product, ProductVariant


class ProductsApiTests(APITestCase):
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
        self.category = Category.objects.create(name='Analgesics')
        self.company = Company.objects.create(name='Emzor', code='EMZ')

    def test_admin_can_create_product_with_variant(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('products-list-create'), {
            'name': 'Paracetamol 500mg',
            'generic_name': 'Acetaminophen',
            'category_id': self.category.id,
            'dosage': '500mg',
            'dosage_form': Product.DosageForm.TABLET,
            'variants': [{
                'company_id': self.company.id,
                'base_price': '80.00',
                'min_selling_price': '100.00',
                'default_selling_price': '120.00',
                'max_selling_price': '150.00',
                'current_stock': 20,
                'reorder_level': 5,
            }],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(ProductVariant.objects.count(), 1)
        self.assertEqual(PriceAdjustmentHistory.objects.count(), 1)

    def test_cashier_cannot_create_category(self):
        self.client.force_authenticate(self.cashier)

        response = self.client.post(reverse('categories-list-create'), {
            'name': 'Antibiotics',
            'description': '',
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_product_list_redacts_base_price(self):
        product = Product.objects.create(
            name='Paracetamol 500mg',
            generic_name='Acetaminophen',
            category=self.category,
            dosage='500mg',
            dosage_form=Product.DosageForm.TABLET,
        )
        ProductVariant.objects.create(
            product=product,
            company=self.company,
            base_price='80.00',
            min_selling_price='100.00',
            default_selling_price='120.00',
            max_selling_price='150.00',
            current_stock=20,
        )
        self.client.force_authenticate(self.cashier)

        response = self.client.get(reverse('products-list-create'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['meta']['current_page'], 1)
        self.assertEqual(response.data['meta']['per_page'], 15)
        self.assertEqual(response.data['meta']['total'], 1)
        self.assertEqual(response.data['meta']['total_pages'], 1)
        variant = response.data['data'][0]['variants'][0]
        self.assertNotIn('base_price', variant)

    def test_invalid_price_range_is_rejected(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('products-list-create'), {
            'name': 'Ibuprofen 200mg',
            'generic_name': 'Ibuprofen',
            'category_id': self.category.id,
            'dosage': '200mg',
            'dosage_form': Product.DosageForm.TABLET,
            'variants': [{
                'company_id': self.company.id,
                'base_price': '100.00',
                'min_selling_price': '90.00',
                'default_selling_price': '120.00',
                'max_selling_price': '150.00',
            }],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_price_adjustment_creates_history(self):
        product = Product.objects.create(
            name='Paracetamol 500mg',
            generic_name='Acetaminophen',
            category=self.category,
            dosage='500mg',
            dosage_form=Product.DosageForm.TABLET,
        )
        variant = ProductVariant.objects.create(
            product=product,
            company=self.company,
            base_price='80.00',
            min_selling_price='100.00',
            default_selling_price='120.00',
            max_selling_price='150.00',
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(reverse('products-variant-price-adjustment', args=[variant.id]), {
            'new_base_price': '85.00',
            'new_min_selling_price': '105.00',
            'new_default_selling_price': '130.00',
            'new_max_selling_price': '160.00',
            'reason': 'New purchase cost.',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PriceAdjustmentHistory.objects.count(), 1)
        variant.refresh_from_db()
        self.assertEqual(str(variant.default_selling_price), '130.00')
