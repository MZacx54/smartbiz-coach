from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    email = models.EmailField(unique=True)
    credits = models.IntegerField(default=200)
    
    # Business Profile Fields
    business_name = models.CharField(max_length=255, blank=True)
    plan = models.CharField(max_length=50, default='Free', choices=[('Free', 'Free'), ('Pro', 'Pro')])
    has_onboarded = models.BooleanField(default=False)
    logo = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=255, blank=True)
    currency = models.CharField(max_length=10, default='NGN')

    @property
    def is_admin_or_owner(self):
        return self.is_staff or self.is_superuser or getattr(self, 'plan', '') == 'Pro'

    def __str__(self):
        return self.username or self.email or 'User'


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        expiry = self.created_at + timezone.timedelta(minutes=15)
        return not self.is_used and timezone.now() < expiry

    def __str__(self):
        return f"{self.user.email if self.user else 'User'} - {self.code}"


class UserCompliance(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='compliance')
    name_search_completed = models.BooleanField(default=False)
    business_reg_completed = models.BooleanField(default=False)
    tin_obtained_completed = models.BooleanField(default=False)
    bank_account_completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Compliance for {self.user.username if self.user else 'User'}"


class AgentHireRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hire_requests')
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=50)
    status = models.CharField(max_length=50, default='Pending', choices=[
        ('Pending', 'Pending'),
        ('Assigned', 'Assigned'),
        ('Completed', 'Completed')
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Hire Request: {self.business_name} ({self.status})"


