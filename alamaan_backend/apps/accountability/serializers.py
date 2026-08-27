from rest_framework import serializers

from apps.customers.models import CustomerDebtPayment
from apps.purchases.models import StockPurchase
from apps.sales.models import Sale

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
    reference_number = serializers.SerializerMethodField()

    def get_reference_number(self, obj) -> str:
        prefix = {
            'Sale': 'Sale',
            'CustomerDebtPayment': 'Receipt',
            'StockPurchase': 'Purchase',
            'ManualExpense': 'Expense',
        }.get(obj.reference_type, obj.reference_type)
        return f'{prefix} #{obj.reference_id}'

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
            'reference_number',
            'description',
            'customer_name',
            'note',
            'status',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = fields


class AccountabilityTransactionDetailSerializer(AccountabilityTransactionOutputSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_id = serializers.SerializerMethodField()
    source_details = serializers.SerializerMethodField()

    class Meta(AccountabilityTransactionOutputSerializer.Meta):
        fields = AccountabilityTransactionOutputSerializer.Meta.fields + [
            'customer_id',
            'source_details',
        ]

    def _source(self, obj):
        if not hasattr(obj, '_accountability_source'):
            source = None
            reference_id = str(obj.reference_id)
            if not reference_id.isdigit():
                obj._accountability_source = None
                return None
            if obj.reference_type == 'Sale':
                source = Sale.objects.select_related('customer').prefetch_related(
                    'items__variant__product',
                    'items__variant__company',
                ).filter(pk=obj.reference_id).first()
            elif obj.reference_type == 'StockPurchase':
                source = StockPurchase.objects.prefetch_related(
                    'items__variant__product',
                    'items__variant__company',
                ).filter(pk=obj.reference_id).first()
            elif obj.reference_type == 'CustomerDebtPayment':
                source = CustomerDebtPayment.objects.select_related('customer').filter(
                    pk=obj.reference_id,
                ).first()
            elif obj.reference_type == 'ManualExpense':
                source = ManualExpense.objects.filter(pk=obj.reference_id).first()
            obj._accountability_source = source
        return obj._accountability_source

    def get_reference_number(self, obj) -> str:
        source = self._source(obj)
        if isinstance(source, Sale):
            return source.invoice_number
        if isinstance(source, StockPurchase):
            return source.purchase_number
        if isinstance(source, CustomerDebtPayment):
            return source.receipt_number
        if isinstance(source, ManualExpense):
            return source.expense_number
        return super().get_reference_number(obj)

    def get_customer_name(self, obj) -> str:
        source = self._source(obj)
        if isinstance(source, Sale) and source.customer:
            return source.customer.name
        if isinstance(source, CustomerDebtPayment):
            return source.customer.name
        return obj.customer_name

    def get_customer_id(self, obj) -> int | None:
        source = self._source(obj)
        if isinstance(source, Sale):
            return source.customer_id
        if isinstance(source, CustomerDebtPayment):
            return source.customer_id
        return None

    def get_source_details(self, obj) -> dict | None:
        source = self._source(obj)
        if isinstance(source, Sale):
            items = [
                {
                    'product_id': item.variant.product_id,
                    'name': item.variant.product.name,
                    'company': item.variant.company.name,
                    'dosage': item.variant.product.dosage,
                    'form': item.variant.product.dosage_form,
                    'quantity': item.quantity,
                    'unit_price': item.actual_selling_price,
                    'subtotal': item.subtotal,
                }
                for item in source.items.all()
            ]
            return {
                'item_count': len(items),
                'total_units': sum(item['quantity'] for item in items),
                'customer_phone': source.customer.phone if source.customer else '',
                'items': items,
                'note': source.notes,
            }
        if isinstance(source, StockPurchase):
            items = [
                {
                    'product_id': item.variant.product_id,
                    'name': item.variant.product.name,
                    'company': item.variant.company.name,
                    'dosage': item.variant.product.dosage,
                    'form': item.variant.product.dosage_form,
                    'quantity': item.quantity,
                    'unit_price': item.unit_purchase_price,
                    'subtotal': item.subtotal,
                }
                for item in source.items.all()
            ]
            return {
                'item_count': len(items),
                'total_units': sum(item['quantity'] for item in items),
                'items': items,
                'note': source.note,
            }
        if isinstance(source, CustomerDebtPayment):
            return {
                'customer_phone': source.customer.phone,
                'previous_balance': source.balance_before,
                'new_balance': source.balance_after,
                'note': source.reference_notes,
            }
        if isinstance(source, ManualExpense):
            return {'note': source.note}
        return None


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


class ManualExpenseCreateOutputSerializer(serializers.Serializer):
    expense = ManualExpenseOutputSerializer()
    transaction = AccountabilityTransactionOutputSerializer()


class CashbookSummarySerializer(serializers.Serializer):
    total_inflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_movement = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_transactions_count = serializers.IntegerField()
    sales_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    debt_payments_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    purchases_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    other_expenses_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
