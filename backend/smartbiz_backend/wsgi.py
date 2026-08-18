"""
WSGI config for smartbiz_backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartbiz_backend.settings')

application = get_wsgi_application()

# Auto-apply any pending database migrations on production startup
try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)
    print("Startup database migrations verified successfully.")
except Exception as e:
    print(f"Startup migration note: {e}")

