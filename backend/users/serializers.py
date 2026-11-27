from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserCompliance, AgentHireRequest, BlogPost

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    logo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_apprentice_mode = serializers.SerializerMethodField(read_only=True)
    has_owner_passcode = serializers.SerializerMethodField(read_only=True)
    plan = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            'business_name', 'plan', 'plan_expires_at', 'credits', 'is_email_verified', 'has_onboarded', 'logo',
            'phone', 'location', 'currency', 'is_apprentice_mode', 'has_owner_passcode',
            'is_staff', 'is_superuser',
        ]
        read_only_fields = [
            'credits', 'plan', 'plan_expires_at', 'is_email_verified',
            'is_apprentice_mode', 'has_owner_passcode', 'is_staff', 'is_superuser',
        ]
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def get_plan(self, obj):
        return getattr(obj, 'effective_plan', getattr(obj, 'plan', 'Free'))

    def _get_security_vault(self, obj):
        try:
            vault = getattr(obj, 'security_vault', None)
            if vault is not None:
                return {
                    'is_apprentice_mode': bool(vault.is_apprentice_mode),
                    'owner_passcode_hash': vault.owner_passcode_hash or '',
                }
            brand = getattr(obj, 'brand_identity', None)
            if brand and isinstance(brand.policies, dict):
                legacy = brand.policies.get('__security_vault__', {})
                if isinstance(legacy, dict):
                    return legacy
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


class UserComplianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCompliance
        fields = ['name_search_completed', 'business_reg_completed', 'tin_obtained_completed', 'bank_account_completed', 'updated_at']


class AgentHireRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentHireRequest
        fields = ['id', 'business_name', 'business_type', 'phone_number', 'registration_type', 'amount_paid', 'payment_reference', 'payment_status', 'status', 'created_at']
        read_only_fields = ['payment_status', 'status', 'created_at']


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'category', 'excerpt', 'content',
            'author_name', 'read_time', 'tags', 'cover_image_url',
            'is_published', 'published_at', 'created_at'
        ]
