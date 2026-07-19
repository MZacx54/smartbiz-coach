from datetime import date
from .models import DailyFreeUsage, CreditLedger

# Hardcoded daily free usage limits per feature
FREE_LIMIT_MAP = {
    'grant_search': 3,
    'content_gen': 3,
    'sales_script': 3,
    'debt_reminder': 5,
    'name_check': 3,
}

def get_free_limit(feature):
    return FREE_LIMIT_MAP.get(feature, 0)

def has_remaining_free_limit(user, feature):
    """
    Returns True if the user has remaining free usage for the given feature today.
    """
    limit = get_free_limit(feature)
    if limit <= 0:
        return False

    try:
        usage = DailyFreeUsage.objects.get(user=user, feature=feature)
        # If the last used date is not today, the count is effectively reset to 0
        if usage.last_used != date.today():
            return True
        return usage.count < limit
    except DailyFreeUsage.DoesNotExist:
        return True

def consume_free_usage(user, feature):
    """
    Increments the daily usage counter for the user and feature.
    Resets the count to 1 if it is a new day.
    """
    usage, created = DailyFreeUsage.objects.get_or_create(
        user=user,
        feature=feature,
        defaults={'count': 1}
    )
    
    if not created:
        if usage.last_used != date.today():
            usage.count = 1
        else:
            usage.count += 1
        usage.save()
    
    return usage.count

def enforce_usage_billing(user, feature, credit_cost, activity_desc):
    """
    Checks if a user has free usage remaining. If yes, consumes it.
    If no, checks if they have enough paid credits, deducts them, logs it, and returns True.
    If neither, returns False.
    Returns: (allowed, remaining_credits, consumed_type)
    """
    if has_remaining_free_limit(user, feature):
        consume_free_usage(user, feature)
        return True, user.credits, 'FREE'

    if user.credits >= credit_cost:
        user.credits -= credit_cost
        user.save()
        
        CreditLedger.objects.create(
            user=user,
            amount=-credit_cost,
            activity=activity_desc
        )
        return True, user.credits, 'PAID'

    return False, user.credits, 'DENIED'

def check_usage_gatekeeper(user, feature, credit_cost):
    """
    Checks if a user is allowed to perform the AI action (has free daily usage or enough paid credits).
    If they are using a free slot, consumes it immediately on the server.
    Returns: (allowed, remaining_credits)
    """
    if has_remaining_free_limit(user, feature):
        consume_free_usage(user, feature)
        return True, user.credits

    if user.credits >= credit_cost:
        return True, user.credits

    return False, user.credits
