import logging
import uuid

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import AuditEvent


audit_logger = logging.getLogger('pharmacy.audit')


class RequestAuditMiddleware:
    SENSITIVE_ACTIONS = {
        '/api/v1/auth/login/': 'auth.login',
        '/api/v1/auth/logout/': 'auth.logout',
        '/api/v1/auth/change-password/': 'auth.change_password',
    }

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_authentication = JWTAuthentication()

    def _resolve_actor(self, request):
        forced_user = getattr(request, '_force_auth_user', None)
        if getattr(forced_user, 'is_authenticated', False):
            return forced_user
        user = getattr(request, 'user', None)
        if getattr(user, 'is_authenticated', False):
            return user
        try:
            authenticated = self.jwt_authentication.authenticate(request)
        except Exception:
            return None
        return authenticated[0] if authenticated else None

    def __call__(self, request):
        request_id = uuid.uuid4()
        request.audit_request_id = request_id
        response = self.get_response(request)
        response.headers['X-Request-ID'] = str(request_id)

        if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'} and request.path.startswith('/api/v1/'):
            status_code = response.status_code
            outcome = (
                AuditEvent.Outcome.SUCCESS if status_code < 400
                else AuditEvent.Outcome.DENIED if status_code in {401, 403}
                else AuditEvent.Outcome.FAILED
            )
            action = self.SENSITIVE_ACTIONS.get(
                request.path,
                f'api.{request.method.lower()}.{request.path.strip("/").replace("/", ".")}',
            )[:100]
            actor = self._resolve_actor(request)
            ip_address = request.META.get('REMOTE_ADDR') or None
            try:
                AuditEvent.objects.create(
                    request_id=request_id,
                    actor=actor,
                    method=request.method,
                    path=request.path[:255],
                    action=action,
                    outcome=outcome,
                    status_code=status_code,
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
                    metadata={},
                )
                audit_logger.info(
                    'audit_event request_id=%s action=%s outcome=%s status=%s actor_id=%s',
                    request_id, action, outcome, status_code, getattr(actor, 'pk', None),
                )
            except Exception:
                audit_logger.exception('Unable to persist audit event request_id=%s', request_id)
        return response


class BrowserSecurityHeadersMiddleware:
    """Add browser controls without weakening local HTTP development."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/') or request.path == '/health/':
            policy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        elif request.path.startswith('/admin/'):
            policy = (
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
                "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
            )
        else:
            policy = "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        response.headers.setdefault('Content-Security-Policy', policy)
        response.headers.setdefault(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
        )
        response.headers.setdefault('Cross-Origin-Opener-Policy', 'same-origin')
        response.headers.setdefault('X-Permitted-Cross-Domain-Policies', 'none')
        return response
