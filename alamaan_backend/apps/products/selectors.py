from django.db.models import F, Min, Q, Sum

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


def list_products(*, search='', category=None, company=None, stock_status=None, status=None, ordering='name'):
    queryset = (
        Product.objects.select_related('category')
        .prefetch_related('variants__company')
        .annotate(
            sort_stock=Sum('variants__current_stock'),
            sort_price=Min('variants__default_selling_price'),
        )
    )

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
    if status:
        queryset = queryset.filter(status=status)
    if stock_status == 'low':
        queryset = queryset.filter(variants__current_stock__gt=0, variants__current_stock__lte=F('variants__reorder_level'))
    elif stock_status == 'out':
        queryset = queryset.filter(variants__current_stock=0)
    elif stock_status == 'available':
        queryset = queryset.filter(variants__current_stock__gt=0)

    ordering_map = {
        'name': 'name',
        'genericName': 'generic_name',
        'stock': 'sort_stock',
        'price': 'sort_price',
        'date': 'created_at',
    }
    descending = ordering.startswith('-')
    ordering_key = ordering[1:] if descending else ordering
    ordering_field = ordering_map.get(ordering_key, 'name')
    if descending:
        ordering_field = f'-{ordering_field}'
    return queryset.distinct().order_by(ordering_field)


def get_product_by_barcode(*, barcode):
    """
    Return the single Product whose barcode matches exactly, with all variants.
    Raises Product.DoesNotExist when no match is found.
    """
    return (
        Product.objects.select_related('category')
        .prefetch_related('variants__company')
        .get(barcode=barcode)
    )


def lookup_product_by_barcode_or_serial(*, code):
    """
    Look up a product either by its exact product barcode or by a matching serial number
    in an active InventoryBatch record.
    Returns a tuple: (product, matched_variant_id, matched_serial)
    Raises Product.DoesNotExist when no match is found.
    """
    cleaned_code = code.strip()
    if not cleaned_code:
        raise Product.DoesNotExist('No barcode or serial code provided.')

    # 1. First attempt exact match on Product.barcode
    product = (
        Product.objects.select_related('category')
        .prefetch_related('variants__company')
        .filter(barcode__iexact=cleaned_code)
        .first()
    )
    if product:
        return product, None, None

    # 2. Search active InventoryBatch records by serial number
    from apps.inventory.models import InventoryBatch
    candidates = (
        InventoryBatch.objects.select_related('variant__product__category', 'variant__company')
        .filter(serial_numbers__icontains=cleaned_code)
        .exclude(status=InventoryBatch.Status.CANCELLED)
    )

    clean_lower = cleaned_code.lower()
    for batch in candidates:
        # Check tokens separated by comma, semicolon, newline, or whitespace
        import re
        tokens = [t.strip().lower() for t in re.split(r'[,;\n\r\s]+', batch.serial_numbers) if t.strip()]
        if clean_lower in tokens:
            variant = batch.variant
            prod = (
                Product.objects.select_related('category')
                .prefetch_related('variants__company')
                .get(pk=variant.product_id)
            )
            return prod, variant.id, cleaned_code

    raise Product.DoesNotExist(f'No product found for barcode or serial number "{code}".')


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
