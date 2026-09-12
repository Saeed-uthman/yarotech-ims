from django.db import models

from apps.common.models import AuditableModel


class Customer(AuditableModel):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        INACTIVE = 'Inactive', 'Inactive'

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=20, unique=True, db_index=True, null=True, blank=True)
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.phone})' if self.phone else self.name


class CustomerDebtPayment(AuditableModel):
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        TRANSFER = 'TRANSFER', 'Bank Transfer'
        POS = 'POS', 'Card / POS'

    id = models.BigAutoField(primary_key=True)
    receipt_number = models.CharField(max_length=32, unique=True, db_index=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='debt_payments',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    balance_before = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    reference_notes = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='recorded_debt_payments',
    )
    is_reversed = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.receipt_number} - {self.customer.name} - {self.amount}'


class CustomerDebtPaymentAllocation(models.Model):
    payment = models.ForeignKey(CustomerDebtPayment, on_delete=models.PROTECT, related_name='allocations')
    sale = models.ForeignKey('sales.Sale', on_delete=models.PROTECT, related_name='debt_payment_allocations')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['payment', 'sale'], name='unique_payment_sale_allocation'),
        ]
        ordering = ['id']


class DebtPaymentReversal(AuditableModel):
    payment = models.OneToOneField(
        CustomerDebtPayment,
        on_delete=models.PROTECT,
        related_name='reversal',
    )
    reason = models.CharField(max_length=500)
    reversed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='reversed_debt_payments',
    )

    class Meta:
        ordering = ['-created_at']
