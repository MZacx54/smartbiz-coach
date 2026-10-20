from rest_framework import serializers
from django.utils import timezone
from .models import VendorVerification, MarketplaceListing, Product, Lead


def is_deal_active(product):
    """A flash deal is live when a higher compare-at price is set and the deal has not expired."""
    if not product.compare_at_price or product.compare_at_price <= product.price:
        return False
    return product.deal_ends_at is None or product.deal_ends_at > timezone.now()

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
    brand_slug = serializers.ReadOnlyField(source='brand.slug')
    brand_logo = serializers.ReadOnlyField(source='brand.logo_url')
    brand_niche = serializers.ReadOnlyField(source='brand.niche')
    brand_address = serializers.ReadOnlyField(source='brand.address')
    smedan_number = serializers.ReadOnlyField(source='brand.smedan_number')
    corporate_entity_type = serializers.ReadOnlyField(source='brand.corporate_entity_type')
    trust_badge_text = serializers.ReadOnlyField(source='brand.trust_badge_text')
    cac_number = serializers.SerializerMethodField()
    whatsapp_number = serializers.SerializerMethodField()
    paystack_subaccount_code = serializers.SerializerMethodField()
    is_vendor_verified = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    deal_active = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['brand', 'is_suspended']

    def _review_stats(self, obj):
        cache = self.__dict__.setdefault('_stats_cache', {})
        if obj.pk not in cache:
            from django.db.models import Avg, Count
            agg = obj.reviews.filter(is_hidden=False).aggregate(a=Avg('rating'), c=Count('id'))
            cache[obj.pk] = (round(float(agg['a']), 1) if agg['a'] else 0, agg['c'] or 0)
        return cache[obj.pk]

    def get_avg_rating(self, obj):
        return self._review_stats(obj)[0] if obj.pk else 0

    def get_review_count(self, obj):
        return self._review_stats(obj)[1] if obj.pk else 0

    def get_deal_active(self, obj):
        return is_deal_active(obj)

    def get_discount_percent(self, obj):
        if is_deal_active(obj):
            return int(round((1 - float(obj.price) / float(obj.compare_at_price)) * 100))
        return 0

    def get_cac_number(self, obj):
        try:
            return getattr(obj.brand, 'cac_number', '') or getattr(getattr(obj.brand.user, 'vendor_profile', None), 'cac_number', '') or ''
        except Exception:
            return ''

    def get_is_vendor_verified(self, obj):
        try:
            return getattr(obj.brand.user.vendor_profile, 'is_verified', False)
        except Exception:
            return False

    def get_whatsapp_number(self, obj):
        try:
            vp = getattr(obj.brand.user, 'vendor_profile', None)
            raw = (getattr(vp, 'whatsapp_number', '') if vp else '') or getattr(obj.brand.user, 'phone', '') or ''
            digits = "".join(c for c in str(raw) if c.isdigit())
            if digits.startswith('0') and len(digits) == 11:
                digits = '234' + digits[1:]
            return digits or "2348000000000"
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
