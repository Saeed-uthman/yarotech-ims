from rest_framework import serializers


class AdminDashboardSerializer(serializers.Serializer):
    total_sales = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_units_sold = serializers.IntegerField()
    low_stock_alerts = serializers.IntegerField()
    total_customers = serializers.IntegerField()
    active_debtors = serializers.IntegerField()


class CashierDashboardSerializer(serializers.Serializer):
    total_checkouts = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_units_dispensed = serializers.IntegerField()
    active_debtors = serializers.IntegerField()
    low_stock_alerts = serializers.IntegerField()
