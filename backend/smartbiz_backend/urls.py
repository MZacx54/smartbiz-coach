import os
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView, RedirectView
from django.http import JsonResponse
from django.db import connections

# Executive Admin Portal Branding
admin.site.site_header = "SmartBiz Coach | Executive Administration Portal"
admin.site.site_title = "SmartBiz Coach Admin"
admin.site.index_title = "MSME Management, Transactions, Partnerships & Governance Hub"

def health_check(request):
    db_conn = connections['default']
    db_ok = False
    db_err = None
    try:
        with db_conn.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        db_ok = True
    except Exception as e:
        db_ok = False
        db_err = str(e)
        
    response_payload = {
        'status': 'ok' if db_ok else 'unhealthy',
        'service': 'SmartBiz Engine',
        'database': 'connected' if db_ok else 'disconnected'
    }
    if getattr(settings, 'DEBUG', False) and db_err:
        response_payload['error'] = db_err

    return JsonResponse(response_payload, status=200 if db_ok else 503)

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
    path('api/marketing/', include('marketing.urls')),
    
    # Also support non-api prefixed calls if frontend is inconsistent, or just redirect
    path('users/', include('users.urls')), 
    path('brand/', include('brand.urls')),
    path('business/', include('business.urls')),
    path('content/', include('content.urls')),

    # Serve React App for any other route by redirecting browser traffic to the live Vercel site
    re_path(r'^.*$', RedirectView.as_view(url='https://smartbizcoach.com.ng/', permanent=False)),
]

