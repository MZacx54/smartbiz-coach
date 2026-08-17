from django.contrib import admin
from .models import BrandIdentity, GeneratedContent

@admin.register(BrandIdentity)
class BrandIdentityAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user', 'niche', 'vibe', 'slug', 'created_at']
    search_fields = ['business_name', 'user__username', 'user__email', 'niche', 'slug']
    list_display_links = ['business_name']

@admin.register(GeneratedContent)
class GeneratedContentAdmin(admin.ModelAdmin):
    list_display = ['topic', 'user', 'type', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['topic', 'user__username', 'user__email']
    list_display_links = ['topic']
