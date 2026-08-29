from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from datetime import timedelta

from .models import Sale


def _visible_sales_for(user):
    queryset = Sale.objects.all()
    if getattr(user, 'role', None) != 'admin':
        queryset = queryset.filter(served_by=user)
    return queryset


def list_sales(*, user, search='', date_range=None, payment_status=None, customer_type=None, ordering='-date'):
    queryset = _visible_sales_for(user).select_related('customer', 'served_by').annotate(
        list_items_count=Count('items'),
    )

    if search:
        queryset = queryset.filter(
            Q(invoice_number__icontains=search)
            | Q(customer__name__icontains=search)
            | Q(customer__phone__icontains=search)
            | Q(served_by__full_name__icontains=search)
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

    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)

    if customer_type == 'walk_in':
        queryset = queryset.filter(customer__isnull=True)
    elif customer_type == 'registered':
        queryset = queryset.filter(customer__isnull=False)

    ordering_map = {
        'date': 'created_at',
        'total': 'total_amount',
        'customer': 'customer__name',
        'invoiceNumber': 'invoice_number',
    }
    descending = ordering.startswith('-')
    ordering_key = ordering[1:] if descending else ordering
    ordering_field = ordering_map.get(ordering_key, 'created_at')
    if descending:
        ordering_field = f'-{ordering_field}'
    return queryset.order_by(ordering_field)


def get_sale_receipt(*, user, sale_id):
    queryset = (
        _visible_sales_for(user)
        .select_related('customer', 'served_by')
        .prefetch_related('items__variant__product', 'items__variant__company')
    )
    return get_object_or_404(queryset, pk=sale_id)


def get_sales_kpis(*, user, date_range=None):
    queryset = _visible_sales_for(user).filter(status=Sale.Status.COMPLETED)

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
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        total_amount_paid=Sum('amount_paid'),
        total_outstanding=Sum('outstanding_amount'),
        paid_count=Count('id', filter=Q(payment_status=Sale.PaymentStatus.PAID)),
        partial_count=Count('id', filter=Q(payment_status=Sale.PaymentStatus.PARTIAL)),
        unpaid_count=Count('id', filter=Q(payment_status=Sale.PaymentStatus.UNPAID)),
    )

    total_sales = aggregates['total_sales'] or 0
    total_revenue = aggregates['total_revenue'] or Decimal('0.00')
    total_amount_paid = aggregates['total_amount_paid'] or Decimal('0.00')
    total_outstanding = aggregates['total_outstanding'] or Decimal('0.00')

    from django.db.models import F
    total_profit = (
        queryset.aggregate(
            profit=Sum(F('items__profit'))
        )['profit'] or Decimal('0.00')
    )

    return {
        'total_sales': total_sales,
        'total_transactions': total_sales,
        'total_revenue': total_revenue,
        'total_amount_paid': total_amount_paid,
        'total_outstanding': total_outstanding,
        'paid_count': aggregates['paid_count'],
        'partial_count': aggregates['partial_count'],
        'unpaid_count': aggregates['unpaid_count'],
        'total_profit': total_profit,
        'average_sale_value': total_revenue / total_sales if total_sales > 0 else Decimal('0.00'),
    }
