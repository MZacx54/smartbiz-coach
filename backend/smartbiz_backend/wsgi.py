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

# Run database migrations and seed default superuser automatically on startup
try:
    from django.core.management import call_command
    print("WSGI Startup: Running database migrations...")
    call_command('migrate', interactive=False)
    print("WSGI Startup: Migrations completed successfully!")
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(is_superuser=True).exists():
        username = 'admin'
        email = 'admin@smartbizcoach.com.ng'
        password = 'SmartBizAdmin2026!'
        
        # Avoid conflict if 'admin' username or email exists but is not superuser
        User.objects.filter(username=username).delete()
        User.objects.filter(email=email).delete()
        
        User.objects.create_superuser(username, email, password)
        print('WSGI Startup: SUCCESS - Default superuser admin created!')
    else:
        print('WSGI Startup: INFO - Superuser already exists.')
except Exception as e:
    print(f"WSGI Startup: WARNING - Auto-migrations/seeding failed: {e}")
