from django.contrib import admin

from .models import InventoryMovement


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = (
        'variant',
        'movement_type',
        'quantity',
        'previous_stock',
        'new_stock',
        'reference_type',
        'created_by',
        'created_at',
    )
    search_fields = ('variant__product__name', 'variant__company__name', 'reason', 'reference_id')
    list_filter = ('movement_type', 'reference_type', 'created_at')
    readonly_fields = [field.name for field in InventoryMovement._meta.fields]

    def has_delete_permission(self, request, obj=None):
        return False
