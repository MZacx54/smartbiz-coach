from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Contact(models.Model):
    """A broadcast contact (WhatsApp or SMS recipient)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=200, blank=True, default='')
    phone = models.CharField(max_length=20)  # Include country code e.g. +2348012345678
    tags = models.CharField(max_length=500, blank=True, default='')  # Comma-separated tags
    is_opted_out = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_messaged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'phone')
        ordering = ['name', 'phone']

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Campaign(models.Model):
    """A broadcast campaign (WhatsApp or SMS)."""
    CHANNEL_CHOICES = [
        ('WHATSAPP', 'WhatsApp'),
        ('SMS', 'SMS'),
    ]
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('COMPLETED', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='campaigns')
    name = models.CharField(max_length=300)
    message_template = models.TextField()  # May contain {{name}} placeholder
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='WHATSAPP')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    daily_limit = models.IntegerField(default=100)  # Max messages per day
    total_contacts = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_time = models.TimeField(null=True, blank=True)  # Time of day to send

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.channel}) - {self.status}"

    @property
    def progress_percent(self):
        if self.total_contacts == 0:
            return 0
        return round((self.sent_count / self.total_contacts) * 100, 1)


class MessageLog(models.Model):
    """Log of each message sent as part of a campaign."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
        ('DELIVERED', 'Delivered'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='logs')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=20)
    message = models.TextField()  # Rendered message (with name substituted)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    sms_message_id = models.CharField(max_length=200, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
