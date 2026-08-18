import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView, RedirectView
from django.http import JsonResponse
from django.db import connections

def health_check(request):
    db_conn = connections['default']
    db_ok = False
    db_err = None
    try:
        db_conn.ensure_connection()
        db_ok = True
    except Exception as e:
        db_err = str(e)
        
    return JsonResponse({
        'status': 'ok' if db_ok else 'unhealthy',
        'database': 'connected' if db_ok else 'failed',
        'database_error': db_err,
        'database_info': {
            'host': db_conn.settings_dict.get('HOST'),
            'port': db_conn.settings_dict.get('PORT'),
            'name': db_conn.settings_dict.get('NAME'),
            'user': db_conn.settings_dict.get('USER'),
            'has_url': bool(os.environ.get('DATABASE_URL')),
        }
    })

def debug_admin_view(request):
    import traceback
    results = {}
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        results['user_count'] = User.objects.count()
        results['sample_users'] = list(User.objects.values('id', 'username', 'email', 'is_staff', 'is_superuser')[:5])
    except Exception as e:
        results['user_query_error'] = f"{type(e).__name__}: {str(e)}"
        results['user_query_traceback'] = traceback.format_exc()

    try:
        from django.test import RequestFactory
        factory = RequestFactory()
        admin_req = factory.get('/admin/users/user/')
        admin_req.user = User.objects.filter(is_superuser=True).first()
        admin_req.session = {}
        from django.contrib.messages.storage.fallback import FallbackStorage
        setattr(admin_req, '_messages', FallbackStorage(admin_req))
        user_admin = admin.site._registry[User]
        response = user_admin.changelist_view(admin_req)
        results['admin_changelist_status'] = getattr(response, 'status_code', 200)
    except Exception as e:
        results['admin_changelist_error'] = f"{type(e).__name__}: {str(e)}"
        results['admin_changelist_traceback'] = traceback.format_exc()

    return JsonResponse(results)

urlpatterns = [
    path('health/', health_check),
    path('api/health/', health_check),
    path('api/debug-admin/', debug_admin_view),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/brand/', include('brand.urls')), # Keeping api prefix for existing frontend calls if any
    path('api/billing/', include('billing.urls')),
    path('api/content/', include('content.urls')),
    path('api/business/', include('business.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/marketing/', include('marketing.urls')),
    
    # Also support non-api prefixed calls if frontend is inconsistent, or just redirect
    path('users/', include('users.urls')), 
    path('brand/', include('brand.urls')),
    path('business/', include('business.urls')),
    path('content/', include('content.urls')),

    # Serve React App for any other route by redirecting browser traffic to the live Vercel site
    re_path(r'^.*$', RedirectView.as_view(url='https://smartbizcoach.com.ng/', permanent=False)),
]

