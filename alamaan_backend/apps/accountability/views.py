from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.pagination import paginated_response
from apps.common.responses import success_response
from apps.common.idempotency import execute_idempotent

from .selectors import get_cashbook_summary, list_cashbook_movements, list_manual_expenses
from .models import AccountabilityTransaction
from .serializers import (
    AccountabilityTransactionDetailSerializer,
    AccountabilityTransactionOutputSerializer,
    CashbookSummarySerializer,
    BusinessFundMovementOutputSerializer,
    CreateBusinessFundMovementInputSerializer,
    CreateExpenseInputSerializer,
    ManualExpenseCreateOutputSerializer,
    ManualExpenseOutputSerializer,
)


class BusinessFundMovementCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=CreateBusinessFundMovementInputSerializer, responses={201: BusinessFundMovementOutputSerializer})
    def post(self, request):
        def create_response():
            serializer = CreateBusinessFundMovementInputSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            movement = serializer.save()
            return success_response(
                BusinessFundMovementOutputSerializer(movement).data,
                'Business funds updated successfully.',
            ), status.HTTP_201_CREATED

        (body, response_status), replayed = execute_idempotent(
            request=request,
            scope='accountability.business-funds.create',
            operation=create_response,
        )
        response = Response(body, status=response_status)
        response['Idempotency-Replayed'] = str(replayed).lower()
        return response


class CashbookListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: AccountabilityTransactionOutputSerializer(many=True)})
    def get(self, request):
        queryset = list_cashbook_movements(
            direction=request.query_params.get('direction'),
            tx_type=request.query_params.get('type'),
            category=request.query_params.get('category'),
            date_range=request.query_params.get('date_range'),
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date'),
            search=request.query_params.get('search', ''),
            ordering=request.query_params.get('ordering', '-date'),
        )
        return paginated_response(request, queryset, AccountabilityTransactionOutputSerializer)


class CashbookSummaryView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: CashbookSummarySerializer})
    def get(self, request):
        data = get_cashbook_summary(
            date_range=request.query_params.get('date_range'),
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date'),
        )
        serializer = CashbookSummarySerializer(data)
        return Response(success_response(serializer.data))


class ManualExpenseCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=CreateExpenseInputSerializer, responses={201: ManualExpenseCreateOutputSerializer})
    def post(self, request):
        def create_response():
            serializer = CreateExpenseInputSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            expense = serializer.save()
            transaction = AccountabilityTransaction.objects.select_related('created_by').get(
                reference_type='ManualExpense',
                reference_id=str(expense.id),
            )
            body = success_response(
                {
                    'expense': ManualExpenseOutputSerializer(expense).data,
                    'transaction': AccountabilityTransactionOutputSerializer(transaction).data,
                },
                'Expense recorded successfully.',
            )
            return body, status.HTTP_201_CREATED

        (body, response_status), replayed = execute_idempotent(
            request=request,
            scope='accountability.expenses.create',
            operation=create_response,
        )
        response = Response(body, status=response_status)
        response['Idempotency-Replayed'] = str(replayed).lower()
        return response


class ManualExpenseListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: ManualExpenseOutputSerializer(many=True)})
    def get(self, request):
        queryset = list_manual_expenses(
            date_range=request.query_params.get('date_range'),
            search=request.query_params.get('search', ''),
        )
        return paginated_response(request, queryset, ManualExpenseOutputSerializer)


class CashbookDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: AccountabilityTransactionDetailSerializer})
    def get(self, request, pk):
        transaction = get_object_or_404(
            AccountabilityTransaction.objects.select_related('created_by'),
            pk=pk,
        )
        return Response(success_response(AccountabilityTransactionDetailSerializer(transaction).data))
