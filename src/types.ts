export interface BrandIdentity {
  businessName: string;
  niche: string;
  vibe: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  taglines: string[];
  socialBio: string;
  whatsappGreeting: string;
  elevatorPitch: string;
  // New Fields
  brandVoice: string;
  targetAudience: string;
  logoPrompt: string; // The prompt for the image generator
  logoUrl?: string; // The actual generated image URL
  phone?: string; // Optional phone field

  // Upgrade: Trust & Operations Kit
  policies: {
    payment: string;
    delivery: string;
    refund: string;
  };
  trustBadgeText: string;

  // Upgrade: WhatsApp Kit
  whatsappContent: {
    stickerIdeas: string[];
    statusTemplates: string[];
    quickReplies: { shortcut: string; message: string }[];
    broadcastMessages: { title: string; message: string }[];
  };

  // Upgrade: Packaging
  packaging: {
    thankYouNote: string;
    unboxingTip: string;
  };
}

export interface BusinessPlan {
  executiveSummary: string;
  marketAnalysis: string;
  marketingStrategy: string;
  financialProjection: string;
  operationalPlan: string;
}

export interface Grant {
  id: string;
  name: string;
  provider: string;
  amountRange: string;
  matchScore: number; // 0-100
  matchReason: string;
  requirements: string[];
  deadline?: string;
  type: "GRANT" | "LOAN" | "EQUITY";
}

export enum AppView {
  DASHBOARD = "DASHBOARD",
  BRAND_BUILDER = "BRAND_BUILDER",
  CONTENT_GENERATOR = "CONTENT_GENERATOR",
  BUSINESS_PLAN = "BUSINESS_PLAN",
  GRANT_MATCHER = "GRANT_MATCHER",
  LEARNING_HUB = "LEARNING_HUB",
  INVENTORY = "INVENTORY",
  INVOICE_GENERATOR = "INVOICE_GENERATOR",
  DEBTOR_BOOK = "DEBTOR_BOOK",
  MARKETPLACE = "MARKETPLACE",
  SMARTHOME_FINDER = "SMARTHOME_FINDER",
  CART = "CART",
  COMPLIANCE = "COMPLIANCE",
  DIGITAL_ROADMAP = "DIGITAL_ROADMAP",
  WHATSAPP_SUPPORT = "WHATSAPP_SUPPORT",
  SETTINGS = "SETTINGS",
  HUB = "HUB",
  PRODUCT_MAGIC = "PRODUCT_MAGIC",
  SALES_ASSISTANT = "SALES_ASSISTANT",
  ORDER_GENERATOR = "ORDER_GENERATOR",
  STOREFRONT = "STOREFRONT",
  PRODUCT_MANAGER = "PRODUCT_MANAGER",
  LEAD_MANAGER = "LEAD_MANAGER",
}

export type ActionType = "URGENT" | "INFO" | "GROWTH" | "COMPLETED";

export interface ActionCard {
  id: string;
  title: string;
  description: string;
  type: ActionType;
  isCompleted: boolean;
  actionLink?: AppView;
  points?: number;
}

export interface UserStats {
  grantReadinessScore: number;
  bizCredits: number;
  completedTasks: number;
  totalTasks: number;
}

export interface VideoScript {
  title: string;
  hook: string;
  body: string;
  cta: string;
  duration: string;
}

export interface WeeklyPlan {
  weekStartDate: string;
  days: {
    day: string;
    theme: string;
    postIdea: string;
  }[];
}

export interface GeneratedContent {
  id?: string;
  createdAt?: number;
  type?: "POST" | "SCRIPT" | "PLAN";
  topic?: string;

  caption?: string;
  hashtags?: string[];
  callToAction?: string;

  slides?: { title: string; content: string }[];
  imageText?: string;
  dmReply?: string;

  script?: VideoScript;

  plan?: WeeklyPlan;
  niche?: string;
}

export interface TrendIdea {
  trendName: string;
  description: string;
  application: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  plan: "Free" | "Pro";
  hasOnboarded?: boolean;
  logo?: string;
  phone?: string;
  location?: string;
  currency?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnailColor: string;
  isLocked: boolean;
  progress: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  costPrice: number;
  sku?: string;
}

export interface Debtor {
  id: string;
  name: string;
  phone: string;
  amount: number;
  dueDate: string;
  itemsBought: string;
  status: "UNPAID" | "PARTIAL" | "PAID";
  lastReminderSent?: number;
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  platform: "Facebook" | "WhatsApp" | "Google" | "General" | "TikTok" | "LinkedIn" | "Instagram";
  isCompleted: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  items: InvoiceItem[];
  discount: number;
  taxRate: number;
  currency: string;
  note?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  rating: number;
  image: string;
  isVerified: boolean;
}

export interface ProductListing {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  location: string;
  isAvailable: boolean;
}

export interface ServiceGig {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  category: string;
  startingPrice: number;
  deliveryTime: string;
  images: string[];
  packages: {
    name: string;
    price: number;
    description: string;
    features: string[];
  }[];
  isOnline: boolean;
}

export interface RentalListing {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  category: "Event" | "Logistics" | "Property" | "Equipment";
  pricePerDay: number;
  location: string;
  image: string;
  isAvailable: boolean;
}

export interface PropertyListing {
  id: string;
  agentId: string;
  title: string;
  type: "Apartment" | "House" | "Office" | "Land";
  rentFrequency: "Yearly" | "Monthly";
  price: number;
  location: {
    address: string;
    lga: string;
    state: string;
  };
  features: {
    bedrooms: number;
    bathrooms: number;
    serviced: boolean;
    furnished: boolean;
    parkingSpace: boolean;
  };
  naijaSpecs: {
    powerRating: "Excellent" | "Average" | "Poor";
    waterSource: "Borehole" | "Treatment Plant" | "Well";
    floodFree: boolean;
    roadAccess: "Tarred" | "Untarred";
  };
  media: {
    images: string[];
    videoUrl?: string;
  };
  status: "AVAILABLE" | "INSPECTION_PENDING" | "TAKEN";
  fees: {
    agencyFee: number;
    legalFee: number;
    cautionFee: number;
    inspectionFee: number;
  };
}

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  vendorId: string;
}

export interface Transaction {
  id: string;
  date: number;
  amount: number;
  description: string;
  status: "SUCCESS" | "FAILED";
  provider: "PAYSTACK" | "SQUAD";
  type: "PURCHASE" | "BOOKING" | "CREDIT_TOPUP";
}

export interface DailyMotivation {
  quote: string;
  author: string;
  theme: "HUSTLE" | "RESILIENCE" | "GROWTH";
}

export interface SeasonalAlert {
  title: string;
  description: string;
  actionItem: string;
  season: string;
}

export interface UnifiedItem {
  id: number;
  name: string;
  description: string;
  price: string;
  price_max?: number;
  image_url: string;
  category: string;
  product_type: "PHYSICAL" | "SERVICE" | "PROPERTY" | "B2B";
  location: string;
  metadata: any;
  brand_name?: string;
  is_public: boolean;
  is_promoted: boolean;
  stock_count: number;
}
