from django.conf import settings


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
