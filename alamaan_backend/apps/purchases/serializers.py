from decimal import Decimal

from rest_framework import serializers

from apps.products.models import ProductVariant

from .models import StockPurchase
from .services import cancel_purchase, create_stock_purchase


class CreatePurchaseItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    unit_purchase_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))

    def validate_unit_purchase_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Unit purchase price must be greater than zero.')
        return value


class CreatePurchaseInputSerializer(serializers.Serializer):
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
                }
                for item in items_data
            ],
            payment_method=validated_data['payment_method'],
            purchase_date=validated_data.get('purchase_date'),
            note=validated_data.get('note', ''),
        )


class PurchaseItemOutputSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(source='variant.id', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    company_name = serializers.CharField(source='variant.company.name', read_only=True)

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
        ]
        read_only_fields = fields


class StockPurchaseListSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)
    items_count = serializers.SerializerMethodField()

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
            'created_at',
        ]
        read_only_fields = fields

    def get_items_count(self, obj):
        return obj.items.count()


class StockPurchaseDetailSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)
    items = PurchaseItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = StockPurchase
        fields = [
            'id',
            'purchase_number',
            'purchase_date',
            'total_amount',
            'payment_method',
            'status',
            'note',
            'recorded_by_name',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


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
