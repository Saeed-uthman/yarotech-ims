from django.contrib import admin

from .models import PurchaseItem, StockPurchase, SupplierPayment


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
        'supplier_name',
        'total_amount',
        'amount_paid',
        'outstanding_amount',
        'credited_amount',
        'payment_status',
        'payment_method',
        'status',
        'recorded_by',
        'created_at',
    )
    list_filter = ('payment_status', 'payment_method', 'status', 'created_at')
    search_fields = ('purchase_number', 'supplier_name', 'note', 'recorded_by__full_name')
    readonly_fields = (
        'purchase_number',
        'purchase_date',
        'supplier_name',
        'total_amount',
        'amount_paid',
        'outstanding_amount',
        'credited_amount',
        'payment_status',
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


@admin.register(SupplierPayment)
class SupplierPaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_number', 'purchase', 'supplier_name', 'amount', 'payment_method', 'payment_date', 'recorded_by')
    list_filter = ('payment_method', 'is_reversed', 'payment_date')
    search_fields = ('payment_number', 'purchase__purchase_number', 'supplier_name')
    readonly_fields = [field.name for field in SupplierPayment._meta.fields]

    def has_delete_permission(self, request, obj=None):
        return False
