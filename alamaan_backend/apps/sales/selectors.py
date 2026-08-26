from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

from datetime import timedelta

from .models import Sale


def list_sales(*, search='', date_range=None, payment_status=None, customer_type=None):
    queryset = Sale.objects.select_related('customer', 'served_by')

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

    return queryset.order_by('-created_at')


def get_sale_receipt(*, sale_id):
    return (
        Sale.objects
        .select_related('customer', 'served_by')
        .prefetch_related('items__variant__product', 'items__variant__company')
        .get(pk=sale_id)
    )


def get_sales_kpis(*, date_range=None):
    queryset = Sale.objects.filter(status=Sale.Status.COMPLETED)

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
        total_sales=Sum('id'),
        total_revenue=Sum('total_amount'),
        total_amount_paid=Sum('amount_paid'),
    )

    total_sales = aggregates['total_sales'] or 0
    total_revenue = aggregates['total_revenue'] or Decimal('0.00')
    total_amount_paid = aggregates['total_amount_paid'] or Decimal('0.00')

    from django.db.models import F
    total_profit = (
        queryset
        .filter(payment_status=Sale.PaymentStatus.PAID)
        .aggregate(
            profit=Sum(F('items__profit'))
        )['profit'] or Decimal('0.00')
    )

    return {
        'total_sales': total_sales,
        'total_revenue': total_revenue,
        'total_amount_paid': total_amount_paid,
        'total_profit': total_profit,
        'average_sale_value': total_revenue / total_sales if total_sales > 0 else Decimal('0.00'),
    }
