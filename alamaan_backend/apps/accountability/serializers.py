from decimal import Decimal

from rest_framework import serializers

from .models import AccountabilityTransaction, ManualExpense
from .services import record_manual_expense


class CreateExpenseInputSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=ManualExpense.Category.choices)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=ManualExpense.PaymentMethod.choices)
    description = serializers.CharField(max_length=255)
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Expense amount must be greater than zero.')
        return value

    def validate_description(self, value):
        return value.strip()

    def create(self, validated_data):
        return record_manual_expense(
            user=self.context['request'].user,
            category=validated_data['category'],
            amount=validated_data['amount'],
            payment_method=validated_data['payment_method'],
            description=validated_data['description'],
            note=validated_data.get('note', ''),
        )


class AccountabilityTransactionOutputSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = AccountabilityTransaction
        fields = [
            'id',
            'transaction_number',
            'direction',
            'type',
            'category',
            'amount',
            'payment_method',
            'reference_type',
            'reference_id',
            'description',
            'customer_name',
            'note',
            'status',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = fields


class ManualExpenseOutputSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = ManualExpense
        fields = [
            'id',
            'expense_number',
            'category',
            'amount',
            'payment_method',
            'description',
            'note',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = fields


class CashbookSummarySerializer(serializers.Serializer):
    total_inflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_movement = serializers.DecimalField(max_digits=12, decimal_places=2)
