from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PasswordResetCode, UserCompliance, AgentHireRequest

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'business_name', 'plan', 'credits', 'is_staff', 'date_joined']
    search_fields = ['username', 'email', 'business_name']
    list_filter = ['plan', 'is_staff', 'is_superuser', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('SmartBiz Profile', {'fields': ('business_name', 'plan', 'credits', 'has_onboarded', 'logo', 'phone', 'location', 'currency')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('SmartBiz Profile', {'fields': ('business_name', 'plan', 'credits')}),
    )

@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'created_at', 'is_used']
    list_filter = ['is_used']

@admin.register(UserCompliance)
class UserComplianceAdmin(admin.ModelAdmin):
    list_display = ['user', 'name_search_completed', 'business_reg_completed', 'tin_obtained_completed', 'bank_account_completed', 'updated_at']
    search_fields = ['user__username', 'user__email']

@admin.register(AgentHireRequest)
class AgentHireRequestAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user', 'business_type', 'phone_number', 'status', 'created_at']
    list_filter = ['status', 'business_type']
    search_fields = ['business_name', 'user__email']
    list_editable = ['status']
