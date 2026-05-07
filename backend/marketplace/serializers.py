from rest_framework import serializers
from .models import VendorVerification, MarketplaceListing, Product, Lead

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

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['brand']

class LeadSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_type = serializers.ReadOnlyField(source='product.product_type')
    
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['brand']
