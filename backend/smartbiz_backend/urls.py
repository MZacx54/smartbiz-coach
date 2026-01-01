from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/brand/', include('brand.urls')), # Keeping api prefix for existing frontend calls if any
    path('api/billing/', include('billing.urls')),
    path('api/content/', include('content.urls')),
    path('api/business/', include('business.urls')),
    
    # Also support non-api prefixed calls if frontend is inconsistent, or just redirect
    path('users/', include('users.urls')), 
    path('brand/', include('brand.urls')),
    path('business/', include('business.urls')),
    path('content/', include('content.urls')),

    # Serve React App for any other route
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
