from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.pagination import paginated_response
from apps.common.responses import success_response

from .selectors import get_cashbook_summary, list_cashbook_movements, list_manual_expenses
from .serializers import (
    AccountabilityTransactionOutputSerializer,
    CashbookSummarySerializer,
    CreateExpenseInputSerializer,
    ManualExpenseOutputSerializer,
)


class CashbookListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: AccountabilityTransactionOutputSerializer(many=True)})
    def get(self, request):
        queryset = list_cashbook_movements(
            direction=request.query_params.get('direction'),
            tx_type=request.query_params.get('type'),
            date_range=request.query_params.get('date_range'),
            search=request.query_params.get('search', ''),
        )
        return paginated_response(request, queryset, AccountabilityTransactionOutputSerializer)


class CashbookSummaryView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: CashbookSummarySerializer})
    def get(self, request):
        data = get_cashbook_summary(date_range=request.query_params.get('date_range'))
        serializer = CashbookSummarySerializer(data)
        return Response(success_response(serializer.data))


class ManualExpenseCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=CreateExpenseInputSerializer, responses={201: ManualExpenseOutputSerializer})
    def post(self, request):
        serializer = CreateExpenseInputSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        return Response(
            success_response(ManualExpenseOutputSerializer(expense).data, 'Expense recorded successfully.'),
            status=status.HTTP_201_CREATED,
        )


class ManualExpenseListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: ManualExpenseOutputSerializer(many=True)})
    def get(self, request):
        queryset = list_manual_expenses(
            date_range=request.query_params.get('date_range'),
            search=request.query_params.get('search', ''),
        )
        return paginated_response(request, queryset, ManualExpenseOutputSerializer)
