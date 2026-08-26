from django.contrib import admin

from .models import Customer, CustomerDebtPayment


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'phone', 'email')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


@admin.register(CustomerDebtPayment)
class CustomerDebtPaymentAdmin(admin.ModelAdmin):
    list_display = (
        'receipt_number',
        'customer',
        'amount',
        'payment_method',
        'balance_before',
        'balance_after',
        'recorded_by',
        'created_at',
    )
    list_filter = ('payment_method', 'created_at')
    search_fields = ('receipt_number', 'customer__name', 'customer__phone', 'recorded_by__full_name')
    readonly_fields = (
        'receipt_number',
        'customer',
        'amount',
        'payment_method',
        'balance_before',
        'balance_after',
        'reference_notes',
        'recorded_by',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
    )

    def has_delete_permission(self, request, obj=None):
        return False
