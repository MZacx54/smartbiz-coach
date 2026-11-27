from datetime import timedelta
import os
from django.utils import timezone
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication


class ExpiringTokenAuthentication(TokenAuthentication):
    """
    DRF TokenAuthentication with automatic sliding/fixed TTL expiration.
    Defaults to 30 days (configurable via AUTH_TOKEN_TTL_DAYS).
    """

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        try:
            ttl_days = int(os.getenv('AUTH_TOKEN_TTL_DAYS', '30'))
        except (ValueError, TypeError):
            ttl_days = 30

        if ttl_days > 0 and token.created and (timezone.now() - token.created) > timedelta(days=ttl_days):
            token.delete()
            raise exceptions.AuthenticationFailed('Session token has expired. Please sign in again.')

        return user, token
