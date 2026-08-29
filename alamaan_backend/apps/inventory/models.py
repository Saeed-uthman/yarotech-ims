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


class InventoryBatch(TimeStampedModel):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        QUARANTINED = 'QUARANTINED', 'Quarantined'
        EXHAUSTED = 'EXHAUSTED', 'Exhausted'
        CANCELLED = 'CANCELLED', 'Cancelled'

    variant = models.ForeignKey('products.ProductVariant', on_delete=models.PROTECT, related_name='inventory_batches')
    purchase_item = models.OneToOneField(
        'purchases.PurchaseItem', on_delete=models.PROTECT, null=True, blank=True, related_name='inventory_batch'
    )
    supplier = models.ForeignKey(
        'purchases.Supplier', on_delete=models.PROTECT, null=True, blank=True, related_name='inventory_batches'
    )
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField(null=True, blank=True, db_index=True)
    received_quantity = models.PositiveIntegerField()
    remaining_quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    received_at = models.DateTimeField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='created_inventory_batches',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['variant', 'batch_number'], name='unique_variant_batch_number'),
            models.CheckConstraint(
                condition=models.Q(remaining_quantity__lte=models.F('received_quantity')),
                name='batch_remaining_not_above_received',
            ),
        ]
        indexes = [
            models.Index(
                fields=['variant', 'status', 'expiry_date'],
                name='inventory_i_variant_38e52d_idx',
            ),
        ]
        ordering = ['expiry_date', 'received_at', 'id']

    def __str__(self):
        return f'{self.variant} - {self.batch_number}'


class SaleBatchAllocation(TimeStampedModel):
    sale_item = models.ForeignKey('sales.SaleItem', on_delete=models.PROTECT, related_name='batch_allocations')
    batch = models.ForeignKey(InventoryBatch, on_delete=models.PROTECT, related_name='sale_allocations')
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['sale_item', 'batch'], name='unique_sale_item_batch')]
        ordering = ['id']
