from django.db import models
from django.conf import settings

class VendorVerification(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_profile')
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=100) # e.g. "Retail", "Logistics", "Wholesale"
    cac_number = models.CharField(max_length=100, blank=True, null=True)
    nin_number = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    whatsapp_number = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.business_name} ({'Verified' if self.is_verified else 'Pending'})"

class MarketplaceListing(models.Model):
    CATEGORY_CHOICES = [
        ('LOGISTICS', 'Logistics & Dispatch'),
        ('WHOLESALE', 'Wholesale Suppliers'),
        ('INFLUENCER', 'Micro-Influencers'),
        ('SERVICES', 'Business Services'),
        ('RAW_MATERIALS', 'Raw Materials & Packaging'),
    ]

    vendor = models.ForeignKey(VendorVerification, on_delete=models.CASCADE, related_name='listings')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    price_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    location = models.CharField(max_length=100) # e.g. "Lagos, Yaba"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.vendor.business_name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Sync to Product model
        from brand.models import BrandIdentity
        
        # Get or create a BrandIdentity for the vendor user
        brand, _ = BrandIdentity.objects.get_or_create(
            user=self.vendor.user,
            defaults={'business_name': self.vendor.business_name}
        )
        
        # Check plan limits for is_promoted monetization logic
        from marketing.views import get_plan_limits
        limits = get_plan_limits(self.vendor.user)
        is_promoted = self.vendor.user.is_admin_or_owner or (limits['plan_name'] == 'Pro')
        
        Product.objects.update_or_create(
            sku=f"LISTING_{self.id}",
            defaults={
                'brand': brand,
                'name': self.title,
                'description': self.description,
                'price': self.price_min or 0.00,
                'price_max': self.price_max,
                'product_type': 'B2B',
                'category': self.category,
                'location': self.location,
                'is_public': self.is_active,
                'is_promoted': is_promoted
            }
        )

    def delete(self, *args, **kwargs):
        Product.objects.filter(sku=f"LISTING_{self.id}").delete()
        super().delete(*args, **kwargs)

class Product(models.Model):
    PRODUCT_TYPES = [
        ('PHYSICAL', 'Physical Product'),
        ('SERVICE', 'Professional Service'),
        ('PROPERTY', 'Real Estate/Property'),
        ('B2B', 'B2B/Wholesale Listing'),
    ]

    brand = models.ForeignKey('brand.BrandIdentity', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    price_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    image_url = models.TextField(blank=True, null=True)
    video_url = models.TextField(blank=True, null=True)
    video_data = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True)
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default='PHYSICAL')
    
    # Geographic & Specialized Data
    location = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True) # For type-specific data (e.g. bedrooms, power, etc.)
    
    # Unified Commerce Flags
    is_public = models.BooleanField(default=True) # Shown on Personal Storefront
    is_promoted = models.BooleanField(default=False) # Shown in Market Square
    
    stock_count = models.IntegerField(default=1)
    
    # Inventory Valuation & Auditing fields
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sku = models.CharField(max_length=100, blank=True, null=True)
    low_stock_threshold = models.IntegerField(default=5)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.product_type}] {self.name} ({self.brand.business_name})"

class Lead(models.Model):
    LEAD_STATUS = [
        ('NEW', 'New Inquiry'),
        ('FOLLOW_UP', 'Following Up'),
        ('NEGOTIATING', 'Negotiating'),
        ('WON', 'Completed/Won'),
        ('LOST', 'Lost/Cancelled'),
    ]

    LEAD_TYPES = [
        ('ORDER', 'Direct Order'),
        ('INQUIRY', 'Service/Property Inquiry'),
        ('B2B', 'Wholesale Inquiry'),
    ]

    brand = models.ForeignKey('brand.BrandIdentity', on_delete=models.CASCADE, related_name='leads')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    
    customer_name = models.CharField(max_length=255)
    customer_contact = models.CharField(max_length=100) # WhatsApp or Phone
    message = models.TextField(blank=True)
    
    lead_type = models.CharField(max_length=10, choices=LEAD_TYPES, default='INQUIRY')
    status = models.CharField(max_length=20, choices=LEAD_STATUS, default='NEW')
    
    # Financials
    quoted_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.customer_name} - {self.product.name if self.product else 'General Inquiry'}"
