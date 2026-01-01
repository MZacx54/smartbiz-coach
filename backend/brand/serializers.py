from rest_framework import serializers
from .models import BrandIdentity, GeneratedContent

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandIdentity
        fields = '__all__'
        read_only_fields = ('user',)

class GeneratedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedContent
        fields = '__all__'
        read_only_fields = ('user',)
