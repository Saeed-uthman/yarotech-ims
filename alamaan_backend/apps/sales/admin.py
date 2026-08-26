from django.contrib import admin

from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = [
        'variant',
        'quantity',
        'actual_selling_price',
        'historical_base_price',
        'min_selling_price',
        'default_selling_price',
        'max_selling_price',
        'subtotal',
        'profit',
    ]

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number',
        'customer',
        'total_amount',
        'amount_paid',
        'outstanding_amount',
        'payment_status',
        'payment_method',
        'status',
        'served_by',
        'created_at',
    )
    list_filter = ('payment_status', 'payment_method', 'status', 'created_at')
    search_fields = ('invoice_number', 'customer__name', 'customer__phone', 'served_by__full_name')
    readonly_fields = (
        'invoice_number',
        'subtotal',
        'discount',
        'total_amount',
        'amount_paid',
        'outstanding_amount',
        'payment_status',
        'payment_method',
        'status',
        'notes',
        'served_by',
        'customer',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
    )
    inlines = [SaleItemInline]

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = (
        'sale',
        'variant',
        'quantity',
        'actual_selling_price',
        'historical_base_price',
        'subtotal',
        'profit',
    )
    search_fields = ('sale__invoice_number', 'variant__product__name')
    readonly_fields = [
        'sale',
        'variant',
        'quantity',
        'actual_selling_price',
        'unit_selling_price',
        'historical_base_price',
        'unit_base_price',
        'min_selling_price',
        'default_selling_price',
        'max_selling_price',
        'subtotal',
        'profit',
    ]

    def has_delete_permission(self, request, obj=None):
        return False
