from django.db import models
from django.conf import settings

class Transaction(models.Model):
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('PENDING', 'Pending'),
    ]
    PROVIDER_CHOICES = [
        ('PAYSTACK', 'Paystack'),
    ]
    TYPE_CHOICES = [
        ('PURCHASE', 'Purchase'),
        ('BOOKING', 'Booking'),
        ('CREDIT_TOPUP', 'Credit Top-up'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    reference = models.CharField(max_length=100, unique=True, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference} - {self.amount} ({self.status})"

class CreditPurchase(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

class CreditLedger(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='credit_ledger')
    amount = models.IntegerField()  # Negative for spend, positive for purchase
    activity = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'User'} - {self.amount} ({self.activity})"

class DailyFreeUsage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='free_usage')
    feature = models.CharField(max_length=50)  # e.g., 'grant_search', 'content_gen', 'debt_reminder', etc.
    count = models.IntegerField(default=0)
    last_used = models.DateField(auto_now=True)

    class Meta:
        unique_together = ('user', 'feature')

    def __str__(self):
        return f"{self.user.username if self.user else 'User'} - {self.feature}: {self.count} (Last used: {self.last_used})"


class AIUsageLog(models.Model):
    """
    Phase 0 Guardrail: Tracks Gemini Flash/Flash-Lite API token consumption and estimated USD cost
    per month across the platform and per merchant to enforce monthly spending limits.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_usage_logs',
    )
    feature = models.CharField(max_length=100, default='general')
    model_name = models.CharField(max_length=100, default='gemini-flash-lite-latest')
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    estimated_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    cached = models.BooleanField(default=False)
    month_key = models.CharField(max_length=7, db_index=True)  # Format: 'YYYY-MM'
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['month_key', 'cached']),
            models.Index(fields=['user', 'month_key']),
        ]

    def __str__(self):
        return f"[{self.month_key}] {self.model_name} ({self.feature}) - ${self.estimated_cost_usd}"
