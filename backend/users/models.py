from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    credits = models.IntegerField(default=10)
    
    # Business Profile Fields
    business_name = models.CharField(max_length=255, blank=True)
    plan = models.CharField(max_length=50, default='Free', choices=[('Free', 'Free'), ('Pro', 'Pro')])
    has_onboarded = models.BooleanField(default=False)
    logo = models.URLField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=255, blank=True)
    currency = models.CharField(max_length=10, default='NGN')

    def __str__(self):
        return self.username
