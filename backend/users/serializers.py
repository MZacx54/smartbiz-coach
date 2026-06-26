from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'business_name', 'plan', 'credits', 'has_onboarded', 'logo', 'phone', 'location', 'currency']
        read_only_fields = ['credits', 'plan']
        extra_kwargs = {'password': {'write_only': True}}


from .models import UserCompliance, AgentHireRequest

class UserComplianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCompliance
        fields = ['name_search_completed', 'business_reg_completed', 'tin_obtained_completed', 'bank_account_completed', 'updated_at']

class AgentHireRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentHireRequest
        fields = ['id', 'business_name', 'business_type', 'phone_number', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']

