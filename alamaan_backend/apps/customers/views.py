from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.pagination import paginated_response
from apps.common.idempotency import execute_idempotent
from apps.common.responses import success_response

from .models import Customer, CustomerDebtPayment
from .selectors import (
    get_customer_debt_ledger,
    get_customer_kpis,
    list_customer_payments,
    list_customers,
    list_debtors,
)
from .serializers import (
    CustomerCreateUpdateSerializer,
    CustomerDetailSerializer,
    CustomerListSerializer,
    DebtPaymentInputSerializer,
    DebtPaymentOutputSerializer,
    SaleOutputSerializer,
)
from .services import toggle_customer_status


class CustomerListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: CustomerListSerializer(many=True)})
    def get(self, request):
        debt_status = request.query_params.get('debt_status')
        if debt_status == 'with_debt':
            queryset = list_debtors(search=request.query_params.get('search', ''))
            return paginated_response(request, queryset, CustomerDetailSerializer)

        queryset = list_customers(
            search=request.query_params.get('search', ''),
            status=request.query_params.get('status'),
            ordering=request.query_params.get('ordering', 'name'),
        )
        return paginated_response(request, queryset, CustomerListSerializer)

    @extend_schema(request=CustomerCreateUpdateSerializer, responses={201: CustomerDetailSerializer})
    def post(self, request):
        serializer = CustomerCreateUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response(
            success_response(CustomerDetailSerializer(customer).data, 'Customer registered successfully.'),
            status=status.HTTP_201_CREATED,
        )


class CustomerDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    @extend_schema(responses={200: CustomerDetailSerializer})
    def get(self, request, pk):
        customer = get_object_or_404(Customer, pk=pk)
        return Response(success_response(CustomerDetailSerializer(customer).data))

    @extend_schema(request=CustomerCreateUpdateSerializer, responses={200: CustomerDetailSerializer})
    def put(self, request, pk):
        return self._update(request, pk)

    @extend_schema(request=CustomerCreateUpdateSerializer, responses={200: CustomerDetailSerializer})
    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial=False):
        customer = get_object_or_404(Customer, pk=pk)
        serializer = CustomerCreateUpdateSerializer(
            customer,
            data=request.data,
            partial=partial,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated_customer = serializer.save()
        return Response(
            success_response(CustomerDetailSerializer(updated_customer).data, 'Customer updated successfully.'),
        )


class CustomerToggleStatusView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: CustomerDetailSerializer})
    def post(self, request, pk):
        customer = get_object_or_404(Customer, pk=pk)
        customer = toggle_customer_status(customer=customer, toggled_by=request.user)
        return Response(
            success_response(CustomerDetailSerializer(customer).data, 'Customer status toggled successfully.'),
        )


class CustomerSummaryKpisView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None})
    def get(self, request):
        return Response(success_response(get_customer_kpis()))


class CustomerSalesHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SaleOutputSerializer(many=True)})
    def get(self, request, pk):
        get_object_or_404(Customer, pk=pk)
        from apps.sales.models import Sale
        sales = Sale.objects.filter(customer_id=pk).order_by('-created_at')
        return paginated_response(request, sales, SaleOutputSerializer)


class CustomerPaymentsHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: DebtPaymentOutputSerializer(many=True)})
    def get(self, request, pk):
        get_object_or_404(Customer, pk=pk)
        payments = list_customer_payments(customer_id=pk)
        return paginated_response(request, payments, DebtPaymentOutputSerializer)


class DebtPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=DebtPaymentInputSerializer, responses={201: DebtPaymentOutputSerializer})
    def post(self, request):
        def create_response():
            serializer = DebtPaymentInputSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            payment = serializer.save()
            body = success_response(
                DebtPaymentOutputSerializer(payment).data,
                'Debt payment recorded successfully.',
            )
            return body, status.HTTP_201_CREATED

        (body, response_status), replayed = execute_idempotent(
            request=request,
            scope='debt-payments.create',
            operation=create_response,
        )
        response = Response(body, status=response_status)
        response['Idempotency-Replayed'] = str(replayed).lower()
        return response


class DebtPaymentReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: DebtPaymentOutputSerializer})
    def get(self, request, pk):
        payment = get_object_or_404(
            CustomerDebtPayment.objects.select_related('customer', 'recorded_by'),
            pk=pk,
        )
        return Response(success_response(DebtPaymentOutputSerializer(payment).data))
