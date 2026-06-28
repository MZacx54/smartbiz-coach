export type FeatureKey = 'brand_builder' | 'content_generator' | 'name_check' | 'business_plan' | 'grant_search' | 'debt_reminder' | 'ai_chat' | 'sales_assistant';

interface FeatureConfig {
  freeLimit: number;
  creditCost: number;
  label: string;
}

export const FEATURE_CONFIGS: Record<FeatureKey, FeatureConfig> = {
  brand_builder: { freeLimit: 1, creditCost: 5, label: 'AI Brand Builder' },
  content_generator: { freeLimit: 3, creditCost: 2, label: 'AI Content Generator' },
  name_check: { freeLimit: 2, creditCost: 1, label: 'AI Name Availability Check' },
  business_plan: { freeLimit: 0, creditCost: 15, label: 'AI Business Plan Generator' },
  grant_search: { freeLimit: 2, creditCost: 2, label: 'AI Grant Search' },
  debt_reminder: { freeLimit: 3, creditCost: 1, label: 'AI Debt Reminder' },
  ai_chat: { freeLimit: 5, creditCost: 1, label: 'AI Live Support Chat' },
  sales_assistant: { freeLimit: 2, creditCost: 1, label: 'AI Sales Assistant' },
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
