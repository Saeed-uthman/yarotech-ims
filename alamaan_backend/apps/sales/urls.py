from django.urls import path

from .views import (
    WarrantyVerificationView,
    QuoteListCreateView,
    QuoteDetailView,
    QuoteConvertToSaleView,
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
    path('sales/verify-warranty/', WarrantyVerificationView.as_view(), name='sales-verify-warranty'),
    path('sales/quotes/', QuoteListCreateView.as_view(), name='quotes-list-create'),
    path('sales/quotes/<int:pk>/', QuoteDetailView.as_view(), name='quotes-detail'),
    path('sales/quotes/<int:pk>/convert/', QuoteConvertToSaleView.as_view(), name='quotes-convert'),
]
