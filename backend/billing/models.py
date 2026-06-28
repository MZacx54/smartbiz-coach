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
        return f"{self.user.username} - {self.amount} ({self.activity})"

