from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import AuditableModel, TimeStampedModel


class StockPurchase(AuditableModel):
    class PaymentStatus(models.TextChoices):
        PAID = 'PAID', 'Fully Paid'
        PARTIAL = 'PARTIAL', 'Partially Paid'
        UNPAID = 'UNPAID', 'Unpaid'

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
    supplier_name = models.CharField(max_length=200, blank=True, default='', db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PAID, db_index=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, null=True, blank=True)
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
            models.CheckConstraint(condition=Q(amount_paid__gte=0), name='purchase_paid_non_negative'),
            models.CheckConstraint(condition=Q(outstanding_amount__gte=0), name='purchase_outstanding_non_negative'),
            models.CheckConstraint(condition=Q(amount_paid__lte=models.F('total_amount')), name='purchase_paid_not_above_total'),
            models.CheckConstraint(condition=Q(amount_paid=models.F('total_amount') - models.F('outstanding_amount')), name='purchase_payment_balances_total'),
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


class SupplierPayment(AuditableModel):
    payment_number = models.CharField(max_length=32, unique=True, db_index=True)
    purchase = models.ForeignKey(StockPurchase, on_delete=models.PROTECT, related_name='supplier_payments')
    supplier_name = models.CharField(max_length=200, blank=True, default='')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=StockPurchase.PaymentMethod.choices)
    payment_date = models.DateTimeField(default=timezone.now)
    balance_before = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='recorded_supplier_payments')
    is_reversed = models.BooleanField(default=False, db_index=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name='supplier_payment_positive')]
        ordering = ['-payment_date', '-id']


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
