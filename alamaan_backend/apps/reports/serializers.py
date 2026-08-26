from rest_framework import serializers


class OverviewReportSerializer(serializers.Serializer):
    total_sales_count = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_purchases_count = serializers.IntegerField()
    total_purchase_spend = serializers.DecimalField(max_digits=12, decimal_places=2)


class SalesReportSerializer(serializers.Serializer):
    total_sales = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_payment_method = serializers.ListField()


class ProfitReportSerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class PurchasesReportSerializer(serializers.Serializer):
    total_purchases = serializers.IntegerField()
    total_spend = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_payment_method = serializers.ListField()


class FinancialMovementReportSerializer(serializers.Serializer):
    total_inflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_movement = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_type = serializers.ListField()


class InventoryMovementReportSerializer(serializers.Serializer):
    total_stock_in = serializers.IntegerField()
    total_stock_out = serializers.IntegerField()
    total_adjustments = serializers.IntegerField()


class DebtReportSerializer(serializers.Serializer):
    total_debtors = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_debt_payments = serializers.DecimalField(max_digits=12, decimal_places=2)
