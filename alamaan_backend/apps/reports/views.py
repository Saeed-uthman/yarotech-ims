from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.responses import success_response

from .selectors import (
    get_debt_report,
    get_financial_movement_report,
    get_inventory_movement_report,
    get_overview_report,
    get_profit_report,
    get_purchases_report,
    get_sales_report,
)
from .serializers import (
    DebtReportSerializer,
    FinancialMovementReportSerializer,
    InventoryMovementReportSerializer,
    OverviewReportSerializer,
    ProfitReportSerializer,
    PurchasesReportSerializer,
    SalesReportSerializer,
)


class ReportOverviewView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = get_overview_report(date_range=request.query_params.get('date_range'))
        return Response(success_response(OverviewReportSerializer(data).data))


class ReportSalesView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = get_sales_report(date_range=request.query_params.get('date_range'))
        return Response(success_response(SalesReportSerializer(data).data))


class ReportProfitView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = get_profit_report(date_range=request.query_params.get('date_range'))
        return Response(success_response(ProfitReportSerializer(data).data))


class ReportPurchasesView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = get_purchases_report(date_range=request.query_params.get('date_range'))
        return Response(success_response(PurchasesReportSerializer(data).data))


class ReportFinancialMovementView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = get_financial_movement_report(date_range=request.query_params.get('date_range'))
        return Response(success_response(FinancialMovementReportSerializer(data).data))


class ReportInventoryMovementView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = get_inventory_movement_report(date_range=request.query_params.get('date_range'))
        return Response(success_response(InventoryMovementReportSerializer(data).data))


class ReportDebtView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = get_debt_report(date_range=request.query_params.get('date_range'))
        return Response(success_response(DebtReportSerializer(data).data))
