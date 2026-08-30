from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.pagination import paginated_response
from apps.common.idempotency import execute_idempotent
from apps.common.responses import success_response

from .models import StockPurchase, Supplier
from .selectors import get_purchase_detail, get_purchase_kpis, list_purchases
from .serializers import (
    CreatePurchaseInputSerializer,
    CreatePurchaseReturnSerializer,
    PurchaseReturnOutputSerializer,
    StockPurchaseCancelSerializer,
    StockPurchaseDetailSerializer,
    StockPurchaseListSerializer,
    SupplierSerializer,
)


class SupplierListCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: SupplierSerializer(many=True)})
    def get(self, request):
        queryset = Supplier.objects.all()
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(name__icontains=search)
        return paginated_response(request, queryset, SupplierSerializer)

    @extend_schema(request=SupplierSerializer, responses={201: SupplierSerializer})
    def post(self, request):
        serializer = SupplierSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        supplier = serializer.save()
        return Response(
            success_response(SupplierSerializer(supplier).data, 'Supplier created successfully.'),
            status=status.HTTP_201_CREATED,
        )


class SupplierDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=SupplierSerializer, responses={200: SupplierSerializer})
    def patch(self, request, pk):
        supplier = get_object_or_404(Supplier, pk=pk)
        serializer = SupplierSerializer(
            supplier,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        return Response(
            success_response(SupplierSerializer(serializer.save()).data, 'Supplier updated successfully.')
        )


class PurchaseListCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: StockPurchaseListSerializer(many=True)})
    def get(self, request):
        queryset = list_purchases(
            search=request.query_params.get('search', ''),
            date_range=request.query_params.get('date_range'),
            payment_method=request.query_params.get('payment_method'),
            status=request.query_params.get('status'),
            ordering=request.query_params.get('ordering', '-date'),
        )
        return paginated_response(request, queryset, StockPurchaseListSerializer)

    @extend_schema(request=CreatePurchaseInputSerializer, responses={201: StockPurchaseDetailSerializer})
    def post(self, request):
        def create_response():
            serializer = CreatePurchaseInputSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            purchase = serializer.save()
            body = success_response(
                StockPurchaseDetailSerializer(purchase).data,
                'Purchase recorded successfully.',
            )
            return body, status.HTTP_201_CREATED

        (body, response_status), replayed = execute_idempotent(
            request=request,
            scope='purchases.create',
            operation=create_response,
        )
        response = Response(body, status=response_status)
        response['Idempotency-Replayed'] = str(replayed).lower()
        return response


class PurchaseDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: StockPurchaseDetailSerializer})
    def get(self, request, pk):
        purchase = get_purchase_detail(purchase_id=pk)
        return Response(success_response(StockPurchaseDetailSerializer(purchase).data))


class PurchaseCancelView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=StockPurchaseCancelSerializer, responses={200: StockPurchaseDetailSerializer})
    def post(self, request, pk):
        purchase = get_object_or_404(StockPurchase, pk=pk)
        serializer = StockPurchaseCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cancelled_purchase = serializer.save(purchase=purchase, cancelled_by=request.user)
        return Response(
            success_response(StockPurchaseDetailSerializer(cancelled_purchase).data, 'Purchase cancelled successfully.'),
        )


class PurchaseReturnView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=CreatePurchaseReturnSerializer, responses={201: PurchaseReturnOutputSerializer})
    def post(self, request, pk):
        purchase = get_object_or_404(StockPurchase, pk=pk)
        serializer = CreatePurchaseReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return_record = serializer.save(purchase=purchase, processed_by=request.user)
        return Response(
            success_response(PurchaseReturnOutputSerializer(return_record).data, 'Purchase return recorded successfully.'),
            status=status.HTTP_201_CREATED,
        )


class PurchaseSummaryKpisView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: None})
    def get(self, request):
        return Response(success_response(get_purchase_kpis(date_range=request.query_params.get('date_range'))))
