from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView

from apps.common.pagination import paginated_response
from apps.common.permissions import IsAdminUserRole

from .models import AuditEvent
from .serializers import AuditEventSerializer


@never_cache
@require_GET
def health_check(request):
    """Minimal readiness probe that confirms Django can reach its database."""

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:
        return JsonResponse({'status': 'unavailable'}, status=503)

    return JsonResponse({'status': 'ok'})


class AuditEventListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses={200: AuditEventSerializer(many=True)})
    def get(self, request):
        queryset = AuditEvent.objects.select_related('actor')
        if action := request.query_params.get('action', '').strip():
            queryset = queryset.filter(action__icontains=action)
        if outcome := request.query_params.get('outcome', '').strip().upper():
            queryset = queryset.filter(outcome=outcome)
        if actor := request.query_params.get('actor', '').strip():
            queryset = queryset.filter(actor_id=actor)
        return paginated_response(request, queryset, AuditEventSerializer)
