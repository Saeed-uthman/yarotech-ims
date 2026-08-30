from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True, default='System / anonymous')
    actor_email = serializers.EmailField(source='actor.email', read_only=True, default='')

    class Meta:
        model = AuditEvent
        fields = [
            'id', 'request_id', 'actor', 'actor_name', 'actor_email', 'method',
            'path', 'action', 'outcome', 'status_code', 'ip_address',
            'user_agent', 'metadata', 'created_at',
        ]
        read_only_fields = fields
