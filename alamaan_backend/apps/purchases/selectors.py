from decimal import Decimal

from django.db.models import Count, F, Prefetch, Q, Sum
from django.utils import timezone

from datetime import timedelta

from .models import PurchaseItem, StockPurchase


def list_purchases(*, search='', date_range=None, payment_method=None, status=None, ordering='-date'):
    queryset = (
        StockPurchase.objects.select_related('recorded_by')
        .annotate(
            list_items_count=Count('items'),
            list_total_units=Sum('items__quantity'),
        )
        .prefetch_related(
            Prefetch(
                'items',
                queryset=PurchaseItem.objects.select_related(
                    'variant__product',
                    'variant__company',
                ).order_by('id'),
                to_attr='list_items',
            )
        )
    )

    if search:
        queryset = queryset.filter(
            Q(purchase_number__icontains=search)
            | Q(supplier_name__icontains=search)
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

    ordering_map = {'date': 'created_at', 'total': 'total_amount'}
    descending = ordering.startswith('-')
    ordering_key = ordering[1:] if descending else ordering
    ordering_field = ordering_map.get(ordering_key, 'created_at')
    if descending:
        ordering_field = f'-{ordering_field}'
    return queryset.order_by(ordering_field)


def get_purchase_detail(*, purchase_id):
    return (
        StockPurchase.objects
        .select_related('recorded_by')
        .prefetch_related('items__variant__product', 'items__variant__company')
        .get(pk=purchase_id)
    )


def _apply_date_filter(queryset, date_range):
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
    return queryset


def get_purchase_kpis(*, date_range=None):
    base_qs = _apply_date_filter(StockPurchase.objects.all(), date_range)

    completed_qs = base_qs.filter(status=StockPurchase.Status.COMPLETED)
    cancelled_qs = base_qs.filter(status=StockPurchase.Status.CANCELLED)

    completed_agg = completed_qs.aggregate(
        total_spend=Sum('total_amount'),
        total_units=Sum('items__quantity'),
    )
    cancelled_count = cancelled_qs.count()

    total_purchases = base_qs.count()
    total_spend = completed_agg['total_spend'] or Decimal('0.00')
    total_units = completed_agg['total_units'] or 0

    return {
        'total_purchases': total_purchases,
        'completed_purchases': total_purchases - cancelled_count,
        'cancelled_purchases': cancelled_count,
        'total_spend': total_spend,
        'total_units_restocked': total_units,
        'average_purchase_value': total_spend / (total_purchases - cancelled_count) if (total_purchases - cancelled_count) > 0 else Decimal('0.00'),
    }
