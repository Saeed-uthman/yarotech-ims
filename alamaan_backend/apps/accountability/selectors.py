from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

from datetime import timedelta

from .models import AccountabilityTransaction


def list_cashbook_movements(*, direction=None, tx_type=None, date_range=None, search=''):
    queryset = AccountabilityTransaction.objects.filter(
        status=AccountabilityTransaction.Status.COMPLETED
    )

    if direction:
        queryset = queryset.filter(direction=direction)

    if tx_type:
        queryset = queryset.filter(type=tx_type)

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

    if search:
        queryset = queryset.filter(
            Q(transaction_number__icontains=search)
            | Q(description__icontains=search)
            | Q(customer_name__icontains=search)
        )

    return queryset.order_by('-created_at')


def get_cashbook_summary(*, date_range=None):
    queryset = AccountabilityTransaction.objects.filter(
        status=AccountabilityTransaction.Status.COMPLETED
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

    aggregates = queryset.aggregate(
        total_in=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.IN)),
        total_out=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.OUT)),
    )

    total_in = aggregates['total_in'] or Decimal('0.00')
    total_out = aggregates['total_out'] or Decimal('0.00')

    return {
        'total_inflow': total_in,
        'total_outflow': total_out,
        'net_movement': total_in - total_out,
    }


def list_manual_expenses(*, date_range=None, search=''):
    from .models import ManualExpense

    queryset = ManualExpense.objects.all()

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

    if search:
        queryset = queryset.filter(
            Q(expense_number__icontains=search)
            | Q(description__icontains=search)
        )

    return queryset.order_by('-created_at')
