from decimal import Decimal

from django.db.models import Sum
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.products.models import ProductVariant

from .models import PurchaseItem, PurchaseReturn, PurchaseReturnItem, StockPurchase, SupplierPayment
from .services import cancel_purchase, create_stock_purchase, process_purchase_return, record_supplier_payment


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
    supplier_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True)
    items = CreatePurchaseItemInputSerializer(many=True, min_length=1)
    payment_method = serializers.ChoiceField(choices=StockPurchase.PaymentMethod.choices, required=False, allow_null=True)
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
            payment_method=validated_data.get('payment_method'),
            amount_paid=validated_data.get('amount_paid'),
            supplier_name=validated_data.get('supplier_name', ''),
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
            'supplier_name',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'payment_status',
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

    class Meta:
        model = StockPurchase
        fields = [
            'id',
            'purchase_number',
            'purchase_date',
            'supplier_name',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'payment_status',
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


class SupplierPaymentInputSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=StockPurchase.PaymentMethod.choices)
    payment_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def save(self, *, purchase, recorded_by):
        return record_supplier_payment(purchase=purchase, user=recorded_by, **self.validated_data)


class SupplierPaymentOutputSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)

    class Meta:
        model = SupplierPayment
        fields = [
            'id', 'payment_number', 'purchase', 'supplier_name', 'amount',
            'payment_method', 'payment_date', 'balance_before', 'balance_after',
            'note', 'recorded_by_name', 'is_reversed', 'created_at',
        ]
        read_only_fields = fields


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
