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

    try:
        cost = max(0, int(credit_cost or 0))
    except (ValueError, TypeError):
        cost = 0

    User = get_user_model()
    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        if cost == 0:
            return True, locked_user.credits, 'FREE'
        if locked_user.credits >= cost:
            locked_user.credits -= cost
            locked_user.save(update_fields=['credits'])
            user.credits = locked_user.credits

            CreditLedger.objects.create(
                user=locked_user,
                amount=-cost,
                activity=str(activity_desc)[:200]
            )
            return True, locked_user.credits, 'PAID'
        return False, locked_user.credits, 'INSUFFICIENT'


def reserve_ai_credits(user, credit_cost, activity_desc):
    """
    Atomically checks balance and reserves credits BEFORE calling an external AI API.
    Returns: (allowed, remaining_credits, reserved_cost)
    """
    allowed, remaining, status_code = enforce_usage_billing(user, 'ai', credit_cost, activity_desc)
    return allowed, remaining, (int(credit_cost) if allowed and status_code == 'PAID' else 0)


def refund_ai_credits(user, credit_cost, activity_desc):
    """
    Atomically refunds previously reserved AI credits when an upstream AI call fails.
    Returns: remaining_credits
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return 0
    try:
        cost = max(0, int(credit_cost or 0))
    except (ValueError, TypeError):
        return getattr(user, 'credits', 0)
    if cost <= 0:
        return getattr(user, 'credits', 0)

    User = get_user_model()
    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        locked_user.credits += cost
        locked_user.save(update_fields=['credits'])
        user.credits = locked_user.credits
        CreditLedger.objects.create(
            user=locked_user,
            amount=cost,
            activity=f"Refund ({str(activity_desc)[:160]})"
        )
        return locked_user.credits


def check_usage_gatekeeper(user, feature, credit_cost):
    """
    Phase 0 Gatekeeper check for AI actions:
    Verifies user authentication and credit balance >= credit_cost.
    Returns: (allowed, remaining_credits)
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False, 0
    remaining = getattr(user, 'credits', 0) or 0
    if remaining < int(credit_cost or 0):
        return False, remaining
    return True, remaining
