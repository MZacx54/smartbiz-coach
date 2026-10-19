/**
 * Single source of truth for navigation (Phase 1 + Phase 4/6).
 * The desktop sidebar and the mobile bottom bar + section chips are both
 * generated from this list, per role and language.
 */
import { AppView, User } from '../types';

export type NavRole = 'OWNER' | 'ATTENDANT';

export interface NavLeaf {
  label: string;
  labelPcm?: string;
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
  labelPcm?: string;
  icon: string;
  children: NavLeaf[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    label: 'Home',
    labelPcm: 'Home',
    icon: '🏠',
    children: [
      {
        label: 'Home',
        labelPcm: 'Home',
        route: '',
        view: AppView.DASHBOARD,
        icon: '🏠',
        aliases: ['insights'],
        attendant: true,
      },
    ],
  },
  {
    id: 'sell',
    label: 'Sell',
    labelPcm: 'Market',
    icon: '🛒',
    children: [
      { label: 'Day-Book (Sales)', labelPcm: 'Day-Book (Sales)', route: 'cashbook', view: AppView.DAILY_CASHBOOK, icon: '⚡', attendant: true },
      { label: 'Invoices & Receipts', labelPcm: 'Receipt & Invoice', route: 'invoices', view: AppView.INVOICE_GENERATOR, icon: '🧾', attendant: true },
      { label: 'Online Store', labelPcm: 'Online Shop', route: 'store-preview', view: AppView.STOREFRONT, icon: '🔗', attendant: true },
      { label: 'Orders', labelPcm: 'Orders', route: 'order-gen', view: AppView.ORDER_GENERATOR, icon: '📦' },
      { label: 'Leads Inbox', labelPcm: 'Customer Leads', route: 'leads', view: AppView.LEAD_MANAGER, icon: '📬' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    labelPcm: 'Money',
    icon: '💰',
    children: [
      { label: 'Debtors (Gbege)', labelPcm: 'Gbege Book (Debt)', route: 'debtor', view: AppView.DEBTOR_BOOK, icon: '📒', aliases: ['debtors'], attendant: true },
      { label: 'Find Funding', labelPcm: 'Grants & Loans', route: 'grants', view: AppView.GRANT_MATCHER, icon: '💰' },
      { label: 'Business Plan', labelPcm: 'Business Plan', route: 'business-plan', view: AppView.BUSINESS_PLAN, icon: '📈' },
      { label: 'Pricing Helper', labelPcm: 'Check Price', route: 'pricing-assistant', view: AppView.PRICING_ASSISTANT, icon: '🏷️' },
      { label: 'Money Insights', labelPcm: 'Money Sense', route: 'analytics', view: AppView.DATA_SCIENCE_HUB, icon: '📊' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    labelPcm: 'Stock',
    icon: '📦',
    children: [
      { label: 'Inventory', labelPcm: 'Shop Goods', route: 'inventory', view: AppView.PRODUCT_MANAGER, icon: '📦', attendant: true },
      { label: 'Market Square', labelPcm: 'Market Square', route: 'marketplace', view: AppView.MARKETPLACE, icon: '🏛️' },
      { label: 'Business Hub (B2B)', labelPcm: 'Wholesale (B2B)', route: 'hub', view: AppView.HUB, icon: '🤝' },
    ],
  },
  {
    id: 'grow',
    label: 'Grow',
    labelPcm: 'Grow',
    icon: '🚀',
    children: [
      {
        label: 'AI Studio',
        labelPcm: 'AI Studio',
        route: 'brand',
        view: AppView.BRAND_BUILDER,
        icon: '🤖',
        aliases: ['content', 'marketing', 'sales-assistant', 'ai-studio'],
      },
      { label: 'Growth Roadmap', labelPcm: 'Growth Map', route: 'roadmap', view: AppView.DIGITAL_ROADMAP, icon: '🗺️' },
      { label: 'Learning Hub', labelPcm: 'Learn Work', route: 'learning', view: AppView.LEARNING_HUB, icon: '🎓' },
      { label: 'Compliance', labelPcm: 'CAC & Tax', route: 'compliance', view: AppView.COMPLIANCE, icon: '⚖️' },
    ],
  },
];

/** Views that need the Owner password while Apprentice Mode is on (incl. non-nav pages). */
export const OWNER_ONLY_VIEWS: AppView[] = [
  AppView.SETTINGS,
  AppView.PARTNER_PORTAL,
  AppView.CONTENT_GENERATOR,
  AppView.MARKETING_AGENT,
  AppView.SALES_ASSISTANT,
  ...NAV_SECTIONS.flatMap((s) => s.children.filter((c) => !c.attendant).map((c) => c.view)),
];

const ADMIN_EMAILS = [
  'meshachzax@gmail.com',
  'admin@smartbiz.com.ng',
  'admin@smartbizcoach.com.ng',
  'partners@smartbizcoach.com.ng',
  'info@smartbizcoach.com.ng',
  'mzacs54@gmail.com',
];

export const isAdminOrPartnerUser = (user?: User | null): boolean => {
  if (!user) return false;
  if ((user as any).is_staff || (user as any).is_superuser) return true;
  const email = (user.email || '').toLowerCase().trim();
  return ADMIN_EMAILS.includes(email);
};

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

export interface QuickAddItem {
  id: string;
  label: string;
  labelPcm: string;
  icon: string;
  view: AppView;
  params?: string;
  attendant: boolean;
}

export const QUICK_ADD: QuickAddItem[] = [
  { id: 'sale', label: 'Record Sale', labelPcm: 'Record Sale', icon: '⚡', view: AppView.DAILY_CASHBOOK, params: 'action=sale', attendant: true },
  { id: 'expense', label: 'Petty Cash / Expense', labelPcm: 'Comot Expense', icon: '💸', view: AppView.DAILY_CASHBOOK, params: 'action=expense', attendant: false },
  { id: 'debt', label: 'Add Debtor', labelPcm: 'Write Gbege (Debt)', icon: '📒', view: AppView.DEBTOR_BOOK, params: 'action=new', attendant: true },
  { id: 'product', label: 'Add Product', labelPcm: 'Add New Market', icon: '📦', view: AppView.PRODUCT_MANAGER, params: 'action=new', attendant: true },
  { id: 'invoice', label: 'New Invoice', labelPcm: 'Write Receipt', icon: '🧾', view: AppView.INVOICE_GENERATOR, params: 'action=new', attendant: true },
];
