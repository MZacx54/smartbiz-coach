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
