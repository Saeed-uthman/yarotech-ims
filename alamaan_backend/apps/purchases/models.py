from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import AuditableModel, TimeStampedModel


class Supplier(AuditableModel):
    name = models.CharField(max_length=200, unique=True)
    phone = models.CharField(max_length=30, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class StockPurchase(AuditableModel):
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        TRANSFER = 'TRANSFER', 'Bank Transfer'
        POS = 'POS', 'Card / POS'

    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.BigAutoField(primary_key=True)
    purchase_number = models.CharField(max_length=32, unique=True, db_index=True)
    purchase_date = models.DateTimeField(default=timezone.now)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='purchases',
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True,
    )
    note = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='recorded_purchases',
    )

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(total_amount__gte=0), name='purchase_total_non_negative'),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.purchase_number


class PurchaseItem(TimeStampedModel):
    id = models.BigAutoField(primary_key=True)
    purchase = models.ForeignKey(StockPurchase, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.PROTECT,
        related_name='purchase_items',
    )
    quantity = models.IntegerField()
    unit_purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.variant} x{self.quantity}'


class PurchaseReturn(AuditableModel):
    id = models.BigAutoField(primary_key=True)
    return_number = models.CharField(max_length=32, unique=True, db_index=True)
    purchase = models.ForeignKey(StockPurchase, on_delete=models.PROTECT, related_name='returns')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    refund_method = models.CharField(max_length=20, choices=StockPurchase.PaymentMethod.choices)
    reason = models.CharField(max_length=500)
    processed_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='processed_purchase_returns'
    )

    class Meta:
        ordering = ['-created_at']


class PurchaseReturnItem(TimeStampedModel):
    return_record = models.ForeignKey(PurchaseReturn, on_delete=models.PROTECT, related_name='items')
    purchase_item = models.ForeignKey(PurchaseItem, on_delete=models.PROTECT, related_name='return_items')
    batch = models.ForeignKey('inventory.InventoryBatch', on_delete=models.PROTECT, related_name='purchase_return_items')
    quantity = models.PositiveIntegerField()
    unit_refund_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['id']
