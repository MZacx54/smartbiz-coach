"""
Custom DRF throttle classes for SmartBiz Coach.
Each class maps to a named rate in settings.py DEFAULT_THROTTLE_RATES.
"""
from rest_framework.throttling import UserRateThrottle


class BrandGenThrottle(UserRateThrottle):
    """5 per hour — Brand identity generation."""
    scope = 'brand_gen'


class ContentGenThrottle(UserRateThrottle):
    """20 per hour — Social post / content generation."""
    scope = 'content_gen'


class BusinessPlanThrottle(UserRateThrottle):
    """3 per day — Business plan generation (expensive)."""
    scope = 'business_plan'


class VideoGenThrottle(UserRateThrottle):
    """5 per day — Video script generation."""
    scope = 'video_gen'


class ImageEditThrottle(UserRateThrottle):
    """10 per day — Image editing with AI vision."""
    scope = 'image_edit'
