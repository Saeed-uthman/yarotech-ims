import hashlib
import json

from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError

from .models import IdempotencyRecord


class IdempotencyConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'This idempotency key was already used with a different request payload.'
    default_code = 'IDEMPOTENCY_KEY_REUSED'


def _request_hash(data):
    canonical_payload = json.dumps(data, sort_keys=True, separators=(',', ':'), default=str)
    return hashlib.sha256(canonical_payload.encode('utf-8')).hexdigest()


@transaction.atomic
def execute_idempotent(*, request, scope, operation):
    key = request.headers.get('Idempotency-Key', '').strip()
    if not key:
        return operation(), False
    if len(key) > 255:
        raise ValidationError({'idempotency_key': 'Idempotency-Key cannot exceed 255 characters.'})

    payload_hash = _request_hash(request.data)
    record, created = IdempotencyRecord.objects.select_for_update().get_or_create(
        user=request.user,
        scope=scope,
        key=key,
        defaults={'request_hash': payload_hash},
    )

    if not created:
        if record.request_hash != payload_hash:
            raise IdempotencyConflict()
        if record.response_body is not None and record.response_status is not None:
            return (record.response_body, record.response_status), True

    response_body, response_status = operation()
    record.request_hash = payload_hash
    record.response_body = response_body
    record.response_status = response_status
    record.save(update_fields=['request_hash', 'response_body', 'response_status', 'updated_at'])
    return (response_body, response_status), False
