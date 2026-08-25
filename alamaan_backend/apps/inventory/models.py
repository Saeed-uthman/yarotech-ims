from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class InventoryMovement(TimeStampedModel):
    class MovementType(models.TextChoices):
        STOCK_IN = 'STOCK_IN', 'Stock In'
        STOCK_OUT = 'STOCK_OUT', 'Stock Out'
        ADJUSTMENT = 'ADJUSTMENT', 'Manual Adjustment'

    class ReferenceType(models.TextChoices):
        SALE = 'SALE', 'Sale Checkout'
        STOCK_PURCHASE = 'STOCK_PURCHASE', 'Stock Purchase'
        MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT', 'Manual Adjustment'
        INITIAL_SETUP = 'INITIAL_SETUP', 'Initial Inventory Setup'

    variant = models.ForeignKey('products.ProductVariant', on_delete=models.PROTECT, related_name='inventory_movements')
    movement_type = models.CharField(max_length=20, choices=MovementType.choices, db_index=True)
    quantity = models.IntegerField()
    previous_stock = models.IntegerField()
    new_stock = models.IntegerField()
    reason = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default='')
    reference_type = models.CharField(max_length=30, choices=ReferenceType.choices, db_index=True)
    reference_id = models.CharField(max_length=64, blank=True, default='')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='recorded_stock_movements')

    class Meta:
        indexes = [
            models.Index(fields=['variant', 'created_at']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]
        ordering = ['-created_at']

    def delete(self, *args, **kwargs):
        raise NotImplementedError('Inventory movements are immutable and cannot be deleted.')

    def __str__(self):
        return f'{self.variant} {self.movement_type} {self.quantity}'
