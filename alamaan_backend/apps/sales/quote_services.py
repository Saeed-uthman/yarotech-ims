import uuid
from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.customers.models import Customer
from apps.products.models import ProductVariant
from apps.settings_app.models import SystemSettings
from .models import Quote, QuoteItem
from .services import process_pos_sale


def _generate_quote_number() -> str:
    today_str = timezone.now().strftime('%Y%m%d')
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f'QT-{today_str}-{unique_suffix}'


@transaction.atomic
def create_quote(*, user, items, customer_id=None, discount=Decimal('0.00'), valid_until=None, notes=''):
    if not items:
        raise ValidationError({'items': 'At least one item is required.'})

    settings = SystemSettings.load()
    if not valid_until:
        validity_days = getattr(settings, 'quote_validity_days', 14) or 14
        valid_until = timezone.now().date() + timedelta(days=validity_days)

    customer = None
    if customer_id:
        try:
            customer = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            raise ValidationError({'customer_id': 'Customer not found.'})

    quote_number = _generate_quote_number()
    variant_ids = [item['product_variant_id'] for item in items]
    variants = {
        v.id: v for v in ProductVariant.objects.select_related('product', 'company').filter(id__in=variant_ids)
    }

    subtotal = Decimal('0.00')
    line_data = []

    for item in items:
        v_id = item['product_variant_id']
        variant = variants.get(v_id)
        if not variant:
            raise ValidationError({'items': f'Variant ID {v_id} not found.'})

        qty = Decimal(str(item['quantity']))
        unit_price = Decimal(str(item['unit_price']))
        line_discount = Decimal(str(item.get('discount', '0.00')))
        line_total_before_tax = (qty * unit_price) - line_discount

        vat_rate = Decimal('0.00')
        vat_amount = Decimal('0.00')
        if settings.vat_enabled and variant.product.vat_enabled:
            vat_rate = settings.vat_rate
            vat_amount = (line_total_before_tax * vat_rate / Decimal('100.00')).quantize(Decimal('.01'))

        total_price = line_total_before_tax + vat_amount
        subtotal += line_total_before_tax

        line_data.append({
            'variant': variant,
            'quantity': qty,
            'unit_price': unit_price,
            'discount': line_discount,
            'vat_rate': vat_rate,
            'vat_amount': vat_amount,
            'total_price': total_price,
            'item_name_snapshot': variant.product.name,
            'company_name_snapshot': variant.company.name,
            'technical_specs_snapshot': variant.product.dosage or '',
            'unit_of_measure_snapshot': getattr(variant.product, 'unit_of_measure', 'PCS') or 'PCS',
        })

    discount = Decimal(str(discount or '0.00'))
    total_vat = sum(line['vat_amount'] for line in line_data)
    total_amount = max(Decimal('0.00'), subtotal - discount + total_vat)

    quote = Quote.objects.create(
        quote_number=quote_number,
        customer=customer,
        subtotal=subtotal,
        discount=discount,
        vat_amount=total_vat,
        total_amount=total_amount,
        valid_until=valid_until,
        status=Quote.Status.DRAFT,
        notes=notes.strip(),
        created_by=user,
        updated_by=user,
    )

    for ld in line_data:
        QuoteItem.objects.create(quote=quote, **ld)

    return quote


@transaction.atomic
def convert_quote_to_sale(*, quote, user, payment_method, amount_paid, serial_numbers_map=None):
    if quote.status == Quote.Status.CONVERTED:
        raise ValidationError({'quote': f'Quote {quote.quote_number} has already been converted to a sale.'})

    # Prepare items for process_pos_sale
    items_for_sale = []
    serial_numbers_map = serial_numbers_map or {}

    for item in quote.items.select_related('variant', 'variant__product', 'variant__company'):
        variant = item.variant
        if variant.current_stock < item.quantity:
            raise ValidationError({
                'stock': f'Insufficient stock for {variant.product.name} ({variant.company.name}). '
                         f'Available: {variant.current_stock}, required: {item.quantity}.'
            })

        serials = serial_numbers_map.get(str(variant.id), '')
        items_for_sale.append({
            'product_variant_id': variant.id,
            'quantity': item.quantity,
            'actual_selling_price': item.unit_price,
            'serial_numbers': serials,
        })

    sale = process_pos_sale(
        user=user,
        customer_id=quote.customer_id,
        items=items_for_sale,
        discount=quote.discount,
        amount_paid=Decimal(str(amount_paid)),
        payment_method=payment_method,
        notes=f'Converted from Quote {quote.quote_number}. {quote.notes}'.strip(),
    )

    quote.status = Quote.Status.CONVERTED
    quote.converted_sale = sale
    quote.updated_by = user
    quote.save(update_fields=['status', 'converted_sale', 'updated_by', 'updated_at'])

    return sale

