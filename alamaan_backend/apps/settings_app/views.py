from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.responses import success_response

from .models import SystemSettings
from .serializers import SystemSettingsOutputSerializer, SystemSettingsUpdateSerializer
from .services import reset_system_settings


class SystemSettingsView(APIView):
    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    @extend_schema(responses={200: SystemSettingsOutputSerializer})
    def get(self, request):
        settings = SystemSettings.load()
        return Response(success_response(SystemSettingsOutputSerializer(settings, context={'request': request}).data))

    @extend_schema(request=SystemSettingsUpdateSerializer, responses={200: SystemSettingsOutputSerializer})
    def put(self, request):
        settings = SystemSettings.load()
        serializer = SystemSettingsUpdateSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(success_response(SystemSettingsOutputSerializer(settings, context={'request': request}).data, 'Settings updated successfully.'))

    @extend_schema(request=SystemSettingsUpdateSerializer, responses={200: SystemSettingsOutputSerializer})
    def patch(self, request):
        settings = SystemSettings.load()
        serializer = SystemSettingsUpdateSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(success_response(SystemSettingsOutputSerializer(settings, context={'request': request}).data, 'Settings updated successfully.'))


class SystemSettingsResetView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=None, responses={200: SystemSettingsOutputSerializer})
    def post(self, request):
        settings = reset_system_settings(reset_by=request.user)
        data = SystemSettingsOutputSerializer(settings, context={'request': request}).data
        return Response(success_response(data, 'Settings reset to system defaults.'))
