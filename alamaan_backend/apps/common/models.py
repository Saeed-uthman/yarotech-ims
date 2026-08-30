from django.conf import settings
from django.db import models

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        
class AuditableModel(TimeStampedModel):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )

    class Meta:
        abstract = True


class IdempotencyRecord(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='idempotency_records')
    scope = models.CharField(max_length=100)
    key = models.CharField(max_length=255)
    request_hash = models.CharField(max_length=64)
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    response_body = models.JSONField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'scope', 'key'], name='unique_user_scope_idempotency_key'),
        ]
        indexes = [models.Index(fields=['created_at'], name='common_idem_created_idx')]

    def __str__(self):
        return f'{self.user_id}:{self.scope}:{self.key}'


class DocumentSequence(TimeStampedModel):
    """Concurrency-safe counters for human-readable business references."""

    name = models.CharField(max_length=100, unique=True)
    value = models.PositiveBigIntegerField(default=0)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name}:{self.value}'


class AuditEvent(models.Model):
    class Outcome(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        DENIED = 'DENIED', 'Denied'
        FAILED = 'FAILED', 'Failed'

    id = models.BigAutoField(primary_key=True)
    request_id = models.UUIDField(db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events',
    )
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=255, db_index=True)
    action = models.CharField(max_length=100, db_index=True)
    outcome = models.CharField(max_length=10, choices=Outcome.choices, db_index=True)
    status_code = models.PositiveSmallIntegerField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['action', 'created_at'], name='common_aud_action_7f2f86_idx')]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise NotImplementedError('Audit events are immutable and cannot be updated.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise NotImplementedError('Audit events are immutable and cannot be deleted individually.')
