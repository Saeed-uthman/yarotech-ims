from rest_framework import serializers

from .models import SystemSettings


class SystemSettingsOutputSerializer(serializers.ModelSerializer):
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
            'low_stock_threshold',
            'allow_negative_stock',
            'receipt_footer',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class SystemSettingsUpdateSerializer(serializers.ModelSerializer):
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
            'low_stock_threshold',
            'allow_negative_stock',
            'receipt_footer',
        ]
