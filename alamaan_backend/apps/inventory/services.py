from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.products.models import ProductVariant

from .models import InventoryMovement


def record_stock_movement(
    *,
    variant,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    created_by,
    reference_type,
    reference_id='',
    notes='',
):
    return InventoryMovement.objects.create(
        variant=variant,
        movement_type=movement_type,
        quantity=quantity,
        previous_stock=previous_stock,
        new_stock=new_stock,
        reason=reason.strip(),
        notes=notes.strip(),
        reference_type=reference_type,
        reference_id=str(reference_id or ''),
        created_by=created_by,
    )


@transaction.atomic
def adjust_stock_manually(*, variant_id, adjustment_type, quantity, reason, notes='', created_by):
    variant = ProductVariant.objects.select_for_update().select_related('product', 'company').get(pk=variant_id)
    previous_stock = variant.current_stock

    if adjustment_type == 'SET_EXACT':
        if quantity < 0:
            raise ValidationError({'quantity': 'Exact stock quantity cannot be negative.'})
        new_stock = quantity
    elif adjustment_type == 'INCREMENT':
        if quantity <= 0:
            raise ValidationError({'quantity': 'Increment quantity must be greater than zero.'})
        new_stock = previous_stock + quantity
    elif adjustment_type == 'DECREMENT':
        if quantity <= 0:
            raise ValidationError({'quantity': 'Decrement quantity must be greater than zero.'})
        new_stock = previous_stock - quantity
    else:
        raise ValidationError({'adjustment_type': 'Unsupported adjustment type.'})

    if new_stock < 0:
        raise ValidationError({'quantity': 'Adjustment would make stock negative.'})

    delta = new_stock - previous_stock
    if delta == 0:
        raise ValidationError({'quantity': 'Adjustment does not change current stock.'})

    variant.current_stock = new_stock
    variant.updated_by = created_by
    variant.save(update_fields=['current_stock', 'updated_by', 'updated_at'])

    movement_type = InventoryMovement.MovementType.STOCK_IN if delta > 0 else InventoryMovement.MovementType.STOCK_OUT
    if adjustment_type == 'SET_EXACT':
        movement_type = InventoryMovement.MovementType.ADJUSTMENT

    return record_stock_movement(
        variant=variant,
        movement_type=movement_type,
        quantity=delta,
        previous_stock=previous_stock,
        new_stock=new_stock,
        reason=reason,
        notes=notes,
        reference_type=InventoryMovement.ReferenceType.MANUAL_ADJUSTMENT,
        created_by=created_by,
    )
