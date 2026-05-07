from django.urls import path
from .views import VendorProfileView, MarketplaceListingListView, ProductListCreateView, PublicBrandProductListView

urlpatterns = [
    path('vendor/profile/', VendorProfileView.as_view(), name='vendor_profile'),
    path('listings/', MarketplaceListingListView.as_view(), name='marketplace_listings'),
    path('products/', ProductListCreateView.as_view(), name='product_list_create'),
    path('products/u/<slug:slug>/', PublicBrandProductListView.as_view(), name='public_brand_products'),
]
