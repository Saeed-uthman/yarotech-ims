from decimal import Decimal

from django.db.models import Q, Sum, Count, F, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from datetime import timedelta

from apps.accountability.models import AccountabilityTransaction
from apps.customers.models import Customer
from apps.inventory.models import InventoryMovement
from apps.purchases.models import StockPurchase
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


def get_overview_report(*, date_range=None):
    sales = Sale.objects.filter(status=Sale.Status.COMPLETED)
    purchases = StockPurchase.objects.filter(status=StockPurchase.Status.COMPLETED)

    if date_range:
        sales = _date_range_filter(sales, date_range)
        purchases = _date_range_filter(purchases, date_range)

    sales_agg = sales.aggregate(
        total_sales_count=Count('id'),
        total_revenue=Sum('total_amount'),
        total_collected=Sum('amount_paid'),
        total_outstanding=Sum('outstanding_amount'),
    )

    purchase_agg = purchases.aggregate(
        total_purchases_count=Count('id'),
        total_purchase_spend=Sum('total_amount'),
    )

    return {
        'total_sales_count': sales_agg['total_sales_count'] or 0,
        'total_revenue': sales_agg['total_revenue'] or Decimal('0.00'),
        'total_collected': sales_agg['total_collected'] or Decimal('0.00'),
        'total_outstanding': sales_agg['total_outstanding'] or Decimal('0.00'),
        'total_purchases_count': purchase_agg['total_purchases_count'] or 0,
        'total_purchase_spend': purchase_agg['total_purchase_spend'] or Decimal('0.00'),
    }


def get_sales_report(*, date_range=None):
    sales = Sale.objects.filter(status=Sale.Status.COMPLETED)

    if date_range:
        sales = _date_range_filter(sales, date_range)

    agg = sales.aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        total_collected=Sum('amount_paid'),
        total_outstanding=Sum('outstanding_amount'),
    )

    by_payment_method = list(
        sales.values('payment_method')
        .annotate(
            count=Count('id'),
            total=Sum('total_amount'),
        )
        .order_by('payment_method')
    )

    return {
        'total_sales': agg['total_sales'] or 0,
        'total_revenue': agg['total_revenue'] or Decimal('0.00'),
        'total_collected': agg['total_collected'] or Decimal('0.00'),
        'total_outstanding': agg['total_outstanding'] or Decimal('0.00'),
        'by_payment_method': by_payment_method,
    }


def get_profit_report(*, date_range=None):
    items = SaleItem.objects.filter(sale__status=Sale.Status.COMPLETED)

    if date_range:
        items = _date_range_filter(items, date_range, date_field='sale__created_at')

    agg = items.aggregate(
        total_revenue=Sum('subtotal'),
        total_cost=Sum(F('unit_base_price') * F('quantity')),
        total_profit=Sum('profit'),
    )

    total_revenue = agg['total_revenue'] or Decimal('0.00')
    total_cost = agg['total_cost'] or Decimal('0.00')
    total_profit = agg['total_profit'] or Decimal('0.00')
    margin = (total_profit / total_revenue * 100) if total_revenue > 0 else Decimal('0.00')

    return {
        'total_revenue': total_revenue,
        'total_cost': total_cost,
        'total_profit': total_profit,
        'margin_percentage': margin,
    }


def get_purchases_report(*, date_range=None):
    purchases = StockPurchase.objects.filter(status=StockPurchase.Status.COMPLETED)

    if date_range:
        purchases = _date_range_filter(purchases, date_range)

    agg = purchases.aggregate(
        total_purchases=Count('id'),
        total_spend=Sum('total_amount'),
    )

    by_payment_method = list(
        purchases.values('payment_method')
        .annotate(
            count=Count('id'),
            total=Sum('total_amount'),
        )
        .order_by('payment_method')
    )

    return {
        'total_purchases': agg['total_purchases'] or 0,
        'total_spend': agg['total_spend'] or Decimal('0.00'),
        'by_payment_method': by_payment_method,
    }


def get_financial_movement_report(*, date_range=None):
    txs = AccountabilityTransaction.objects.filter(
        status=AccountabilityTransaction.Status.COMPLETED
    )

    if date_range:
        txs = _date_range_filter(txs, date_range)

    agg = txs.aggregate(
        total_inflow=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.IN)),
        total_outflow=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.OUT)),
    )

    total_inflow = agg['total_inflow'] or Decimal('0.00')
    total_outflow = agg['total_outflow'] or Decimal('0.00')

    by_type = list(
        txs.values('type', 'direction')
        .annotate(
            count=Count('id'),
            total=Sum('amount'),
        )
        .order_by('type', 'direction')
    )

    return {
        'total_inflow': total_inflow,
        'total_outflow': total_outflow,
        'net_movement': total_inflow - total_outflow,
        'by_type': by_type,
    }


def get_inventory_movement_report(*, date_range=None):
    movements = InventoryMovement.objects.all()

    if date_range:
        movements = _date_range_filter(movements, date_range)

    agg = movements.aggregate(
        total_stock_in=Sum('quantity', filter=Q(movement_type=InventoryMovement.MovementType.STOCK_IN)),
        total_stock_out=Sum('quantity', filter=Q(movement_type=InventoryMovement.MovementType.STOCK_OUT)),
        total_adjustments=Sum('quantity', filter=Q(movement_type=InventoryMovement.MovementType.ADJUSTMENT)),
    )

    return {
        'total_stock_in': abs(agg['total_stock_in'] or 0),
        'total_stock_out': abs(agg['total_stock_out'] or 0),
        'total_adjustments': agg['total_adjustments'] or 0,
    }


def get_debt_report(*, date_range=None):
    customers = Customer.objects.filter(status=Customer.Status.ACTIVE)

    debtors = customers.annotate(
        outstanding=Sum(
            'sales__outstanding_amount',
            filter=Q(
                sales__status=Sale.Status.COMPLETED,
                sales__payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
            ),
        )
    ).filter(outstanding__gt=0)

    total_outstanding = debtors.aggregate(total=Sum('outstanding'))['total'] or Decimal('0.00')

    debt_payments = apps_get_debt_payments(date_range)

    return {
        'total_debtors': debtors.count(),
        'total_outstanding': total_outstanding,
        'total_debt_payments': debt_payments,
    }


def apps_get_debt_payments(date_range=None):
    from apps.customers.models import CustomerDebtPayment

    payments = CustomerDebtPayment.objects.all()
    if date_range:
        payments = _date_range_filter(payments, date_range)
    return payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
