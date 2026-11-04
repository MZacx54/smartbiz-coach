from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    email = models.EmailField(unique=True)
    credits = models.IntegerField(default=50)
    
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
    registration_type = models.CharField(max_length=100, blank=True, default='Business Name')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_reference = models.CharField(max_length=100, blank=True, default='')
    payment_status = models.CharField(max_length=50, default='PENDING', choices=[
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid / In Progress'),
        ('COMPLETED', 'Completed')
    ])
    status = models.CharField(max_length=50, default='Pending', choices=[
        ('Pending', 'Pending'),
        ('Assigned', 'Assigned'),
        ('Completed', 'Completed')
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"CAC Registration: {self.business_name} ({self.registration_type} - {self.payment_status})"


class PartnershipInquiry(models.Model):
    STATUS_CHOICES = [
        ('NEW', 'New Inquiry'),
        ('IN_REVIEW', 'In Review'),
        ('CONTACTED', 'Contacted / Meeting Scheduled'),
        ('PILOT_ACTIVE', 'Pilot Active'),
        ('DECLINED', 'Declined / Closed'),
    ]

    PARTNERSHIP_TYPES = [
        ('SME Training & NGO Cohorts', 'SME Training & NGO Cohorts'),
        ('Bank / Microfinance Credit Scoring', 'Bank / Microfinance Credit Scoring'),
        ('Government Agency (SMEDAN, BOI)', 'Government Agency (SMEDAN, BOI)'),
        ('Market Association / Cooperative', 'Market Association / Cooperative'),
        ('Equity Investment / Venture Capital', 'Equity Investment / Venture Capital'),
        ('Other', 'Other Strategic Partnership'),
    ]

    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, default='')
    organization = models.CharField(max_length=255)
    partnership_type = models.CharField(max_length=100, choices=PARTNERSHIP_TYPES, default='SME Training & NGO Cohorts')
    cohort_size = models.CharField(max_length=100, blank=True, default='')
    message = models.TextField()
    source = models.CharField(max_length=100, default='Landing Page')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='NEW')
    internal_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Partnership & Cohort Inquiry'
        verbose_name_plural = 'Partnership & Cohort Inquiries'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization} ({self.name}) - {self.partnership_type} [{self.status}]"




class Cohort(models.Model):
    """
    Represents an institutional cohort (e.g. NACCIMA, SMEDAN, NGO) that
    groups multiple users together for bulk onboarding and progress tracking.
    """
    COHORT_TYPE_CHOICES = [
        ('NACCIMA', 'NACCIMA Chamber'),
        ('SMEDAN', 'SMEDAN Programme'),
        ('NGO', 'NGO / Development Partner'),
        ('BANK', 'Bank / MFI Lending Programme'),
        ('GOV', 'Government Agency'),
        ('COOPERATIVE', 'Market Association / Cooperative'),
        ('OTHER', 'Other'),
    ]
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=100)
    cohort_type = models.CharField(max_length=50, choices=COHORT_TYPE_CHOICES, default='NACCIMA')
    organization = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=100, blank=True)
    contact_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cohort / Institution'
        verbose_name_plural = 'Cohorts / Institutions'
        ordering = ['-created_at']

    def member_count(self):
        return self.members.count()

    def __str__(self):
        return f"{self.name} ({self.cohort_type}) - {self.state}"


class CohortMembership(models.Model):
    """Links a User to a Cohort with optional chapter/state tagging."""
    cohort = models.ForeignKey(Cohort, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cohort_memberships')
    chapter = models.CharField(max_length=100, blank=True, help_text="e.g. NACCIMA Lagos Chapter")
    sector = models.CharField(max_length=100, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_activated = models.BooleanField(default=False)  # True when user logs in for the first time

    class Meta:
        unique_together = ('cohort', 'user')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.cohort.name}"


class BlogPost(models.Model):
    """
    Dynamic CMS Blog Post model allowing content teams to publish articles,
    policy briefings, and MSME guides directly via Django Admin.
    """
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=150)
    category = models.CharField(max_length=100, default='General')
    excerpt = models.TextField(blank=True)
    content = models.TextField(help_text="Markdown or rich text article body")
    author_name = models.CharField(max_length=100, default='SmartBiz Insights Team')
    read_time = models.CharField(max_length=50, default='5 min read')
    tags = models.JSONField(default=list, blank=True)
    cover_image_url = models.TextField(blank=True, default='')
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Blog Post & Advisory'
        verbose_name_plural = 'Blog Posts & Advisories'
        ordering = ['-published_at']

    def __str__(self):
        return self.title
