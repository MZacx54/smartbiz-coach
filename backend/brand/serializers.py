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

