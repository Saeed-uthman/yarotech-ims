from django.urls import path

from .views import (
    PurchaseCancelView,
    PurchaseDetailView,
    PurchaseListCreateView,
    PurchaseSummaryKpisView,
    SupplierDetailView,
    SupplierListCreateView,
)

urlpatterns = [
    path('suppliers/', SupplierListCreateView.as_view(), name='suppliers-list'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(), name='suppliers-detail'),
    path('purchases/', PurchaseListCreateView.as_view(), name='purchases-list'),
    path('purchases/summary-kpis/', PurchaseSummaryKpisView.as_view(), name='purchases-summary-kpis'),
    path('purchases/<int:pk>/', PurchaseDetailView.as_view(), name='purchases-detail'),
    path('purchases/<int:pk>/cancel/', PurchaseCancelView.as_view(), name='purchases-cancel'),
]
