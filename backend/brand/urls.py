from django.urls import path
from .views import BrandListCreate, BrandDetail, GenerateBrandView, GenerateBrandLogoView

urlpatterns = [
    path('', BrandListCreate.as_view(), name='brand-list-create'),
    path('<int:pk>/', BrandDetail.as_view(), name='brand-detail'),
    path('generate/', GenerateBrandView.as_view(), name='generate-brand'),
    path('generate-logo/', GenerateBrandLogoView.as_view(), name='generate-logo'),
]
