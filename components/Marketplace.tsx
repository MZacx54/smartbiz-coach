import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Search, Filter, MapPin, SlidersHorizontal, RefreshCw, Star, ArrowRight, Tag, 
  ShieldCheck, Zap, Home, Briefcase, Globe, X, Megaphone, 
  ChevronRight, Phone, MessageCircle, Sparkles, CheckCircle2,
  Building, Truck, Users, Package, Award, ArrowUpDown, Store,
  Share2, Copy, ExternalLink, HelpCircle, Check, Camera
} from 'lucide-react';
import { UnifiedItem, User } from '../types';
import api from '../services/api';
import { billingService } from '../services/billingService';
import { toast } from 'react-hot-toast';
import { MerchantProfileDrawer } from './MerchantProfileDrawer';
import SEO from './SEO';

interface MarketplaceProps {
  onAddToCart?: (item: UnifiedItem) => void;
  currentUser?: User;
  initialType?: 'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B';
  isPublicMode?: boolean;
}

// ── Subcategories for ALL 4 Core Pillars ──────────────────
const PILLAR_SUBCATEGORIES = {
  PHYSICAL: [
    { value: '', label: 'All Shop', icon: '🛍️' },
    { value: 'Fashion', label: '👗 Fashion & Wears', icon: '👗' },
    { value: 'Electronics', label: '📱 Electronics & Phones', icon: '📱' },
    { value: 'Beauty', label: '💄 Beauty & Hair', icon: '💄' },
    { value: 'Groceries', label: '🍲 Groceries & Agro', icon: '🍲' },
    { value: 'Home', label: '🛋️ Home & Living', icon: '🛋️' },
    { value: 'Automotive', label: '🚗 Auto & Hardware', icon: '🚗' },
    { value: 'Kids', label: '🍼 Kids & Baby', icon: '🍼' },
  ],
  SERVICE: [
    { value: '', label: 'All Services', icon: '🛠️' },
    { value: 'Tech', label: '💻 Tech & Software', icon: '💻' },
    { value: 'Branding', label: '🎨 Branding & Graphics', icon: '🎨' },
    { value: 'Legal', label: '⚖️ CAC & Legal', icon: '⚖️' },
    { value: 'Accounting', label: '📊 Accounting & Tax', icon: '📊' },
    { value: 'Media', label: '📸 Photography & Media', icon: '📸' },
    { value: 'Repairs', label: '🛠️ Repairs & Maintenance', icon: '🛠️' },
    { value: 'Events', label: '🎉 Events & Catering', icon: '🎉' },
  ],
  PROPERTY: [
    { value: '', label: 'All Real Estate', icon: '🏠' },
    { value: 'Commercial', label: '🏪 Shops & Commercial Plazas', icon: '🏪' },
    { value: 'Office', label: '🏢 Office Spaces & Hubs', icon: '🏢' },
    { value: 'Warehouse', label: '🏭 Warehouses & Storage', icon: '🏭' },
    { value: 'Residential', label: '🏡 Residential Apartments', icon: '🏡' },
    { value: 'Land', label: '🌴 Land & Plots', icon: '🌴' },
  ],
  B2B: [
    { value: '', label: 'All B2B Hub', icon: '⚡' },
    { value: 'LOGISTICS', label: '🚚 Logistics & Dispatch Fleet', icon: '🚚' },
    { value: 'WHOLESALE', label: '📦 Wholesale & Bulk Suppliers', icon: '📦' },
    { value: 'INFLUENCER', label: '📣 Micro-Influencers & UGC', icon: '📣' },
    { value: 'RAW_MATERIALS', label: '🏭 Raw Materials & Packaging', icon: '🏭' },
    { value: 'SERVICES', label: '💼 Enterprise Business Solutions', icon: '💼' },
  ],
};

// ── Major Nigerian Commercial Trade Hubs & States ─────────
const NIGERIAN_GEO_HUBS = [
  { id: '', label: '🇳🇬 All 36 States + FCT' },
  { id: 'Lagos', label: '📍 Lagos (Alaba / Balogun / Ikeja / Trade Fair)' },
  { id: 'Abuja', label: '📍 Abuja FCT (Wuse / Banex / Garki)' },
  { id: 'Port Harcourt', label: '📍 Port Harcourt / Rivers (Oil Mill / Garrison)' },
  { id: 'Onitsha', label: '📍 Onitsha Main Market / Nnewi (Anambra)' },
  { id: 'Aba', label: '📍 Aba Ariaria Market / Umuahia (Abia)' },
  { id: 'Kano', label: '📍 Kano (Kantin Kwari / Sabon Gari)' },
  { id: 'Ibadan', label: '📍 Ibadan (Dugbe / Bodija) / Oyo' },
  { id: 'Ogun', label: '📍 Ogun (Abeokuta / Sango Ota)' },
  { id: 'Enugu', label: '📍 Enugu (Ogbete Main Market)' },
  { id: 'Benin', label: '📍 Benin City / Edo' },
  { id: 'Warri', label: '📍 Warri / Asaba (Delta)' },
  { id: 'Kaduna', label: '📍 Kaduna Central' },
  { id: 'Jos', label: '📍 Jos / Plateau' },
  { id: 'Ilorin', label: '📍 Ilorin / Kwara' },
  { id: 'Uyo', label: '📍 Uyo / Akwa Ibom' },
  { id: 'Owerri', label: '📍 Owerri / Imo' },
  { id: 'Calabar', label: '📍 Calabar / Cross River' },
];

// ── Price Range Buckets ──────────────────────────────────
const PRICE_BUCKETS = [
  { id: '', label: 'All Prices' },
  { id: '0-5000', label: 'Under ₦5k', min: '0', max: '5000' },
  { id: '5000-25000', label: '₦5k – ₦25k', min: '5000', max: '25000' },
  { id: '25000-100000', label: '₦25k – ₦100k', min: '25000', max: '100000' },
  { id: '100000-99999999', label: '₦100k+', min: '100000', max: '99999999' },
];

// Empty fallback (real listings come exclusively from /api/marketplace/global/)
const SEED_MARKETPLACE_LISTINGS: Record<'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B', UnifiedItem[]> = {
  PHYSICAL: [],
  SERVICE: [],
  PROPERTY: [],
  B2B: []
};

// Client-side in-memory cache for instant tab switching (2 minutes TTL)
const marketplaceClientCache = new Map<string, { data: UnifiedItem[]; timestamp: number }>();

const Marketplace: React.FC<MarketplaceProps> = ({ onAddToCart, initialType = 'PHYSICAL', isPublicMode = false }) => {
  const navigate = useNavigate();
  const routeParams = useParams<{ category?: string; state?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const wishlist = useWishlist();

  const urlTab = (searchParams.get('tab') || searchParams.get('type') || '').toUpperCase();
  const resolvedInitialTab = (['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B'].includes(urlTab) ? urlTab : initialType) as 'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B';
  const [activeTab, setActiveTab] = useState<'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B'>(resolvedInitialTab);

  const [items, setItems] = useState<UnifiedItem[]>(() => {
    try {
      const cached = localStorage.getItem(`sb_marketplace_cache_${resolvedInitialTab}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_MARKETPLACE_LISTINGS[resolvedInitialTab] || [];
  });
  const [isLoading, setIsLoading] = useState(() => items.length === 0);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localCartCount, setLocalCartCount] = useState<number>(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Mobile Back-To-Top listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync activeTab when query param or initialType changes
  useEffect(() => {
    const rawTab = (searchParams.get('tab') || searchParams.get('type') || initialType || '').toUpperCase();
    if (['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B'].includes(rawTab) && rawTab !== activeTab) {
      setActiveTab(rawTab as any);
    }
  }, [searchParams, initialType]);

  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem('smartbiz_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          setLocalCartCount(Array.isArray(parsed) ? parsed.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) : 0);
        } else {
          setLocalCartCount(0);
        }
      } catch {
        setLocalCartCount(0);
      }
    };
    syncCart();
    window.addEventListener('storage', syncCart);
    return () => window.removeEventListener('storage', syncCart);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => routeParams.category ? decodeURIComponent(routeParams.category) : '');
  const [selectedLocation, setSelectedLocation] = useState<string>(() => routeParams.state ? decodeURIComponent(routeParams.state) : '');
  const [selectedPriceBucket, setSelectedPriceBucket] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('boosted');
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);

  // Merchant Profile Drawer state
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [isMerchantDrawerOpen, setIsMerchantDrawerOpen] = useState(false);

  // B2B Request for Quote (RFQ) Modal state
  const [rfqItem, setRfqItem] = useState<UnifiedItem | null>(null);
  const [rfqQuantity, setRfqQuantity] = useState<string>('50');
  const [rfqLocation, setRfqLocation] = useState<string>('Lagos');
  const [rfqNotes, setRfqNotes] = useState<string>('');
  const [isSubmittingRfq, setIsSubmittingRfq] = useState(false);

  // Copy listing link state
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  // Cutting-Edge AI Feature: Visual Search by Photo Modal state
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);
  const [visualSearchFile, setVisualSearchFile] = useState<File | null>(null);
  const [visualSearchPreview, setVisualSearchPreview] = useState<string | null>(null);
  const [isVisualSearching, setIsVisualSearching] = useState(false);
  const [visualSearchResults, setVisualSearchResults] = useState<any | null>(null);

  const activeFilterCount = (selectedCategory ? 1 : 0) + (selectedLocation ? 1 : 0) + (selectedPriceBucket ? 1 : 0) + (verifiedOnly ? 1 : 0) + (dealsOnly ? 1 : 0);

  const fetchItems = async (forceRefresh = false) => {
    const bucket = PRICE_BUCKETS.find(b => b.id === selectedPriceBucket);
    const minPrice = bucket?.min || '';
    const maxPrice = bucket?.max || '';

    const cacheKey = `${activeTab}_${searchQuery}_${selectedCategory}_${selectedLocation}_${selectedPriceBucket}_${verifiedOnly}_${dealsOnly}_${sortBy}`;
    const cached = marketplaceClientCache.get(cacheKey);

    if (cached && !forceRefresh && (Date.now() - cached.timestamp < 120000)) {
      setItems(cached.data);
      setIsLoading(false);
      return;
    }

    if (!cached && items.length === 0) {
      setIsLoading(true);
    }

    try {
      const response = await api.get('/api/marketplace/global/', {
        params: { 
          product_type: activeTab, 
          search: searchQuery,
          category: selectedCategory,
          location: selectedLocation,
          min_price: minPrice,
          max_price: maxPrice,
          verified_only: verifiedOnly ? 'true' : '',
          deals: dealsOnly ? 'true' : '',
          sort_by: sortBy
        }
      });
      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          setItems(response.data);
          marketplaceClientCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
          if (!searchQuery && !selectedCategory && !selectedLocation && !selectedPriceBucket) {
            try {
              localStorage.setItem(`sb_marketplace_cache_${activeTab}`, JSON.stringify(response.data));
            } catch {}
          }
        } else if (!searchQuery && !selectedCategory && !selectedLocation && !selectedPriceBucket && !verifiedOnly && !dealsOnly) {
          // Fallback to verified Nigerian starter listings if server DB has 0 items on this tab
          const seeds = SEED_MARKETPLACE_LISTINGS[activeTab] || [];
          setItems(seeds);
        } else {
          setItems([]);
        }
      }
    } catch (err: any) {
      console.warn('Marketplace fetch error:', err);
      const localCached = localStorage.getItem(`sb_marketplace_cache_${activeTab}`);
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
            return;
          }
        } catch {}
      }
      // Fallback to verified Nigerian starter listings on network or cold-start error
      const seeds = SEED_MARKETPLACE_LISTINGS[activeTab] || [];
      setItems(seeds);
      if (forceRefresh) {
        toast('📶 Offline Mode: Loaded local market showcase.', { icon: '📦' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedCategory('');
    try {
      const cached = localStorage.getItem(`sb_marketplace_cache_${activeTab}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {}
    fetchItems();
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, selectedLocation, selectedPriceBucket, verifiedOnly, dealsOnly, sortBy]);

  const displayedItems = savedOnly ? items.filter(it => wishlist.has(it.id)) : items;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(true);
  };

  const handleOpenMerchantProfile = (item: UnifiedItem) => {
    setSelectedMerchant({
      brand_name: item.brand_name || 'Verified Merchant',
      brand_slug: item.brand_slug,
      brand_logo: item.brand_logo,
      brand_niche: item.brand_niche,
      brand_address: item.brand_address,
      cac_number: item.cac_number,
      smedan_number: item.smedan_number,
      corporate_entity_type: item.corporate_entity_type,
      trust_badge_text: item.trust_badge_text,
      is_vendor_verified: item.is_vendor_verified,
      whatsapp_number: item.whatsapp_number,
      location: item.location,
      vendor_badge: (item as any).vendor_badge,
      vendor_verification_tier: (item as any).vendor_verification_tier,
      vendor_chamber: (item as any).vendor_chamber
    });
    setIsMerchantDrawerOpen(true);
  };

  // Filter boosted items for the VIP Spotlight banner
  const boostedItems = items.filter(item => item.is_promoted);

  // Handle B2B RFQ Submission
  const handleSendRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqItem) return;
    setIsSubmittingRfq(true);
    try {
      await api.post('/api/marketplace/leads/', {
        product: rfqItem.id,
        customer_name: 'B2B Wholesale Buyer',
        customer_contact: 'WhatsApp',
        message: `💼 B2B RFQ Inquiry for "${rfqItem.name}"\n• Required Quantity: ${rfqQuantity} units\n• Target Delivery: ${rfqLocation}\n• Buyer Notes: ${rfqNotes || 'Please send bulk pricing and waybill terms.'}`,
        lead_type: 'B2B',
        quoted_price: (Number(rfqItem.price) || 0) * (Number(rfqQuantity) || 1)
      });

      const rawNum = rfqItem.whatsapp_number || '';
      const cleanNum = rawNum.replace(/\D/g, '');
      const waNum = !cleanNum
        ? ''
        : cleanNum.startsWith('0') && cleanNum.length === 11
          ? '234' + cleanNum.slice(1)
          : cleanNum.startsWith('234') ? cleanNum : '234' + cleanNum;
      
      const text = encodeURIComponent(
        `Hello ${rfqItem.brand_name || 'Vendor'}! 💼\n\nI am requesting a B2B quotation for:\n📦 "${rfqItem.name}"\n• Quantity Needed: ${rfqQuantity} units\n• Destination: ${rfqLocation}\n• Notes: ${rfqNotes || 'Please share wholesale pricing & delivery schedule'}\n\nSent via SmartBiz Marketplace.`
      );
      if (waNum) {
        window.open(`https://wa.me/${waNum}?text=${text}`, '_blank');
      }

      toast.success('B2B Quote Request Sent! Opening WhatsApp chat...');
      setRfqItem(null);
      setRfqNotes('');
    } catch (err) {
      toast.error('Failed to submit quote request');
    } finally {
      setIsSubmittingRfq(false);
    }
  };

  const getProductDeepLink = (item: UnifiedItem) => {
    const slug = item.brand_slug;
    return slug ? `/u/${slug}/p/${item.id}` : `/market/p/${item.id}`;
  };

  const handleShareListing = async (item: UnifiedItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://smartbizcoach.com.ng';
    const productLink = `${origin}${getProductDeepLink(item)}`;
    const storeLink = item.brand_slug ? `${origin}/u/${item.brand_slug}` : `${origin}/market`;

    const shareText =
      `🔥 *CHECK THIS OUT ON SMARTBIZ MARKET SQUARE!*\n\n` +
      `📦 *${item.name}*\n` +
      `💰 *Price:* ₦${Number(item.price).toLocaleString()}\n` +
      `🏪 *Vendor:* ${item.brand_name || 'Verified Merchant'}\n` +
      `📍 *Location:* ${item.location || 'Nigeria'}\n\n` +
      `👉 *Buy / View Item:* ${productLink}\n` +
      `🏪 *Seller's Full Store:* ${storeLink}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setHasCopiedLink(true);
      toast.success('Product link & details copied! Share to WhatsApp Status or customer chat.');
      setTimeout(() => setHasCopiedLink(false), 2500);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const hasAuthToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('sb_auth_token'));

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.smartbizcoach.com.ng';
  const marketplaceUrl = `${origin}/market`;

  const marketplaceSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': 'Nigerian MSME Market Square',
    'url': marketplaceUrl,
    'description': 'The central national marketplace for verified Nigerian small businesses. Browse physical goods, professional services, commercial property, and B2B wholesale offers across all 36 Nigerian states and Abuja.',
    'isPartOf': {
      '@type': 'WebSite',
      'name': 'SmartBiz Coach',
      'url': origin
    },
    'mainEntity': {
      '@type': 'ItemList',
      'itemListElement': (displayedItems || []).slice(0, 20).map((it, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'url': `${origin}/p/${it.id}`,
        'name': it.name
      }))
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 px-3 sm:px-6 overflow-touch">
      <SEO
        title="Nigerian MSME Market Square — Buy from Verified Local Businesses across 36 States"
        description="The central digital marketplace for Nigerian MSMEs. Discover local fashion, electronics, beauty, groceries, and services from Nigerian businesses across all 36 states and Abuja. Pay via Paystack or order on WhatsApp."
        url={marketplaceUrl}
        keywords="Nigerian marketplace, MSME market square, buy local Nigeria, Lagos fashion, Computer Village phones, Abuja wholesale, Nigerian small business directory, Paystack checkout"
        schema={marketplaceSchema}
      />
      {/* Public Top Navigation Bar when accessed at /market or market.smartbizcoach.com.ng */}
      {isPublicMode && (
        <header className="sticky top-0 z-40 -mx-3 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/market')}>
            <img src="/favicon.png" alt="SmartBiz Market Square" className="w-8 h-8 rounded-xl object-cover" />
            <div>
              <span className="font-black text-slate-900 text-sm sm:text-base font-heading block leading-none">
                SmartBiz Market Square 🇳🇬
              </span>
              <span className="text-[10px] font-bold text-emerald-600">
                Verified Nigerian Small Businesses & Local Products
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/track')}
              className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Track Order</span>
            </button>
            {hasAuthToken ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer"
              >
                <span>🏠 My Shop Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3.5 min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold cursor-pointer"
                >
                  Merchant Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Open Free Store</span>
                </button>
              </>
            )}
          </div>
        </header>
      )}
      
      {/* ── 1. Hero Banner (Nationwide MSME Commerce Hub) ── */}
      <section className="relative rounded-2xl sm:rounded-[36px] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-8 md:p-12 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-60 sm:w-96 h-60 sm:h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 sm:w-80 h-48 sm:h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-3.5 sm:space-y-5">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
             <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest">
                   <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> #1 Nigerian MSME Market Square
                </div>
                <button
                  onClick={() => navigate(hasAuthToken ? '/dashboard/inventory?action=new' : '/register')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold transition-all cursor-pointer shadow-sm"
                >
                   <Sparkles className="w-3 h-3 text-emerald-400" /> 🏪 Showcase Goods (1-Click) ➔
                </button>
             </div>

             <h1 className="text-xl sm:text-3xl md:text-5xl font-black font-heading tracking-tight leading-tight">
               Showcasing Nigerian <span className="bg-gradient-to-r from-emerald-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">MSMEs</span> Nationwide
             </h1>
             <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-xl leading-relaxed">
               Discover authentic local products, verified artisans, B2B wholesale commodities, and commercial trade spaces across all 36 Nigerian states + FCT.
             </p>
          </motion.div>
 
          {/* Live Search Form (Optimized with Integrated Visual Search on Mobile) */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-2xl pt-1">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask AI: e.g. 'Ankara Lagos', 'Catering Abuja'..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-xl sm:rounded-2xl pl-10 pr-20 sm:pr-10 py-3 sm:py-3.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all shadow-inner"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => { setSearchQuery(''); fetchItems(true); }}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setShowVisualSearchModal(true)}
                  className="sm:hidden p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                  title="Snap photo to search"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="submit"
                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Search className="w-3.5 h-3.5 sm:hidden" />
                <span>Search Hub</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowVisualSearchModal(true)}
                className="hidden sm:flex bg-white/15 hover:bg-white/25 border border-white/20 text-white px-4 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all items-center gap-2 cursor-pointer min-h-[44px]"
                title="Upload or snap a photo of any item to find exact matching products"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Visual Search</span>
              </button>
            </div>
          </form>

          {/* AI Smart Shopper Quick Discovery Chips (Horizontally Swipeable on Mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1 shrink-0 mr-1">
              <Sparkles className="w-3 h-3" /> Popular:
            </span>
            {[
              { label: '👗 Ankara & Aso-Ebi', q: 'Ankara' },
              { label: '🍲 Foodstuff & Grains', q: 'Food' },
              { label: '📱 Phones & Gadgets', q: 'Phone' },
              { label: '🚚 Dispatch & Waybill', q: 'Dispatch' },
              { label: '💄 Wigs & Skincare', q: 'Beauty' },
              { label: '📦 Wholesale B2B', q: 'Wholesale' },
            ].map((chip) => (
              <button
                key={chip.q}
                type="button"
                onClick={() => {
                  setSearchQuery(chip.q);
                  setTimeout(() => fetchItems(true), 20);
                }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 hover:bg-emerald-500/30 border border-white/15 text-slate-200 transition-colors cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Trust Guarantees Strip */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 text-[10px] sm:text-[11px] text-slate-300 font-medium">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified MSMEs
            </span>
            <span className="flex items-center gap-1 text-indigo-300">
              <Truck className="w-3.5 h-3.5" /> Nationwide Waybill
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <Zap className="w-3.5 h-3.5" /> 1-Tap WhatsApp & Paystack
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Top Navigation Tabs (4 Core MSME Pillars) ── */}
      <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-xl border border-slate-200/80 p-1.5 sm:p-2 rounded-2xl sm:rounded-[28px] shadow-lg shadow-slate-200/40">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {[
            { id: 'PHYSICAL' as const, label: 'Shop', sub: 'Retail Goods', icon: ShoppingBag, color: 'text-indigo-600' },
            { id: 'SERVICE' as const, label: 'Services', sub: 'MSME Experts', icon: Briefcase, color: 'text-purple-600' },
            { id: 'PROPERTY' as const, label: 'Real Estate', sub: 'Commercial', icon: Home, color: 'text-emerald-600' },
            { id: 'B2B' as const, label: 'B2B Hub', sub: 'Wholesale & MOQ', icon: Zap, color: 'text-amber-600' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('tab', tab.id);
                  setSearchParams(newParams, { replace: true });
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 py-2.5 sm:py-3.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-md scale-[1.02]' 
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? 'text-emerald-400' : tab.color}`} />
                <div className="text-center sm:text-left">
                  <span className="text-[11px] sm:text-xs font-black block tracking-tight">{tab.label}</span>
                  <span className={`text-[9px] font-bold hidden sm:block ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {tab.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Streamlined Discovery & Filter Control Bar ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3 sm:p-4 shadow-sm space-y-3">
        {/* Top Control Strip: Subcategories Chips (Horizontally Scrollable) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
          {PILLAR_SUBCATEGORIES[activeTab].map(cat => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Control Strip: State Selector + Quick Toggles + Filter Drawer Trigger + Sorter (Scrollable on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-2 border-t border-slate-100 sm:flex-wrap">
          {/* Commercial Hub & State Dropdown Selector */}
          <div className="relative shrink-0">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600 pointer-events-none" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl pl-8 pr-7 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none transition-colors min-h-[38px]"
              title="Filter by Nigerian State or Commercial Trade Hub"
            >
              {NIGERIAN_GEO_HUBS.map(hub => (
                <option key={hub.id} value={hub.id}>{hub.label}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 rotate-90 pointer-events-none" />
          </div>

          {/* Quick Chips: Flash Deals */}
          <button
            type="button"
            onClick={() => setDealsOnly(v => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-all shrink-0 whitespace-nowrap min-h-[38px] ${
              dealsOnly ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100/70'
            }`}
          >
            🔥 Flash Deals
          </button>

          {/* Quick Chips: Verified MSMEs */}
          <button
            type="button"
            onClick={() => setVerifiedOnly(v => !v)}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-all shrink-0 whitespace-nowrap min-h-[38px] ${
              verifiedOnly ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50/70 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified MSMEs</span>
          </button>

          {/* Quick Chips: Saved Wishlist */}
          <button
            type="button"
            onClick={() => setSavedOnly(v => !v)}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-all shrink-0 whitespace-nowrap min-h-[38px] ${
              savedOnly ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${savedOnly ? 'fill-white' : 'text-pink-600'}`} />
            <span>Saved ({wishlist.ids.length})</span>
          </button>

          {/* Deep Filter Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
              activeFilterCount > 0 
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center ml-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sorter Selector */}
          <div className="relative shrink-0 sm:ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl pl-3 pr-7 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none transition-colors min-h-[38px]"
            >
              <option value="boosted">⚡ Featured</option>
              <option value="price_low">💵 Low to High</option>
              <option value="price_high">💎 High to Low</option>
              <option value="newest">✨ Newest</option>
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 rotate-90 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── 5. VIP Boosted & Featured Spotlight Carousel ── */}
      {boostedItems.length > 0 && (
        <section className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-amber-300/40 rounded-3xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔥</span> Verified VIP Featured MSME Spotlight
              </h3>
            </div>
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
              Top Ranked Nationwide
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pt-1">
            {boostedItems.map(item => (
              <div
                key={`boosted-${item.id}`}
                className="flex-shrink-0 w-64 sm:w-72 bg-white rounded-2xl p-3 border border-amber-200/80 shadow-md hover:shadow-xl transition-all group"
              >
                <div 
                  onClick={() => setSelectedItem(item)}
                  className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 relative mb-2.5 cursor-pointer"
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ShoppingBag className="w-8 h-8" /></div>
                  )}
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1">
                    ⚡ SPONSORED
                  </span>
                </div>

                <div 
                  onClick={() => handleOpenMerchantProfile(item)}
                  className="flex items-center justify-between cursor-pointer group/merch"
                >
                  <p className="text-[10px] font-black text-indigo-600 truncate group-hover/merch:underline flex items-center gap-1">
                    <Store className="w-3 h-3" /> {item.brand_name || 'Verified Merchant'}
                  </p>
                  {item.is_vendor_verified && (
                    <span className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <h4 
                  onClick={() => setSelectedItem(item)}
                  className="text-xs font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors cursor-pointer mt-0.5"
                >
                  {item.name}
                </h4>

                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                  <span className="text-sm font-black text-slate-900 font-heading">
                    ₦{Number(item.price).toLocaleString()}
                  </span>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5 cursor-pointer"
                  >
                    Inspect ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. Main Modern Commerce Product & B2B Grid (Ultra-Optimized 2-Col Mobile Layout) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {displayedItems.map((item) => {
            const isBoosted = item.is_promoted;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group bg-white rounded-2xl sm:rounded-3xl border overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative ${
                  isBoosted 
                    ? 'border-amber-300 ring-2 ring-amber-300/40 shadow-md shadow-amber-500/10' 
                    : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Product Image Box */}
                <div 
                  onClick={() => setSelectedItem(item)}
                  className="aspect-[4/3] bg-slate-100 relative overflow-hidden cursor-pointer"
                >
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ShoppingBag className="w-10 h-10" />
                    </div>
                  )}

                  {/* Badges on Top of Image */}
                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-1 flex-wrap max-w-[70%]">
                      <span className="bg-slate-900/85 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        {item.product_type === 'PHYSICAL' && '🛍️ Shop'}
                        {item.product_type === 'SERVICE' && '🛠️ Service'}
                        {item.product_type === 'PROPERTY' && '🏠 Property'}
                        {item.product_type === 'B2B' && '⚡ B2B'}
                      </span>
                      {isBoosted && (
                        <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5">
                          ⚡ Top
                        </span>
                      )}
                      {item.deal_active && item.discount_percent ? (
                        <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm">
                          -{item.discount_percent}%
                        </span>
                      ) : null}
                    </div>

                    {/* Floating Action Icons (Share + Wishlist) */}
                    <div className="flex items-center gap-1 pointer-events-auto">
                      <button
                        type="button"
                        aria-label="Share listing"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareListing(item);
                        }}
                        className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-slate-950 flex items-center justify-center shadow-sm cursor-pointer active:scale-90 transition-transform"
                        title="Share Product"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Save item"
                        onClick={(e) => {
                          e.stopPropagation();
                          const saved = wishlist.toggle(item.id);
                          toast.success(saved ? 'Saved to wishlist!' : 'Removed from wishlist');
                        }}
                        className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md text-slate-400 hover:text-pink-600 flex items-center justify-center shadow-sm cursor-pointer active:scale-90 transition-transform"
                        title="Save to Wishlist"
                      >
                        <Heart className={`w-3.5 h-3.5 ${wishlist.has(item.id) ? 'fill-pink-600 text-pink-600' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-2.5 sm:p-4 flex flex-col flex-1 space-y-1.5 sm:space-y-2">
                  
                  {/* Vendor Brand & Verified Badge (Click to open Drawer) */}
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <button
                      onClick={() => handleOpenMerchantProfile(item)}
                      className="font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider truncate flex items-center gap-1 cursor-pointer transition-colors max-w-[65%]"
                      title="View Merchant Profile & Catalog"
                    >
                      <Store className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.brand_name || 'Verified Merchant'}</span>
                    </button>

                    {item.location && (
                      <span className="text-[9px] text-slate-500 font-bold truncate flex items-center gap-0.5 shrink-0">
                        <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> {item.location.split(',')[0]}
                      </span>
                    )}
                  </div>

                  {/* Title & Price */}
                  <div onClick={() => setSelectedItem(item)} className="cursor-pointer space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-baseline gap-1.5 flex-wrap pt-0.5">
                      <span className="text-sm sm:text-base font-black text-slate-950 font-heading">
                        ₦{Number(item.price).toLocaleString()}
                      </span>
                      {item.compare_at_price && Number(item.compare_at_price) > Number(item.price) && (
                        <span className="text-[10px] text-slate-400 line-through">
                          ₦{Number(item.compare_at_price).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category-Specific Component Chips (Compact on Mobile) */}
                  <div className="text-[9px] sm:text-[10px] space-y-1 pt-0.5">
                    {/* PHYSICAL SPEC */}
                    {item.product_type === 'PHYSICAL' && (
                      <div className="flex flex-wrap gap-1 text-slate-600 font-bold">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                          📦 {item.stock_count && item.stock_count > 0 ? `${item.stock_count} in stock` : 'Available'}
                        </span>
                      </div>
                    )}

                    {/* SERVICE SPEC */}
                    {item.product_type === 'SERVICE' && (
                      <div className="flex flex-wrap gap-1 text-purple-700 font-bold">
                        <span className="bg-purple-50 px-1.5 py-0.5 rounded">
                          ⏱️ {item.metadata?.duration || 'Fast Delivery'}
                        </span>
                      </div>
                    )}

                    {/* REAL ESTATE SPEC */}
                    {item.product_type === 'PROPERTY' && (
                      <div className="flex flex-wrap gap-1 text-emerald-700 font-bold">
                        <span className="bg-emerald-50 px-1.5 py-0.5 rounded">
                          🏢 {item.metadata?.propertyType || 'Commercial'}
                        </span>
                      </div>
                    )}

                    {/* B2B COMPONENT SPEC */}
                    {item.product_type === 'B2B' && (
                      <div className="flex flex-wrap gap-1 text-amber-800 font-bold">
                        <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                          📦 MOQ: {item.metadata?.moq || '10'} units
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Modern, High-Converting 1-Tap Action Bar */}
                  <div className="mt-auto pt-2 sm:pt-3 border-t border-slate-100 flex items-center gap-1.5">
                    {item.product_type === 'PHYSICAL' ? (
                      <button
                        onClick={() => {
                          if (onAddToCart && !isPublicMode) {
                            onAddToCart(item);
                            setLocalCartCount(prev => prev + 1);
                            toast.success((t) => (
                              <div className="flex items-center justify-between gap-3 w-full">
                                <span className="text-xs font-bold">Added to cart!</span>
                                <button
                                  onClick={() => {
                                    toast.dismiss(t.id);
                                    navigate('/dashboard/cart');
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-lg whitespace-nowrap cursor-pointer"
                                >
                                  View Cart →
                                </button>
                              </div>
                            ), { duration: 3500 });
                          } else {
                            navigate(getProductDeepLink(item));
                          }
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-black py-2 sm:py-2.5 px-2.5 rounded-xl transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1 cursor-pointer active:scale-95 min-h-[38px]"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{onAddToCart && !isPublicMode ? 'Add to Cart' : 'Buy Now'}</span>
                      </button>
                    ) : item.product_type === 'B2B' ? (
                      <button
                        onClick={() => setRfqItem(item)}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] sm:text-xs font-black py-2 sm:py-2.5 px-2.5 rounded-xl transition-all shadow-sm shadow-amber-600/20 flex items-center justify-center gap-1 cursor-pointer active:scale-95 min-h-[38px]"
                      >
                        <Package className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Wholesale RFQ</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(getProductDeepLink(item))}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] sm:text-xs font-black py-2 sm:py-2.5 px-2.5 rounded-xl transition-all shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-1 cursor-pointer active:scale-95 min-h-[38px]"
                      >
                        <span className="truncate">{item.product_type === 'PROPERTY' ? '🏡 Inquire' : '💼 Book Service'}</span>
                      </button>
                    )}

                    {/* Instant Direct WhatsApp Order & Chat */}
                    <button
                      onClick={() => {
                        const rawNum = item.whatsapp_number || '';
                        const cleanNum = rawNum.replace(/\D/g, '');
                        const waNum = !cleanNum
                          ? ''
                          : cleanNum.startsWith('0') && cleanNum.length === 11
                            ? '234' + cleanNum.slice(1)
                            : cleanNum.startsWith('234') ? cleanNum : '234' + cleanNum;
                        if (!waNum) {
                          toast.error('Seller has not provided a WhatsApp number yet. View their storefront instead.');
                          return;
                        }
                        const text = encodeURIComponent(
                          `Hello ${item.brand_name || 'Vendor'}! I saw your listing "${item.name}" (₦${Number(item.price).toLocaleString()}) on SmartBiz Market Square and would like to order / make an inquiry.`
                        );
                        window.open(`https://wa.me/${waNum}?text=${text}`, '_blank');
                      }}
                      className="px-2.5 py-2 sm:py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 shrink-0 min-h-[38px]"
                      title="Instant WhatsApp Order & Chat"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="hidden sm:inline text-[11px]">Chat</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading Skeleton Placeholders */}
        {isLoading && items.length === 0 && (
          <div className="col-span-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-slate-200/80 space-y-3 animate-pulse shadow-sm">
                <div className="aspect-[4/3] rounded-xl bg-slate-200" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-200 rounded w-4/5" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-9 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State with One-Click Refresh */}
        {items.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm text-2xl font-bold">
              🛍️
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800">No Listings Found</h3>
              <p className="text-slate-500 max-w-md mx-auto text-xs leading-relaxed">
                {searchQuery || selectedCategory || selectedLocation || selectedPriceBucket || verifiedOnly || dealsOnly
                  ? "No listings match your active filters. Try clearing your filters to discover verified Nigerian products across all 36 states."
                  : "Checking for active listings across Nigeria... Tap Refresh below to reload."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => fetchItems(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Marketplace
              </button>
              {(searchQuery || selectedCategory || selectedLocation || selectedPriceBucket || verifiedOnly || dealsOnly) && (
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedLocation('');
                    setSelectedPriceBucket('');
                    setVerifiedOnly(false);
                    setDealsOnly(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 7. B2B Request for Quote (RFQ) Modal ── */}
      <AnimatePresence>
        {rfqItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRfqItem(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Request Bulk Quotation (RFQ)</h3>
                    <p className="text-xs text-slate-400">{rfqItem.name}</p>
                  </div>
                </div>
                <button onClick={() => setRfqItem(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendRFQ} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-600 mb-1 block">Order Quantity Required (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={rfqQuantity}
                    onChange={(e) => setRfqQuantity(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Vendor Minimum Order (MOQ): {rfqItem.metadata?.moq || 'None'}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-600 mb-1 block">Delivery Destination State/City</label>
                  <input
                    type="text"
                    value={rfqLocation}
                    onChange={(e) => setRfqLocation(e.target.value)}
                    placeholder="e.g. Lagos, Trade Fair Complex or Port Harcourt"
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 mb-1 block">Custom Specs / Delivery Notes</label>
                  <textarea
                    rows={3}
                    value={rfqNotes}
                    onChange={(e) => setRfqNotes(e.target.value)}
                    placeholder="Provide specific details (e.g. customized branding, payment on waybill delivery, batch schedule)..."
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200/70 p-3.5 rounded-2xl text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold">⚡ Instant Multi-Channel Dispatch:</p>
                  <p className="text-amber-800 leading-relaxed">
                    Submitting this RFQ notifies the merchant and connects directly to their verified WhatsApp line with your exact specifications.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRfq}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>🚀</span>
                  <span>{isSubmittingRfq ? 'Dispatching RFQ...' : 'Submit Quote Request & Open WhatsApp'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. Rich Item Detail Modal (Bottom Sheet on Mobile, Centered Modal on Desktop) ── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-[36px] shadow-3xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] sm:max-h-[90vh] z-10"
            >
               {/* Mobile Drag Indicator */}
               <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

               <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-9 h-9 sm:w-10 sm:h-10 bg-slate-900/60 hover:bg-slate-900/90 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
               >
                 <X className="w-4 h-4 sm:w-5 sm:h-5" />
               </button>

               {/* Media Section */}
               <div className="w-full md:w-1/2 aspect-[16/10] sm:aspect-[4/3] md:aspect-auto bg-slate-100 relative shrink-0">
                  {selectedItem.image_url ? (
                    <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ShoppingBag className="w-16 h-16 sm:w-20 sm:h-20" />
                    </div>
                  )}

                  {/* Merchant badge overlay on photo */}
                  <div 
                    onClick={() => {
                      handleOpenMerchantProfile(selectedItem);
                    }}
                    className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-slate-900/85 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-white cursor-pointer hover:bg-slate-900 transition-all border border-white/10"
                  >
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Verified MSME Seller</p>
                         <p className="font-extrabold text-xs sm:text-sm truncate">{selectedItem.brand_name || 'Verified Merchant'}</p>
                       </div>
                       <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1 shrink-0">
                         View Store ➔
                       </span>
                     </div>
                     {selectedItem.location && (
                       <p className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                         <MapPin className="w-3 h-3 text-emerald-400 shrink-0" /> {selectedItem.location}
                       </p>
                     )}
                  </div>
               </div>

               {/* Info Section with Sticky Action Footer on Mobile */}
               <div className="w-full md:w-1/2 p-4 sm:p-8 flex flex-col overflow-y-auto space-y-3 sm:space-y-4">
                  <div className="space-y-1">
                     <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                          {selectedItem.product_type}
                        </span>
                        {selectedItem.is_vendor_verified && (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified MSME
                          </span>
                        )}
                        {selectedItem.cac_number && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-bold">
                            RC: {selectedItem.cac_number}
                          </span>
                        )}
                     </div>
                     <h2 className="text-lg sm:text-2xl font-black text-slate-900 font-heading leading-tight">{selectedItem.name}</h2>
                     <p className="text-xl sm:text-2xl font-black text-slate-950 font-heading">₦{Number(selectedItem.price).toLocaleString()}</p>
                  </div>

                  <div className="space-y-3 text-xs flex-1">
                     <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">About This Listing</h4>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-xs sm:text-sm">{selectedItem.description}</p>
                     </div>

                     {/* Specs Grid */}
                     <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Specifications & Fulfillment</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {selectedItem.category && (
                            <div>
                              <span className="text-slate-400 font-medium block text-[10px]">Category:</span>
                              <strong className="text-slate-800">{selectedItem.category}</strong>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px]">Stock Status:</span>
                            <strong className="text-emerald-700">{selectedItem.stock_count && selectedItem.stock_count > 0 ? `${selectedItem.stock_count} units available` : 'In Stock'}</strong>
                          </div>
                          {selectedItem.product_type === 'B2B' && (
                            <div>
                              <span className="text-slate-400 font-medium block text-[10px]">Min Order (MOQ):</span>
                              <strong className="text-slate-800">{selectedItem.metadata?.moq || '10 units'}</strong>
                            </div>
                          )}
                          {selectedItem.product_type === 'PROPERTY' && (
                            <div>
                              <span className="text-slate-400 font-medium block text-[10px]">Property Specs:</span>
                              <strong className="text-slate-800">{selectedItem.metadata?.propertyType || 'Commercial'}</strong>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px]">Fulfillment:</span>
                            <strong className="text-slate-800">Nationwide Waybill</strong>
                          </div>
                        </div>
                     </div>
                  </div>

                  {/* Trust badge note */}
                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 text-[10px] sm:text-[11px] text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="leading-tight">
                      <strong>Safe Nigerian Commerce:</strong> Chat directly with the merchant on WhatsApp or pay securely via Paystack.
                    </p>
                  </div>

                  {/* Actions in Modal (Sticky Bottom on Mobile for Effortless Thumb Access) */}
                  <div className="mt-auto pt-2.5 sm:pt-3 border-t border-slate-100 flex flex-col gap-2 sticky bottom-0 bg-white/95 backdrop-blur-md pb-safe">
                     <div className="flex items-center gap-2">
                        {selectedItem.product_type === 'PHYSICAL' ? (
                          <button 
                            onClick={() => {
                              if (onAddToCart) {
                                onAddToCart(selectedItem);
                                setLocalCartCount(prev => prev + 1);
                                toast.success('Added to shopping cart! 🛍️');
                              }
                              setSelectedItem(null);
                            }}
                            className="flex-1 bg-slate-900 hover:bg-emerald-600 text-white py-3 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                          >
                            <ShoppingBag className="w-4 h-4" /> Add to Cart
                          </button>
                        ) : selectedItem.product_type === 'B2B' ? (
                          <button 
                            onClick={() => {
                              setRfqItem(selectedItem);
                              setSelectedItem(null);
                            }}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95 cursor-pointer min-h-[44px]"
                          >
                            Request Bulk Quote
                          </button>
                        ) : null}

                        <button 
                          onClick={() => {
                            const rawNum = selectedItem.whatsapp_number || '';
                            const cleanNum = rawNum.replace(/\D/g, '');
                            const waNum = !cleanNum
                              ? ''
                              : cleanNum.startsWith('0') && cleanNum.length === 11
                                ? '234' + cleanNum.slice(1)
                                : cleanNum.startsWith('234') ? cleanNum : '234' + cleanNum;
                            if (!waNum) {
                              toast.error('Seller has not provided a WhatsApp number yet.');
                              return;
                            }
                            const text = encodeURIComponent(
                              `Hello ${selectedItem.brand_name || 'Vendor'}! I saw your listing "${selectedItem.name}" (₦${Number(selectedItem.price).toLocaleString()}) on SmartBiz Market Square and would like to order/negotiate.`
                            );
                            window.open(`https://wa.me/${waNum}?text=${text}`, '_blank');
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                        >
                          <MessageCircle className="w-4 h-4" /> WhatsApp Order
                        </button>
                     </div>

                     <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShareListing(selectedItem)}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                        >
                          {hasCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>{hasCopiedLink ? 'Copied Link!' : 'Share Listing'}</span>
                        </button>
                        <button
                          onClick={() => {
                            handleOpenMerchantProfile(selectedItem);
                            setSelectedItem(null);
                          }}
                          className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                        >
                          <Store className="w-3.5 h-3.5" /> Seller Store
                        </button>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 9. Merchant Profile Drawer ── */}
      <MerchantProfileDrawer
        isOpen={isMerchantDrawerOpen}
        onClose={() => setIsMerchantDrawerOpen(false)}
        merchant={selectedMerchant}
        onAddToCart={onAddToCart}
        onSelectItem={(item) => {
          setIsMerchantDrawerOpen(false);
          setSelectedItem(item);
        }}
      />

      {/* ── Slide-over / Modal for Deep Filters ── */}
      <AnimatePresence>
        {showFilterDrawer && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilterDrawer(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 z-10 max-h-[88vh] overflow-y-auto"
            >
              {/* Mobile Drag Indicator */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-extrabold text-slate-900">Filter Marketplace</h3>
                </div>
                <button 
                  onClick={() => setShowFilterDrawer(false)} 
                  className="text-slate-400 hover:text-slate-600 p-2 cursor-pointer rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Price Range Buckets */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" /> Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_BUCKETS.map(bucket => {
                    const isSelected = selectedPriceBucket === bucket.id;
                    return (
                      <button
                        key={bucket.id}
                        type="button"
                        onClick={() => setSelectedPriceBucket(bucket.id)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-all border text-left cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {bucket.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commercial Trade Hub / Location */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> State or Commercial Hub
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {NIGERIAN_GEO_HUBS.map(hub => (
                    <option key={hub.id} value={hub.id}>{hub.label}</option>
                  ))}
                </select>
              </div>

              {/* Verification & Flash Deals Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-black text-slate-900">Verified MSMEs Only</p>
                      <p className="text-[10px] text-slate-500">Show businesses with verified identity & CAC details</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔥</span>
                    <div>
                      <p className="text-xs font-black text-slate-900">Flash Deals Only</p>
                      <p className="text-[10px] text-slate-500">Listings with active limited-time discounts</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={dealsOnly}
                    onChange={(e) => setDealsOnly(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Actions: Clear & Done */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPriceBucket('');
                    setSelectedLocation('');
                    setVerifiedOnly(false);
                    setDealsOnly(false);
                    setSelectedCategory('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterDrawer(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
                >
                  Apply & View Results
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 10. Cutting-Edge AI Feature: Visual Search by Photo Modal ── */}
      {showVisualSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">AI Visual Product Search</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Find matching marketplace goods by photo</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowVisualSearchModal(false);
                  setVisualSearchFile(null);
                  setVisualSearchPreview(null);
                  setVisualSearchResults(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-2 cursor-pointer rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Area */}
            {!visualSearchPreview ? (
              <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-xs sm:text-sm text-slate-800 block">Upload Product Snapshot or Screenshot</span>
                  <span className="text-[11px] text-slate-400">Snap a photo of shoes, lace fabric, or electronics to match in seconds</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setVisualSearchFile(file);
                      setVisualSearchPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-56">
                  <img src={visualSearchPreview} alt="Search target preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setVisualSearchFile(null);
                      setVisualSearchPreview(null);
                      setVisualSearchResults(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/70 text-white p-1.5 rounded-full hover:bg-slate-900 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {!visualSearchResults && (
                  <button
                    type="button"
                    disabled={isVisualSearching}
                    onClick={async () => {
                      if (!visualSearchFile) return;
                      setIsVisualSearching(true);
                      const toastId = toast.loading('Visual AI analyzing features & matching catalog...');
                      try {
                        const formData = new FormData();
                        formData.append('image', visualSearchFile);
                        const res = await api.post('/api/marketplace/visual-search/', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setVisualSearchResults(res.data);
                        toast.success(`Found ${res.data.matches_count || 0} matching items! ✓`, { id: toastId });
                      } catch (err: any) {
                        toast.error(err.response?.data?.error || 'Failed to match image.', { id: toastId });
                      } finally {
                        setIsVisualSearching(false);
                      }
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isVisualSearching ? 'Matching Visual Embeddings...' : 'Match Catalog Items via AI'}</span>
                  </button>
                )}

                {/* Match Results */}
                {visualSearchResults && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Detected: <strong>{visualSearchResults.detected_item}</strong></span>
                      <span className="text-indigo-600 font-mono">{visualSearchResults.matches_count} matches</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                      {(visualSearchResults.products || []).map((prod: any) => (
                        <div 
                          key={prod.id}
                          onClick={() => {
                            setShowVisualSearchModal(false);
                            setSelectedItem(prod);
                          }}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm cursor-pointer transition-all space-y-1"
                        >
                          <div className="w-full h-20 bg-slate-100 rounded-lg overflow-hidden">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <h5 className="font-bold text-slate-800 text-xs truncate">{prod.name}</h5>
                          <span className="font-black font-mono text-emerald-600 text-xs block">
                            ₦{Number(prod.price).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating Mobile Cart Pill ── */}
      {localCartCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          onClick={() => navigate(isPublicMode ? '/cart' : '/dashboard/cart')}
          className="fixed bottom-6 right-4 sm:right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-4 sm:px-5 py-3 rounded-full shadow-2xl shadow-emerald-900/40 flex items-center gap-2.5 font-black text-xs sm:text-sm border border-emerald-400/30 cursor-pointer active:scale-95 transition-all"
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse">
              {localCartCount}
            </span>
          </div>
          <span>View Cart ({localCartCount})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* ── Floating Back-to-Top Button ── */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed ${localCartCount > 0 ? 'bottom-20' : 'bottom-6'} right-4 z-30 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer active:scale-95 border border-slate-700`}
          title="Scroll to Top"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      )}

    </div>
  );
};

export default Marketplace;
