from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.accountability.models import AccountabilityTransaction
from apps.customers.models import Customer, CustomerDebtPayment
from apps.inventory.models import InventoryMovement
from apps.products.models import ProductVariant
from apps.purchases.models import PurchaseItem, StockPurchase
from apps.sales.models import Sale, SaleItem


ZERO = Decimal('0.00')


def _filter_period(queryset, *, date_range=None, start_date=None, end_date=None, date_field='created_at'):
    now = timezone.now()
    if date_range == 'today':
        queryset = queryset.filter(**{f'{date_field}__gte': now.replace(hour=0, minute=0, second=0, microsecond=0)})
    elif date_range in {'week', 'this_week'}:
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        queryset = queryset.filter(**{f'{date_field}__gte': start})
    elif date_range in {'month', 'this_month'}:
        queryset = queryset.filter(**{f'{date_field}__gte': now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)})
    elif date_range == 'last_month':
        this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_month = (this_month - timedelta(days=1)).replace(day=1)
        queryset = queryset.filter(**{f'{date_field}__gte': previous_month, f'{date_field}__lt': this_month})
    elif date_range == 'this_year':
        queryset = queryset.filter(**{f'{date_field}__gte': now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)})

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


def _reporting_period(*, date_range=None, start_date=None, end_date=None):
    today = timezone.localdate()
    if date_range == 'today':
        start = finish = today
    elif date_range in {'week', 'this_week'}:
        start, finish = today - timedelta(days=today.weekday()), today
    elif date_range in {'month', 'this_month'}:
        start, finish = today.replace(day=1), today
    elif date_range == 'last_month':
        first_this_month = today.replace(day=1)
        finish = first_this_month - timedelta(days=1)
        start = finish.replace(day=1)
    elif date_range == 'this_year':
        start, finish = today.replace(month=1, day=1), today
    else:
        start = parse_date(start_date) if start_date else None
        finish = parse_date(end_date) if end_date else None
    return (
        start.isoformat() if start else '',
        finish.isoformat() if finish else '',
    )


def _common_querysets(*, date_range=None, start_date=None, end_date=None):
    sales = _filter_period(Sale.objects.filter(status=Sale.Status.COMPLETED), date_range=date_range, start_date=start_date, end_date=end_date)
    items = _filter_period(SaleItem.objects.filter(sale__status=Sale.Status.COMPLETED), date_range=date_range, start_date=start_date, end_date=end_date, date_field='sale__created_at')
    purchases = _filter_period(
        StockPurchase.objects.filter(status=StockPurchase.Status.COMPLETED),
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        date_field='purchase_date',
    )
    return sales, items, purchases


def get_overview_report(*, date_range=None, start_date=None, end_date=None):
    sales, items, purchases = _common_querysets(date_range=date_range, start_date=start_date, end_date=end_date)
    purchase_items = _filter_period(
        PurchaseItem.objects.filter(purchase__status=StockPurchase.Status.COMPLETED),
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        date_field='purchase__purchase_date',
    )
    transactions = _filter_period(AccountabilityTransaction.objects.filter(status=AccountabilityTransaction.Status.COMPLETED), date_range=date_range, start_date=start_date, end_date=end_date)
    sales_agg = sales.aggregate(total_sales_count=Count('id'), total_revenue=Sum('total_amount'), total_collected=Sum('amount_paid'), total_outstanding=Sum('outstanding_amount'))
    item_agg = items.aggregate(total_profit=Sum('profit'), total_units_sold=Sum('quantity'))
    purchase_agg = purchases.aggregate(
        total_purchases_count=Count('id'),
        total_purchase_spend=Sum('total_amount'),
    )
    purchase_agg['total_units_purchased'] = purchase_items.aggregate(value=Sum('quantity'))['value'] or 0
    cash_agg = transactions.aggregate(money_in=Sum('amount', filter=Q(direction='IN')), money_out=Sum('amount', filter=Q(direction='OUT')), total_transactions=Count('id'))
    revenue = sales_agg['total_revenue'] or ZERO
    profit = item_agg['total_profit'] or ZERO
    money_in, money_out = cash_agg['money_in'] or ZERO, cash_agg['money_out'] or ZERO
    reporting_start, reporting_end = _reporting_period(
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )
    return {
        **{key: value or 0 for key, value in sales_agg.items()},
        **{key: value or 0 for key, value in purchase_agg.items()},
        'total_profit': profit,
        'profit_margin_percentage': (profit / revenue * 100) if revenue else ZERO,
        'money_in': money_in, 'money_out': money_out, 'net_money_movement': money_in - money_out,
        'total_transactions': cash_agg['total_transactions'] or 0,
        'total_units_sold': item_agg['total_units_sold'] or 0,
        'average_sale_value': revenue / (sales_agg['total_sales_count'] or 1),
        'date_range': date_range or ('custom' if start_date or end_date else 'overall'),
        'start_date': reporting_start,
        'end_date': reporting_end,
    }


def get_sales_report(*, date_range=None, start_date=None, end_date=None, payment_method=None, category_id=None, company_id=None, product_id=None):
    sales, items, _ = _common_querysets(date_range=date_range, start_date=start_date, end_date=end_date)
    if payment_method:
        sales, items = sales.filter(payment_method=payment_method), items.filter(sale__payment_method=payment_method)
    if category_id:
        items = items.filter(variant__product__category_id=category_id)
    if company_id:
        items = items.filter(variant__company_id=company_id)
    if product_id:
        items = items.filter(variant__product_id=product_id)
    has_dimension_filter = any([category_id, company_id, product_id])
    if has_dimension_filter:
        sales = sales.filter(items__in=items).distinct()
    sales_agg = sales.aggregate(total_sales=Count('id', distinct=True), total_revenue=Sum('total_amount'))
    item_agg = items.aggregate(total_profit=Sum('profit'), total_items_sold=Sum('quantity'), filtered_revenue=Sum('subtotal'))
    revenue = (item_agg['filtered_revenue'] if has_dimension_filter else sales_agg['total_revenue']) or ZERO
    profit = item_agg['total_profit'] or ZERO
    if has_dimension_filter:
        by_method = list(
            items.values(method=F('sale__payment_method'))
            .annotate(amount=Sum('subtotal'), count=Count('sale_id', distinct=True))
            .order_by('method')
        )
    else:
        by_method = list(
            sales.values(method=F('payment_method'))
            .annotate(amount=Sum('total_amount'), count=Count('id'))
            .order_by('method')
        )
    for row in by_method:
        row['percentage'] = (row['amount'] / revenue * 100) if revenue else ZERO
    trends = list(items.annotate(date=TruncDate('sale__created_at')).values('date').annotate(sales=Sum('subtotal'), profit=Sum('profit'), units_sold=Sum('quantity'), transactions_count=Count('sale_id', distinct=True)).order_by('date'))
    for row in trends:
        row['label'] = _trend_label(row['date'])
    by_category = list(items.values(category_id=F('variant__product__category_id'), category_name=F('variant__product__category__name')).annotate(units_sold=Sum('quantity'), revenue=Sum('subtotal'), profit=Sum('profit')).order_by('-revenue'))
    by_company = list(items.values(company_id=F('variant__company_id'), company_name=F('variant__company__name')).annotate(units_sold=Sum('quantity'), revenue=Sum('subtotal'), profit=Sum('profit')).order_by('-revenue'))
    return {
        'summary': {'total_sales': revenue, 'total_profit': profit, 'profit_margin_percentage': (profit / revenue * 100) if revenue else ZERO, 'transactions_count': sales_agg['total_sales'] or 0, 'average_sale_value': revenue / (sales_agg['total_sales'] or 1), 'total_items_sold': item_agg['total_items_sold'] or 0},
        'trends': trends, 'sales_by_payment_method': by_method, 'sales_by_category': by_category, 'sales_by_company': by_company,
        'total_sales': sales_agg['total_sales'] or 0, 'total_revenue': revenue,
        'total_collected': sales.aggregate(value=Sum('amount_paid'))['value'] or ZERO,
        'total_outstanding': sales.aggregate(value=Sum('outstanding_amount'))['value'] or ZERO,
        'by_payment_method': by_method,
    }


def get_profit_report(*, date_range=None, start_date=None, end_date=None, category_id=None, company_id=None, product_id=None):
    _, items, _ = _common_querysets(date_range=date_range, start_date=start_date, end_date=end_date)
    if category_id:
        items = items.filter(variant__product__category_id=category_id)
    if company_id:
        items = items.filter(variant__company_id=company_id)
    if product_id:
        items = items.filter(variant__product_id=product_id)
    cost_expr = ExpressionWrapper(F('unit_base_price') * F('quantity'), output_field=DecimalField(max_digits=16, decimal_places=2))
    agg = items.aggregate(total_revenue=Sum('subtotal'), total_cost=Sum(cost_expr), total_profit=Sum('profit'), total_sold_units=Sum('quantity'))
    revenue, cost, profit = agg['total_revenue'] or ZERO, agg['total_cost'] or ZERO, agg['total_profit'] or ZERO
    def dimension(id_field, name_field, id_key, name_key):
        rows = list(items.values(**{id_key: F(id_field), name_key: F(name_field)}).annotate(revenue=Sum('subtotal'), cost=Sum(cost_expr), profit=Sum('profit')).order_by('-profit'))
        for row in rows:
            row['margin_pct'] = (row['profit'] / row['revenue'] * 100) if row['revenue'] else ZERO
        return rows
    top = list(items.values(product_id=F('variant__product_id'), product_name=F('variant__product__name'), generic_name=F('variant__product__generic_name'), company_name=F('variant__company__name')).annotate(units_sold=Sum('quantity'), revenue=Sum('subtotal'), cost=Sum(cost_expr), profit=Sum('profit')).order_by('-profit')[:20])
    for row in top:
        row['margin_pct'] = (row['profit'] / row['revenue'] * 100) if row['revenue'] else ZERO
    trends = list(items.annotate(date=TruncDate('sale__created_at')).values('date').annotate(sales=Sum('subtotal'), profit=Sum('profit'), units_sold=Sum('quantity')).order_by('date'))
    for row in trends:
        row['label'] = _trend_label(row['date'])
    return {
        'summary': {'total_revenue': revenue, 'total_cost': cost, 'gross_profit': profit, 'profit_margin_percentage': (profit / revenue * 100) if revenue else ZERO, 'total_sold_units': agg['total_sold_units'] or 0},
        'trends': trends,
        'profit_by_category': dimension('variant__product__category_id', 'variant__product__category__name', 'category_id', 'category_name'),
        'profit_by_company': dimension('variant__company_id', 'variant__company__name', 'company_id', 'company_name'),
        'top_profitable_products': top,
        'total_revenue': revenue, 'total_cost': cost, 'total_profit': profit,
        'margin_percentage': (profit / revenue * 100) if revenue else ZERO,
    }


def get_purchases_report(*, date_range=None, start_date=None, end_date=None, company_id=None, product_id=None):
    _, _, purchases = _common_querysets(date_range=date_range, start_date=start_date, end_date=end_date)
    items = _filter_period(PurchaseItem.objects.filter(purchase__status=StockPurchase.Status.COMPLETED), date_range=date_range, start_date=start_date, end_date=end_date, date_field='purchase__purchase_date')
    if company_id:
        items = items.filter(variant__company_id=company_id)
    if product_id:
        items = items.filter(variant__product_id=product_id)
    has_dimension_filter = any([company_id, product_id])
    if has_dimension_filter:
        purchases = purchases.filter(items__in=items).distinct()
    agg = items.aggregate(total_spent=Sum('subtotal'), total_units=Sum('quantity'))
    purchase_count, total_spent = purchases.count(), agg['total_spent'] or ZERO
    trends = list(items.annotate(date=TruncDate('purchase__purchase_date')).values('date').annotate(amount=Sum('subtotal'), units=Sum('quantity'), count=Count('purchase_id', distinct=True)).order_by('date'))
    for row in trends:
        row['label'] = _trend_label(row['date'])
    by_company = list(items.values(company_id=F('variant__company_id'), company_name=F('variant__company__name')).annotate(purchases_count=Count('purchase_id', distinct=True), units_purchased=Sum('quantity'), total_amount=Sum('subtotal')).order_by('-total_amount'))
    for row in by_company:
        row['percentage'] = (row['total_amount'] / total_spent * 100) if total_spent else ZERO
    top = list(items.values(product_id=F('variant__product_id'), product_name=F('variant__product__name'), generic_name=F('variant__product__generic_name'), company_name=F('variant__company__name')).annotate(units_purchased=Sum('quantity'), total_spent=Sum('subtotal')).order_by('-total_spent')[:20])
    for row in top:
        row['unit_cost'] = row['total_spent'] / row['units_purchased'] if row['units_purchased'] else ZERO
    if has_dimension_filter:
        by_payment_method = list(
            items.values(payment_method=F('purchase__payment_method'))
            .annotate(count=Count('purchase_id', distinct=True), total=Sum('subtotal'))
        )
    else:
        by_payment_method = list(
            purchases.values('payment_method').annotate(count=Count('id'), total=Sum('total_amount'))
        )
    return {'summary': {'total_spent': total_spent, 'total_purchases_count': purchase_count, 'total_units_purchased': agg['total_units'] or 0, 'average_purchase_value': total_spent / (purchase_count or 1)}, 'trends': trends, 'purchases_by_company': by_company, 'top_purchased_products': top, 'total_purchases': purchase_count, 'total_spend': total_spent, 'by_payment_method': by_payment_method}


def get_financial_movement_report(*, date_range=None, start_date=None, end_date=None):
    txs = _filter_period(AccountabilityTransaction.objects.filter(status=AccountabilityTransaction.Status.COMPLETED), date_range=date_range, start_date=start_date, end_date=end_date)
    agg = txs.aggregate(total_inflow=Sum('amount', filter=Q(direction='IN')), total_outflow=Sum('amount', filter=Q(direction='OUT')))
    inflow, outflow = agg['total_inflow'] or ZERO, agg['total_outflow'] or ZERO
    by_type = list(txs.values('type', 'direction').annotate(count=Count('id'), total=Sum('amount')).order_by('type'))
    trends = list(txs.annotate(date=TruncDate('created_at')).values('date').annotate(money_in=Sum('amount', filter=Q(direction='IN')), money_out=Sum('amount', filter=Q(direction='OUT'))).order_by('date'))
    for row in trends:
        row['money_in'], row['money_out'] = row['money_in'] or ZERO, row['money_out'] or ZERO
        row['net_movement'], row['label'] = row['money_in'] - row['money_out'], _trend_label(row['date'])
    def breakdown(direction):
        total = inflow if direction == 'IN' else outflow
        rows = []
        for source in [row for row in by_type if row['direction'] == direction]:
            row = dict(source)
            row['source' if direction == 'IN' else 'category'] = row['type']
            row['amount'], row['percentage'] = row['total'], (row['total'] / total * 100) if total else ZERO
            rows.append(row)
        return rows
    type_totals = {row['type']: row['total'] for row in by_type}
    return {'summary': {'money_in': inflow, 'money_out': outflow, 'net_movement': inflow - outflow, 'sales_income': type_totals.get('SALE', ZERO), 'debt_payments_income': type_totals.get('DEBT_PAYMENT', ZERO), 'purchases_expense': type_totals.get('STOCK_PURCHASE', ZERO) + type_totals.get('SUPPLIER_PAYMENT', ZERO), 'operating_expenses': type_totals.get('OTHER_EXPENSE', ZERO)}, 'trends': trends, 'money_in_breakdown': breakdown('IN'), 'money_out_breakdown': breakdown('OUT'), 'total_inflow': inflow, 'total_outflow': outflow, 'net_movement': inflow - outflow, 'by_type': by_type}


def get_product_performance_report(*, date_range=None, start_date=None, end_date=None, category_id=None, company_id=None, product_id=None):
    items = _filter_period(SaleItem.objects.filter(sale__status=Sale.Status.COMPLETED), date_range=date_range, start_date=start_date, end_date=end_date, date_field='sale__created_at')
    if category_id:
        items = items.filter(variant__product__category_id=category_id)
    if company_id:
        items = items.filter(variant__company_id=company_id)
    if product_id:
        items = items.filter(variant__product_id=product_id)
    cost_expr = ExpressionWrapper(F('unit_base_price') * F('quantity'), output_field=DecimalField(max_digits=16, decimal_places=2))
    rows = list(items.values('variant_id', product_id=F('variant__product_id'), product_name=F('variant__product__name'), generic_name=F('variant__product__generic_name'), dosage=F('variant__product__dosage'), form=F('variant__product__dosage_form'), company_id=F('variant__company_id'), company_name=F('variant__company__name'), category_name=F('variant__product__category__name'), current_stock=F('variant__current_stock'), selling_price=F('variant__default_selling_price'), base_price=F('variant__base_price')).annotate(units_sold=Sum('quantity'), revenue=Sum('subtotal'), cost=Sum(cost_expr), profit=Sum('profit')).order_by('-units_sold'))
    max_units = max([row['units_sold'] for row in rows], default=0)
    for row in rows:
        row['margin_pct'] = (row['profit'] / row['revenue'] * 100) if row['revenue'] else ZERO
        row['velocity'] = 'fast' if max_units and row['units_sold'] >= max_units * Decimal('.67') else 'moderate' if max_units and row['units_sold'] >= max_units * Decimal('.33') else 'slow'
    sold_ids = {row['variant_id'] for row in rows}
    zero_variants = ProductVariant.objects.filter(status=ProductVariant.Status.AVAILABLE).exclude(id__in=sold_ids)
    if category_id:
        zero_variants = zero_variants.filter(product__category_id=category_id)
    if company_id:
        zero_variants = zero_variants.filter(company_id=company_id)
    if product_id:
        zero_variants = zero_variants.filter(product_id=product_id)
    for variant in zero_variants.select_related('product', 'product__category', 'company'):
        rows.append({'product_id': variant.product_id, 'variant_id': variant.id, 'product_name': variant.product.name, 'generic_name': variant.product.generic_name, 'dosage': variant.product.dosage, 'form': variant.product.dosage_form, 'company_id': variant.company_id, 'company_name': variant.company.name, 'category_name': variant.product.category.name, 'units_sold': 0, 'revenue': ZERO, 'cost': ZERO, 'profit': ZERO, 'margin_pct': ZERO, 'current_stock': variant.current_stock, 'selling_price': variant.default_selling_price, 'base_price': variant.base_price, 'velocity': 'zero'})
    return {'items': rows, 'fast_moving_count': sum(row['velocity'] == 'fast' for row in rows), 'slow_moving_count': sum(row['velocity'] == 'slow' for row in rows), 'zero_movement_count': sum(row['velocity'] == 'zero' for row in rows), 'total_units_sold': sum(row['units_sold'] for row in rows), 'total_revenue': sum((row['revenue'] for row in rows), ZERO), 'total_profit': sum((row['profit'] for row in rows), ZERO)}


def get_inventory_movement_report(*, date_range=None, start_date=None, end_date=None, category_id=None, company_id=None, product_id=None):
    variants = ProductVariant.objects.select_related('product', 'product__category', 'company')
    if category_id:
        variants = variants.filter(product__category_id=category_id)
    if company_id:
        variants = variants.filter(company_id=company_id)
    if product_id:
        variants = variants.filter(product_id=product_id)
    movements = _filter_period(InventoryMovement.objects.all(), date_range=date_range, start_date=start_date, end_date=end_date)
    grouped = {row['variant_id']: row for row in movements.values('variant_id').annotate(stock_in=Sum('quantity', filter=Q(quantity__gt=0)), stock_out=Sum('quantity', filter=Q(quantity__lt=0)))}
    items = []
    for variant in variants:
        movement = grouped.get(variant.id, {})
        stock_in, stock_out = movement.get('stock_in') or 0, abs(movement.get('stock_out') or 0)
        last_date = movements.filter(variant=variant).order_by('-created_at').values_list('created_at', flat=True).first()
        status = 'out_of_stock' if variant.current_stock == 0 else 'low_stock' if variant.current_stock <= variant.reorder_level else 'in_stock'
        items.append({'product_id': variant.product_id, 'variant_id': variant.id, 'product_name': variant.product.name, 'generic_name': variant.product.generic_name, 'company_name': variant.company.name, 'category_name': variant.product.category.name, 'dosage': variant.product.dosage, 'form': variant.product.dosage_form, 'opening_stock': variant.current_stock - stock_in + stock_out, 'stock_in': stock_in, 'stock_out': stock_out, 'current_stock': variant.current_stock, 'reorder_level': variant.reorder_level, 'status': status, 'last_movement_date': last_date})
    aggregate = lambda **kwargs: abs(movements.filter(**kwargs).aggregate(v=Sum('quantity'))['v'] or 0)
    return {'items': items, 'total_opening_stock': sum(row['opening_stock'] for row in items), 'total_stock_in': sum(row['stock_in'] for row in items), 'total_stock_out': sum(row['stock_out'] for row in items), 'total_current_stock': sum(row['current_stock'] for row in items), 'stock_in_purchases': aggregate(reference_type=InventoryMovement.ReferenceType.STOCK_PURCHASE, quantity__gt=0), 'stock_in_adjustments': aggregate(reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT, quantity__gt=0), 'stock_out_sales': aggregate(reference_type=InventoryMovement.ReferenceType.SALE, quantity__lt=0), 'stock_out_adjustments': aggregate(reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT, quantity__lt=0), 'total_adjustments': aggregate(reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT)}


def get_debt_report(*, date_range=None, start_date=None, end_date=None):
    debt_sales = _filter_period(Sale.objects.filter(status=Sale.Status.COMPLETED, customer__isnull=False), date_range=date_range, start_date=start_date, end_date=end_date)
    payments = _filter_period(CustomerDebtPayment.objects.all(), date_range=date_range, start_date=start_date, end_date=end_date)
    debtors_qs = Customer.objects.filter(status=Customer.Status.ACTIVE).annotate(current_debt=Sum('sales__outstanding_amount', filter=Q(sales__status=Sale.Status.COMPLETED))).filter(current_debt__gt=0)
    debt_created = debt_sales.aggregate(total=Sum('outstanding_amount'))['total'] or ZERO
    debt_paid = payments.aggregate(total=Sum('amount'))['total'] or ZERO
    debtors = []
    for customer in debtors_qs:
        customer_payments = payments.filter(customer=customer)
        debtors.append({'customer_id': customer.id, 'name': customer.name, 'phone': customer.phone, 'current_debt': customer.current_debt or ZERO, 'total_purchases_value': customer.sales.filter(status=Sale.Status.COMPLETED).aggregate(v=Sum('total_amount'))['v'] or ZERO, 'debt_created_in_period': debt_sales.filter(customer=customer).aggregate(v=Sum('outstanding_amount'))['v'] or ZERO, 'debt_paid_in_period': customer_payments.aggregate(v=Sum('amount'))['v'] or ZERO, 'last_payment_date': customer_payments.order_by('-created_at').values_list('created_at', flat=True).first()})
    sale_trends = {row['date']: row['amount'] for row in debt_sales.annotate(date=TruncDate('created_at')).values('date').annotate(amount=Sum('outstanding_amount'))}
    payment_trends = {row['date']: row['amount'] for row in payments.annotate(date=TruncDate('created_at')).values('date').annotate(amount=Sum('amount'))}
    trends = [{'date': date, 'label': _trend_label(date), 'debt_created': sale_trends.get(date, ZERO), 'debt_recovered': payment_trends.get(date, ZERO)} for date in sorted(set(sale_trends) | set(payment_trends))]
    current_total = sum((row['current_debt'] for row in debtors), ZERO)
    return {'summary': {'total_outstanding_debt': current_total, 'debt_created_in_period': debt_created, 'debt_payments_in_period': debt_paid, 'net_debt_change': debt_created - debt_paid, 'active_debtors_count': len(debtors)}, 'debtors': debtors, 'trends': trends, 'total_debtors': len(debtors), 'total_outstanding': current_total, 'total_debt_payments': debt_paid}
