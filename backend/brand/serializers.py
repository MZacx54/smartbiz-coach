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

class GeneratedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedContent
        fields = '__all__'
        read_only_fields = ('user',)
