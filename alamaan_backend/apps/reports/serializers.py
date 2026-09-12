from rest_framework import serializers


class VatDailySerializer(serializers.Serializer):
    date = serializers.DateField()
    vat_billed = serializers.DecimalField(max_digits=16, decimal_places=2)
    vat_collected = serializers.DecimalField(max_digits=16, decimal_places=2)


class VatReportSerializer(serializers.Serializer):
    vat_billed = serializers.DecimalField(max_digits=16, decimal_places=2)
    vat_collected = serializers.DecimalField(max_digits=16, decimal_places=2)
    vat_awaiting_payment = serializers.DecimalField(max_digits=16, decimal_places=2)
    daily = VatDailySerializer(many=True)


class OverviewReportSerializer(serializers.Serializer):
    total_sales_count = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_purchases_count = serializers.IntegerField()
    total_purchase_spend = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin_percentage = serializers.DecimalField(max_digits=8, decimal_places=2)
    money_in = serializers.DecimalField(max_digits=12, decimal_places=2)
    money_out = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_money_movement = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_transactions = serializers.IntegerField()
    total_units_sold = serializers.IntegerField()
    total_units_purchased = serializers.IntegerField()
    average_sale_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    date_range = serializers.CharField()
    start_date = serializers.CharField()
    end_date = serializers.CharField()


class SalesReportSerializer(serializers.Serializer):
    summary = serializers.DictField()
    trends = serializers.ListField(child=serializers.DictField())
    sales_by_payment_method = serializers.ListField(child=serializers.DictField())
    sales_by_category = serializers.ListField(child=serializers.DictField())
    sales_by_company = serializers.ListField(child=serializers.DictField())
    total_sales = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_payment_method = serializers.ListField()


class ProfitReportSerializer(serializers.Serializer):
    summary = serializers.DictField()
    trends = serializers.ListField(child=serializers.DictField())
    profit_by_category = serializers.ListField(child=serializers.DictField())
    profit_by_company = serializers.ListField(child=serializers.DictField())
    top_profitable_products = serializers.ListField(child=serializers.DictField())
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class PurchasesReportSerializer(serializers.Serializer):
    summary = serializers.DictField()
    trends = serializers.ListField(child=serializers.DictField())
    purchases_by_company = serializers.ListField(child=serializers.DictField())
    top_purchased_products = serializers.ListField(child=serializers.DictField())
    total_purchases = serializers.IntegerField()
    total_spend = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_payment_method = serializers.ListField()


class FinancialMovementReportSerializer(serializers.Serializer):
    summary = serializers.DictField()
    trends = serializers.ListField(child=serializers.DictField())
    money_in_breakdown = serializers.ListField(child=serializers.DictField())
    money_out_breakdown = serializers.ListField(child=serializers.DictField())
    total_inflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outflow = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_movement = serializers.DecimalField(max_digits=12, decimal_places=2)
    by_type = serializers.ListField()


class InventoryMovementReportSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField())
    total_opening_stock = serializers.IntegerField()
    total_stock_in = serializers.IntegerField()
    total_stock_out = serializers.IntegerField()
    total_current_stock = serializers.IntegerField()
    stock_in_purchases = serializers.IntegerField()
    stock_in_adjustments = serializers.IntegerField()
    stock_out_sales = serializers.IntegerField()
    stock_out_adjustments = serializers.IntegerField()
    total_adjustments = serializers.IntegerField()


class DebtReportSerializer(serializers.Serializer):
    summary = serializers.DictField()
    debtors = serializers.ListField(child=serializers.DictField())
    trends = serializers.ListField(child=serializers.DictField())
    total_debtors = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_debt_payments = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProductPerformanceReportSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField())
    fast_moving_count = serializers.IntegerField()
    slow_moving_count = serializers.IntegerField()
    zero_movement_count = serializers.IntegerField()
    total_units_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
