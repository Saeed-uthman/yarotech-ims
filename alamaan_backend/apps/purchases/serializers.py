from decimal import Decimal

from django.db.models import Sum
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.products.models import ProductVariant

from .models import PurchaseItem, PurchaseReturn, PurchaseReturnItem, StockPurchase, Supplier
from .services import cancel_purchase, create_stock_purchase, process_purchase_return


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'email', 'address', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        return Supplier.objects.create(created_by=user, updated_by=user, **validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.updated_by = self.context['request'].user
        instance.save()
        return instance


class CreatePurchaseItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    unit_purchase_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    batch_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    expiry_date = serializers.DateField(required=False, allow_null=True, default=None)

    def validate_unit_purchase_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Unit purchase price must be greater than zero.')
        return value


class CreatePurchaseInputSerializer(serializers.Serializer):
    supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.filter(is_active=True),
        source='supplier',
        required=False,
        allow_null=True,
        default=None,
    )
    items = CreatePurchaseItemInputSerializer(many=True, min_length=1)
    payment_method = serializers.ChoiceField(choices=StockPurchase.PaymentMethod.choices)
    purchase_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        return create_stock_purchase(
            user=self.context['request'].user,
            items=[
                {
                    'product_variant_id': item['product_variant_id'].pk,
                    'quantity': item['quantity'],
                    'unit_purchase_price': item['unit_purchase_price'],
                    'batch_number': item.get('batch_number', ''),
                    'expiry_date': item.get('expiry_date'),
                }
                for item in items_data
            ],
            payment_method=validated_data['payment_method'],
            supplier=validated_data.get('supplier'),
            purchase_date=validated_data.get('purchase_date'),
            note=validated_data.get('note', ''),
        )


class PurchaseItemOutputSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(source='variant.id', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    company_name = serializers.CharField(source='variant.company.name', read_only=True)
    batch_number = serializers.CharField(source='inventory_batch.batch_number', read_only=True)
    expiry_date = serializers.DateField(source='inventory_batch.expiry_date', read_only=True)

    class Meta:
        model = StockPurchase.items.rel.related_model
        fields = [
            'id',
            'variant_id',
            'product_name',
            'company_name',
            'quantity',
            'unit_purchase_price',
            'subtotal',
            'batch_number',
            'expiry_date',
        ]
        read_only_fields = fields


class PurchaseItemSummarySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    company_name = serializers.CharField(source='variant.company.name', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ['product_name', 'company_name', 'quantity']
        read_only_fields = fields


class StockPurchaseListSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)
    items_count = serializers.SerializerMethodField()
    items_summary = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()

    class Meta:
        model = StockPurchase
        fields = [
            'id',
            'purchase_number',
            'purchase_date',
            'total_amount',
            'payment_method',
            'status',
            'recorded_by_name',
            'items_count',
            'items_summary',
            'total_units',
            'created_at',
        ]
        read_only_fields = fields

    def get_items_count(self, obj) -> int:
        if hasattr(obj, 'list_items_count'):
            return obj.list_items_count
        return obj.items.count()

    @extend_schema_field(PurchaseItemSummarySerializer(many=True))
    def get_items_summary(self, obj):
        if hasattr(obj, 'list_items'):
            return PurchaseItemSummarySerializer(obj.list_items[:3], many=True).data
        items = obj.items.select_related('variant__product', 'variant__company')[:3]
        return PurchaseItemSummarySerializer(items, many=True).data

    def get_total_units(self, obj) -> int:
        if hasattr(obj, 'list_total_units'):
            return obj.list_total_units or 0
        return obj.items.aggregate(total=Sum('quantity'))['total'] or 0


class StockPurchaseDetailSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)
    items = PurchaseItemOutputSerializer(many=True, read_only=True)
    total_units = serializers.SerializerMethodField()
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default='')

    class Meta:
        model = StockPurchase
        fields = [
            'id',
            'purchase_number',
            'purchase_date',
            'supplier',
            'supplier_name',
            'total_amount',
            'payment_method',
            'status',
            'note',
            'recorded_by_name',
            'items',
            'total_units',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_total_units(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())


class StockPurchaseCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)

    def validate_reason(self, value):
        reason = value.strip()
        if not reason:
            raise serializers.ValidationError('A cancellation reason is required.')
        return reason

    def save(self, purchase, cancelled_by):
        return cancel_purchase(
            purchase=purchase,
            cancelled_by=cancelled_by,
            reason=self.validated_data['reason'],
        )


class PurchaseReturnItemInputSerializer(serializers.Serializer):
    purchase_item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class CreatePurchaseReturnSerializer(serializers.Serializer):
    items = PurchaseReturnItemInputSerializer(many=True, min_length=1)
    refund_method = serializers.ChoiceField(choices=StockPurchase.PaymentMethod.choices)
    reason = serializers.CharField(max_length=500)

    def validate_items(self, value):
        ids = [item['purchase_item_id'] for item in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError('Each purchase item may appear only once.')
        return value

    def validate_reason(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('A return reason is required.')
        return value

    def save(self, *, purchase, processed_by):
        return process_purchase_return(
            purchase=purchase,
            items=self.validated_data['items'],
            refund_method=self.validated_data['refund_method'],
            reason=self.validated_data['reason'],
            processed_by=processed_by,
        )


class PurchaseReturnItemOutputSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='purchase_item.variant.product.name', read_only=True)
    company_name = serializers.CharField(source='purchase_item.variant.company.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)

    class Meta:
        model = PurchaseReturnItem
        fields = ['id', 'purchase_item', 'product_name', 'company_name', 'batch_number', 'quantity', 'unit_refund_price', 'subtotal']
        read_only_fields = fields


class PurchaseReturnOutputSerializer(serializers.ModelSerializer):
    processed_by_name = serializers.CharField(source='processed_by.full_name', read_only=True)
    items = PurchaseReturnItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseReturn
        fields = ['id', 'return_number', 'purchase', 'total_amount', 'refund_method', 'reason', 'processed_by_name', 'items', 'created_at']
        read_only_fields = fields
