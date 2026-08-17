from django.contrib import admin
from .models import Contact, Campaign, MessageLog, SocialConnect


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'user', 'is_opted_out', 'last_messaged_at', 'created_at']
    list_filter = ['is_opted_out', 'created_at']
    search_fields = ['name', 'phone', 'user__username', 'user__email']
    list_display_links = ['name', 'phone']


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'channel', 'status', 'sent_count', 'total_contacts', 'created_at']
    list_filter = ['channel', 'status']
    search_fields = ['name', 'user__username', 'user__email']
    list_display_links = ['name']


@admin.register(MessageLog)
class MessageLogAdmin(admin.ModelAdmin):
    list_display = ['phone', 'campaign', 'status', 'sent_at']
    list_filter = ['status']
    search_fields = ['phone']
    list_display_links = ['phone']


@admin.register(SocialConnect)
class SocialConnectAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_active', 'instagram_account_id', 'facebook_page_id', 'whatsapp_phone_number_id', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__username', 'user__email']
    list_display_links = ['user']
