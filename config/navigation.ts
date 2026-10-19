/**
 * Single source of truth for navigation (Phase 1).
 * The desktop sidebar and the mobile bottom bar + section chips are both
 * generated from this list, per role.
 */
import { AppView } from '../types';

export type NavRole = 'OWNER' | 'ATTENDANT';

export interface NavLeaf {
  label: string;
  route: string; // path segment under /dashboard ('' = Home)
  view: AppView;
  icon: string;
  /** Extra route segments that should highlight this leaf */
  aliases?: string[];
  /** Visible to apprentices / cashiers (everything else is owner-only) */
  attendant?: boolean;
}

export interface NavSection {
  id: 'home' | 'sell' | 'money' | 'stock' | 'grow';
  label: string;
  icon: string;
  children: NavLeaf[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    children: [{ label: 'Home', route: '', view: AppView.DASHBOARD, icon: '🏠', aliases: ['insights'], attendant: true }],
  },
  {
    id: 'sell',
    label: 'Sell',
    icon: '🛒',
    children: [
      { label: 'Day-Book (Sales)', route: 'cashbook', view: AppView.DAILY_CASHBOOK, icon: '⚡', attendant: true },
      { label: 'Invoices & Receipts', route: 'invoices', view: AppView.INVOICE_GENERATOR, icon: '🧾', attendant: true },
      { label: 'Online Store', route: 'store-preview', view: AppView.STOREFRONT, icon: '🔗', attendant: true },
      { label: 'Orders', route: 'order-gen', view: AppView.ORDER_GENERATOR, icon: '📦' },
      { label: 'Leads Inbox', route: 'leads', view: AppView.LEAD_MANAGER, icon: '📬' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    icon: '💰',
    children: [
      { label: 'Debtors (Gbege)', route: 'debtor', view: AppView.DEBTOR_BOOK, icon: '📒', aliases: ['debtors'], attendant: true },
      { label: 'Find Funding', route: 'grants', view: AppView.GRANT_MATCHER, icon: '💰' },
      { label: 'Business Plan', route: 'business-plan', view: AppView.BUSINESS_PLAN, icon: '📈' },
      { label: 'Pricing Helper', route: 'pricing-assistant', view: AppView.PRICING_ASSISTANT, icon: '🏷️' },
      { label: 'Money Insights', route: 'analytics', view: AppView.DATA_SCIENCE_HUB, icon: '📊' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: '📦',
    children: [
      { label: 'Inventory', route: 'inventory', view: AppView.PRODUCT_MANAGER, icon: '📦', attendant: true },
      { label: 'Market Square', route: 'marketplace', view: AppView.MARKETPLACE, icon: '🏛️' },
      { label: 'Business Hub (B2B)', route: 'hub', view: AppView.HUB, icon: '🤝' },
    ],
  },
  {
    id: 'grow',
    label: 'Grow',
    icon: '🚀',
    children: [
      { label: 'Brand Builder', route: 'brand', view: AppView.BRAND_BUILDER, icon: '✨' },
      { label: 'Content Studio', route: 'content', view: AppView.CONTENT_GENERATOR, icon: '✍️' },
      { label: 'Broadcast HQ', route: 'marketing', view: AppView.MARKETING_AGENT, icon: '📣' },
      { label: 'Sales Closer', route: 'sales-assistant', view: AppView.SALES_ASSISTANT, icon: '💬' },
      { label: 'Growth Roadmap', route: 'roadmap', view: AppView.DIGITAL_ROADMAP, icon: '🗺️' },
      { label: 'Learning Hub', route: 'learning', view: AppView.LEARNING_HUB, icon: '🎓' },
      { label: 'Compliance', route: 'compliance', view: AppView.COMPLIANCE, icon: '⚖️' },
    ],
  },
];

/** Views that need the Owner password while Apprentice Mode is on (incl. non-nav pages). */
export const OWNER_ONLY_VIEWS: AppView[] = [
  AppView.SETTINGS,
  AppView.PARTNER_PORTAL,
  ...NAV_SECTIONS.flatMap((s) => s.children.filter((c) => !c.attendant).map((c) => c.view)),
];

export const leafVisible = (leaf: NavLeaf, role: NavRole) => role === 'OWNER' || !!leaf.attendant;

export const sectionsForRole = (role: NavRole): NavSection[] =>
  NAV_SECTIONS.map((s) => ({ ...s, children: s.children.filter((c) => leafVisible(c, role)) })).filter(
    (s) => s.children.length > 0
  );

/** Which section / leaf does this URL path belong to? */
export const matchNav = (pathname: string): { section?: NavSection; leaf?: NavLeaf } => {
  const seg = pathname.replace(/^\/dashboard\/?/, '').split('/')[0].split('?')[0];
  for (const section of NAV_SECTIONS) {
    for (const leaf of section.children) {
      if (leaf.route === seg || leaf.aliases?.includes(seg)) return { section, leaf };
    }
  }
  return {};
};

export const QUICK_ADD = [
  { id: 'sale', label: 'Record Sale', icon: '⚡', view: AppView.DAILY_CASHBOOK, params: 'action=sale', attendant: true },
  { id: 'expense', label: 'Petty Cash / Expense', icon: '💸', view: AppView.DAILY_CASHBOOK, params: 'action=expense', attendant: false },
  { id: 'debt', label: 'Add Debtor', icon: '📒', view: AppView.DEBTOR_BOOK, params: undefined, attendant: true },
  { id: 'product', label: 'Add Product', icon: '📦', view: AppView.PRODUCT_MANAGER, params: undefined, attendant: true },
  { id: 'invoice', label: 'New Invoice', icon: '🧾', view: AppView.INVOICE_GENERATOR, params: undefined, attendant: true },
] as const;
