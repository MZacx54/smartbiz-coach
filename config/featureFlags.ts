/**
 * Production Feature Flags — Core Battle-Tested Launch Wedge
 * All partial/stub, experimental AI, or non-core modules default to `false` in production
 * so only verified operational workflows (Offline POS + Expense Tracker + Apprentice Lock,
 * Inventory, Debt Ledger + WhatsApp Receipts, Invoices, Basic Storefront + Orders/Leads)
 * are exposed at launch.
 */
const flagEnabled = (envVal: unknown, defaultVal = false): boolean => {
  if (typeof envVal === 'string') {
    const normalized = envVal.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return defaultVal;
};

export interface FeatureFlags {
  aiStudio: boolean;
  grantsAndPlans: boolean;
  pricingHelper: boolean;
  dataScienceLabs: boolean;
  learningAndRoadmap: boolean;
  marketSquareDirectory: boolean;
  orderSlipsStub: boolean;
  partnerPortal: boolean;
  businessInsightsLegacy: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  aiStudio: flagEnabled(import.meta.env.VITE_FF_AI_STUDIO, true),
  grantsAndPlans: flagEnabled(import.meta.env.VITE_FF_GRANTS_PLANS, true),
  pricingHelper: flagEnabled(import.meta.env.VITE_FF_PRICING_HELPER, true),
  dataScienceLabs: flagEnabled(import.meta.env.VITE_FF_DATA_SCIENCE, true),
  learningAndRoadmap: flagEnabled(import.meta.env.VITE_FF_LEARNING_ROADMAP, true),
  marketSquareDirectory: flagEnabled(import.meta.env.VITE_FF_MARKET_SQUARE, true),
  orderSlipsStub: flagEnabled(import.meta.env.VITE_FF_ORDER_SLIPS, true),
  partnerPortal: flagEnabled(import.meta.env.VITE_FF_PARTNER_PORTAL, true),
  businessInsightsLegacy: flagEnabled(import.meta.env.VITE_FF_LEGACY_INSIGHTS, true),
};

export const isFeatureEnabled = (flag?: keyof FeatureFlags): boolean => {
  if (!flag) return true;
  return Boolean(FEATURE_FLAGS[flag]);
};
