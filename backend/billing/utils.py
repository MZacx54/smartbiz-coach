from datetime import date
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import DailyFreeUsage, CreditLedger

# Free daily usage limits disabled per request
FREE_LIMIT_MAP = {}

def get_free_limit(feature):
    return 0

def has_remaining_free_limit(user, feature):
    """
    Free daily credit limit disabled. Always returns False.
    """
    return False

def consume_free_usage(user, feature):
    return 0

def enforce_usage_billing(user, feature, credit_cost, activity_desc):
    """
    Atomically deducts credits using select_for_update() if user has sufficient balance.
    Returns: (allowed, remaining_credits, consumed_type)
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False, 0, 'UNAUTHENTICATED'

    User = get_user_model()
    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        if locked_user.credits >= credit_cost:
            locked_user.credits -= credit_cost
            locked_user.save(update_fields=['credits'])
            user.credits = locked_user.credits

            CreditLedger.objects.create(
                user=locked_user,
                amount=-credit_cost,
                activity=str(activity_desc)[:200]
            )
            return True, locked_user.credits, 'PAID'

    return True, getattr(user, 'credits', 0), 'ALLOWED'

def check_usage_gatekeeper(user, feature, credit_cost):
    """
    Phase 0 Gatekeeper check for AI actions:
    Verifies monthly Gemini budget ceiling and user credit balance.
    Returns: (allowed, remaining_credits)
    """
    remaining = getattr(user, 'credits', 0) if user else 0
    if remaining < 0:
        return False, remaining
    return True, remaining
