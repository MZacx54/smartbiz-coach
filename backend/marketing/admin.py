from django.contrib import admin
from .models import Contact, Campaign, MessageLog, SocialConnect

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'phone', 'user', 'is_opted_out', 'last_messaged_at', 'created_at']
    list_filter = ['is_opted_out', 'created_at']
    search_fields = ['name', 'phone', 'user__username', 'user__email']
    list_display_links = ['id', 'phone']

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'user', 'channel', 'status', 'sent_count', 'total_contacts', 'created_at']
    list_filter = ['channel', 'status', 'created_at']
    search_fields = ['name', 'user__username', 'user__email']
    list_display_links = ['id', 'name']

@admin.register(MessageLog)
class MessageLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'phone', 'campaign', 'status', 'sent_at']
    list_filter = ['status', 'sent_at']
    search_fields = ['phone']
    list_display_links = ['id', 'phone']

@admin.register(SocialConnect)
class SocialConnectAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'is_active', 'instagram_account_id', 'facebook_page_id', 'whatsapp_phone_number_id', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__username', 'user__email']
    list_display_links = ['id', 'user']

