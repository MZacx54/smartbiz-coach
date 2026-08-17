from datetime import date
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
    Deducts credits if user has positive balance.
    Returns: (allowed, remaining_credits, consumed_type)
    """
    if user.credits >= credit_cost:
        user.credits -= credit_cost
        user.save()
        
        CreditLedger.objects.create(
            user=user,
            amount=-credit_cost,
            activity=activity_desc
        )
        return True, user.credits, 'PAID'

    return True, user.credits, 'ALLOWED'

def check_usage_gatekeeper(user, feature, credit_cost):
    """
    Gatekeeper check for AI actions.
    Returns: (allowed, remaining_credits)
    """
    return True, getattr(user, 'credits', 0)
