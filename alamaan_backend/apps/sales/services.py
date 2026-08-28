from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accountability.models import AccountabilityTransaction
from apps.accountability.sequences import next_accountability_transaction_number
from apps.common.sequences import next_document_number
from apps.inventory.models import InventoryMovement
from apps.inventory.services import record_stock_movement
from apps.products.models import ProductVariant
from apps.settings_app.models import SystemSettings

from .models import Sale, SaleItem


def _generate_invoice_number():
    today = timezone.now()
    prefix = f'SAL-{today:%Y%m%d}-'
    return next_document_number(
        sequence_name=f'sale:{today:%Y%m%d}',
        prefix=prefix,
        queryset=Sale.objects.all(),
        field_name='invoice_number',
        width=6,
    )


@transaction.atomic
def process_pos_sale(*, user, customer_id=None, items, discount=Decimal('0.00'), amount_paid, payment_method, notes=''):
    system_settings = SystemSettings.load()
    variant_ids = [item['product_variant_id'] for item in items]
    variants = {
        v.id: v
        for v in ProductVariant.objects.select_for_update().filter(id__in=variant_ids).order_by('id')
    }

    for item in items:
        variant = variants.get(item['product_variant_id'])
        if variant is None:
            raise ValidationError({'items': f'Product variant {item["product_variant_id"]} not found.'})

        quantity = item['quantity']
        actual_price = Decimal(str(item['actual_selling_price']))

        if variant.current_stock < quantity:
            raise ValidationError({
                'items': f'Insufficient stock for {variant.product.name} ({variant.company.name}). '
                         f'Available: {variant.current_stock}, requested: {quantity}.'
            })

        if actual_price < variant.min_selling_price or actual_price > variant.max_selling_price:
            raise ValidationError({
                'items': f'Selling price for {variant.product.name} must be between '
                         f'{variant.min_selling_price} and {variant.max_selling_price}.'
            })

    subtotal = Decimal('0.00')
    for item in items:
        variant = variants[item['product_variant_id']]
        actual_price = Decimal(str(item['actual_selling_price']))
        subtotal += actual_price * item['quantity']

    discount = Decimal(str(discount))
    total_amount = subtotal - discount
    if total_amount < 0:
        raise ValidationError({'discount': 'Discount cannot exceed subtotal.'})

    amount_paid = Decimal(str(amount_paid))
    if amount_paid < 0:
        raise ValidationError({'amount_paid': 'Amount paid cannot be negative.'})

    outstanding_amount = total_amount - amount_paid
    if outstanding_amount < 0:
        raise ValidationError({'amount_paid': 'Amount paid cannot exceed total amount.'})

    if customer_id is None and not system_settings.allow_walking_sales:
        raise ValidationError({'customer_id': 'Walk-in sales are disabled in system settings.'})
    if outstanding_amount > 0 and not system_settings.allow_credit_sales:
        raise ValidationError({'amount_paid': 'Credit and partial-payment sales are disabled in system settings.'})

    if outstanding_amount == 0:
        payment_status = Sale.PaymentStatus.PAID
    elif amount_paid > 0:
        payment_status = Sale.PaymentStatus.PARTIAL
    else:
        payment_status = Sale.PaymentStatus.UNPAID

    if payment_status in (Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID) and customer_id is None:
        raise ValidationError({'customer_id': 'Credit sales require a registered customer.'})

    invoice_number = _generate_invoice_number()

    sale = Sale.objects.create(
        invoice_number=invoice_number,
        customer_id=customer_id,
        subtotal=subtotal,
        discount=discount,
        total_amount=total_amount,
        amount_paid=amount_paid,
        outstanding_amount=outstanding_amount,
        payment_status=payment_status,
        payment_method=payment_method,
        notes=notes.strip(),
        served_by=user,
        created_by=user,
        updated_by=user,
    )

    for item in items:
        variant = variants[item['product_variant_id']]
        actual_price = Decimal(str(item['actual_selling_price']))
        quantity = item['quantity']

        item_subtotal = actual_price * quantity
        item_profit = (actual_price - variant.base_price) * quantity

        SaleItem.objects.create(
            sale=sale,
            variant=variant,
            quantity=quantity,
            actual_selling_price=actual_price,
            unit_selling_price=actual_price,
            historical_base_price=variant.base_price,
            unit_base_price=variant.base_price,
            min_selling_price=variant.min_selling_price,
            default_selling_price=variant.default_selling_price,
            max_selling_price=variant.max_selling_price,
            subtotal=item_subtotal,
            profit=item_profit,
        )

        previous_stock = variant.current_stock
        new_stock = previous_stock - quantity
        variant.current_stock = new_stock
        variant.updated_by = user
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_OUT,
            quantity=-quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Sale {invoice_number}',
            created_by=user,
            reference_type=InventoryMovement.ReferenceType.SALE,
            reference_id=str(sale.id),
        )

    if amount_paid > 0:
        AccountabilityTransaction.objects.create(
            transaction_number=next_accountability_transaction_number(),
            direction=AccountabilityTransaction.Direction.IN,
            type=AccountabilityTransaction.TxType.SALE,
            category='Sales Revenue',
            amount=amount_paid,
            payment_method=payment_method,
            reference_type='Sale',
            reference_id=str(sale.id),
            description=f'Sale revenue for {invoice_number}',
            customer_name=sale.customer.name if sale.customer_id else '',
            created_by=user,
            updated_by=user,
        )

    return sale


@transaction.atomic
def cancel_sale(*, sale, cancelled_by, reason=''):
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    if sale.status == Sale.Status.CANCELLED:
        raise ValidationError({'detail': 'Sale is already cancelled.'})

    sale_items = list(sale.items.select_related('variant').all())
    locked_variants = {
        variant.id: variant
        for variant in (
            ProductVariant.objects.select_for_update()
            .filter(id__in=[item.variant_id for item in sale_items])
            .order_by('id')
        )
    }

    for item in sale_items:
        variant = locked_variants[item.variant_id]
        previous_stock = variant.current_stock
        new_stock = previous_stock + item.quantity

        variant.current_stock = new_stock
        variant.updated_by = cancelled_by
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_IN,
            quantity=item.quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Cancelled sale {sale.invoice_number}. {reason}'.strip(),
            created_by=cancelled_by,
            reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
            reference_id=str(sale.id),
        )

    AccountabilityTransaction.objects.filter(
        reference_type='Sale',
        reference_id=str(sale.id),
        status=AccountabilityTransaction.Status.COMPLETED,
    ).update(status=AccountabilityTransaction.Status.CANCELLED)

    sale.status = Sale.Status.CANCELLED
    sale.updated_by = cancelled_by
    sale.save(update_fields=['status', 'updated_by', 'updated_at'])

    return sale
