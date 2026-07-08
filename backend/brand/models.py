from django.db import models
from django.conf import settings

class BrandIdentity(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='brand_identity')
    business_name = models.CharField(max_length=255)
    niche = models.CharField(max_length=100, blank=True, default='')
    vibe = models.CharField(max_length=100, blank=True, default='')
    slug = models.SlugField(unique=True, blank=True, null=True)
    
    # JSON Fields for structured data
    colors = models.JSONField(default=dict)
    fonts = models.JSONField(default=dict)
    taglines = models.JSONField(default=list)
    
    social_bio = models.TextField(blank=True)
    whatsapp_greeting = models.TextField(blank=True)
    elevator_pitch = models.TextField(blank=True)
    
    brand_voice = models.CharField(max_length=100, blank=True)
    target_audience = models.TextField(blank=True)
    logo_prompt = models.TextField(blank=True)
    logo_url = models.URLField(blank=True, null=True)
    
    # Kits (JSON)
    policies = models.JSONField(default=dict)
    trust_badge_text = models.CharField(max_length=255, blank=True)
    whatsapp_content = models.JSONField(default=dict)
    packaging = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import uuid
            base_slug = slugify(self.business_name)
            if not base_slug:
                base_slug = "biz"
            self.slug = base_slug
            # Simple check for uniqueness (will handle race conditions in production with DB constraints)
            if BrandIdentity.objects.filter(slug=self.slug).exists():
                self.slug = f"{base_slug}-{uuid.uuid4().hex[:4]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.business_name} ({self.user.username})"

class GeneratedContent(models.Model):
    CONTENT_TYPES = [
        ('POST', 'Post'),
        ('SCRIPT', 'Script'),
        ('PLAN', 'Plan'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='generated_content')
    type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    topic = models.CharField(max_length=255, blank=True)
    
    # Post Data
    caption = models.TextField(blank=True)
    hashtags = models.JSONField(default=list)
    call_to_action = models.CharField(max_length=255, blank=True)
    
    # Super Post Features
    slides = models.JSONField(default=list)
    image_text = models.CharField(max_length=255, blank=True)
    dm_reply = models.TextField(blank=True)
    
    # Script & Plan Data
    script = models.JSONField(default=dict, blank=True)
    plan = models.JSONField(default=dict, blank=True)
    niche = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type}: {self.topic[:30]}"
