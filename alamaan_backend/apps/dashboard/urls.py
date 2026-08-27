from django.urls import path

from .views import CashierDashboardView, DashboardView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('dashboard/cashier-summary/', CashierDashboardView.as_view(), name='dashboard-cashier-summary'),
]
