from rest_framework import serializers
from .models import VendorVerification, MarketplaceListing, Product, Lead

class VendorVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorVerification
        fields = ['id', 'business_name', 'business_type', 'cac_number', 'is_verified', 'whatsapp_number', 'bank_name', 'bank_code', 'account_number', 'account_name', 'paystack_subaccount_code', 'created_at']
        read_only_fields = ['is_verified']

class MarketplaceListingSerializer(serializers.ModelSerializer):
    vendor = VendorVerificationSerializer(read_only=True)
    
    class Meta:
        model = MarketplaceListing
        fields = ['id', 'vendor', 'title', 'description', 'category', 'price_min', 'price_max', 'location', 'is_active', 'created_at']

class ProductSerializer(serializers.ModelSerializer):
    brand_name = serializers.ReadOnlyField(source='brand.business_name')
    whatsapp_number = serializers.SerializerMethodField()
    paystack_subaccount_code = serializers.SerializerMethodField()
    is_vendor_verified = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['brand']

    def get_is_vendor_verified(self, obj):
        try:
            return getattr(obj.brand.user.vendor_profile, 'is_verified', False)
        except Exception:
            return False

    def get_whatsapp_number(self, obj):
        try:
            num = obj.brand.user.vendor_profile.whatsapp_number
            return "".join(c for c in num if c.isdigit())
        except Exception:
            return "2348000000000"

    def get_paystack_subaccount_code(self, obj):
        try:
            code = getattr(obj.brand.user.vendor_profile, 'paystack_subaccount_code', '') or ""
            if code and code.startswith('ACCT_') and not code.startswith('ACCT_DIR_'):
                return code
            return ""
        except Exception:
            return ""

    def validate(self, attrs):
        is_promoted = attrs.get('is_promoted', False)
        request = self.context.get('request')
        if is_promoted and request and getattr(request, 'user', None) and request.user.is_authenticated:
            try:
                from marketing.views import get_plan_limits
                limits = get_plan_limits(request.user)
                is_pro = getattr(request.user, 'is_admin_or_owner', False) or (limits.get('plan_name') == 'Pro')
                if not is_pro:
                    # Gracefully allow product creation by falling back to standard listing
                    attrs['is_promoted'] = False
            except Exception:
                attrs['is_promoted'] = False
        return attrs

class LeadSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_type = serializers.ReadOnlyField(source='product.product_type')
    
    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['brand']


class DailySaleSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import DailySale
        model = DailySale
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class DailyExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import DailyExpense
        model = DailyExpense
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
