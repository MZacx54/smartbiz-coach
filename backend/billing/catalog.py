"""
Single source of truth for SmartBiz Coach BizCredit packs, Pro subscription plans,
and server-side AI credit costs.
"""
from decimal import Decimal

CREDIT_PACKS = {
    'micro_50': {
        'id': 'micro_50',
        'label': 'Micro Pack',
        'price_ngn': Decimal('500.00'),
        'credits': 50,
        'bonus_credits': 0,
        'desc': '50 BizCredits (₦10/credit) for quick daily AI studio & pricing runs',
    },
    'starter_175': {
        'id': 'starter_175',
        'label': 'Starter Pack',
        'price_ngn': Decimal('1500.00'),
        'credits': 175,
        'bonus_credits': 25,
        'desc': '175 BizCredits (150 + 25 Bonus) for 7-day boost & Photo AI',
    },
    'grower_450': {
        'id': 'grower_450',
        'label': 'Grower Pack',
        'price_ngn': Decimal('3500.00'),
        'credits': 450,
        'bonus_credits': 50,
        'desc': '450 BizCredits (400 + 50 Bonus) for Studio Shoots & Marketplace Boosts',
        'popular': True,
    },
    'vendor_pro_1250': {
        'id': 'vendor_pro_1250',
        'label': 'Vendor Pro Pack',
        'price_ngn': Decimal('7500.00'),
        'credits': 1250,
        'bonus_credits': 250,
        'desc': '1,250 BizCredits (1,000 + 250 Bonus) for 30-Day Boost + Full AI Studio',
    },
    'mogul_2500': {
        'id': 'mogul_2500',
        'label': 'Mogul Pack',
        'price_ngn': Decimal('15000.00'),
        'credits': 2500,
        'bonus_credits': 500,
        'desc': '2,500 BizCredits for continuous weekly boosts & business plans',
    },
}

# Legacy topup amounts still accepted seamlessly
LEGACY_TOPUP_CREDITS = {
    1000: 110,
    2500: 300,
    5000: 700,
}

PRO_PLANS = {
    'pro_monthly': {
        'id': 'pro_monthly',
        'label': 'Growth Merchant Pro (Monthly)',
        'billing_cycle': 'monthly',
        'price_ngn': Decimal('3500.00'),
        'credits': 450,
        'duration_days': 30,
    },
    'pro_annual': {
        'id': 'pro_annual',
        'label': 'Growth Merchant Pro (Annual)',
        'billing_cycle': 'annual',
        'price_ngn': Decimal('35000.00'),
        'credits': 5000,
        'duration_days': 365,
    },
}

# Authoritative server-side credit costs per AI feature
AI_CREDIT_COSTS = {
    'brand_identity': 15,
    'brand_logo': 15,
    'content_post': 2,
    'video_script': 2,
    'trend_ideas': 2,
    'image_edit': 3,
    'precision_studio': 3,
    'audio_transcribe': 2,
    'daily_motivation': 1,
    'seasonal_tips': 1,
    'chat': 1,
    'suggested_prompts': 1,
    'weekly_plan': 2,
    'debt_reminder': 1,
    'trending_topics': 1,
    'sales_assistant': 2,
    'product_analysis': 2,
    'business_plan': 15,
    'grant_search': 3,
    'name_check': 2,
    'neighborhood_analysis': 2,
    'vendor_search': 2,
    'pricing_assistant': 2,
    'snap_and_list': 3,
    'barcode_autofill': 1,
    'shelf_scan': 5,
    'visual_search': 1,
    'daily_ai_insights': 1,
    'daily_ai_ask': 1,
    'voice_pos': 2,
    'receipt_ocr': 2,
    'listing_assist': 1,
    'whatsapp_promo_assist': 1,
    'marketing_ai_suggest': 1,
    'health_score': 5,
}
