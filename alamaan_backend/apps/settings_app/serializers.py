from rest_framework import serializers

from .models import SystemSettings


class SystemSettingsOutputSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = SystemSettings
        fields = [
            'id',
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
            'updated_at',
            'updated_by_name',
        ]
        read_only_fields = ['id', 'updated_at']


class SystemSettingsUpdateSerializer(serializers.ModelSerializer):
    clear_logo = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = SystemSettings
        fields = [
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
            'clear_logo',
        ]

    def validate_receipt_footer(self, value):
        if len(value) > 150:
            raise serializers.ValidationError('Receipt footer cannot exceed 150 characters.')
        return value

    def validate_language(self, value):
        if value != 'English':
            raise serializers.ValidationError('English is currently the only supported language.')
        return value

    def validate_large_transaction_threshold(self, value):
        if value < 0:
            raise serializers.ValidationError('Large transaction threshold cannot be negative.')
        return value

    def validate_require_customer_for_credit(self, value):
        if not value:
            raise serializers.ValidationError(
                'Registered customers are required for credit sales so debt remains collectible.'
            )
        return value

    def validate_allow_negative_stock(self, value):
        if value:
            raise serializers.ValidationError(
                'Negative stock cannot be enabled because inventory has a non-negative database constraint.'
            )
        return value

    def validate_require_admin_stock_adjustment(self, value):
        if not value:
            raise serializers.ValidationError(
                'Admin authorization is required for audited stock adjustments.'
            )
        return value

    def update(self, instance, validated_data):
        clear_logo = validated_data.pop('clear_logo', False)
        instance = super().update(instance, validated_data)
        if clear_logo and instance.logo:
            instance.logo = None
            instance.save(update_fields=['logo', 'updated_at'])
        return instance
