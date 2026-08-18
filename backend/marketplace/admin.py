from django.contrib import admin
from .models import VendorVerification, MarketplaceListing, Product, Lead

@admin.register(VendorVerification)
class VendorVerificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'business_name', 'user', 'business_type', 'whatsapp_number', 'is_verified', 'bank_name', 'account_number', 'paystack_subaccount_code', 'created_at']
    list_filter = ['is_verified', 'business_type', 'created_at']
    search_fields = ['business_name', 'user__username', 'user__email', 'whatsapp_number', 'account_number']
    list_display_links = ['id', 'business_name']

@admin.register(MarketplaceListing)
class MarketplaceListingAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'vendor', 'category', 'price_min', 'price_max', 'location', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['title', 'vendor__business_name', 'location']
    list_display_links = ['id', 'title']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'brand', 'product_type', 'price', 'category', 'is_public', 'is_promoted', 'promoted_until', 'created_at']
    list_filter = ['product_type', 'category', 'is_public', 'is_promoted', 'created_at']
    search_fields = ['name', 'brand__business_name', 'location', 'sku']
    list_display_links = ['id', 'name']

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_name', 'customer_contact', 'brand', 'product', 'lead_type', 'status', 'quoted_price', 'created_at']
    list_filter = ['lead_type', 'status', 'created_at']
    search_fields = ['customer_name', 'customer_contact', 'brand__business_name']
    list_display_links = ['id', 'customer_name']

