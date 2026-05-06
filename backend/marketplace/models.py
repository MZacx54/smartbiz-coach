from django.db import models
from django.conf import settings

class VendorVerification(models.fields.Model):
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

class MarketplaceListing(models.fields.Model):
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
