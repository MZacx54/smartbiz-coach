from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PasswordResetCode, UserCompliance, AgentHireRequest

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'username', 'email', 'business_name', 'plan', 'credits', 'is_staff', 'date_joined']
    search_fields = ['username', 'email', 'business_name']
    list_filter = ['plan', 'is_staff', 'is_superuser', 'is_active']
    ordering = ['-date_joined']
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('SmartBiz Profile', {'fields': ('business_name', 'plan', 'credits', 'has_onboarded', 'logo', 'phone', 'location', 'currency')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password', 'business_name', 'plan', 'credits'),
        }),
    )

@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'code', 'created_at', 'is_used']
    list_filter = ['is_used', 'created_at']
    search_fields = ['user__username', 'user__email', 'code']
    list_display_links = ['id', 'code']

@admin.register(UserCompliance)
class UserComplianceAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'name_search_completed', 'business_reg_completed', 'tin_obtained_completed', 'bank_account_completed', 'updated_at']
    search_fields = ['user__username', 'user__email']
    list_display_links = ['id', 'user']

@admin.register(AgentHireRequest)
class AgentHireRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'business_name', 'user', 'business_type', 'phone_number', 'status', 'created_at']
    list_filter = ['status', 'business_type', 'created_at']
    search_fields = ['business_name', 'user__username', 'user__email', 'phone_number']
    list_editable = ['status']
    list_display_links = ['id', 'business_name']

