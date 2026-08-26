from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

from datetime import timedelta

from .models import StockPurchase


def list_purchases(*, search='', date_range=None, payment_method=None, status=None):
    queryset = StockPurchase.objects.select_related('recorded_by')

    if search:
        queryset = queryset.filter(
            Q(purchase_number__icontains=search)
            | Q(note__icontains=search)
            | Q(recorded_by__full_name__icontains=search)
        )

    if date_range:
        now = timezone.now()
        if date_range == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)
        elif date_range == 'week':
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)
        elif date_range == 'month':
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)

    if payment_method:
        queryset = queryset.filter(payment_method=payment_method)

    if status:
        queryset = queryset.filter(status=status)

    return queryset.order_by('-created_at')


def get_purchase_detail(*, purchase_id):
    return (
        StockPurchase.objects
        .select_related('recorded_by')
        .prefetch_related('items__variant__product', 'items__variant__company')
        .get(pk=purchase_id)
    )


def get_purchase_kpis(*, date_range=None):
    queryset = StockPurchase.objects.filter(status=StockPurchase.Status.COMPLETED)

    if date_range:
        now = timezone.now()
        if date_range == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)
        elif date_range == 'week':
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)
        elif date_range == 'month':
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)

    aggregates = queryset.aggregate(
        total_purchases=Sum('id'),
        total_spend=Sum('total_amount'),
    )

    total_purchases = aggregates['total_purchases'] or 0
    total_spend = aggregates['total_spend'] or Decimal('0.00')

    return {
        'total_purchases': total_purchases,
        'total_spend': total_spend,
        'average_purchase_value': total_spend / total_purchases if total_purchases > 0 else Decimal('0.00'),
    }
