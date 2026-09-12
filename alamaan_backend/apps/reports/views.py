from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.responses import success_response

from .selectors import (
    get_vat_report,
    get_debt_report,
    get_financial_movement_report,
    get_inventory_movement_report,
    get_overview_report,
    get_profit_report,
    get_product_performance_report,
    get_purchases_report,
    get_sales_report,
)
from .serializers import (
    VatReportSerializer,
    DebtReportSerializer,
    FinancialMovementReportSerializer,
    InventoryMovementReportSerializer,
    OverviewReportSerializer,
    ProfitReportSerializer,
    ProductPerformanceReportSerializer,
    PurchasesReportSerializer,
    SalesReportSerializer,
)


def _report_params(request):
    return {
        'date_range': request.query_params.get('date_range'),
        'start_date': request.query_params.get('start_date'),
        'end_date': request.query_params.get('end_date'),
    }


def _dimension_params(request):
    return {
        **_report_params(request),
        'product_id': request.query_params.get('product_id'),
        'company_id': request.query_params.get('company_id'),
        'category_id': request.query_params.get('category_id'),
    }


class ReportOverviewView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: OverviewReportSerializer})
    def get(self, request):
        data = get_overview_report(**_report_params(request))
        return Response(success_response(data))


class ReportVatView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: VatReportSerializer})
    def get(self, request):
        return Response(success_response(VatReportSerializer(get_vat_report(**_report_params(request))).data))


class ReportSalesView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: SalesReportSerializer})
    def get(self, request):
        data = get_sales_report(
            **_dimension_params(request),
            payment_method=request.query_params.get('payment_method'),
        )
        return Response(success_response(data))


class ReportProfitView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: ProfitReportSerializer})
    def get(self, request):
        data = get_profit_report(**_dimension_params(request))
        return Response(success_response(data))


class ReportPurchasesView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: PurchasesReportSerializer})
    def get(self, request):
        params = _dimension_params(request)
        params.pop('category_id')
        data = get_purchases_report(**params)
        return Response(success_response(data))


class ReportFinancialMovementView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: FinancialMovementReportSerializer})
    def get(self, request):
        data = get_financial_movement_report(**_report_params(request))
        return Response(success_response(data))


class ReportInventoryMovementView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: InventoryMovementReportSerializer})
    def get(self, request):
        data = get_inventory_movement_report(**_dimension_params(request))
        return Response(success_response(data))


class ReportDebtView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: DebtReportSerializer})
    def get(self, request):
        data = get_debt_report(**_report_params(request))
        return Response(success_response(data))


class ReportProductPerformanceView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: ProductPerformanceReportSerializer})
    def get(self, request):
        return Response(success_response(get_product_performance_report(**_dimension_params(request))))
