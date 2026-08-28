from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.common.sequences import next_document_number

from .models import AccountabilityTransaction, ManualExpense
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
