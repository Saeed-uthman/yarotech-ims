from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accountability.models import AccountabilityTransaction
from apps.inventory.models import InventoryMovement
from apps.inventory.services import record_stock_movement
from apps.products.models import ProductVariant

from .models import PurchaseItem, StockPurchase


def _generate_purchase_number():
    now = timezone.now()
    prefix = f'PUR-{now:%Y%m}-'
    last_purchase = (
        StockPurchase.objects.filter(purchase_number__startswith=prefix)
        .order_by('-purchase_number')
        .first()
    )
    if last_purchase:
        last_seq = int(last_purchase.purchase_number.split('-')[-1])
        next_seq = last_seq + 1
    else:
        next_seq = 1
    return f'{prefix}{next_seq:05d}'


def _generate_transaction_number():
    now = timezone.now()
    prefix = f'ACC-{now:%Y%m}-'
    last_tx = (
        AccountabilityTransaction.objects.filter(transaction_number__startswith=prefix)
        .order_by('-transaction_number')
        .first()
    )
    if last_tx:
        last_seq = int(last_tx.transaction_number.split('-')[-1])
        next_seq = last_seq + 1
    else:
        next_seq = 1
    return f'{prefix}{next_seq:06d}'


@transaction.atomic
def create_stock_purchase(*, user, items, payment_method, purchase_date=None, note=''):
    variant_ids = [item['product_variant_id'] for item in items]
    variants = {
        v.id: v
        for v in ProductVariant.objects.select_for_update().filter(id__in=variant_ids)
    }

    total_amount = Decimal('0.00')
    purchase_items_data = []

    for item in items:
        variant = variants.get(item['product_variant_id'])
        if variant is None:
            raise ValidationError({'items': f'Product variant {item["product_variant_id"]} not found.'})

        quantity = item['quantity']
        unit_price = Decimal(str(item['unit_purchase_price']))

        if quantity <= 0:
            raise ValidationError({'items': 'Quantity must be greater than zero.'})
        if unit_price <= 0:
            raise ValidationError({'items': 'Unit purchase price must be greater than zero.'})

        item_subtotal = unit_price * quantity
        total_amount += item_subtotal

        purchase_items_data.append({
            'variant': variant,
            'quantity': quantity,
            'unit_purchase_price': unit_price,
            'subtotal': item_subtotal,
        })

    purchase_number = _generate_purchase_number()

    purchase = StockPurchase.objects.create(
        purchase_number=purchase_number,
        purchase_date=purchase_date or timezone.now(),
        total_amount=total_amount,
        payment_method=payment_method,
        note=note.strip(),
        recorded_by=user,
        created_by=user,
        updated_by=user,
    )

    for item_data in purchase_items_data:
        variant = item_data['variant']
        quantity = item_data['quantity']
        unit_price = item_data['unit_purchase_price']
        item_subtotal = item_data['subtotal']

        PurchaseItem.objects.create(
            purchase=purchase,
            variant=variant,
            quantity=quantity,
            unit_purchase_price=unit_price,
            subtotal=item_subtotal,
        )

        previous_stock = variant.current_stock
        new_stock = previous_stock + quantity
        variant.current_stock = new_stock
        variant.updated_by = user
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_IN,
            quantity=quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Purchase {purchase_number}',
            created_by=user,
            reference_type=InventoryMovement.ReferenceType.STOCK_PURCHASE,
            reference_id=str(purchase.id),
        )

    AccountabilityTransaction.objects.create(
        transaction_number=_generate_transaction_number(),
        direction=AccountabilityTransaction.Direction.OUT,
        type=AccountabilityTransaction.TxType.STOCK_PURCHASE,
        category='Stock Purchase',
        amount=total_amount,
        payment_method=payment_method,
        reference_type='StockPurchase',
        reference_id=str(purchase.id),
        description=f'Stock purchase {purchase_number}',
        created_by=user,
        updated_by=user,
    )

    return purchase


@transaction.atomic
def cancel_purchase(*, purchase, cancelled_by, reason=''):
    purchase = StockPurchase.objects.select_for_update().get(pk=purchase.pk)
    if purchase.status == StockPurchase.Status.CANCELLED:
        raise ValidationError({'detail': 'Purchase is already cancelled.'})

    purchase_items = list(purchase.items.select_related('variant').all())
    locked_variants = {
        variant.id: variant
        for variant in ProductVariant.objects.select_for_update().filter(
            id__in=[item.variant_id for item in purchase_items]
        )
    }

    for item in purchase_items:
        variant = locked_variants[item.variant_id]
        previous_stock = variant.current_stock
        new_stock = previous_stock - item.quantity

        if new_stock < 0:
            raise ValidationError({
                'detail': f'Cannot cancel purchase: stock for {variant.product.name} ({variant.company.name}) '
                          f'would go negative (current: {previous_stock}, to reverse: {item.quantity}).'
            })

        variant.current_stock = new_stock
        variant.updated_by = cancelled_by
        variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

        record_stock_movement(
            variant=variant,
            movement_type=InventoryMovement.MovementType.STOCK_OUT,
            quantity=-item.quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=f'Cancelled purchase {purchase.purchase_number}. {reason}'.strip(),
            created_by=cancelled_by,
            reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
            reference_id=str(purchase.id),
        )

    AccountabilityTransaction.objects.filter(
        reference_type='StockPurchase',
        reference_id=str(purchase.id),
        status=AccountabilityTransaction.Status.COMPLETED,
    ).update(status=AccountabilityTransaction.Status.CANCELLED)

    purchase.status = StockPurchase.Status.CANCELLED
    purchase.updated_by = cancelled_by
    purchase.save(update_fields=['status', 'updated_by', 'updated_at'])

    return purchase
