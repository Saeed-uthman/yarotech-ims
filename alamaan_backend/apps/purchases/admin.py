from django.contrib import admin

from .models import PurchaseItem, StockPurchase


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0
    readonly_fields = [
        'variant',
        'quantity',
        'unit_purchase_price',
        'subtotal',
    ]

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StockPurchase)
class StockPurchaseAdmin(admin.ModelAdmin):
    list_display = (
        'purchase_number',
        'purchase_date',
        'total_amount',
        'payment_method',
        'status',
        'recorded_by',
        'created_at',
    )
    list_filter = ('payment_method', 'status', 'created_at')
    search_fields = ('purchase_number', 'note', 'recorded_by__full_name')
    readonly_fields = (
        'purchase_number',
        'purchase_date',
        'total_amount',
        'payment_method',
        'status',
        'note',
        'recorded_by',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
    )
    inlines = [PurchaseItemInline]

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PurchaseItem)
class PurchaseItemAdmin(admin.ModelAdmin):
    list_display = (
        'purchase',
        'variant',
        'quantity',
        'unit_purchase_price',
        'subtotal',
    )
    search_fields = ('purchase__purchase_number', 'variant__product__name')
    readonly_fields = [
        'purchase',
        'variant',
        'quantity',
        'unit_purchase_price',
        'subtotal',
    ]

    def has_delete_permission(self, request, obj=None):
        return False
