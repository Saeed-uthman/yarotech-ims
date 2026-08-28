from django.utils import timezone

from apps.common.sequences import next_document_number

from .models import AccountabilityTransaction


def next_accountability_transaction_number():
    now = timezone.now()
    prefix = f'ACC-{now:%Y%m}-'
    return next_document_number(
        sequence_name=f'accountability:{now:%Y%m}',
        prefix=prefix,
        queryset=AccountabilityTransaction.objects.all(),
        field_name='transaction_number',
        width=6,
    )
