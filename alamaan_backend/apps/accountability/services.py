from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import AccountabilityTransaction, ManualExpense


def _generate_expense_number():
    now = timezone.now()
    prefix = f'EXP-{now:%Y%m}-'
    last_expense = (
        ManualExpense.objects.filter(expense_number__startswith=prefix)
        .order_by('-expense_number')
        .first()
    )
    if last_expense:
        last_seq = int(last_expense.expense_number.split('-')[-1])
        next_seq = last_seq + 1
    else:
        next_seq = 1
    return f'{prefix}{next_seq:05d}'


def _generate_transaction_number():
    now = timezone.now()
    prefix = f'ACC-{now:%Y%m}-'
    last_tx = (
        AccountabilityTransaction.objects.filter(transaction_number__startswith=prefix)
        .order_by('-transaction_number')
        .first()
    )
    if last_tx:
        last_seq = int(last_tx.transaction_number.split('-')[-1])
        next_seq = last_seq + 1
    else:
        next_seq = 1
    return f'{prefix}{next_seq:06d}'


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
        transaction_number=_generate_transaction_number(),
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
