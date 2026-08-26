from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.responses import success_response

from .models import SystemSettings
from .serializers import SystemSettingsOutputSerializer, SystemSettingsUpdateSerializer


class SystemSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings = SystemSettings.load()
        return Response(success_response(SystemSettingsOutputSerializer(settings).data))

    def put(self, request):
        settings = SystemSettings.load()
        serializer = SystemSettingsUpdateSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(success_response(SystemSettingsOutputSerializer(settings).data, 'Settings updated successfully.'))

    def patch(self, request):
        settings = SystemSettings.load()
        serializer = SystemSettingsUpdateSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(success_response(SystemSettingsOutputSerializer(settings).data, 'Settings updated successfully.'))
