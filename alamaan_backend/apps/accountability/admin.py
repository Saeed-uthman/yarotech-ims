from django.contrib import admin

from .models import AccountabilityTransaction, BusinessFundMovement, ManualExpense


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


@admin.register(ManualExpense)
class ManualExpenseAdmin(admin.ModelAdmin):
    list_display = (
        'expense_number',
        'category',
        'amount',
        'payment_method',
        'description',
        'created_by',
        'created_at',
    )
    list_filter = ('category', 'payment_method', 'created_at')
    search_fields = ('expense_number', 'description')
    readonly_fields = (
        'expense_number',
        'category',
        'amount',
        'payment_method',
        'description',
        'note',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
    )

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(BusinessFundMovement)
class BusinessFundMovementAdmin(admin.ModelAdmin):
    list_display = ('movement_number', 'movement_type', 'amount', 'created_by', 'created_at')
    list_filter = ('movement_type', 'created_at')
    search_fields = ('movement_number', 'note')
    readonly_fields = (
        'movement_number', 'movement_type', 'amount', 'note', 'created_by',
        'updated_by', 'created_at', 'updated_at',
    )

    def has_delete_permission(self, request, obj=None):
        return False
