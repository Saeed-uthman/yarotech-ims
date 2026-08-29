from django.urls import path

from .views import (
    CustomerDetailView,
    CustomerListCreateView,
    CustomerPaymentsHistoryView,
    CustomerSalesHistoryView,
    CustomerSummaryKpisView,
    CustomerToggleStatusView,
    DebtPaymentReceiptView,
    DebtPaymentReversalView,
    DebtPaymentView,
)

urlpatterns = [
    path('customers/', CustomerListCreateView.as_view(), name='customers-list'),
    path('customers/summary-kpis/', CustomerSummaryKpisView.as_view(), name='customers-summary-kpis'),
    path('customers/<int:pk>/', CustomerDetailView.as_view(), name='customers-detail'),
    path('customers/<int:pk>/toggle-status/', CustomerToggleStatusView.as_view(), name='customers-toggle-status'),
    path('customers/<int:pk>/sales/', CustomerSalesHistoryView.as_view(), name='customers-sales-history'),
    path('customers/<int:pk>/payments/', CustomerPaymentsHistoryView.as_view(), name='customers-payments-history'),
    path('payments/debt-payment/', DebtPaymentView.as_view(), name='debt-payment-create'),
    path('payments/receipt/<int:pk>/', DebtPaymentReceiptView.as_view(), name='debt-payment-receipt'),
    path('payments/<int:pk>/reverse/', DebtPaymentReversalView.as_view(), name='debt-payment-reverse'),
]
