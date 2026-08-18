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
    OrderCreateView,
    ProductSnapAndListView,
    RelatedEcosystemProductsView,
    BoostProductView,
    VerifyVendorWithCreditsView
)

from .payout_views import (
    ListBanksView,
    ResolveBankView,
    SetupPayoutView,
    GetVendorPayoutDetailsView
)

urlpatterns = [
    path('analytics/', EcosystemAnalyticsView.as_view(), name='ecosystem_analytics'),
    path('orders/create/', OrderCreateView.as_view(), name='order_create'),
    path('leads/', LeadListCreateView.as_view(), name='lead_list_create'),
    path('leads/<int:pk>/', LeadDetailView.as_view(), name='lead_detail'),
    path('vendor/profile/', VendorProfileView.as_view(), name='vendor_profile'),
    path('vendor/verify-with-credits/', VerifyVendorWithCreditsView.as_view(), name='vendor_verify_credits'),
    path('payout/banks/', ListBanksView.as_view(), name='payout_banks'),
    path('payout/resolve-bank/', ResolveBankView.as_view(), name='payout_resolve_bank'),
    path('payout/setup/', SetupPayoutView.as_view(), name='payout_setup'),
    path('payout/details/', GetVendorPayoutDetailsView.as_view(), name='payout_details'),
    path('listings/', MarketplaceListingListView.as_view(), name='marketplace_listings'),
    path('products/', ProductListCreateView.as_view(), name='product_list_create'),
    path('products/snap-and-list/', ProductSnapAndListView.as_view(), name='product_snap_and_list'),
    path('products/related/', RelatedEcosystemProductsView.as_view(), name='products_related'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product_detail'),
    path('products/<int:pk>/boost/', BoostProductView.as_view(), name='product_boost'),
    path('products/u/<slug:slug>/', PublicBrandProductListView.as_view(), name='public_brand_products'),
    path('global/', GlobalMarketplaceListView.as_view(), name='global_marketplace'),
    path('search/', DashboardSearchView.as_view(), name='dashboard_search'),
]
