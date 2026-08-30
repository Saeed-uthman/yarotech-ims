from django.contrib import admin

from .models import InventoryBatch, InventoryMovement, SaleBatchAllocation


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


@admin.register(InventoryBatch)
class InventoryBatchAdmin(admin.ModelAdmin):
    list_display = ('batch_number', 'variant', 'expiry_date', 'remaining_quantity', 'status', 'supplier_name')
    list_filter = ('status', 'expiry_date')
    search_fields = ('batch_number', 'variant__product__name', 'supplier_name')
    readonly_fields = [field.name for field in InventoryBatch._meta.fields]

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SaleBatchAllocation)
class SaleBatchAllocationAdmin(admin.ModelAdmin):
    list_display = ('sale_item', 'batch', 'quantity', 'unit_cost', 'created_at')
    readonly_fields = [field.name for field in SaleBatchAllocation._meta.fields]

    def has_delete_permission(self, request, obj=None):
        return False
