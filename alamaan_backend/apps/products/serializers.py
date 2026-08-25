import json

from rest_framework import serializers

from .models import Category, Company, PriceAdjustmentHistory, Product, ProductVariant
from .services import create_product, create_product_variant, update_product, update_variant_prices, validate_variant_prices


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'is_active', 'created_at', 'updated_at']


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'code', 'country', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'is_active', 'created_at', 'updated_at']


class ProductVariantInputSerializer(serializers.Serializer):
    company_id = serializers.PrimaryKeyRelatedField(queryset=Company.objects.filter(is_active=True), source='company')
    base_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    min_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    default_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    max_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_stock = serializers.IntegerField(default=0, min_value=0)
    reorder_level = serializers.IntegerField(default=10, min_value=0)

    def validate(self, attrs):
        data = {
            'base_price': attrs.get('base_price', getattr(self.instance, 'base_price', None)),
            'min_selling_price': attrs.get('min_selling_price', getattr(self.instance, 'min_selling_price', None)),
            'default_selling_price': attrs.get('default_selling_price', getattr(self.instance, 'default_selling_price', None)),
            'max_selling_price': attrs.get('max_selling_price', getattr(self.instance, 'max_selling_price', None)),
            'current_stock': attrs.get('current_stock', getattr(self.instance, 'current_stock', 0)),
            'reorder_level': attrs.get('reorder_level', getattr(self.instance, 'reorder_level', 10)),
        }
        if all(value is not None for value in data.values()):
            validate_variant_prices(data)
        return attrs


class ProductCreateUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    generic_name = serializers.CharField(max_length=200)
    category_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.filter(is_active=True), source='category')
    dosage = serializers.CharField(max_length=50)
    dosage_form = serializers.ChoiceField(choices=Product.DosageForm.choices)
    barcode = serializers.CharField(max_length=64, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    subtitle = serializers.CharField(max_length=255, required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=Product.Status.choices, required=False)
    variants = ProductVariantInputSerializer(many=True, required=False)

    def to_internal_value(self, data):
        mutable_data = data.copy()
        variants = mutable_data.get('variants')
        if isinstance(variants, str):
            try:
                mutable_data['variants'] = json.loads(variants)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({'variants': 'Variants must be valid JSON.'}) from exc
        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        variants = validated_data.pop('variants', [])
        return create_product(
            created_by=self.context['request'].user,
            variants=variants,
            **validated_data,
        )

    def update(self, instance, validated_data):
        validated_data.pop('variants', None)
        return update_product(
            product=instance,
            updated_by=self.context['request'].user,
            **validated_data,
        )


class ProductVariantSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    stock_status = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'company',
            'base_price',
            'min_selling_price',
            'default_selling_price',
            'max_selling_price',
            'current_stock',
            'reorder_level',
            'stock_status',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if not request or getattr(request.user, 'role', None) != 'admin':
            fields.pop('base_price', None)
        return fields

    def get_stock_status(self, obj):
        if obj.current_stock == 0:
            return 'out'
        if obj.current_stock <= obj.reorder_level:
            return 'low'
        return 'available'


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'generic_name',
            'category',
            'dosage',
            'dosage_form',
            'barcode',
            'subtitle',
            'image',
            'status',
            'variants',
            'created_at',
            'updated_at',
        ]


class PriceAdjustmentHistorySerializer(serializers.ModelSerializer):
    adjusted_by_name = serializers.CharField(source='adjusted_by.full_name', read_only=True)

    class Meta:
        model = PriceAdjustmentHistory
        fields = [
            'id',
            'old_base_price',
            'new_base_price',
            'old_min_selling_price',
            'new_min_selling_price',
            'old_default_selling_price',
            'new_default_selling_price',
            'old_max_selling_price',
            'new_max_selling_price',
            'change_type',
            'reason',
            'adjusted_by',
            'adjusted_by_name',
            'effective_date',
            'created_at',
        ]
        read_only_fields = fields


class ProductVariantDetailSerializer(ProductVariantSerializer):
    price_history = PriceAdjustmentHistorySerializer(many=True, read_only=True)

    class Meta(ProductVariantSerializer.Meta):
        fields = ProductVariantSerializer.Meta.fields + ['price_history']


class ProductDetailSerializer(ProductListSerializer):
    variants = ProductVariantDetailSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ['description', 'created_by', 'updated_by']


class VariantUpdateSerializer(ProductVariantInputSerializer):
    company_id = serializers.PrimaryKeyRelatedField(queryset=Company.objects.filter(is_active=True), source='company', required=False)
    status = serializers.ChoiceField(choices=ProductVariant.Status.choices, required=False)


class PriceAdjustmentSerializer(serializers.Serializer):
    new_base_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    new_min_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    new_default_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    new_max_selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField()

    def validate_reason(self, value):
        reason = value.strip()
        if not reason:
            raise serializers.ValidationError('A price adjustment reason is required.')
        return reason
