from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView, RedirectView

urlpatterns = [
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
