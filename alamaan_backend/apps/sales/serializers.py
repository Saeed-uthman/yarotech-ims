from decimal import Decimal

from rest_framework import serializers

from apps.customers.models import Customer
from apps.products.models import ProductVariant

from .models import Sale, SaleItem, SaleReturn, SaleReturnItem
from .services import cancel_sale, process_pos_sale, process_sale_return


class CreateSaleItemInputSerializer(serializers.Serializer):
    product_variant_id = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    actual_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)

    def validate_actual_selling_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Selling price must be greater than zero.')
        return value


class CreateSaleInputSerializer(serializers.Serializer):
    expected_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=0)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=False,
        allow_null=True,
        default=None,
    )
    items = CreateSaleItemInputSerializer(many=True, min_length=1)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), min_value=0)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    payment_method = serializers.ChoiceField(choices=Sale.PaymentMethod.choices)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        customer = validated_data.pop('customer_id', None)
        customer_id = customer.pk if customer else None

        sale = process_pos_sale(
            user=self.context['request'].user,
            customer_id=customer_id,
            items=[
                {
                    'product_variant_id': item['product_variant_id'].pk,
                    'quantity': item['quantity'],
                    'actual_selling_price': item['actual_selling_price'],
                }
                for item in items_data
            ],
            discount=validated_data.get('discount', Decimal('0.00')),
            amount_paid=validated_data['amount_paid'],
            payment_method=validated_data['payment_method'],
            notes=validated_data.get('notes', ''),
            expected_total=validated_data.get('expected_total'),
        )
        return sale


class SaleItemOutputSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(source='variant.id', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    company_name = serializers.CharField(source='variant.company.name', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id',
            'variant_id',
            'product_name',
            'company_name',
            'quantity',
            'actual_selling_price',
            'unit_selling_price',
            'historical_base_price',
            'unit_base_price',
            'min_selling_price',
            'default_selling_price',
            'max_selling_price',
            'subtotal',
            'vat_amount',
            'vat_rate',
            'line_discount',
            'profit',
        ]
        read_only_fields = fields

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if not request or getattr(request.user, 'role', None) != 'admin':
            fields.pop('historical_base_price', None)
            fields.pop('unit_base_price', None)
            fields.pop('profit', None)
        return fields


class SaleListSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='Walk-in')
    served_by_name = serializers.CharField(source='served_by.full_name', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'customer',
            'customer_name',
            'subtotal',
            'vat_amount',
            'discount',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'payment_status',
            'payment_method',
            'status',
            'served_by_name',
            'items_count',
            'created_at',
        ]
        read_only_fields = fields

    def get_items_count(self, obj) -> int:
        if hasattr(obj, 'list_items_count'):
            return obj.list_items_count
        return obj.items.count()


class SaleDetailSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='Walk-in')
    served_by_name = serializers.CharField(source='served_by.full_name', read_only=True)
    items = SaleItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'customer',
            'customer_name',
            'subtotal',
            'vat_amount',
            'discount',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'payment_status',
            'payment_method',
            'status',
            'notes',
            'served_by_name',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class SaleReceiptSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='Walk-in')
    customer_phone = serializers.CharField(source='customer.phone', read_only=True, allow_null=True, default='')
    customer_address = serializers.CharField(source='customer.address', read_only=True, default='')
    served_by_name = serializers.CharField(source='served_by.full_name', read_only=True)
    items = SaleItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'customer',
            'customer_name',
            'customer_phone',
            'customer_address',
            'subtotal',
            'vat_amount',
            'discount',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'payment_status',
            'payment_method',
            'status',
            'notes',
            'served_by_name',
            'items',
            'created_at',
        ]
        read_only_fields = fields


class SaleCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)

    def validate_reason(self, value):
        reason = value.strip()
        if not reason:
            raise serializers.ValidationError('A cancellation reason is required.')
        return reason

    def save(self, sale, cancelled_by):
        return cancel_sale(
            sale=sale,
            cancelled_by=cancelled_by,
            reason=self.validated_data['reason'],
        )


class SaleReturnItemInputSerializer(serializers.Serializer):
    sale_item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class CreateSaleReturnSerializer(serializers.Serializer):
    items = SaleReturnItemInputSerializer(many=True, min_length=1)
    refund_method = serializers.ChoiceField(choices=[
        Sale.PaymentMethod.CASH,
        Sale.PaymentMethod.TRANSFER,
        Sale.PaymentMethod.POS,
    ])
    reason = serializers.CharField(max_length=500)

    def validate_items(self, value):
        item_ids = [item['sale_item_id'] for item in value]
        if len(item_ids) != len(set(item_ids)):
            raise serializers.ValidationError('Each sale item may appear only once.')
        return value

    def validate_reason(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('A return reason is required.')
        return value

    def save(self, *, sale, processed_by):
        return process_sale_return(
            sale=sale,
            items=self.validated_data['items'],
            refund_method=self.validated_data['refund_method'],
            reason=self.validated_data['reason'],
            processed_by=processed_by,
        )


class SaleReturnItemOutputSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='sale_item.variant.product.name', read_only=True)
    company_name = serializers.CharField(source='sale_item.variant.company.name', read_only=True)

    class Meta:
        model = SaleReturnItem
        fields = [
            'id', 'sale_item', 'product_name', 'company_name', 'quantity',
            'unit_refund_price', 'subtotal', 'vat_amount', 'historical_cost', 'profit_reversal',
        ]
        read_only_fields = fields


class SaleReturnOutputSerializer(serializers.ModelSerializer):
    processed_by_name = serializers.CharField(source='processed_by.full_name', read_only=True)
    items = SaleReturnItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = SaleReturn
        fields = [
            'id', 'return_number', 'sale', 'total_amount', 'vat_amount', 'debt_reduction',
            'refund_amount', 'refund_method', 'reason', 'processed_by_name',
            'items', 'created_at',
        ]
        read_only_fields = fields
