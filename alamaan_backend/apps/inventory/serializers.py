from decimal import Decimal

from rest_framework import serializers

from apps.products.models import ProductVariant

from .models import InventoryBatch, InventoryMovement


class InventoryBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    company_name = serializers.CharField(source='variant.company.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default='')
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = InventoryBatch
        fields = [
            'id', 'variant', 'product_name', 'company_name', 'supplier', 'supplier_name',
            'batch_number', 'expiry_date', 'received_quantity', 'remaining_quantity',
            'unit_cost', 'status', 'received_at', 'is_expired', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_is_expired(self, obj) -> bool:
        from django.utils import timezone
        return bool(obj.expiry_date and obj.expiry_date < timezone.localdate())


class InventoryItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    generic_name = serializers.CharField(source='product.generic_name', read_only=True)
    category_id = serializers.IntegerField(source='product.category.id', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    company_id = serializers.IntegerField(source='company.id', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    stock_status = serializers.SerializerMethodField()
    inventory_cost_value = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'product_id',
            'product_name',
            'generic_name',
            'category_id',
            'category_name',
            'company_id',
            'company_name',
            'base_price',
            'min_selling_price',
            'default_selling_price',
            'max_selling_price',
            'current_stock',
            'reorder_level',
            'stock_status',
            'inventory_cost_value',
            'status',
            'updated_at',
        ]
        read_only_fields = fields

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if not request or getattr(request.user, 'role', None) != 'admin':
            fields.pop('base_price', None)
            fields.pop('inventory_cost_value', None)
        return fields

    def get_stock_status(self, obj) -> str:
        if obj.current_stock == 0:
            return 'out'
        if obj.current_stock <= obj.reorder_level:
            return 'low'
        return 'available'

    def get_inventory_cost_value(self, obj) -> Decimal:
        return obj.current_stock * obj.base_price


class StockAdjustmentInputSerializer(serializers.Serializer):
    variant_id = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all(), source='variant')
    adjustment_type = serializers.ChoiceField(choices=['SET_EXACT', 'INCREMENT', 'DECREMENT'])
    quantity = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_reason(self, value):
        reason = value.strip()
        if not reason:
            raise serializers.ValidationError('A stock adjustment reason is required.')
        return reason


class InventoryMovementSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(source='variant.id', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    company_name = serializers.CharField(source='variant.company.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            'id',
            'variant_id',
            'product_name',
            'company_name',
            'movement_type',
            'quantity',
            'previous_stock',
            'new_stock',
            'reason',
            'notes',
            'reference_type',
            'reference_id',
            'created_by',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = fields
