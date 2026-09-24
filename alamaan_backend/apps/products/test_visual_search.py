from io import BytesIO
import json
from pathlib import Path
import tempfile
from unittest.mock import patch

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import User
from .models import Category, Company, Product, ProductVariant
from .visual_images import read_product_photo
from .visual_search import rebuild_index, load_index, search_photo, VisualSearchUnavailable, MODEL_VERSION


def jpeg(color='red'):
    output = BytesIO()
    Image.new('RGB', (100, 80), color).save(output, format='JPEG')
    return output.getvalue()


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class VisualSearchTests(APITestCase):
    def setUp(self):
        import numpy as np
        self.np = np
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.settings = override_settings(MEDIA_ROOT=self.root / 'media', VISUAL_SEARCH_DIR=self.root / 'index',
                                         VISUAL_SEARCH_ENABLED=True, VISUAL_SEARCH_MIN_SIMILARITY=0.65)
        self.settings.enable()
        self.addCleanup(self.settings.disable)
        cache.clear()
        self.admin = User.objects.create_superuser(email='photo-admin@example.com', password='StrongPass123!', full_name='Admin', phone='08000000001')
        self.cashier = User.objects.create_user(email='photo-cashier@example.com', password='StrongPass123!', full_name='Cashier',
                                               status=User.Status.ACTIVE, is_active=True, phone='08000000002')
        self.category = Category.objects.create(name='Networking')
        self.company = Company.objects.create(name='Brand A')
        self.product = Product.objects.create(name='Router', generic_name='Router', category=self.category,
                                              dosage='AX', dosage_form='Router', image=ContentFile(jpeg(), name='router.jpg'))
        self.variant = ProductVariant.objects.create(product=self.product, company=self.company, base_price=50,
            min_selling_price=100, default_selling_price=100, max_selling_price=150, current_stock=8)
        self.vector = np.zeros(512, dtype=np.float32)
        self.vector[0] = 1
        self.encoder = patch('apps.products.visual_search.embed', return_value=self.vector)
        self.encode = self.encoder.start()
        self.addCleanup(self.encoder.stop)
        self.client.force_authenticate(self.cashier)

    def photo(self, data=None):
        return SimpleUploadedFile('photo.jpg', jpeg() if data is None else data, content_type='image/jpeg')

    def search(self, data=None):
        return self.client.post(reverse('products-photo-search'), {'image': self.photo(data)}, format='multipart')

    def test_authentication_required(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.search().status_code, 401)

    @override_settings(VISUAL_SEARCH_ENABLED=False)
    def test_disabled_is_truthful_503(self):
        self.assertEqual(self.search().status_code, 503)

    def test_missing_index_is_503_and_does_not_create_one(self):
        self.assertEqual(self.search().status_code, 503)
        self.assertFalse((self.root / 'index' / 'index.npz').exists())

    def test_results_preserve_role_redaction_and_do_not_change_stock_or_save_query(self):
        rebuild_index()
        before = list((self.root / 'media').rglob('*'))
        response = self.search()
        self.assertEqual(response.status_code, 200)
        data = response.data['data']
        self.assertTrue(data['requires_confirmation'])
        self.assertEqual(data['matches'][0]['product']['id'], self.product.id)
        self.assertNotIn('base_price', data['matches'][0]['product']['variants'][0])
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.current_stock, 8)
        self.assertEqual(before, list((self.root / 'media').rglob('*')))

    def test_admin_results_retain_authorized_cost(self):
        rebuild_index()
        self.client.force_authenticate(self.admin)
        self.assertIn('base_price', self.search().data['data']['matches'][0]['product']['variants'][0])

    def test_invalid_oversized_and_excessive_dimensions_are_rejected(self):
        self.assertEqual(self.search(b'<svg/>').status_code, 400)
        self.assertEqual(self.search(b'x' * (4 * 1024 * 1024 + 1)).status_code, 400)
        with patch('apps.products.visual_images.MAX_PIXELS', 100):
            self.assertEqual(self.search().status_code, 400)
        narrow = BytesIO()
        Image.new('RGB', (32, 1024)).save(narrow, format='PNG')
        self.assertEqual(self.search(narrow.getvalue()).status_code, 400)
        self.encode.assert_not_called()

    def test_urls_are_not_accepted_as_photos(self):
        response = self.client.post(reverse('products-photo-search'), {'image': 'http://127.0.0.1/private'}, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_empty_index_returns_no_candidates(self):
        self.product.image = None
        self.product.save()
        rebuild_index()
        data = self.search().data['data']
        self.assertEqual(data['matches'], [])
        self.assertEqual(data['indexed_products'], 0)

    def test_replaced_and_inactive_photos_are_excluded_immediately(self):
        rebuild_index()
        self.product.image.save('replacement.jpg', ContentFile(jpeg('blue')))
        self.assertEqual(self.search().data['data']['matches'], [])
        rebuild_index()
        self.product.status = 'Inactive'
        self.product.save()
        self.assertEqual(self.search().data['data']['matches'], [])

    def test_low_similarity_returns_no_match_not_an_arbitrary_product(self):
        rebuild_index()
        other = self.np.zeros(512, dtype=self.np.float32)
        other[1] = 1
        self.encode.return_value = other
        self.assertEqual(self.search().data['data']['matches'], [])

    def test_refresh_reuses_unchanged_vectors_and_preserves_old_index_on_failure(self):
        rebuild_index()
        self.encode.reset_mock()
        rebuild_index()
        self.encode.assert_not_called()
        original = (self.root / 'index' / 'index.npz').read_bytes()
        self.product.image.save('new.jpg', ContentFile(jpeg('blue')))
        self.encode.side_effect = VisualSearchUnavailable()
        with self.assertRaises(VisualSearchUnavailable):
            rebuild_index()
        self.assertEqual((self.root / 'index' / 'index.npz').read_bytes(), original)

    def test_index_does_not_read_paths_outside_media(self):
        self.product.image = '../outside.jpg'
        self.product.save()
        (self.root / 'outside.jpg').write_bytes(jpeg())
        self.assertEqual(rebuild_index()['skipped_product_ids'], [self.product.pk])
        self.encode.assert_not_called()

    def test_rate_limit(self):
        rebuild_index()
        with patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'product_photo_search': '1/min'}):
            self.assertEqual(self.search().status_code, 200)
            self.assertEqual(self.search().status_code, 429)

    def test_admin_multipart_create_saves_image_and_nested_variants(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(reverse('products-list-create'), {
            'name': 'Switch', 'generic_name': 'Switch', 'category_id': self.category.pk,
            'dosage': '8 port', 'dosage_form': 'Switch', 'status': 'Active', 'image': self.photo(),
            'variants': json.dumps([{'company_id': self.company.pk, 'base_price': '50',
                'min_selling_price': '100', 'default_selling_price': '100', 'max_selling_price': '150',
                'current_stock': 0, 'reorder_level': 5}]),
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        created = Product.objects.get(pk=response.data['data']['id'])
        self.assertTrue(created.image.name.endswith('.jpg'))
        self.assertEqual(created.variants.count(), 1)
        self.assertTrue(Path(created.image.path).exists())

    def test_image_replace_remove_and_cashier_denial(self):
        url = reverse('products-detail', args=[self.product.pk])
        self.assertEqual(self.client.patch(url, {'image': self.photo()}, format='multipart').status_code, 403)
        self.client.force_authenticate(self.admin)
        old = self.product.image.name
        self.assertEqual(self.client.patch(url, {'image': self.photo()}, format='multipart').status_code, 200)
        self.product.refresh_from_db()
        self.assertNotEqual(self.product.image.name, old)
        self.assertEqual(self.client.patch(url, {'image': None}, format='json').status_code, 200)
        self.product.refresh_from_db()
        self.assertFalse(self.product.image)
