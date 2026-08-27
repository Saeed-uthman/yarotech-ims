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

from .models import Sale
from .selectors import get_sale_receipt, get_sales_kpis, list_sales
from .serializers import (
    CreateSaleInputSerializer,
    SaleCancelSerializer,
    SaleDetailSerializer,
    SaleListSerializer,
    SaleReceiptSerializer,
)


class SaleListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SaleListSerializer(many=True)})
    def get(self, request):
        queryset = list_sales(
            search=request.query_params.get('search', ''),
            date_range=request.query_params.get('date_range'),
            payment_status=request.query_params.get('payment_status'),
            customer_type=request.query_params.get('customer_type'),
            ordering=request.query_params.get('ordering', '-date'),
        )
        return paginated_response(
            request,
            queryset,
            SaleListSerializer,
            context={'request': request},
        )

    @extend_schema(request=CreateSaleInputSerializer, responses={201: SaleDetailSerializer})
    def post(self, request):
        def create_response():
            serializer = CreateSaleInputSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            sale = serializer.save()
            body = success_response(
                SaleDetailSerializer(sale, context={'request': request}).data,
                'Sale completed successfully.',
            )
            return body, status.HTTP_201_CREATED

        (body, response_status), replayed = execute_idempotent(
            request=request,
            scope='sales.create',
            operation=create_response,
        )
        response = Response(body, status=response_status)
        response['Idempotency-Replayed'] = str(replayed).lower()
        return response


class SaleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SaleDetailSerializer})
    def get(self, request, pk):
        sale = get_object_or_404(Sale, pk=pk)
        return Response(success_response(SaleDetailSerializer(sale, context={'request': request}).data))


class SaleReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SaleReceiptSerializer})
    def get(self, request, pk):
        sale = get_sale_receipt(sale_id=pk)
        return Response(success_response(SaleReceiptSerializer(sale, context={'request': request}).data))


class SaleCancelView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=SaleCancelSerializer, responses={200: SaleDetailSerializer})
    def post(self, request, pk):
        sale = get_object_or_404(Sale, pk=pk)
        serializer = SaleCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cancelled_sale = serializer.save(sale=sale, cancelled_by=request.user)
        return Response(
            success_response(SaleDetailSerializer(cancelled_sale, context={'request': request}).data, 'Sale cancelled successfully.'),
        )


class SaleSummaryKpisView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None})
    def get(self, request):
        data = get_sales_kpis(date_range=request.query_params.get('date_range'))
        if getattr(request.user, 'role', None) != 'admin':
            data.pop('total_profit', None)
        return Response(success_response(data))
