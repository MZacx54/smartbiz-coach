import traceback
import sys

class ExceptionLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        print(f"\n==========================================", file=sys.stderr)
        print(f"[Django Exception] Path: {request.method} {request.path}", file=sys.stderr)
        print(f"[Django Exception] User: {getattr(request, 'user', 'Anonymous')}", file=sys.stderr)
        print(f"[Django Exception] Error: {exception}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(f"==========================================\n", file=sys.stderr)
        sys.stderr.flush()
        return None


class SecurityHeadersMiddleware:
    """
    Applies strict defensive security headers, modern isolation policies,
    and cache control optimization across all responses.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Defensive Security Headers
        response['X-Content-Type-Options'] = 'nosniff'
        if 'X-Frame-Options' not in response:
            response['X-Frame-Options'] = 'SAMEORIGIN'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'camera=(self), microphone=(self), geolocation=()'
        response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'

        # Cache Control Optimization
        path = request.path_info
        if path.startswith('/api/'):
            # Sensitive financial & ML endpoints must not be cached by proxies
            if 'Cache-Control' not in response:
                response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
                response['Pragma'] = 'no-cache'
        elif path.startswith('/static/') or path.startswith('/assets/'):
            # Static bundles with content hashes can be cached aggressively
            if 'Cache-Control' not in response:
                response['Cache-Control'] = 'public, max-age=31536000, immutable'

        return response

