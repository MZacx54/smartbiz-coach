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
  DEBTOR_BOOK = "DEBTOR_BOOK", // New
  MARKETPLACE = "MARKETPLACE",
  SMARTHOME_FINDER = "SMARTHOME_FINDER", // New
  CART = "CART",
  COMPLIANCE = 'COMPLIANCE',
  DIGITAL_ROADMAP = 'DIGITAL_ROADMAP',
  WHATSAPP_SUPPORT = 'WHATSAPP_SUPPORT',
  SETTINGS = 'SETTINGS',
  HUB = 'HUB',
  PRODUCT_MAGIC = 'PRODUCT_MAGIC',
  SALES_ASSISTANT = 'SALES_ASSISTANT',
  ORDER_GENERATOR = 'ORDER_GENERATOR',
  STOREFRONT = 'STOREFRONT',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
  LEAD_MANAGER = 'LEAD_MANAGER',
}

export type ActionType = "URGENT" | "INFO" | "GROWTH" | "COMPLETED";

export interface ActionCard {
  id: string;
  title: string;
  description: string;
  type: ActionType;
  isCompleted: boolean;
  actionLink?: AppView; // navigate to a view
  points?: number; // points gained on completion
}

export interface UserStats {
  grantReadinessScore: number; // 0 to 100
  bizCredits: number;
  completedTasks: number;
  totalTasks: number;
}

export interface VideoScript {
  title: string;
  hook: string; // 0-3s
  body: string; // 3-60s
  cta: string; // Closing
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
  type?: "POST" | "SCRIPT" | "PLAN"; // Differentiator
  topic?: string; // optional, for history context

  // Post Data
  caption?: string;
  hashtags?: string[];
  callToAction?: string;

  // New "Super Post" Features
  slides?: { title: string; content: string }[]; // For Carousel
  imageText?: string; // Text to put on the image
  dmReply?: string; // Sales closing script

  // Script Data
  script?: VideoScript;

  // Plan Data
  plan?: WeeklyPlan;
  niche?: string;
}

export interface TrendIdea {
  trendName: string;
  description: string;
  application: string; // How to apply it
}

export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  plan: "Free" | "Pro";
  // New Onboarding Fields
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
  progress: number; // 0-100
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number; // Selling Price
  costPrice: number; // Cost Price for Profit calc
  sku?: string;
}

// --- Debtor Book Types ---
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
  platform: "Facebook" | "WhatsApp" | "Google" | "General";
  isCompleted: boolean;
}

// --- Invoice Types ---
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

// --- Marketplace Types ---
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
  category: string; // e.g., Fashion, Gadgets
  price: number;
  image: string;
  images?: string[]; // Multiple images
  videoUrl?: string; // For trust
  description: string;

  // Naija Retail Upgrades
  condition: "New" | "Foreign Used" | "Naija Used" | "Refurbished";
  stockCount: number;
  minOrderQuantity: number; // For wholesale
  wholesalePrice?: {
    minQty: number;
    price: number;
  };
  deliveryOptions: {
    pickup: boolean;
    dispatch: boolean;
    interstate: boolean;
  };
  location: string; // "Ikeja, Lagos"
}

// Updated Service Structure for Gig Marketplace
export interface ServiceGig {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorAvatar: string;
  vendorLevel: "Newbie" | "Pro" | "Top Rated"; // Based on completed jobs
  title: string; // e.g., "I will design a professional logo for your brand"
  category: "Digital" | "Artisan";
  subCategory: string; // e.g., "Graphics" or "Plumbing"
  location?: string; // Required for Artisans
  rating: number;
  reviewsCount: number;
  startingPrice: number;
  deliveryTime: string; // "2 Days" or "Instant"
  images: string[]; // Portfolio
  packages: {
    name: string; // "Basic", "Standard", "Premium"
    price: number;
    description: string;
    features: string[];
  }[];
  isOnline: boolean; // For instant chat
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

// --- SmartHome Finder Types ---
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
    serviced: boolean; // Cleaning/Security included?
    furnished: boolean;
    parkingSpace: boolean;
  };
  naijaSpecs: {
    powerRating: "Excellent" | "Average" | "Poor"; // Light situation
    waterSource: "Borehole" | "Treatment Plant" | "Well";
    floodFree: boolean;
    roadAccess: "Tarred" | "Untarred";
  };
  media: {
    images: string[];
    videoUrl?: string; // High value for trust
  };
  status: "AVAILABLE" | "INSPECTION_PENDING" | "TAKEN";
  fees: {
    agencyFee: number; // e.g., 10%
    legalFee: number; // e.g., 10%
    cautionFee: number;
    inspectionFee: number; // e.g., N2,000
  };
}

// --- Cart & Payment Types ---
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

// --- Personalization Types ---
export interface DailyMotivation {
  quote: string;
  author: string; // usually "SmartBiz AI"
  theme: "HUSTLE" | "RESILIENCE" | "GROWTH";
}

export interface SeasonalAlert {
  title: string;
  description: string;
  actionItem: string;
  season: string; // e.g. "Rainy Season", "Valentine's"
}

 e x p o r t   i n t e r f a c e   U n i f i e d I t e m   { 
     i d :   n u m b e r ; 
     n a m e :   s t r i n g ; 
     d e s c r i p t i o n :   s t r i n g ; 
     p r i c e :   n u m b e r ; 
     p r i c e _ m a x ? :   n u m b e r ; 
     i m a g e _ u r l :   s t r i n g ; 
     c a t e g o r y :   s t r i n g ; 
     p r o d u c t _ t y p e :   ' P H Y S I C A L '   |   ' S E R V I C E '   |   ' P R O P E R T Y '   |   ' B 2 B ' ; 
     l o c a t i o n :   s t r i n g ; 
     m e t a d a t a :   a n y ; 
     b r a n d _ n a m e ? :   s t r i n g ; 
     i s _ p u b l i c :   b o o l e a n ; 
     i s _ p r o m o t e d :   b o o l e a n ; 
     s t o c k _ c o u n t :   n u m b e r ; 
 }  
 