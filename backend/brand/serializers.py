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
            existing_policies = instance.policies if isinstance(instance.policies, dict) else {}
            if '__security_vault__' in existing_policies and '__security_vault__' not in validated_data['policies']:
                validated_data['policies']['__security_vault__'] = existing_policies['__security_vault__']
        return super().update(instance, validated_data)

class GeneratedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedContent
        fields = '__all__'
        read_only_fields = ('user',)

