from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    logo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_apprentice_mode = serializers.SerializerMethodField(read_only=True)
    has_owner_passcode = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            'business_name', 'plan', 'credits', 'has_onboarded', 'logo',
            'phone', 'location', 'currency', 'is_apprentice_mode', 'has_owner_passcode'
        ]
        read_only_fields = ['credits', 'plan', 'is_apprentice_mode', 'has_owner_passcode']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def _get_security_vault(self, obj):
        try:
            brand = getattr(obj, 'brand_identity', None)
            if brand and isinstance(brand.policies, dict):
                vault = brand.policies.get('__security_vault__', {})
                if isinstance(vault, dict):
                    return vault
        except Exception:
            pass
        return {}

    def get_is_apprentice_mode(self, obj):
        vault = self._get_security_vault(obj)
        return bool(vault.get('is_apprentice_mode', False))

    def get_has_owner_passcode(self, obj):
        vault = self._get_security_vault(obj)
        return bool(vault.get('owner_passcode_hash'))

    def validate_password(self, value):
        if value:
            from django.contrib.auth.password_validation import validate_password
            validate_password(value)
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


from .models import UserCompliance, AgentHireRequest

class UserComplianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCompliance
        fields = ['name_search_completed', 'business_reg_completed', 'tin_obtained_completed', 'bank_account_completed', 'updated_at']

class AgentHireRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentHireRequest
        fields = ['id', 'business_name', 'business_type', 'phone_number', 'registration_type', 'amount_paid', 'payment_reference', 'payment_status', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']

