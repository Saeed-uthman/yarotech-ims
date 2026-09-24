from django.urls import path
from .visual_views import ProductPhotoSearchView

from .views import (
    CategoryListCreateView,
    CompanyListCreateView,
    ProductBarcodeLookupView,
    ProductDetailView,
    ProductKpiStatsView,
    ProductListCreateView,
    ProductVariantCreateView,
    ProductVariantDetailView,
    ProductVariantPriceAdjustmentView,
)

urlpatterns = [
    path('categories/', CategoryListCreateView.as_view(), name='categories-list-create'),
    path('companies/', CompanyListCreateView.as_view(), name='companies-list-create'),
    path('products/', ProductListCreateView.as_view(), name='products-list-create'),
    path('products/kpi-stats/', ProductKpiStatsView.as_view(), name='products-kpi-stats'),
    path('products/barcode-lookup/', ProductBarcodeLookupView.as_view(), name='products-barcode-lookup'),
    path('products/photo-search/', ProductPhotoSearchView.as_view(), name='products-photo-search'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='products-detail'),
    path('products/<int:pk>/variants/', ProductVariantCreateView.as_view(), name='products-variant-create'),
    path('products/variants/<int:pk>/', ProductVariantDetailView.as_view(), name='products-variant-detail'),
    path('products/variants/<int:pk>/price-adjustment/', ProductVariantPriceAdjustmentView.as_view(), name='products-variant-price-adjustment'),
]
