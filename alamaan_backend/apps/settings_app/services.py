from django.db import transaction

from .models import SystemSettings


RESETTABLE_FIELDS = [
    'pharmacy_name',
    'phone',
    'email',
    'address',
    'logo',
    'business_description',
    'currency',
    'currency_symbol',
    'show_decimals',
    'allow_walking_sales',
    'allow_credit_sales',
    'require_customer_for_credit',
    'require_sale_confirmation',
    'low_stock_threshold',
    'allow_negative_stock',
    'require_admin_stock_adjustment',
    'receipt_logo',
    'receipt_phone',
    'receipt_address',
    'receipt_cashier',
    'receipt_customer',
    'receipt_datetime',
    'receipt_number',
    'receipt_footer',
    'low_stock_notifications',
    'out_of_stock_notifications',
    'new_debt_notifications',
    'large_transaction_alert',
    'large_transaction_threshold',
    'theme',
    'language',
    'session_timeout',
]


@transaction.atomic
def reset_system_settings(*, reset_by):
    instance = SystemSettings.objects.select_for_update().get_or_create(pk=1)[0]
    for field_name in RESETTABLE_FIELDS:
        field = SystemSettings._meta.get_field(field_name)
        setattr(instance, field_name, field.get_default())
    instance.updated_by = reset_by
    instance.save()
    return instance
