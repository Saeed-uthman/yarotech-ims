from django.db.models import F, Q, Sum

from .models import Category, Company, Product, ProductVariant


def list_categories(*, search=''):
    queryset = Category.objects.filter(is_active=True)
    if search:
        queryset = queryset.filter(name__icontains=search)
    return queryset.order_by('name')


def list_companies(*, search=''):
    queryset = Company.objects.filter(is_active=True)
    if search:
        queryset = queryset.filter(name__icontains=search)
    return queryset.order_by('name')


def list_products(*, search='', category=None, company=None, stock_status=None):
    queryset = Product.objects.select_related('category').prefetch_related('variants__company')

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(generic_name__icontains=search)
            | Q(barcode__icontains=search)
            | Q(variants__company__name__icontains=search)
        )
    if category:
        queryset = queryset.filter(category_id=category)
    if company:
        queryset = queryset.filter(variants__company_id=company)
    if stock_status == 'low':
        queryset = queryset.filter(variants__current_stock__gt=0, variants__current_stock__lte=F('variants__reorder_level'))
    elif stock_status == 'out':
        queryset = queryset.filter(variants__current_stock=0)
    elif stock_status == 'available':
        queryset = queryset.filter(variants__current_stock__gt=0)

    return queryset.distinct().order_by('name')


def get_product_detail(*, product_id):
    return (
        Product.objects.select_related('category')
        .prefetch_related('variants__company', 'variants__price_history__adjusted_by')
        .get(pk=product_id)
    )


def get_catalog_kpis():
    return {
        'active_products': Product.objects.filter(status=Product.Status.ACTIVE).count(),
        'active_categories': Category.objects.filter(is_active=True).count(),
        'active_companies': Company.objects.filter(is_active=True).count(),
        'available_variants': ProductVariant.objects.filter(status=ProductVariant.Status.AVAILABLE).count(),
        'total_stock_units': ProductVariant.objects.aggregate(total=Sum('current_stock'))['total'] or 0,
        'low_stock_variants': ProductVariant.objects.filter(current_stock__gt=0, current_stock__lte=F('reorder_level')).count(),
        'out_of_stock_variants': ProductVariant.objects.filter(current_stock=0).count(),
    }
