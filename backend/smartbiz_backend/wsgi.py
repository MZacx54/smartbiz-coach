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

# 1. Auto-apply any pending database migrations on production startup
try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)
    print("Startup database migrations verified successfully.")
except Exception as e:
    print(f"Startup migration note: {e}")

# 2. Auto-provision / update Super Admin accounts on startup
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    admin_emails = ["meshachzax@gmail.com", "admin@smartbizcoach.com.ng"]
    for email in admin_emails:
        admin_user, _ = User.objects.get_or_create(
            username=email,
            defaults={'email': email, 'business_name': 'SmartBiz Admin', 'plan': 'Pro'}
        )
        admin_user.email = email
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.set_password("SmartBizAdmin2026!")
        admin_user.save()
    print("Super admin accounts verified and provisioned successfully.")
except Exception as e:
    print(f"Super admin provisioning note: {e}")


