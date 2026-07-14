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

    def validate(self, attrs):
        is_promoted = attrs.get('is_promoted', False)
        request = self.context.get('request')
        if is_promoted and request and request.user:
            from marketing.views import get_plan_limits
            limits = get_plan_limits(request.user)
            is_pro = request.user.is_admin_or_owner or (limits['plan_name'] == 'Pro')
            if not is_pro:
                raise serializers.ValidationError({
                    "is_promoted": "Promoting/featuring products on the Marketplace is a premium feature. Please upgrade to a Pro plan to feature your listings."
                })
        return attrs

class LeadSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_type = serializers.ReadOnlyField(source='product.product_type')
    
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['brand']
