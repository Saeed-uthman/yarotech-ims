from django.urls import path

from .views import (
    CashbookListView,
    CashbookSummaryView,
    ManualExpenseCreateView,
    ManualExpenseListView,
)

urlpatterns = [
    path('accountability/', CashbookListView.as_view(), name='accountability-list'),
    path('accountability/summary/', CashbookSummaryView.as_view(), name='accountability-summary'),
    path('accountability/expenses/', ManualExpenseCreateView.as_view(), name='accountability-expenses-create'),
    path('accountability/expenses/list/', ManualExpenseListView.as_view(), name='accountability-expenses-list'),
]
