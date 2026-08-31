from django.db import models

from apps.common.models import AuditableModel


class ManualExpense(AuditableModel):
    class Category(models.TextChoices):
        TRANSPORT = 'Transport', 'Transport'
        UTILITIES = 'Utilities', 'Utilities'
        STATIONERY = 'Stationery', 'Stationery'
        MAINTENANCE = 'Maintenance', 'Maintenance'
        OTHER = 'Other', 'Other'

    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        TRANSFER = 'TRANSFER', 'Bank Transfer'
        POS = 'POS', 'Card / POS'

    id = models.BigAutoField(primary_key=True)
    expense_number = models.CharField(max_length=32, unique=True, db_index=True)
    category = models.CharField(max_length=50, choices=Category.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.expense_number} - {self.description}'


class AccountabilityTransaction(AuditableModel):
    class Direction(models.TextChoices):
        IN = 'IN', 'Cash Inflow'
        OUT = 'OUT', 'Cash Outflow'

    class TxType(models.TextChoices):
        SALE = 'SALE', 'Sales Revenue'
        DEBT_PAYMENT = 'DEBT_PAYMENT', 'Customer Debt Recovery'
        STOCK_PURCHASE = 'STOCK_PURCHASE', 'Stock Purchase Disbursement'
        OTHER_EXPENSE = 'OTHER_EXPENSE', 'Operational Expense'
        DEBT_PAYMENT_REVERSAL = 'DEBT_PAYMENT_REVERSAL', 'Debt Payment Reversal'
        SALE_REFUND = 'SALE_REFUND', 'Customer Sale Refund'
        PURCHASE_RETURN = 'PURCHASE_RETURN', 'Stock Purchase Return'
        SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT', 'Supplier Payment'
        OPENING_BALANCE = 'OPENING_BALANCE', 'Opening Business Funds'
        OWNER_CAPITAL = 'OWNER_CAPITAL', 'Owner Capital Added'
        OWNER_WITHDRAWAL = 'OWNER_WITHDRAWAL', 'Owner Withdrawal'

    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        TRANSFER = 'TRANSFER', 'Bank Transfer'
        POS = 'POS', 'Card / POS'

    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.BigAutoField(primary_key=True)
    transaction_number = models.CharField(max_length=32, unique=True, db_index=True)
    direction = models.CharField(max_length=10, choices=Direction.choices, db_index=True)
    type = models.CharField(max_length=30, choices=TxType.choices, db_index=True)
    category = models.CharField(max_length=100, default='Sales Revenue')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    reference_type = models.CharField(max_length=30)
    reference_id = models.CharField(max_length=64)
    description = models.CharField(max_length=255, blank=True, default='')
    customer_name = models.CharField(max_length=150, blank=True, default='')
    note = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True,
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.transaction_number} {self.direction} {self.amount}'


class BusinessFundMovement(AuditableModel):
    class MovementType(models.TextChoices):
        OPENING_BALANCE = 'OPENING_BALANCE', 'Opening Balance'
        OWNER_CAPITAL = 'OWNER_CAPITAL', 'Owner Capital Added'
        OWNER_WITHDRAWAL = 'OWNER_WITHDRAWAL', 'Owner Withdrawal'

    id = models.BigAutoField(primary_key=True)
    movement_number = models.CharField(max_length=32, unique=True, db_index=True)
    movement_type = models.CharField(max_length=30, choices=MovementType.choices, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name='business_fund_movement_positive_amount',
            ),
            models.UniqueConstraint(
                fields=['movement_type'],
                condition=models.Q(movement_type='OPENING_BALANCE'),
                name='one_business_opening_balance',
            ),
        ]

    def __str__(self):
        return f'{self.movement_number} - {self.get_movement_type_display()}'
