from django.contrib import admin
from .models import VendorVerification, MarketplaceListing, Product, Lead, DailySale, DailyExpense, Order, OrderItem, ProductReview, ListingReport, DeliveryRate

@admin.register(VendorVerification)
class VendorVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'business_name', 'user', 'verification_tier', 'status', 'is_verified',
        'id_type', 'cac_number', 'naccima_member_id', 'reviewed_by', 'verified_at', 'created_at'
    ]
    list_filter = ['status', 'verification_tier', 'is_verified', 'id_type', 'created_at']
    search_fields = [
        'business_name', 'user__username', 'user__email', 'whatsapp_number',
        'cac_number', 'nin_number', 'tin_number', 'naccima_member_id', 'naccima_chamber_name'
    ]
    list_display_links = ['id', 'business_name']
    actions = ['approve_selected_vendors', 'suspend_selected_vendors']

    @admin.action(description="Approve verification for selected vendors")
    def approve_selected_vendors(self, request, queryset):
        from django.utils import timezone
        for v in queryset:
            v.status = 'VERIFIED'
            v.is_verified = True
            v.verified_at = timezone.now()
            v.reviewed_by = request.user.email or request.user.username
            v.reviewed_at = timezone.now()
            v.rejection_reason = ""
            v.save()
        self.message_user(request, f"{queryset.count()} vendors approved with official verified badge.")

    @admin.action(description="Suspend verification for selected vendors")
    def suspend_selected_vendors(self, request, queryset):
        from django.utils import timezone
        for v in queryset:
            v.status = 'SUSPENDED'
            v.is_verified = False
            v.rejection_reason = "Suspended by admin review."
            v.reviewed_by = request.user.email or request.user.username
            v.reviewed_at = timezone.now()
            v.save()
        self.message_user(request, f"{queryset.count()} vendors suspended from verified status.")

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

@admin.register(DailySale)
class DailySaleAdmin(admin.ModelAdmin):
    list_display = ['id', 'item_name', 'user', 'quantity', 'unit_price', 'total_amount', 'payment_method', 'is_debt', 'created_at']
    list_filter = ['payment_method', 'is_debt', 'created_at']
    search_fields = ['item_name', 'user__username', 'user__email', 'customer_name', 'customer_phone']
    list_display_links = ['id', 'item_name']
    date_hierarchy = 'created_at'

@admin.register(DailyExpense)
class DailyExpenseAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'user', 'category', 'amount', 'payment_method', 'created_at']
    list_filter = ['category', 'payment_method', 'created_at']
    search_fields = ['title', 'user__username', 'user__email', 'notes']
    list_display_links = ['id', 'title']
    date_hierarchy = 'created_at'


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['tracking_code', 'brand', 'buyer_name', 'total_amount', 'status', 'payment_verified', 'created_at']
    list_filter = ['status', 'payment_verified']
    search_fields = ['tracking_code', 'reference', 'buyer_name', 'buyer_phone']
    inlines = [OrderItemInline]


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'rating', 'reviewer_name', 'verified_purchase', 'is_hidden', 'created_at']
    list_filter = ['rating', 'is_hidden', 'verified_purchase']


@admin.register(ListingReport)
class ListingReportAdmin(admin.ModelAdmin):
    list_display = ['product', 'reason', 'status', 'created_at']
    list_filter = ['status', 'reason']


admin.site.register(DeliveryRate)
