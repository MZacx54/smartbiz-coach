export type FeatureKey = 
  | 'brand_builder' 
  | 'content_generator' 
  | 'name_check' 
  | 'business_plan' 
  | 'grant_search' 
  | 'debt_reminder' 
  | 'ai_chat' 
  | 'sales_assistant' 
  | 'health_score' 
  | 'pricing_assistant'
  | 'snap_and_list'
  | 'logo_generation';

interface FeatureConfig {
  freeLimit: number;
  creditCost: number;
  label: string;
}

export const FEATURE_CONFIGS: Record<FeatureKey, FeatureConfig> = {
  brand_builder: { freeLimit: 0, creditCost: 5, label: 'AI Brand Identity Builder' },
  content_generator: { freeLimit: 0, creditCost: 2, label: 'AI Content Studio' },
  name_check: { freeLimit: 0, creditCost: 1, label: 'AI Name Availability Check' },
  business_plan: { freeLimit: 0, creditCost: 15, label: 'AI Business Plan Generator' },
  grant_search: { freeLimit: 0, creditCost: 2, label: 'AI Grant Search' },
  debt_reminder: { freeLimit: 0, creditCost: 1, label: 'AI Debt Reminder' },
  ai_chat: { freeLimit: 999999, creditCost: 0, label: 'AI Live Support Chat (Free)' },
  sales_assistant: { freeLimit: 0, creditCost: 2, label: 'AI Sales Assistant' },
  health_score: { freeLimit: 0, creditCost: 5, label: 'AI Business Health Score' },
  pricing_assistant: { freeLimit: 0, creditCost: 2, label: 'AI Pricing Assistant' },
  snap_and_list: { freeLimit: 0, creditCost: 1, label: 'AI Snap & List Scanner' },
  logo_generation: { freeLimit: 0, creditCost: 2, label: 'AI Logo Generation' },
};

interface UsageRecord {
  date: string;
  count: number;
}

export const usageLimiter = {
  getUsageCount: (feature: FeatureKey): number => {
    const today = new Date().toISOString().split('T')[0];
    const dataStr = localStorage.getItem(`sb_usage_${feature}`);
    if (!dataStr) return 0;
    try {
      const record: UsageRecord = JSON.parse(dataStr);
      if (record.date === today) {
        return record.count;
      }
    } catch {
      // ignore
    }
    return 0;
  },

  incrementUsage: (feature: FeatureKey) => {
    const today = new Date().toISOString().split('T')[0];
    const currentCount = usageLimiter.getUsageCount(feature);
    const newRecord: UsageRecord = {
      date: today,
      count: currentCount + 1,
    };
    localStorage.setItem(`sb_usage_${feature}`, JSON.stringify(newRecord));
  },

  checkUsage: (
    feature: FeatureKey,
    currentCredits: number
  ): {
    allowed: boolean;
    useCredits: boolean;
    cost: number;
    reason?: 'limit_exceeded' | 'insufficient_credits';
  } => {
    const config = FEATURE_CONFIGS[feature];
    const currentUsage = usageLimiter.getUsageCount(feature);

    // If within free daily limit
    if (currentUsage < config.freeLimit) {
      return { allowed: true, useCredits: false, cost: 0 };
    }

    // Exceeded free limit, check credit wallet
    if (currentCredits >= config.creditCost) {
      return { allowed: true, useCredits: true, cost: config.creditCost };
    }

    // Exceeded free limit and not enough credits
    return {
      allowed: false,
      useCredits: false,
      cost: config.creditCost,
      reason: currentCredits < config.creditCost ? 'insufficient_credits' : 'limit_exceeded',
    };
  },
};
