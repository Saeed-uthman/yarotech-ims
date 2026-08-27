from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.responses import success_response

from .selectors import get_admin_dashboard, get_cashier_dashboard
from .serializers import AdminDashboardSerializer, CashierDashboardSerializer


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: AdminDashboardSerializer})
    def get(self, request):
        # `period` is the canonical public contract. Keep `date_range` as a
        # temporary compatibility alias for clients integrated before Phase A.
        date_range = request.query_params.get('period') or request.query_params.get('date_range')
        user = request.user

        if getattr(user, 'role', None) == 'admin':
            data = get_admin_dashboard(date_range=date_range)
            serializer = AdminDashboardSerializer(data)
        else:
            data = get_cashier_dashboard(user=user, date_range=date_range)
            serializer = CashierDashboardSerializer(data)

        return Response(success_response(serializer.data))


class CashierDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: CashierDashboardSerializer})
    def get(self, request):
        date_range = request.query_params.get('period') or request.query_params.get('date_range')
        data = get_cashier_dashboard(user=request.user, date_range=date_range)
        return Response(success_response(CashierDashboardSerializer(data).data))
