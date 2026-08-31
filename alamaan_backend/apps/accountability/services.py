from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.common.sequences import next_document_number

from .models import AccountabilityTransaction, BusinessFundMovement, ManualExpense
from .sequences import next_accountability_transaction_number


def _generate_expense_number():
    now = timezone.now()
    prefix = f'EXP-{now:%Y%m}-'
    return next_document_number(
        sequence_name=f'expense:{now:%Y%m}',
        prefix=prefix,
        queryset=ManualExpense.objects.all(),
        field_name='expense_number',
        width=5,
    )


@transaction.atomic
def record_manual_expense(*, user, category, amount, payment_method, description, note=''):
    amount = Decimal(str(amount))

    if amount <= 0:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({'amount': 'Expense amount must be greater than zero.'})

    expense_number = _generate_expense_number()

    expense = ManualExpense.objects.create(
        expense_number=expense_number,
        category=category,
        amount=amount,
        payment_method=payment_method,
        description=description.strip(),
        note=note.strip(),
        created_by=user,
        updated_by=user,
    )

    AccountabilityTransaction.objects.create(
        transaction_number=next_accountability_transaction_number(),
        direction=AccountabilityTransaction.Direction.OUT,
        type=AccountabilityTransaction.TxType.OTHER_EXPENSE,
        category=category,
        amount=amount,
        payment_method=payment_method,
        reference_type='ManualExpense',
        reference_id=str(expense.id),
        description=description.strip(),
        created_by=user,
        updated_by=user,
    )

    return expense


@transaction.atomic
def record_business_fund_movement(*, user, movement_type, amount, note=''):
    from rest_framework.exceptions import ValidationError

    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValidationError({'amount': 'Amount must be greater than zero.'})
    if movement_type not in BusinessFundMovement.MovementType.values:
        raise ValidationError({'movement_type': 'Invalid business funds movement type.'})

    # The shared sequence row provides a database lock so simultaneous withdrawals
    # cannot both validate against the same available balance.
    movement_number = next_document_number(
        sequence_name='business-fund-movement',
        prefix='BFM-',
        queryset=BusinessFundMovement.objects.all(),
        field_name='movement_number',
        width=7,
    )

    if movement_type == BusinessFundMovement.MovementType.OPENING_BALANCE:
        if BusinessFundMovement.objects.filter(
            movement_type=BusinessFundMovement.MovementType.OPENING_BALANCE
        ).exists():
            raise ValidationError({'movement_type': 'The opening business balance has already been recorded.'})

    completed = AccountabilityTransaction.objects.filter(
        status=AccountabilityTransaction.Status.COMPLETED
    )
    totals = completed.aggregate(
        money_in=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.IN)),
        money_out=Sum('amount', filter=Q(direction=AccountabilityTransaction.Direction.OUT)),
    )
    available_balance = (totals['money_in'] or Decimal('0.00')) - (totals['money_out'] or Decimal('0.00'))
    if movement_type == BusinessFundMovement.MovementType.OWNER_WITHDRAWAL and amount > available_balance:
        raise ValidationError({
            'amount': f'Withdrawal exceeds the available business funds of {available_balance:.2f}.'
        })

    movement = BusinessFundMovement.objects.create(
        movement_number=movement_number,
        movement_type=movement_type,
        amount=amount,
        note=note.strip(),
        created_by=user,
        updated_by=user,
    )
    is_withdrawal = movement_type == BusinessFundMovement.MovementType.OWNER_WITHDRAWAL
    labels = {
        BusinessFundMovement.MovementType.OPENING_BALANCE: 'Opening business funds',
        BusinessFundMovement.MovementType.OWNER_CAPITAL: 'Owner capital added',
        BusinessFundMovement.MovementType.OWNER_WITHDRAWAL: 'Owner withdrawal',
    }
    AccountabilityTransaction.objects.create(
        transaction_number=next_accountability_transaction_number(),
        direction=(AccountabilityTransaction.Direction.OUT if is_withdrawal else AccountabilityTransaction.Direction.IN),
        type=movement_type,
        category='Owner Funds',
        amount=amount,
        payment_method=AccountabilityTransaction.PaymentMethod.CASH,
        reference_type='BusinessFundMovement',
        reference_id=str(movement.id),
        description=labels[movement_type],
        note=note.strip(),
        created_by=user,
        updated_by=user,
    )
    return movement
