from django.urls import path

from .views import InventoryAdjustView, InventoryInsightsView, InventoryListView, InventoryMovementListView, InventorySummaryKpisView

urlpatterns = [
    path('inventory/', InventoryListView.as_view(), name='inventory-list'),
    path('inventory/summary-kpis/', InventorySummaryKpisView.as_view(), name='inventory-summary-kpis'),
    path('inventory/adjust/', InventoryAdjustView.as_view(), name='inventory-adjust'),
    path('inventory/movements/', InventoryMovementListView.as_view(), name='inventory-movements'),
    path('inventory/insights/', InventoryInsightsView.as_view(), name='inventory-insights'),
]
