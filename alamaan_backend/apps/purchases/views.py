from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.responses import success_response

from .models import StockPurchase
from .selectors import get_purchase_detail, get_purchase_kpis, list_purchases
from .serializers import (
    CreatePurchaseInputSerializer,
    StockPurchaseCancelSerializer,
    StockPurchaseDetailSerializer,
    StockPurchaseListSerializer,
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
        )
        serializer = StockPurchaseListSerializer(queryset, many=True)
        return Response(success_response(serializer.data))

    @extend_schema(request=CreatePurchaseInputSerializer, responses={201: StockPurchaseDetailSerializer})
    def post(self, request):
        serializer = CreatePurchaseInputSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        purchase = serializer.save()
        return Response(
            success_response(StockPurchaseDetailSerializer(purchase).data, 'Purchase recorded successfully.'),
            status=status.HTTP_201_CREATED,
        )


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


class PurchaseSummaryKpisView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: None})
    def get(self, request):
        return Response(success_response(get_purchase_kpis(date_range=request.query_params.get('date_range'))))
