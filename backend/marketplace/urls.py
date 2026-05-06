from django.urls import path
from .views import VendorProfileView, MarketplaceListingListView

urlpatterns = [
    path('vendor/profile/', VendorProfileView.as_view(), name='vendor_profile'),
    path('listings/', MarketplaceListingListView.as_view(), name='marketplace_listings'),
]
