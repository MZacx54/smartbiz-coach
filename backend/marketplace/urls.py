from django.urls import path
from .views import (
    VendorProfileView, 
    MarketplaceListingListView, 
    ProductListCreateView, 
    ProductDetailView,
    PublicBrandProductListView,
    GlobalMarketplaceListView,
    DashboardSearchView,
    LeadListCreateView,
    LeadDetailView,
    EcosystemAnalyticsView,
    OrderCreateView
)

urlpatterns = [
    path('analytics/', EcosystemAnalyticsView.as_view(), name='ecosystem_analytics'),
    path('orders/create/', OrderCreateView.as_view(), name='order_create'),
    path('leads/', LeadListCreateView.as_view(), name='lead_list_create'),
    path('leads/<int:pk>/', LeadDetailView.as_view(), name='lead_detail'),
    path('vendor/profile/', VendorProfileView.as_view(), name='vendor_profile'),
    path('listings/', MarketplaceListingListView.as_view(), name='marketplace_listings'),
    path('products/', ProductListCreateView.as_view(), name='product_list_create'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product_detail'),
    path('products/u/<slug:slug>/', PublicBrandProductListView.as_view(), name='public_brand_products'),
    path('global/', GlobalMarketplaceListView.as_view(), name='global_marketplace'),
    path('search/', DashboardSearchView.as_view(), name='dashboard_search'),
]
