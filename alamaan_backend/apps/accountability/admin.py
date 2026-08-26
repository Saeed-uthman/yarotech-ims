from django.contrib import admin

from .models import AccountabilityTransaction


@admin.register(AccountabilityTransaction)
class AccountabilityTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'transaction_number',
        'direction',
        'type',
        'category',
        'amount',
        'payment_method',
        'reference_type',
        'reference_id',
        'status',
        'created_at',
    )
    list_filter = ('direction', 'type', 'payment_method', 'status', 'created_at')
    search_fields = ('transaction_number', 'reference_id', 'customer_name', 'description')
    readonly_fields = (
        'transaction_number',
        'direction',
        'type',
        'category',
        'amount',
        'payment_method',
        'reference_type',
        'reference_id',
        'description',
        'customer_name',
        'note',
        'status',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
    )

    def has_delete_permission(self, request, obj=None):
        return False
