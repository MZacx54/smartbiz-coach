from rest_framework import serializers
from .models import VendorVerification, MarketplaceListing

class VendorVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorVerification
        fields = ['id', 'business_name', 'business_type', 'cac_number', 'is_verified', 'whatsapp_number', 'created_at']
        read_only_fields = ['is_verified']

class MarketplaceListingSerializer(serializers.ModelSerializer):
    vendor = VendorVerificationSerializer(read_only=True)
    
    class Meta:
        model = MarketplaceListing
        fields = ['id', 'vendor', 'title', 'description', 'category', 'price_min', 'price_max', 'location', 'is_active', 'created_at']
