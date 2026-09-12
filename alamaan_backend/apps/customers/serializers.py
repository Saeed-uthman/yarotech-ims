from datetime import datetime
from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from apps.sales.models import Sale

from .models import Customer, CustomerDebtPayment, DebtPaymentReversal
from .services import create_customer, record_customer_debt_payment, reverse_customer_debt_payment, update_customer


class CustomerCreateUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    address = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Customer name is required.')
        return name

    def validate_phone(self, value):
        phone = (value or "").strip() or None
        if phone is None:
            return None
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

    def get_outstanding_debt(self, obj) -> Decimal:
        if hasattr(obj, 'metric_outstanding_debt'):
            return obj.metric_outstanding_debt
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

    def get_total_purchases(self, obj) -> int:
        if hasattr(obj, 'metric_total_purchases'):
            return obj.metric_total_purchases
        return Sale.objects.filter(customer=obj, status=Sale.Status.COMPLETED).count()

    def get_sales_count(self, obj) -> int:
        if hasattr(obj, 'metric_sales_count'):
            return obj.metric_sales_count
        return Sale.objects.filter(
            customer=obj,
            status=Sale.Status.COMPLETED,
        ).count()

    def get_amount_paid(self, obj) -> Decimal:
        if hasattr(obj, 'metric_amount_paid'):
            return obj.metric_amount_paid
        result = (
            Sale.objects
            .filter(
                customer=obj,
                status=Sale.Status.COMPLETED,
            )
            .aggregate(total=Sum('amount_paid'))
        )
        return result['total'] or Decimal('0.00')

    def get_last_purchase_date(self, obj) -> datetime | None:
        if hasattr(obj, 'metric_last_purchase_date'):
            return obj.metric_last_purchase_date
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

    def get_outstanding_debt(self, obj) -> Decimal:
        if hasattr(obj, 'metric_outstanding_debt'):
            return obj.metric_outstanding_debt
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

    def get_total_purchases(self, obj) -> int:
        if hasattr(obj, 'metric_total_purchases'):
            return obj.metric_total_purchases
        return Sale.objects.filter(customer=obj, status=Sale.Status.COMPLETED).count()

    def get_sales_count(self, obj) -> int:
        if hasattr(obj, 'metric_sales_count'):
            return obj.metric_sales_count
        return Sale.objects.filter(
            customer=obj,
            status=Sale.Status.COMPLETED,
        ).count()

    def get_amount_paid(self, obj) -> Decimal:
        if hasattr(obj, 'metric_amount_paid'):
            return obj.metric_amount_paid
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
    customer_phone = serializers.CharField(source='customer.phone', read_only=True, allow_null=True)
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
            'is_reversed',
        ]
        read_only_fields = fields


class DebtPaymentReversalInputSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)

    def validate_reason(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('A reversal reason is required.')
        return value

    def save(self, *, payment, reversed_by):
        return reverse_customer_debt_payment(
            payment=payment,
            reversed_by=reversed_by,
            reason=self.validated_data['reason'],
        )


class DebtPaymentReversalOutputSerializer(serializers.ModelSerializer):
    receipt_number = serializers.CharField(source='payment.receipt_number', read_only=True)
    reversed_by_name = serializers.CharField(source='reversed_by.full_name', read_only=True)

    class Meta:
        model = DebtPaymentReversal
        fields = ['id', 'payment', 'receipt_number', 'reason', 'reversed_by_name', 'created_at']
        read_only_fields = fields


# Keep history consistent with sale details, including role-filtered item fields.
from apps.sales.serializers import SaleDetailSerializer


class SaleOutputSerializer(SaleDetailSerializer):
    pass
