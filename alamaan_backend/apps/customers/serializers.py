from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from apps.sales.models import Sale

from .models import Customer, CustomerDebtPayment
from .services import create_customer, record_customer_debt_payment, update_customer


class CustomerCreateUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    address = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Customer name is required.')
        return name

    def validate_phone(self, value):
        phone = value.strip()
        if not phone:
            raise serializers.ValidationError('Phone number is required.')
        instance = getattr(self, 'instance', None)
        qs = Customer.objects.filter(phone=phone)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A customer with this phone number already exists.')
        return phone

    def create(self, validated_data):
        return create_customer(
            created_by=self.context['request'].user,
            **validated_data,
        )

    def update(self, instance, validated_data):
        return update_customer(
            customer=instance,
            updated_by=self.context['request'].user,
            **validated_data,
        )


class CustomerListSerializer(serializers.ModelSerializer):
    outstanding_debt = serializers.SerializerMethodField()
    total_purchases = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    amount_paid = serializers.SerializerMethodField()
    last_purchase_date = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'status',
            'outstanding_debt',
            'total_purchases',
            'sales_count',
            'amount_paid',
            'last_purchase_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_outstanding_debt(self, obj):
        result = (
            Sale.objects
            .filter(
                customer=obj,
                status=Sale.Status.COMPLETED,
                payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
            )
            .aggregate(total=Sum('outstanding_amount'))
        )
        return result['total'] or Decimal('0.00')

    def get_total_purchases(self, obj):
        result = (
            Sale.objects
            .filter(
                customer=obj,
                status=Sale.Status.COMPLETED,
            )
            .aggregate(total=Sum('total_amount'))
        )
        return result['total'] or Decimal('0.00')

    def get_sales_count(self, obj):
        return Sale.objects.filter(
            customer=obj,
            status=Sale.Status.COMPLETED,
        ).count()

    def get_amount_paid(self, obj):
        result = (
            Sale.objects
            .filter(
                customer=obj,
                status=Sale.Status.COMPLETED,
            )
            .aggregate(total=Sum('amount_paid'))
        )
        return result['total'] or Decimal('0.00')

    def get_last_purchase_date(self, obj):
        last_sale = (
            Sale.objects
            .filter(customer=obj, status=Sale.Status.COMPLETED)
            .order_by('-created_at')
            .first()
        )
        return last_sale.created_at if last_sale else None


class CustomerDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default=None)
    outstanding_debt = serializers.SerializerMethodField()
    total_purchases = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    amount_paid = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'address',
            'notes',
            'status',
            'outstanding_debt',
            'total_purchases',
            'sales_count',
            'amount_paid',
            'created_by',
            'created_by_name',
            'updated_by',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_outstanding_debt(self, obj):
        result = (
            Sale.objects
            .filter(
                customer=obj,
                status=Sale.Status.COMPLETED,
                payment_status__in=[Sale.PaymentStatus.PARTIAL, Sale.PaymentStatus.UNPAID],
            )
            .aggregate(total=Sum('outstanding_amount'))
        )
        return result['total'] or Decimal('0.00')

    def get_total_purchases(self, obj):
        result = (
            Sale.objects
            .filter(
                customer=obj,
                status=Sale.Status.COMPLETED,
            )
            .aggregate(total=Sum('total_amount'))
        )
        return result['total'] or Decimal('0.00')

    def get_sales_count(self, obj):
        return Sale.objects.filter(
            customer=obj,
            status=Sale.Status.COMPLETED,
        ).count()

    def get_amount_paid(self, obj):
        result = (
            Sale.objects
            .filter(
                customer=obj,
                status=Sale.Status.COMPLETED,
            )
            .aggregate(total=Sum('amount_paid'))
        )
        return result['total'] or Decimal('0.00')


class DebtPaymentInputSerializer(serializers.Serializer):
    customer_id = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=CustomerDebtPayment.PaymentMethod.choices)
    reference_notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be greater than zero.')
        return value

    def create(self, validated_data):
        return record_customer_debt_payment(
            user=self.context['request'].user,
            customer=validated_data['customer_id'],
            amount=validated_data['amount'],
            payment_method=validated_data['payment_method'],
            notes=validated_data.get('reference_notes', ''),
        )


class DebtPaymentOutputSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)

    class Meta:
        model = CustomerDebtPayment
        fields = [
            'id',
            'receipt_number',
            'customer',
            'customer_name',
            'customer_phone',
            'amount',
            'payment_method',
            'balance_before',
            'balance_after',
            'reference_notes',
            'recorded_by',
            'recorded_by_name',
            'created_at',
        ]
        read_only_fields = fields


class SaleOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'total_amount',
            'amount_paid',
            'outstanding_amount',
            'payment_status',
            'payment_method',
            'created_at',
        ]
        read_only_fields = fields
