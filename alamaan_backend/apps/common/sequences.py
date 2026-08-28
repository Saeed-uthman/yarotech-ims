from django.db import transaction

from .models import DocumentSequence


def _existing_suffix(*, queryset, field_name, prefix):
    last_reference = (
        queryset.filter(**{f'{field_name}__startswith': prefix})
        .order_by(f'-{field_name}')
        .values_list(field_name, flat=True)
        .first()
    )
    if not last_reference:
        return 0
    try:
        return int(last_reference.rsplit('-', 1)[-1])
    except (TypeError, ValueError):
        return 0


@transaction.atomic
def next_document_number(*, sequence_name, prefix, queryset, field_name, width):
    """Allocate a reference while holding a row lock until caller commit."""

    sequence, created = DocumentSequence.objects.select_for_update().get_or_create(
        name=sequence_name,
    )
    if created or sequence.value == 0:
        sequence.value = max(
            sequence.value,
            _existing_suffix(
                queryset=queryset,
                field_name=field_name,
                prefix=prefix,
            ),
        )

    sequence.value += 1
    sequence.save(update_fields=['value', 'updated_at'])
    return f'{prefix}{sequence.value:0{width}d}'
