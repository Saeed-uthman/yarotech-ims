from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Category, Company, PriceAdjustmentHistory, Product, ProductVariant


def _raise_serializer_validation_error(error):
    if hasattr(error, 'message_dict'):
        raise ValidationError(error.message_dict)
    raise ValidationError({'detail': error.messages})


def validate_variant_prices(data):
    base_price = data['base_price']
    min_price = data['min_selling_price']
    default_price = data['default_selling_price']
    max_price = data['max_selling_price']
    current_stock = data.get('current_stock', 0)
    reorder_level = data.get('reorder_level', 10)

    if current_stock < 0:
        raise ValidationError({'current_stock': 'Current stock cannot be negative.'})
    if reorder_level < 0:
        raise ValidationError({'reorder_level': 'Reorder level cannot be negative.'})
    if default_price < min_price:
        raise ValidationError({'default_selling_price': 'Default selling price cannot be below minimum selling price.'})
    if max_price < default_price:
        raise ValidationError({'max_selling_price': 'Maximum selling price cannot be below default selling price.'})
    if base_price > 0 and min_price <= base_price:
        raise ValidationError({'min_selling_price': 'Minimum selling price must be greater than base price.'})


@transaction.atomic
def create_category(*, name, description=''):
    return Category.objects.create(name=name.strip(), description=description.strip())


@transaction.atomic
def create_company(*, name, code='', country='Nigeria'):
    return Company.objects.create(name=name.strip(), code=code.strip(), country=country.strip() or 'Nigeria')


@transaction.atomic
def create_product(*, created_by, variants=None, **product_data):
    variants = variants or []
    product = Product.objects.create(created_by=created_by, updated_by=created_by, **product_data)

    for variant_data in variants:
        create_product_variant(product=product, created_by=created_by, **variant_data)

    return product


@transaction.atomic
def update_product(*, product, updated_by, **product_data):
    for field, value in product_data.items():
        setattr(product, field, value)
    product.updated_by = updated_by
    product.save()
    return product


@transaction.atomic
def create_product_variant(*, product, created_by, **variant_data):
    validate_variant_prices(variant_data)
    variant = ProductVariant(product=product, created_by=created_by, updated_by=created_by, **variant_data)

    try:
        variant.full_clean()
    except DjangoValidationError as error:
        _raise_serializer_validation_error(error)

    variant.save()
    PriceAdjustmentHistory.objects.create(
        variant=variant,
        old_base_price=0,
        new_base_price=variant.base_price,
        old_min_selling_price=0,
        new_min_selling_price=variant.min_selling_price,
        old_default_selling_price=0,
        new_default_selling_price=variant.default_selling_price,
        old_max_selling_price=0,
        new_max_selling_price=variant.max_selling_price,
        change_type=PriceAdjustmentHistory.ChangeType.INITIAL,
        reason='Initial price setup.',
        adjusted_by=created_by,
    )
    return variant


@transaction.atomic
def update_variant_prices(*, variant, updated_by, reason, **price_data):
    old_values = {
        'base_price': variant.base_price,
        'min_selling_price': variant.min_selling_price,
        'default_selling_price': variant.default_selling_price,
        'max_selling_price': variant.max_selling_price,
    }

    for field, value in price_data.items():
        setattr(variant, field, value)

    validate_variant_prices({
        'base_price': variant.base_price,
        'min_selling_price': variant.min_selling_price,
        'default_selling_price': variant.default_selling_price,
        'max_selling_price': variant.max_selling_price,
        'current_stock': variant.current_stock,
        'reorder_level': variant.reorder_level,
    })
    variant.updated_by = updated_by

    try:
        variant.full_clean()
    except DjangoValidationError as error:
        _raise_serializer_validation_error(error)

    variant.save()
    change_type = PriceAdjustmentHistory.ChangeType.INCREASE
    if variant.default_selling_price < old_values['default_selling_price']:
        change_type = PriceAdjustmentHistory.ChangeType.DECREASE

    PriceAdjustmentHistory.objects.create(
        variant=variant,
        old_base_price=old_values['base_price'],
        new_base_price=variant.base_price,
        old_min_selling_price=old_values['min_selling_price'],
        new_min_selling_price=variant.min_selling_price,
        old_default_selling_price=old_values['default_selling_price'],
        new_default_selling_price=variant.default_selling_price,
        old_max_selling_price=old_values['max_selling_price'],
        new_max_selling_price=variant.max_selling_price,
        change_type=change_type,
        reason=reason,
        adjusted_by=updated_by,
    )
    return variant


@transaction.atomic
def update_product_variant(*, variant, updated_by, reason='Variant price update.', **variant_data):
    price_fields = {
        'base_price',
        'min_selling_price',
        'default_selling_price',
        'max_selling_price',
    }
    price_data = {field: variant_data.pop(field) for field in list(variant_data) if field in price_fields}

    if price_data:
        update_variant_prices(variant=variant, updated_by=updated_by, reason=reason, **price_data)

    for field, value in variant_data.items():
        setattr(variant, field, value)

    validate_variant_prices({
        'base_price': variant.base_price,
        'min_selling_price': variant.min_selling_price,
        'default_selling_price': variant.default_selling_price,
        'max_selling_price': variant.max_selling_price,
        'current_stock': variant.current_stock,
        'reorder_level': variant.reorder_level,
    })
    variant.updated_by = updated_by

    try:
        variant.full_clean()
    except DjangoValidationError as error:
        _raise_serializer_validation_error(error)

    variant.save()
    return variant
