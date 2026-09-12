from django.db.models import Count, Max, Q, Sum
from django.utils import timezone

from datetime import timedelta

from apps.sales.models import Sale

from .models import Customer, CustomerDebtPayment

NINETY_DAYS = timedelta(days=90)


def _with_customer_metrics(queryset):
    completed_sales = Q(sales__status=Sale.Status.COMPLETED)
    outstanding_sales = completed_sales & Q(sales__outstanding_amount__gt=0)
    return queryset.annotate(
        metric_outstanding_debt=Sum(
            'sales__outstanding_amount',
            filter=outstanding_sales,
            default=0,
        ),
        metric_total_purchases=Count('sales', filter=completed_sales, distinct=True),
        metric_sales_count=Count('sales', filter=completed_sales, distinct=True),
        metric_amount_paid=Sum('sales__amount_paid', filter=completed_sales, default=0),
        metric_last_purchase_date=Max('sales__created_at', filter=completed_sales),
    )


def list_customers(*, search='', status=None, ordering='name'):
    queryset = _with_customer_metrics(Customer.objects.all())

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(phone__icontains=search)
            | Q(email__icontains=search)
        )
    if status:
        queryset = queryset.filter(status=status)

    ordering_map = {
        'name': 'name',
        'debt': 'metric_outstanding_debt',
        'purchases': 'metric_total_purchases',
        'date': 'created_at',
    }
    descending = ordering.startswith('-')
    ordering_key = ordering[1:] if descending else ordering
    ordering_field = ordering_map.get(ordering_key, 'name')
    if descending:
        ordering_field = f'-{ordering_field}'
    return queryset.order_by(ordering_field, 'pk')


def get_customer_detail(*, customer_id):
    return _with_customer_metrics(Customer.objects.all()).get(pk=customer_id)


def list_debtors(*, search=''):
    queryset = (
        _with_customer_metrics(Customer.objects.all())
        .filter(metric_outstanding_debt__gt=0)
    )

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(phone__icontains=search)
        )

    return queryset.order_by('-metric_outstanding_debt')


def get_customer_debt_ledger(*, customer_id):
    return (
        Sale.objects
        .filter(
            customer_id=customer_id,
            status=Sale.Status.COMPLETED,
            payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
        )
        .order_by('created_at')
    )


def list_customer_payments(*, customer_id):
    return (
        CustomerDebtPayment.objects
        .filter(customer_id=customer_id)
        .select_related('recorded_by')
        .order_by('-created_at')
    )


def get_customer_kpis():
    now = timezone.now()
    cutoff = now - NINETY_DAYS

    debt_summary = (
        Sale.objects
        .filter(
            status=Sale.Status.COMPLETED,
            payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
        )
        .aggregate(
            total_outstanding=Sum('outstanding_amount'),
        )
    )

    total_debtors = (
        Customer.objects
        .filter(
            sales__status=Sale.Status.COMPLETED,
            sales__payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
            sales__outstanding_amount__gt=0,
        )
        .distinct()
        .count()
    )

    return {
        'total_customers': Customer.objects.count(),
        'active_customers': Customer.objects.filter(status=Customer.Status.ACTIVE).count(),
        'inactive_customers': Customer.objects.filter(status=Customer.Status.INACTIVE).count(),
        'dormant_90_days': Customer.objects.filter(
            status=Customer.Status.ACTIVE,
            created_at__lt=cutoff,
        ).count(),
        'total_debtors': total_debtors,
        'total_outstanding_amount': debt_summary['total_outstanding'] or 0,
    }
