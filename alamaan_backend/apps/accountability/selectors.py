from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date

from datetime import timedelta

from .models import AccountabilityTransaction


def _apply_date_filter(queryset, *, date_range=None, start_date=None, end_date=None):
    if date_range:
        now = timezone.now()
        if date_range == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)
        elif date_range == 'week':
            start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)
        elif date_range == 'month':
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            queryset = queryset.filter(created_at__gte=start)
    if start_date:
        parsed = parse_date(start_date)
        if parsed:
            queryset = queryset.filter(created_at__date__gte=parsed)
    if end_date:
        parsed = parse_date(end_date)
        if parsed:
            queryset = queryset.filter(created_at__date__lte=parsed)
    return queryset


def list_cashbook_movements(*, direction=None, tx_type=None, category=None, date_range=None, start_date=None, end_date=None, search='', ordering='-date'):
    queryset = AccountabilityTransaction.objects.filter(
        status=AccountabilityTransaction.Status.COMPLETED
    )

    if direction:
        queryset = queryset.filter(direction=direction)

    if tx_type:
        queryset = queryset.filter(type=tx_type)
    if category:
        queryset = queryset.filter(category=category)

    queryset = _apply_date_filter(
        queryset,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )

    if search:
        queryset = queryset.filter(
            Q(transaction_number__icontains=search)
            | Q(description__icontains=search)
            | Q(customer_name__icontains=search)
        )

    ordering_map = {'date': 'created_at', 'amount': 'amount', 'type': 'type'}
    descending = ordering.startswith('-')
    key = ordering[1:] if descending else ordering
    field = ordering_map.get(key, 'created_at')
    return queryset.select_related('created_by').order_by(f'-{field}' if descending else field)


def get_cashbook_summary(*, date_range=None, start_date=None, end_date=None):
    queryset = AccountabilityTransaction.objects.filter(
        status=AccountabilityTransaction.Status.COMPLETED
    )

    queryset = _apply_date_filter(
        queryset,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )

    aggregates = queryset.aggregate(
        total_in=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.IN)),
        total_out=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.OUT)),
        transaction_count=Count('id'),
        sales_income=Sum('amount', filter=Q(type=AccountabilityTransaction.TxType.SALE)),
        debt_income=Sum('amount', filter=Q(type=AccountabilityTransaction.TxType.DEBT_PAYMENT)),
        purchase_expense=Sum('amount', filter=Q(type=AccountabilityTransaction.TxType.STOCK_PURCHASE)),
        other_expense=Sum('amount', filter=Q(type=AccountabilityTransaction.TxType.OTHER_EXPENSE)),
    )

    total_in = aggregates['total_in'] or Decimal('0.00')
    total_out = aggregates['total_out'] or Decimal('0.00')

    return {
        'total_inflow': total_in,
        'total_outflow': total_out,
        'net_movement': total_in - total_out,
        'total_transactions_count': aggregates['transaction_count'] or 0,
        'sales_income': aggregates['sales_income'] or Decimal('0.00'),
        'debt_payments_income': aggregates['debt_income'] or Decimal('0.00'),
        'purchases_expense': aggregates['purchase_expense'] or Decimal('0.00'),
        'other_expenses_expense': aggregates['other_expense'] or Decimal('0.00'),
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
