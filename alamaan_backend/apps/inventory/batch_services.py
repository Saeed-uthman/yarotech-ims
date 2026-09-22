from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import InventoryBatch


def apply_manual_batch_delta(*, variant, delta, created_by):
    """Keep batch totals aligned with an already-locked aggregate variant."""
    if delta > 0:
        now = timezone.now()
        InventoryBatch.objects.create(
            variant=variant,
            batch_number=f'ADJ-{variant.id}-{now:%Y%m%d%H%M%S%f}',
            received_quantity=delta,
            remaining_quantity=delta,
            unit_cost=variant.base_price,
            received_at=now,
            created_by=created_by,
        )
        return

    required = abs(delta)
    batches = list(
        InventoryBatch.objects.select_for_update()
        .filter(variant=variant, remaining_quantity__gt=0)
        .exclude(status=InventoryBatch.Status.CANCELLED)
        .order_by('received_at', 'id')
    )
    if not batches and variant.current_stock > 0:
        batches = [InventoryBatch.objects.create(
            variant=variant,
            batch_number=f'LEGACY-{variant.id}',
            received_quantity=variant.current_stock,
            remaining_quantity=variant.current_stock,
            unit_cost=variant.base_price,
            received_at=timezone.now(),
            created_by=created_by,
        )]
    if sum(batch.remaining_quantity for batch in batches) < required:
        raise ValidationError({'quantity': 'Batch stock is lower than aggregate stock; reconcile inventory first.'})

    for batch in batches:
        if required == 0:
            break
        deduction = min(required, batch.remaining_quantity)
        batch.remaining_quantity -= deduction
        if batch.remaining_quantity == 0:
            batch.status = InventoryBatch.Status.EXHAUSTED
        batch.save(update_fields=['remaining_quantity', 'status', 'updated_at'])
        required -= deduction
