from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.utils.dateparse import parse_date

from apps.products.models import ProductVariant

from .models import InventoryMovement


def list_inventory_items(*, search='', category=None, company=None, stock_status=None):
    queryset = ProductVariant.objects.select_related('product', 'product__category', 'company')

    if search:
        queryset = queryset.filter(
            Q(product__name__icontains=search)
            | Q(product__generic_name__icontains=search)
            | Q(product__barcode__icontains=search)
            | Q(company__name__icontains=search)
        )
    if category:
        queryset = queryset.filter(product__category_id=category)
    if company:
        queryset = queryset.filter(company_id=company)
    if stock_status == 'low':
        queryset = queryset.filter(current_stock__gt=0, current_stock__lte=F('reorder_level'))
    elif stock_status == 'out':
        queryset = queryset.filter(current_stock=0)
    elif stock_status == 'available':
        queryset = queryset.filter(current_stock__gt=0)

    return queryset.order_by('product__name', 'company__name')


def get_inventory_kpis():
    value_expression = ExpressionWrapper(
        F('current_stock') * F('base_price'),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )
    return {
        'total_variants': ProductVariant.objects.count(),
        'total_stock_units': ProductVariant.objects.aggregate(total=Sum('current_stock'))['total'] or 0,
        'low_stock_variants': ProductVariant.objects.filter(current_stock__gt=0, current_stock__lte=F('reorder_level')).count(),
        'out_of_stock_variants': ProductVariant.objects.filter(current_stock=0).count(),
        'inventory_cost_value': ProductVariant.objects.aggregate(total=Sum(value_expression))['total'] or 0,
    }


def list_inventory_movements(*, variant_id=None, movement_type=None, start_date=None, end_date=None):
    queryset = InventoryMovement.objects.select_related('variant', 'variant__product', 'variant__company', 'created_by')

    if variant_id:
        queryset = queryset.filter(variant_id=variant_id)
    if movement_type:
        queryset = queryset.filter(movement_type=movement_type)
    if start_date:
        parsed_start = parse_date(start_date)
        if parsed_start:
            queryset = queryset.filter(created_at__date__gte=parsed_start)
    if end_date:
        parsed_end = parse_date(end_date)
        if parsed_end:
            queryset = queryset.filter(created_at__date__lte=parsed_end)

    return queryset.order_by('-created_at')


def get_inventory_insights():
    return {
        'stock_by_category': list(
            ProductVariant.objects.values('product__category__name')
            .annotate(total_units=Sum('current_stock'), variant_count=Count('id'))
            .order_by('product__category__name')
        ),
        'stock_by_company': list(
            ProductVariant.objects.values('company__name')
            .annotate(total_units=Sum('current_stock'), variant_count=Count('id'))
            .order_by('company__name')
        ),
        'movements_by_type': list(
            InventoryMovement.objects.values('movement_type')
            .annotate(total_quantity=Sum('quantity'), movement_count=Count('id'))
            .order_by('movement_type')
        ),
    }
