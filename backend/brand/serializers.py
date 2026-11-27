from rest_framework import serializers
from .models import BrandIdentity, GeneratedContent


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandIdentity
        fields = '__all__'
        read_only_fields = ('user',)

    def validate_logo_url(self, value):
        if value == "":
            return None
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Never expose internal security vault hashes in Brand responses
        if isinstance(data.get('policies'), dict):
            cleaned_policies = dict(data['policies'])
            cleaned_policies.pop('__security_vault__', None)
            data['policies'] = cleaned_policies
        try:
            user = getattr(instance, 'user', None)
            user_phone = getattr(user, 'phone', '') if user else ''
            vp = getattr(user, 'vendor_profile', None) if user else None
            vp_phone = getattr(vp, 'whatsapp_number', '') if vp else ''
            fallback_phone = user_phone or vp_phone or ''

            if not data.get('phone') or data.get('phone') == '2348000000000':
                data['phone'] = fallback_phone
            if not data.get('whatsapp') or data.get('whatsapp') == '2348000000000':
                data['whatsapp'] = data.get('phone') or fallback_phone
        except Exception:
            pass
        return data

    def update(self, instance, validated_data):
        if 'policies' in validated_data and isinstance(validated_data['policies'], dict):
            validated_data['policies'].pop('__security_vault__', None)
        return super().update(instance, validated_data)


class PublicBrandSerializer(serializers.ModelSerializer):
    """Sanitized storefront serializer: never leaks passcode hashes, TINs, or private owner metadata."""
    whatsapp = serializers.SerializerMethodField()

    class Meta:
        model = BrandIdentity
        fields = [
            'id', 'business_name', 'niche', 'vibe', 'slug', 'colors', 'fonts',
            'taglines', 'social_bio', 'whatsapp_greeting', 'elevator_pitch',
            'brand_voice', 'target_audience', 'logo_url', 'phone', 'whatsapp',
            'address', 'cac_number', 'mission', 'vision', 'core_values',
            'sla_policy', 'trust_badge_text', 'opening_hours', 'created_at', 'updated_at',
        ]

    def _fallback_phone(self, instance):
        user = getattr(instance, 'user', None)
        user_phone = getattr(user, 'phone', '') if user else ''
        vp = getattr(user, 'vendor_profile', None) if user else None
        vp_phone = getattr(vp, 'whatsapp_number', '') if vp else ''
        raw = instance.phone or ''
        if not raw or raw == '2348000000000':
            return user_phone or vp_phone or ''
        return raw

    def get_whatsapp(self, instance):
        wc = instance.whatsapp_content if isinstance(instance.whatsapp_content, dict) else {}
        wa = wc.get('whatsapp') or ''
        if not wa or wa == '2348000000000':
            return self._fallback_phone(instance)
        return wa

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['phone'] = self._fallback_phone(instance)
        if not data.get('whatsapp'):
            data['whatsapp'] = data['phone']
        return data


class GeneratedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedContent
        fields = '__all__'
        read_only_fields = ('user',)


