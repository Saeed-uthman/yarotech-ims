from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.pagination import paginated_response
from apps.common.responses import success_response

from .selectors import get_inventory_insights, get_inventory_kpis, list_inventory_items, list_inventory_movements
from .serializers import InventoryItemSerializer, InventoryMovementSerializer, StockAdjustmentInputSerializer
from .services import adjust_stock_manually


class InventoryListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: InventoryItemSerializer(many=True)})
    def get(self, request):
        queryset = list_inventory_items(
            search=request.query_params.get('search', ''),
            category=request.query_params.get('category'),
            company=request.query_params.get('company'),
            stock_status=request.query_params.get('stock_status'),
            ordering=request.query_params.get('ordering', 'name'),
        )
        return paginated_response(
            request,
            queryset,
            InventoryItemSerializer,
            context={'request': request},
        )


class InventorySummaryKpisView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None})
    def get(self, request):
        data = get_inventory_kpis()
        if getattr(request.user, 'role', None) != 'admin':
            data.pop('inventory_cost_value', None)
        return Response(success_response(data))


class InventoryAdjustView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=StockAdjustmentInputSerializer, responses={200: InventoryMovementSerializer})
    def post(self, request):
        serializer = StockAdjustmentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        movement = adjust_stock_manually(
            variant_id=data['variant'].id,
            adjustment_type=data['adjustment_type'],
            quantity=data['quantity'],
            reason=data['reason'],
            notes=data.get('notes', ''),
            created_by=request.user,
        )
        output = InventoryMovementSerializer(movement)
        return Response(success_response(output.data, 'Stock adjusted successfully.'), status=status.HTTP_200_OK)


class InventoryMovementListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: InventoryMovementSerializer(many=True)})
    def get(self, request):
        queryset = list_inventory_movements(
            variant_id=request.query_params.get('variant_id'),
            movement_type=request.query_params.get('movement_type'),
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date'),
        )
        return paginated_response(request, queryset, InventoryMovementSerializer)


class InventoryInsightsView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: None})
    def get(self, request):
        return Response(success_response(get_inventory_insights()))
