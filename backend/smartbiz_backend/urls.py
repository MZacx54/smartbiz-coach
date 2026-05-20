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

urlpatterns = [
    path('health/', health_check),
    path('api/health/', health_check),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/brand/', include('brand.urls')), # Keeping api prefix for existing frontend calls if any
    path('api/billing/', include('billing.urls')),
    path('api/content/', include('content.urls')),
    path('api/business/', include('business.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    
    # Also support non-api prefixed calls if frontend is inconsistent, or just redirect
    path('users/', include('users.urls')), 
    path('brand/', include('brand.urls')),
    path('business/', include('business.urls')),
    path('content/', include('content.urls')),

    # Serve React App for any other route by redirecting browser traffic to the live Vercel site
    re_path(r'^.*$', RedirectView.as_view(url='https://smartbizcoach.com.ng/', permanent=False)),
]

