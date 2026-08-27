from decimal import Decimal

from django.db.models import Q, Sum, Count, F
from django.utils import timezone

from datetime import timedelta

from apps.accountability.models import AccountabilityTransaction
from apps.customers.models import Customer
from apps.inventory.models import InventoryMovement
from apps.products.models import ProductVariant
from apps.sales.models import Sale, SaleItem


def _date_range_filter(queryset, date_range, date_field='created_at'):
    if date_range:
        now = timezone.now()
        if date_range == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(**{f'{date_field}__gte': start})
        elif date_range == 'week':
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(**{f'{date_field}__gte': start})
        elif date_range == 'month':
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(**{f'{date_field}__gte': start})
    return queryset


def get_admin_dashboard(*, date_range=None):
    sales = Sale.objects.filter(status=Sale.Status.COMPLETED)
    items = SaleItem.objects.filter(sale__status=Sale.Status.COMPLETED)

    if date_range:
        sales = _date_range_filter(sales, date_range)
        items = _date_range_filter(items, date_range, date_field='sale__created_at')

    sales_agg = sales.aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        total_collected=Sum('amount_paid'),
        total_outstanding=Sum('outstanding_amount'),
    )

    items_agg = items.aggregate(
        total_profit=Sum('profit'),
        total_units_sold=Sum('quantity'),
    )

    low_stock_count = ProductVariant.objects.filter(
        current_stock__lte=F('reorder_level'),
        status=ProductVariant.Status.AVAILABLE,
    ).count()

    total_customers = Customer.objects.filter(status=Customer.Status.ACTIVE).count()
    debtors_count = Customer.objects.filter(
        status=Customer.Status.ACTIVE,
        sales__payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
        sales__outstanding_amount__gt=0,
    ).distinct().count()

    return {
        'total_sales': sales_agg['total_sales'] or 0,
        'total_revenue': sales_agg['total_revenue'] or Decimal('0.00'),
        'total_collected': sales_agg['total_collected'] or Decimal('0.00'),
        'total_outstanding': sales_agg['total_outstanding'] or Decimal('0.00'),
        'total_profit': items_agg['total_profit'] or Decimal('0.00'),
        'total_units_sold': items_agg['total_units_sold'] or 0,
        'low_stock_alerts': low_stock_count,
        'total_customers': total_customers,
        'active_debtors': debtors_count,
    }


def get_cashier_dashboard(*, user, date_range=None):
    sales = Sale.objects.filter(status=Sale.Status.COMPLETED, served_by=user)
    items = SaleItem.objects.filter(sale__status=Sale.Status.COMPLETED, sale__served_by=user)

    if date_range:
        sales = _date_range_filter(sales, date_range)
        items = _date_range_filter(items, date_range, date_field='sale__created_at')

    sales_agg = sales.aggregate(
        total_checkouts=Count('id'),
        total_revenue=Sum('total_amount'),
        total_collected=Sum('amount_paid'),
    )

    items_agg = items.aggregate(
        total_units_dispensed=Sum('quantity'),
    )

    active_debtors = Customer.objects.filter(
        status=Customer.Status.ACTIVE,
        sales__payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
        sales__outstanding_amount__gt=0,
    ).distinct().count()

    low_stock_count = ProductVariant.objects.filter(
        current_stock__lte=F('reorder_level'),
        status=ProductVariant.Status.AVAILABLE,
    ).count()

    return {
        'total_checkouts': sales_agg['total_checkouts'] or 0,
        'total_revenue': sales_agg['total_revenue'] or Decimal('0.00'),
        'total_collected': sales_agg['total_collected'] or Decimal('0.00'),
        'total_units_dispensed': items_agg['total_units_dispensed'] or 0,
        'active_debtors': active_debtors,
        'low_stock_alerts': low_stock_count,
    }
