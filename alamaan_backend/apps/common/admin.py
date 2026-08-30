from django.contrib import admin

from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'action', 'outcome', 'status_code', 'actor', 'ip_address')
    list_filter = ('outcome', 'method', 'created_at')
    search_fields = ('request_id', 'action', 'path', 'actor__email')
    readonly_fields = (
        'request_id', 'actor', 'method', 'path', 'action', 'outcome',
        'status_code', 'ip_address', 'user_agent', 'metadata', 'created_at',
    )
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
