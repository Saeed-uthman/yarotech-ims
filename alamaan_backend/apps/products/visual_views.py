import time
import logging

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.responses import success_response
from .serializers import ProductListSerializer
from .visual_images import read_product_photo
from .visual_search import search_photo, VisualSearchUnavailable

logger = logging.getLogger(__name__)


class PhotoSearchInputSerializer(serializers.Serializer):
    # FileField intentionally validates decoded dimensions before Pillow loads
    # pixel data; DRF's ImageField may verify it first with a much larger limit.
    image = serializers.FileField()

    def validate_image(self, value):
        return read_product_photo(value)


class PhotoMatchSerializer(serializers.Serializer):
    product = ProductListSerializer()
    similarity = serializers.FloatField(help_text='Cosine similarity, not a confidence percentage.')


class PhotoSearchResultSerializer(serializers.Serializer):
    matches = PhotoMatchSerializer(many=True)
    indexed_products = serializers.IntegerField()
    requires_confirmation = serializers.BooleanField()


class ProductPhotoSearchView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    throttle_scope = 'product_photo_search'

    @extend_schema(request=PhotoSearchInputSerializer, responses={200: PhotoSearchResultSerializer})
    def post(self, request):
        if not settings.VISUAL_SEARCH_ENABLED:
            raise VisualSearchUnavailable()
        incoming = PhotoSearchInputSerializer(data=request.data)
        incoming.is_valid(raise_exception=True)
        started = time.monotonic()
        matches, count = search_photo(incoming.validated_data['image'])
        data = {
            'matches': [{'product': ProductListSerializer(product, context={'request': request}).data,
                         'similarity': score} for product, score in matches],
            'indexed_products': count,
            'requires_confirmation': True,
        }
        logger.info('photo_search_completed matches=%s duration_ms=%s', len(matches), round((time.monotonic() - started) * 1000))
        response = Response(success_response(data))
        response['Cache-Control'] = 'no-store'
        return response
