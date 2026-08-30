from django.urls import path

from .views import (
    SaleCancelView,
    SaleDetailView,
    SaleListCreateView,
    SaleReceiptView,
    SaleReturnView,
    SaleSummaryKpisView,
)

urlpatterns = [
    path('sales/', SaleListCreateView.as_view(), name='sales-list'),
    path('sales/summary-kpis/', SaleSummaryKpisView.as_view(), name='sales-summary-kpis'),
    path('sales/<int:pk>/', SaleDetailView.as_view(), name='sales-detail'),
    path('sales/<int:pk>/receipt/', SaleReceiptView.as_view(), name='sales-receipt'),
    path('sales/<int:pk>/cancel/', SaleCancelView.as_view(), name='sales-cancel'),
    path('sales/<int:pk>/returns/', SaleReturnView.as_view(), name='sales-return'),
]
