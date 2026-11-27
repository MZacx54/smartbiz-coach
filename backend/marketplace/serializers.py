from rest_framework import serializers
from django.utils import timezone
from .models import VendorVerification, MarketplaceListing, Product, Lead


def is_deal_active(product):
    """A flash deal is live when a higher compare-at price is set and the deal has not expired."""
    if not product.compare_at_price or product.compare_at_price <= product.price:
        return False
    return product.deal_ends_at is None or product.deal_ends_at > timezone.now()

class VendorVerificationSerializer(serializers.ModelSerializer):
    badge_info = serializers.ReadOnlyField()

    class Meta:
        model = VendorVerification
        fields = [
            'id', 'business_name', 'business_type', 'cac_number', 'nin_number',
            'is_verified', 'verification_tier', 'status', 'id_type', 'id_number',
            'id_document_url', 'tin_number', 'cac_document_url', 'proof_of_address_url',
            'physical_address', 'operating_state', 'operating_lga',
            'naccima_member_id', 'naccima_chamber_name', 'naccima_document_url',
            'rejection_reason', 'reviewed_by', 'reviewed_at', 'verified_at',
            'whatsapp_number', 'bank_name', 'bank_code', 'account_number', 'account_name',
            'paystack_subaccount_code', 'badge_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['is_verified', 'reviewed_by', 'reviewed_at', 'verified_at', 'badge_info', 'status', 'verification_tier', 'paystack_subaccount_code', 'rejection_reason']

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
    vendor_badge = serializers.SerializerMethodField()
    vendor_verification_tier = serializers.SerializerMethodField()
    vendor_chamber = serializers.SerializerMethodField()
    vendor_verification_status = serializers.SerializerMethodField()

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
            vp = getattr(obj.brand.user, 'vendor_profile', None)
            return bool(vp and vp.is_verified and vp.status == 'VERIFIED')
        except Exception:
            return False

    def get_vendor_badge(self, obj):
        try:
            vp = getattr(obj.brand.user, 'vendor_profile', None)
            return vp.badge_info if vp else None
        except Exception:
            return None

    def get_vendor_verification_tier(self, obj):
        try:
            vp = getattr(obj.brand.user, 'vendor_profile', None)
            return getattr(vp, 'verification_tier', 'NONE') if vp and vp.is_verified else 'NONE'
        except Exception:
            return 'NONE'

    def get_vendor_chamber(self, obj):
        try:
            vp = getattr(obj.brand.user, 'vendor_profile', None)
            return getattr(vp, 'naccima_chamber_name', '') if vp else ''
        except Exception:
            return ''

    def get_vendor_verification_status(self, obj):
        try:
            vp = getattr(obj.brand.user, 'vendor_profile', None)
            return getattr(vp, 'status', 'UNVERIFIED') if vp else 'UNVERIFIED'
        except Exception:
            return 'UNVERIFIED' 

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

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Selling price must be ₦0 or greater.")
        return value

    def validate_cost_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Cost price (COGS) must be ₦0 or greater.")
        return value

    def validate_stock_count(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value

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


class PublicProductSerializer(ProductSerializer):
    """Public-facing product serializer omitting internal COGS cost_price, low_stock_threshold, and SKU."""
    class Meta:
        model = Product
        fields = [
            'id', 'brand', 'name', 'description', 'price', 'price_max', 'image_url',
            'video_url', 'category', 'product_type', 'location', 'metadata',
            'is_public', 'is_promoted', 'promoted_until', 'stock_count',
            'compare_at_price', 'deal_ends_at', 'is_suspended', 'created_at', 'updated_at',
            'brand_name', 'brand_slug', 'brand_logo', 'brand_niche', 'brand_address',
            'smedan_number', 'corporate_entity_type', 'trust_badge_text', 'cac_number',
            'whatsapp_number', 'paystack_subaccount_code', 'is_vendor_verified',
            'avg_rating', 'review_count', 'deal_active', 'discount_percent',
            'vendor_badge', 'vendor_verification_tier', 'vendor_chamber', 'vendor_verification_status',
        ]


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
        read_only_fields = ['user', 'created_at', 'is_voided', 'voided_at']

    def validate_quantity(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value

    def validate_total_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Total amount cannot be negative.")
        return value


class DailyExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import DailyExpense
        model = DailyExpense
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'is_voided', 'voided_at']

    def validate_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Expense amount cannot be negative.")
        return value
