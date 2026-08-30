from django.db import models
from django.db.models import Q

from apps.common.models import AuditableModel, TimeStampedModel


class Sale(AuditableModel):
    class PaymentStatus(models.TextChoices):
        PAID = 'PAID', 'Fully Paid'
        PARTIAL = 'PARTIAL', 'Partially Paid'
        UNPAID = 'UNPAID', 'Credit / Unpaid'

    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        TRANSFER = 'TRANSFER', 'Bank Transfer'
        POS = 'POS', 'Card / POS'
        CREDIT = 'CREDIT', 'Credit'

    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.BigAutoField(primary_key=True)
    invoice_number = models.CharField(max_length=32, unique=True, db_index=True)
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='sales',
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        db_index=True,
    )
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True,
    )
    notes = models.TextField(blank=True, default='')
    served_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='served_sales',
    )

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(total_amount__gte=0), name='sale_total_non_negative'),
            models.CheckConstraint(condition=Q(amount_paid__gte=0), name='sale_amount_paid_non_negative'),
            models.CheckConstraint(condition=Q(outstanding_amount__gte=0), name='sale_outstanding_non_negative'),
        ]
        indexes = [
            models.Index(fields=['created_at', 'payment_status']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.invoice_number


class SaleItem(TimeStampedModel):
    id = models.BigAutoField(primary_key=True)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.PROTECT,
        related_name='sale_items',
    )
    quantity = models.IntegerField()
    actual_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    unit_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    historical_base_price = models.DecimalField(max_digits=12, decimal_places=2)
    unit_base_price = models.DecimalField(max_digits=12, decimal_places=2)
    min_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    default_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    max_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    profit = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.variant} x{self.quantity}'


class SaleReturn(AuditableModel):
    id = models.BigAutoField(primary_key=True)
    return_number = models.CharField(max_length=32, unique=True, db_index=True)
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name='returns')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    debt_reduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_method = models.CharField(max_length=20, choices=Sale.PaymentMethod.choices)
    reason = models.CharField(max_length=500)
    processed_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='processed_sale_returns'
    )

    class Meta:
        ordering = ['-created_at']


class SaleReturnItem(TimeStampedModel):
    return_record = models.ForeignKey(SaleReturn, on_delete=models.PROTECT, related_name='items')
    sale_item = models.ForeignKey(SaleItem, on_delete=models.PROTECT, related_name='return_items')
    quantity = models.PositiveIntegerField()
    unit_refund_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    historical_cost = models.DecimalField(max_digits=12, decimal_places=2)
    profit_reversal = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['id']


class SaleReturnBatchRestoration(TimeStampedModel):
    return_item = models.ForeignKey(SaleReturnItem, on_delete=models.PROTECT, related_name='batch_restorations')
    batch = models.ForeignKey('inventory.InventoryBatch', on_delete=models.PROTECT, related_name='return_restorations')
    quantity = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['return_item', 'batch'], name='unique_return_item_batch'),
        ]
