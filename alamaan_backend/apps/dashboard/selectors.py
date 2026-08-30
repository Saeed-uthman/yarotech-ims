from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.accountability.models import AccountabilityTransaction
from apps.customers.models import Customer
from apps.products.models import ProductVariant
from apps.purchases.models import StockPurchase
from apps.sales.models import Sale, SaleItem, SaleReturnItem
from apps.settings_app.models import SystemSettings


ZERO = Decimal('0.00')


def _filter_period(queryset, *, date_range=None, start_date=None, end_date=None, date_field='created_at'):
    now = timezone.now()
    if date_range == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        queryset = queryset.filter(**{f'{date_field}__gte': start})
    elif date_range in {'week', 'this_week'}:
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        queryset = queryset.filter(**{f'{date_field}__gte': start})
    elif date_range in {'month', 'this_month'}:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        queryset = queryset.filter(**{f'{date_field}__gte': start})
    elif date_range == 'last_month':
        this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month = (this_month - timedelta(days=1)).replace(day=1)
        queryset = queryset.filter(**{f'{date_field}__gte': last_month, f'{date_field}__lt': this_month})

    if start_date:
        parsed = parse_date(start_date)
        if parsed:
            queryset = queryset.filter(**{f'{date_field}__date__gte': parsed})
    if end_date:
        parsed = parse_date(end_date)
        if parsed:
            queryset = queryset.filter(**{f'{date_field}__date__lte': parsed})
    return queryset


def _trend_label(value):
    return value.strftime('%d %b') if value else ''


def get_dashboard_data(*, user, date_range=None, start_date=None, end_date=None):
    is_admin = getattr(user, 'role', None) == 'admin'
    settings = SystemSettings.load()

    sales = Sale.objects.filter(status=Sale.Status.COMPLETED)
    items = SaleItem.objects.filter(sale__status=Sale.Status.COMPLETED)
    transactions = AccountabilityTransaction.objects.filter(
        status=AccountabilityTransaction.Status.COMPLETED,
    )
    if not is_admin:
        sales = sales.filter(served_by=user)
        items = items.filter(sale__served_by=user)
        transactions = transactions.filter(created_by=user)

    sales = _filter_period(
        sales,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )
    items = _filter_period(
        items,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        date_field='sale__created_at',
    )
    transactions = _filter_period(
        transactions,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )
    purchases = _filter_period(
        StockPurchase.objects.filter(status=StockPurchase.Status.COMPLETED),
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        date_field='purchase_date',
    ) if is_admin else StockPurchase.objects.none()

    sales_agg = sales.aggregate(
        transaction_count=Count('id'),
        total_sales=Sum('total_amount'),
        total_collected=Sum('amount_paid'),
    )
    items_agg = items.aggregate(items_sold=Sum('quantity'), total_profit=Sum('profit'))
    returned_items = _filter_period(
        SaleReturnItem.objects.all(),
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        date_field='return_record__created_at',
    )
    returned_agg = returned_items.aggregate(
        items_returned=Sum('quantity'),
        profit_reversed=Sum('profit_reversal'),
    )
    cash_agg = transactions.aggregate(
        money_in=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.IN)),
        money_out=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.OUT)),
        sales_collected=Sum(
            'amount',
            filter=Q(
                direction=AccountabilityTransaction.Direction.IN,
                type=AccountabilityTransaction.TxType.SALE,
            ),
        ),
        debt_recovered=Sum(
            'amount',
            filter=Q(
                direction=AccountabilityTransaction.Direction.IN,
                type=AccountabilityTransaction.TxType.DEBT_PAYMENT,
            ),
        ),
        stock_purchase_spend=Sum(
            'amount',
            filter=Q(
                direction=AccountabilityTransaction.Direction.OUT,
                type__in=[
                    AccountabilityTransaction.TxType.STOCK_PURCHASE,
                    AccountabilityTransaction.TxType.SUPPLIER_PAYMENT,
                ],
            ),
        ),
        operating_expenses=Sum(
            'amount',
            filter=Q(
                direction=AccountabilityTransaction.Direction.OUT,
                type=AccountabilityTransaction.TxType.OTHER_EXPENSE,
            ),
        ),
        cash_reversals=Sum(
            'amount',
            filter=Q(
                direction=AccountabilityTransaction.Direction.OUT,
                type__in=[
                    AccountabilityTransaction.TxType.SALE_REFUND,
                    AccountabilityTransaction.TxType.DEBT_PAYMENT_REVERSAL,
                ],
            ),
        ),
        purchase_returns=Sum(
            'amount',
            filter=Q(
                direction=AccountabilityTransaction.Direction.IN,
                type=AccountabilityTransaction.TxType.PURCHASE_RETURN,
            ),
        ),
    )
    purchase_agg = purchases.aggregate(
        purchases_count=Count('id'),
        total_purchases_amount=Sum('total_amount'),
    )

    active_variants = ProductVariant.objects.filter(status=ProductVariant.Status.AVAILABLE)
    inventory_value_expression = ExpressionWrapper(
        F('current_stock') * F('base_price'),
        output_field=DecimalField(max_digits=18, decimal_places=2),
    )
    inventory_agg = active_variants.aggregate(
        total_stock_units=Sum('current_stock'),
        inventory_value=Sum(inventory_value_expression),
        low_stock_count=Count(
            'id',
            filter=Q(
                current_stock__gt=0,
                current_stock__lte=settings.low_stock_threshold,
            ),
        ),
        out_of_stock_count=Count('id', filter=Q(current_stock=0)),
    )

    outstanding_debt = Sale.objects.filter(
        status=Sale.Status.COMPLETED,
        outstanding_amount__gt=0,
    ).aggregate(value=Sum('outstanding_amount'))['value'] or ZERO
    debtor_count = Customer.objects.filter(
        status=Customer.Status.ACTIVE,
        sales__status=Sale.Status.COMPLETED,
        sales__outstanding_amount__gt=0,
    ).distinct().count()
    registered_customers = Customer.objects.filter(status=Customer.Status.ACTIVE).count()

    total_sales = sales_agg['total_sales'] or ZERO
    total_profit = (
        (items_agg['total_profit'] or ZERO) - (returned_agg['profit_reversed'] or ZERO)
    ) if is_admin else ZERO
    items_sold = (items_agg['items_sold'] or 0) - (returned_agg['items_returned'] or 0)
    money_in = cash_agg['money_in'] or ZERO
    money_out = cash_agg['money_out'] or ZERO
    sales_collected = cash_agg['sales_collected'] or ZERO
    debt_recovered = cash_agg['debt_recovered'] or ZERO
    stock_purchase_spend = cash_agg['stock_purchase_spend'] or ZERO
    operating_expenses = cash_agg['operating_expenses'] or ZERO
    cash_reversals = cash_agg['cash_reversals'] or ZERO
    purchase_returns = cash_agg['purchase_returns'] or ZERO
    net_cash_generated = (
        sales_collected
        + debt_recovered
        + purchase_returns
        - stock_purchase_spend
        - operating_expenses
        - cash_reversals
    )

    sales_daily = {
        row['date']: row
        for row in sales.annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(sales=Sum('total_amount'), transactions=Count('id'))
        .order_by('date')
    }
    profit_daily = {
        row['date']: row['profit'] or ZERO
        for row in items.annotate(date=TruncDate('sale__created_at'))
        .values('date')
        .annotate(profit=Sum('profit'))
    }
    financial_daily = {
        row['date']: row
        for row in transactions.annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(
            money_in=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.IN)),
            money_out=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.OUT)),
        )
        .order_by('date')
    }
    trend_dates = sorted(set(sales_daily) | set(financial_daily))
    sales_trends = []
    financial_trends = []
    for date in trend_dates:
        sale_row = sales_daily.get(date, {})
        cash_row = financial_daily.get(date, {})
        daily_in = cash_row.get('money_in') or ZERO
        daily_out = cash_row.get('money_out') or ZERO
        sales_trends.append({
            'date': date,
            'label': _trend_label(date),
            'sales': sale_row.get('sales') or ZERO,
            'profit': profit_daily.get(date, ZERO) if is_admin else ZERO,
            'transactions': sale_row.get('transactions') or 0,
        })
        financial_trends.append({
            'date': date,
            'label': _trend_label(date),
            'money_in': daily_in,
            'money_out': daily_out,
            'net_movement': daily_in - daily_out,
        })

    top_products = list(
        items.values(
            'variant_id',
            product_id=F('variant__product_id'),
            product_name=F('variant__product__name'),
            generic_name=F('variant__product__generic_name'),
            company_name=F('variant__company__name'),
            category_name=F('variant__product__category__name'),
            current_stock=F('variant__current_stock'),
        )
        .annotate(
            units_sold=Sum('quantity'),
            revenue=Sum('subtotal'),
            profit=Sum('profit'),
        )
        .order_by('-units_sold')[:5]
    )
    if not is_admin:
        for row in top_products:
            row['profit'] = ZERO

    stock_alerts = [
        {
            'product_id': variant.product_id,
            'variant_id': variant.id,
            'product_name': variant.product.name,
            'generic_name': variant.product.generic_name,
            'company_name': variant.company.name,
            'current_stock': variant.current_stock,
            'reorder_level': settings.low_stock_threshold,
            'status': 'out_of_stock' if variant.current_stock == 0 else 'low_stock',
        }
        for variant in active_variants.select_related('product', 'company')
        .filter(
            Q(current_stock=0)
            | Q(
                current_stock__gt=0,
                current_stock__lte=settings.low_stock_threshold,
            )
        )
        .order_by('current_stock')[:8]
    ]

    recent_sales_qs = Sale.objects.filter(status=Sale.Status.COMPLETED)
    if not is_admin:
        recent_sales_qs = recent_sales_qs.filter(served_by=user)
    recent_sales = [
        {
            'id': sale.id,
            'receipt_number': sale.invoice_number,
            'date': sale.created_at,
            'raw_date': sale.created_at,
            'customer_name': sale.customer.name if sale.customer else 'Walking Customer',
            'is_walk_in': sale.customer_id is None,
            'total_amount': sale.total_amount,
            'payment_method': sale.payment_method,
            'payment_status': sale.payment_status,
            'item_count': sale.item_count or 0,
        }
        for sale in recent_sales_qs.select_related('customer')
        .annotate(item_count=Sum('items__quantity'))
        .order_by('-created_at')[:6]
    ]

    recent_purchases = []
    if is_admin:
        recent_purchase_qs = (
            StockPurchase.objects.filter(status=StockPurchase.Status.COMPLETED)
            .prefetch_related('items__variant__company')
            .order_by('-purchase_date')[:4]
        )
        for purchase in recent_purchase_qs:
            purchase_items = list(purchase.items.all())
            first_item = purchase_items[0] if purchase_items else None
            recent_purchases.append({
                'id': purchase.id,
                'invoice_number': purchase.purchase_number,
                'purchase_date': purchase.purchase_date,
                'raw_date': purchase.purchase_date,
                'company_name': first_item.variant.company.name if first_item else 'Multiple Manufacturers',
                'total_amount': purchase.total_amount,
                'payment_status': 'PAID',
                'items_count': len(purchase_items),
            })

    summary = {
        'total_sales': total_sales,
        'total_profit': total_profit,
        'transaction_count': sales_agg['transaction_count'] or 0,
        'items_sold': items_sold,
        'money_in': money_in,
        'money_out': money_out,
        'net_money_movement': money_in - money_out,
        'sales_collected': sales_collected,
        'debt_recovered': debt_recovered,
        'stock_purchase_spend': stock_purchase_spend,
        'operating_expenses': operating_expenses,
        'cash_reversals': cash_reversals,
        'purchase_returns': purchase_returns,
        'net_cash_generated': net_cash_generated,
        'outstanding_debt': outstanding_debt,
        'debtor_count': debtor_count,
        'inventory_value': (inventory_agg['inventory_value'] or ZERO) if is_admin else ZERO,
        'total_stock_units': inventory_agg['total_stock_units'] or 0,
        'low_stock_count': inventory_agg['low_stock_count'] or 0,
        'out_of_stock_count': inventory_agg['out_of_stock_count'] or 0,
        'registered_customers_count': registered_customers,
        'total_purchases_amount': purchase_agg['total_purchases_amount'] or ZERO,
        'purchases_count': purchase_agg['purchases_count'] or 0,
    }
    data = {
        'summary': summary,
        'sales_trends': sales_trends,
        'financial_movement_trends': financial_trends if is_admin else [],
        'top_products': top_products,
        'recent_sales': recent_sales,
        'recent_purchases': recent_purchases,
        'stock_alerts': stock_alerts,
        'low_stock_threshold': settings.low_stock_threshold,
    }

    if is_admin:
        data.update({
            'total_sales': summary['transaction_count'],
            'total_revenue': total_sales,
            'total_collected': sales_agg['total_collected'] or ZERO,
            'total_outstanding': outstanding_debt,
            'total_profit': total_profit,
            'total_units_sold': summary['items_sold'],
            'low_stock_alerts': summary['low_stock_count'] + summary['out_of_stock_count'],
            'total_customers': registered_customers,
            'active_debtors': debtor_count,
        })
    else:
        data.update({
            'total_checkouts': summary['transaction_count'],
            'total_revenue': total_sales,
            'total_collected': sales_agg['total_collected'] or ZERO,
            'total_units_dispensed': summary['items_sold'],
            'active_debtors': debtor_count,
            'low_stock_alerts': summary['low_stock_count'] + summary['out_of_stock_count'],
        })
    return data


def get_admin_dashboard(*, user, date_range=None, start_date=None, end_date=None):
    return get_dashboard_data(
        user=user,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )


def get_cashier_dashboard(*, user, date_range=None, start_date=None, end_date=None):
    return get_dashboard_data(
        user=user,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )
