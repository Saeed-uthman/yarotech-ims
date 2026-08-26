from django.urls import path

from .views import (
    ReportDebtView,
    ReportFinancialMovementView,
    ReportInventoryMovementView,
    ReportOverviewView,
    ReportProfitView,
    ReportPurchasesView,
    ReportSalesView,
)

urlpatterns = [
    path('reports/overview/', ReportOverviewView.as_view(), name='reports-overview'),
    path('reports/sales/', ReportSalesView.as_view(), name='reports-sales'),
    path('reports/profit/', ReportProfitView.as_view(), name='reports-profit'),
    path('reports/purchases/', ReportPurchasesView.as_view(), name='reports-purchases'),
    path('reports/financial-movement/', ReportFinancialMovementView.as_view(), name='reports-financial-movement'),
    path('reports/inventory-movement/', ReportInventoryMovementView.as_view(), name='reports-inventory-movement'),
    path('reports/debt/', ReportDebtView.as_view(), name='reports-debt'),
]
