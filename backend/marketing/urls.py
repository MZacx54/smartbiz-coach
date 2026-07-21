from django.urls import path
from . import views

urlpatterns = [
    # Stats
    path('stats/', views.marketing_stats, name='marketing-stats'),

    # Contacts
    path('contacts/', views.contacts_list, name='contacts-list'),
    path('contacts/<int:contact_id>/', views.contact_detail, name='contact-detail'),
    path('contacts/upload/', views.upload_contacts_csv, name='contacts-upload'),

    # Campaigns
    path('campaigns/', views.campaigns_list, name='campaigns-list'),
    path('campaigns/<int:campaign_id>/', views.campaign_detail, name='campaign-detail'),
    path('campaigns/<int:campaign_id>/logs/', views.campaign_logs, name='campaign-logs'),

    # WhatsApp
    path('whatsapp/batch/', views.generate_whatsapp_batch, name='whatsapp-batch'),
    path('whatsapp/mark-sent/', views.mark_batch_sent, name='whatsapp-mark-sent'),

    # SMS
    path('sms/send/', views.send_sms_batch, name='sms-send'),

    # AI Message suggestion
    path('ai-suggest/', views.ai_suggest_message, name='marketing-ai-suggest'),

    # Social Media Connections & Auto-Publishing
    path('social-connect/', views.SocialConnectView.as_view(), name='marketing-social-connect'),
    path('publish-meta/', views.PublishToMetaView.as_view(), name='marketing-publish-meta'),
    path('send-whatsapp-cloud/', views.SendWhatsAppCloudMessageView.as_view(), name='marketing-send-whatsapp-cloud'),
]
