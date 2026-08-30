import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Search, Filter, MapPin, Star, ArrowRight, Tag, 
  ShieldCheck, Zap, Home, Briefcase, Globe, X, Megaphone, 
  ChevronRight, Phone, MessageCircle, Sparkles, CheckCircle2,
  Building, Truck, Users, Package, Award, ArrowUpDown
} from 'lucide-react';
import { UnifiedItem, User } from '../types';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface MarketplaceProps {
  onAddToCart?: (item: UnifiedItem) => void;
  currentUser?: User;
  initialType?: 'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B';
}

// ── Subcategories for ALL 4 Core Pillars (Equal Visibility) ──────────────────
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

// ── Major Nigerian Commercial Trade Hubs ─────────────────────────────────────
const NIGERIAN_GEO_HUBS = [
  { id: '', label: '🇳🇬 All Nigeria' },
  { id: 'Lagos', label: '📍 Lagos (Yaba/Alaba/Ikeja)' },
  { id: 'Abuja', label: '📍 Abuja (FCT)' },
  { id: 'Port Harcourt', label: '📍 Port Harcourt' },
  { id: 'Onitsha', label: '📍 Onitsha / Aba' },
  { id: 'Kano', label: '📍 Kano / North' },
  { id: 'Ibadan', label: '📍 Ibadan / Oyo' },
];

const Marketplace: React.FC<MarketplaceProps> = ({ onAddToCart, initialType = 'PHYSICAL' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B'>(initialType);
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('boosted');
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);

  // B2B Request for Quote (RFQ) Modal state
  const [rfqItem, setRfqItem] = useState<UnifiedItem | null>(null);
  const [rfqQuantity, setRfqQuantity] = useState<string>('50');
  const [rfqLocation, setRfqLocation] = useState<string>('Lagos');
  const [rfqNotes, setRfqNotes] = useState<string>('');
  const [isSubmittingRfq, setIsSubmittingRfq] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/marketplace/global/', {
        params: { 
          product_type: activeTab, 
          search: searchQuery,
          category: selectedCategory,
          location: selectedLocation,
          sort_by: sortBy
        }
      });
      setItems(response.data);
    } catch (err) {
      toast.error('Failed to load marketplace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset subcategory filter when switching top tabs
    setSelectedCategory('');
    fetchItems();
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, selectedLocation, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
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

      // Direct WhatsApp click-to-chat
      const whatsappNum = rfqItem.whatsapp_number || '2349064556107';
      const text = encodeURIComponent(
        `Hello ${rfqItem.brand_name || 'Vendor'}! 💼\n\nI am requesting a B2B quotation for:\n📦 "${rfqItem.name}"\n• Quantity Needed: ${rfqQuantity} units\n• Destination: ${rfqLocation}\n• Notes: ${rfqNotes || 'Please share wholesale pricing & delivery schedule'}\n\nSent via SmartBiz Marketplace.`
      );
      window.open(`https://wa.me/${whatsappNum}?text=${text}`, '_blank');

      toast.success('B2B Quote Request Sent! Opening WhatsApp chat...');
      setRfqItem(null);
      setRfqNotes('');
    } catch (err) {
      toast.error('Failed to submit quote request');
    } finally {
      setIsSubmittingRfq(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 px-3 sm:px-6">
      
      {/* ── 1. Hero Banner (Clean, Modern, Mobile-First) ── */}
      <section className="relative rounded-3xl sm:rounded-[36px] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-10 md:p-14 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 sm:w-80 h-60 sm:h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-5">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
             <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest">
                   <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> #1 Nigerian MSME Commerce Hub
                </div>
                <button
                  onClick={() => navigate('/dashboard/inventory')}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-all cursor-pointer"
                >
                   <Sparkles className="w-3 h-3 text-emerald-400" /> List & Boost Your Product ➔
                </button>
             </div>

             <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-heading tracking-tight leading-tight">
               The <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Unified</span> Market Square
             </h1>
             <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-xl leading-relaxed">
               Buy & sell verified products, B2B wholesale commodities, logistics dispatch, and professional business services across Nigeria.
             </p>
          </motion.div>
 
          {/* Live Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-2xl pt-1">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, wholesale MOQ, services, locations..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shadow-inner"
              />
            </div>
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ── 2. Top Navigation Tabs (4 Equal Core Pillars) ── */}
      <div className="sticky top-2 z-30 bg-white/90 backdrop-blur-xl border border-slate-200/80 p-1.5 sm:p-2 rounded-2xl sm:rounded-[28px] shadow-lg shadow-slate-200/40">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {[
            { id: 'PHYSICAL' as const, label: 'Shop', sub: 'Retail Goods', icon: ShoppingBag, color: 'text-indigo-600' },
            { id: 'SERVICE' as const, label: 'Services', sub: 'Experts', icon: Briefcase, color: 'text-purple-600' },
            { id: 'PROPERTY' as const, label: 'Real Estate', sub: 'Commercial', icon: Home, color: 'text-emerald-600' },
            { id: 'B2B' as const, label: 'B2B Hub', sub: 'Wholesale', icon: Zap, color: 'text-amber-600' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 py-2.5 sm:py-3.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-md scale-[1.02]' 
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? 'text-indigo-400' : tab.color}`} />
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

      {/* ── 3. Subcategories Pills Bar for ACTIVE Tab ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-2 px-2">
          {PILLAR_SUBCATEGORIES[activeTab].map(cat => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 4. Nigerian Commercial Trade Hubs & Sorter Bar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Geo-Filter Dropdown / Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2">
            {NIGERIAN_GEO_HUBS.map(hub => {
              const isSelected = selectedLocation === hub.id;
              return (
                <button
                  key={hub.id}
                  onClick={() => setSelectedLocation(hub.id)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {hub.label}
                </button>
              );
            })}
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center justify-end gap-2 text-xs">
            <span className="text-slate-400 font-bold hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
            >
              <option value="boosted">⚡ Boosted & Featured First</option>
              <option value="price_low">💵 Price: Low to High</option>
              <option value="price_high">💎 Price: High to Low</option>
              <option value="newest">✨ Newest Listed</option>
            </select>
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
                <span>🔥</span> Verified VIP Featured Spotlight
              </h3>
            </div>
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
              Top Ranked
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pt-1">
            {boostedItems.map(item => (
              <div
                key={`boosted-${item.id}`}
                onClick={() => setSelectedItem(item)}
                className="flex-shrink-0 w-64 sm:w-72 bg-white rounded-2xl p-3 border border-amber-200/80 shadow-md hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 relative mb-2.5">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ShoppingBag className="w-8 h-8" /></div>
                  )}
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1">
                    ⚡ SPONSORED
                  </span>
                </div>
                <p className="text-[10px] font-bold text-indigo-600 truncate">{item.brand_name || 'Verified Merchant'}</p>
                <h4 className="text-xs font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                  <span className="text-sm font-black text-slate-900 font-heading">
                    ₦{Number(item.price).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-extrabold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    View ➔
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. Main Modern Commerce Product & B2B Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const isBoosted = item.is_promoted;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group bg-white rounded-3xl border overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full relative ${
                  isBoosted 
                    ? 'border-amber-300 ring-2 ring-amber-300/40 shadow-lg shadow-amber-500/10' 
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
                      <ShoppingBag className="w-12 h-12" />
                    </div>
                  )}

                  {/* Badges on Top of Image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-slate-900/85 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        {item.product_type === 'PHYSICAL' && '🛍️ Shop'}
                        {item.product_type === 'SERVICE' && '🛠️ Service'}
                        {item.product_type === 'PROPERTY' && '🏠 Property'}
                        {item.product_type === 'B2B' && '⚡ B2B'}
                      </span>
                      {isBoosted && (
                        <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                          ⚡ Boosted
                        </span>
                      )}
                    </div>
                    {item.location && (
                      <span className="bg-white/90 backdrop-blur-md text-slate-800 px-2 py-1 rounded-lg text-[9px] font-bold shadow-sm flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-indigo-600" /> {item.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-3">
                  
                  {/* Vendor Brand & Verified Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider truncate">
                      {item.brand_name || 'Verified Merchant'}
                    </span>
                    {item.is_vendor_verified ? (
                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified MSME
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400">
                        ⭐ 4.9 (12+)
                      </span>
                    )}
                  </div>

                  {/* Title & Price */}
                  <div onClick={() => setSelectedItem(item)} className="cursor-pointer">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-base sm:text-lg font-black text-slate-900 font-heading mt-0.5">
                      ₦{Number(item.price).toLocaleString()}
                    </p>
                  </div>

                  {/* Category-Specific Component Chips */}
                  <div className="text-[10px] space-y-1.5 pt-1">
                    {/* PHYSICAL SPEC */}
                    {item.product_type === 'PHYSICAL' && (
                      <div className="flex flex-wrap gap-1.5 text-slate-600 font-bold">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                          📦 {item.stock_count && item.stock_count > 0 ? `${item.stock_count} in stock` : 'Available'}
                        </span>
                        {item.metadata?.brand && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                            🏷️ {item.metadata.brand}
                          </span>
                        )}
                      </div>
                    )}

                    {/* SERVICE SPEC */}
                    {item.product_type === 'SERVICE' && (
                      <div className="flex flex-wrap gap-1.5 text-purple-700 font-bold">
                        <span className="bg-purple-50 px-2 py-0.5 rounded-md">
                          ⏱️ {item.metadata?.duration || 'Fast Delivery'}
                        </span>
                        <span className="bg-purple-50 px-2 py-0.5 rounded-md">
                          💳 {item.metadata?.billingType || 'Fixed Quote'}
                        </span>
                      </div>
                    )}

                    {/* REAL ESTATE SPEC */}
                    {item.product_type === 'PROPERTY' && (
                      <div className="flex flex-wrap gap-1.5 text-emerald-700 font-bold">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded-md">
                          🛏️ {item.metadata?.bedrooms || 0} Beds
                        </span>
                        <span className="bg-emerald-50 px-2 py-0.5 rounded-md">
                          🛁 {item.metadata?.bathrooms || 0} Baths
                        </span>
                        {item.metadata?.propertyType && (
                          <span className="bg-emerald-50 px-2 py-0.5 rounded-md">
                            🏢 {item.metadata.propertyType}
                          </span>
                        )}
                      </div>
                    )}

                    {/* B2B COMPONENT SPEC */}
                    {item.product_type === 'B2B' && (
                      <div className="flex flex-wrap gap-1.5 text-amber-800 font-bold">
                        <span className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          📦 MOQ: {item.metadata?.moq || '10'} units
                        </span>
                        {item.category === 'LOGISTICS' && item.metadata?.vehicleType && (
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                            🚚 {item.metadata.vehicleType}
                          </span>
                        )}
                        {item.category === 'INFLUENCER' && item.metadata?.followers && (
                          <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md">
                            📣 {item.metadata.followers} Reach
                          </span>
                        )}
                        {item.metadata?.leadTime && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            ⏳ {item.metadata.leadTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1-Tap Quick Action Buttons on Card */}
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
                    {item.product_type === 'PHYSICAL' ? (
                      <button
                        onClick={() => {
                          onAddToCart && onAddToCart(item);
                          toast.success(`Added "${item.name}" to cart!`);
                        }}
                        className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-extrabold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Buy / Bag
                      </button>
                    ) : item.product_type === 'B2B' ? (
                      <button
                        onClick={() => setRfqItem(item)}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Package className="w-3.5 h-3.5" /> Request Quote
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>📋</span> Book / Inspect
                      </button>
                    )}

                    {/* Direct WhatsApp Quick Chat */}
                    <button
                      onClick={() => {
                        const whatsappNum = item.whatsapp_number || '2349064556107';
                        const text = encodeURIComponent(
                          `Hello! I saw your listing "${item.name}" (₦${Number(item.price).toLocaleString()}) on the SmartBiz Marketplace and would like to make an inquiry.`
                        );
                        window.open(`https://wa.me/${whatsappNum}?text=${text}`, '_blank');
                      }}
                      className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                      title="Chat directly on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {items.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md text-2xl">
               🌍
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-800">No Listings Found</h3>
              <p className="text-slate-400 max-w-md mx-auto text-xs leading-relaxed">
                No listings matching your current category or location filters. Try clearing your search or switching trade hubs.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedLocation('');
                setSearchQuery('');
              }}
              className="text-xs font-extrabold text-indigo-600 underline cursor-pointer"
            >
              Clear All Filters
            </button>
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
                    Submitting this RFQ logs the opportunity in the seller's CRM Lead Manager and opens their verified WhatsApp line with your exact specifications.
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

      {/* ── 8. Rich Item Detail Modal ── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl sm:rounded-[36px] shadow-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] z-10"
            >
               <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
               >
                 <X className="w-5 h-5" />
               </button>

               {/* Media Section */}
               <div className="w-full md:w-1/2 aspect-[4/3] md:aspect-auto bg-slate-100 relative">
                  {selectedItem.image_url ? (
                    <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ShoppingBag className="w-20 h-20" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl text-white">
                     <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Listed By</p>
                     <p className="font-extrabold text-sm">{selectedItem.brand_name || 'Verified Merchant'}</p>
                     {selectedItem.location && (
                       <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                         <MapPin className="w-3 h-3 text-indigo-400" /> {selectedItem.location}
                       </p>
                     )}
                  </div>
               </div>

               {/* Info Section */}
               <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col overflow-y-auto space-y-4">
                  <div className="space-y-1.5">
                     <div className="flex items-center gap-2">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                          {selectedItem.product_type}
                        </span>
                        {selectedItem.is_vendor_verified && (
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        )}
                     </div>
                     <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading leading-tight">{selectedItem.name}</h2>
                     <p className="text-2xl font-black text-slate-950 font-heading">₦{Number(selectedItem.price).toLocaleString()}</p>
                  </div>

                  <div className="space-y-4 text-xs">
                     <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">About This Listing</h4>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{selectedItem.description}</p>
                     </div>

                     {/* Specs Grid */}
                     <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Specifications</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {selectedItem.category && (
                            <div>
                              <span className="text-slate-400 font-medium block">Category:</span>
                              <strong className="text-slate-800">{selectedItem.category}</strong>
                            </div>
                          )}
                          {selectedItem.product_type === 'PHYSICAL' && selectedItem.metadata?.brand && (
                            <div>
                              <span className="text-slate-400 font-medium block">Brand:</span>
                              <strong className="text-slate-800">{selectedItem.metadata.brand}</strong>
                            </div>
                          )}
                          {selectedItem.product_type === 'B2B' && (
                            <div>
                              <span className="text-slate-400 font-medium block">Min Order (MOQ):</span>
                              <strong className="text-slate-800">{selectedItem.metadata?.moq || '10 units'}</strong>
                            </div>
                          )}
                          {selectedItem.product_type === 'PROPERTY' && (
                            <div>
                              <span className="text-slate-400 font-medium block">Rooms:</span>
                              <strong className="text-slate-800">{selectedItem.metadata?.bedrooms || 0} Bed / {selectedItem.metadata?.bathrooms || 0} Bath</strong>
                            </div>
                          )}
                          {selectedItem.product_type === 'SERVICE' && (
                            <div>
                              <span className="text-slate-400 font-medium block">Turnaround:</span>
                              <strong className="text-slate-800">{selectedItem.metadata?.duration || 'Flexible'}</strong>
                            </div>
                          )}
                        </div>
                     </div>
                  </div>

                  {/* Actions in Modal */}
                  <div className="mt-auto pt-4 flex items-center gap-3">
                     {selectedItem.product_type === 'PHYSICAL' ? (
                       <button 
                        onClick={() => {
                          onAddToCart && onAddToCart(selectedItem);
                          toast.success(`Added "${selectedItem.name}" to bag!`);
                          setSelectedItem(null);
                        }}
                        className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white py-3.5 rounded-xl font-extrabold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
                       >
                         Add to Shopping Bag
                       </button>
                     ) : selectedItem.product_type === 'B2B' ? (
                       <button 
                        onClick={() => {
                          setRfqItem(selectedItem);
                          setSelectedItem(null);
                        }}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl font-extrabold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
                       >
                         Request Bulk Quotation
                       </button>
                     ) : null}

                     <button 
                      onClick={() => {
                        const whatsappNum = selectedItem.whatsapp_number || '2349064556107';
                        const text = encodeURIComponent(
                          `Hello! I'm interested in your listing "${selectedItem.name}" (₦${Number(selectedItem.price).toLocaleString()}) on the SmartBiz Marketplace.`
                        );
                        window.open(`https://wa.me/${whatsappNum}?text=${text}`, '_blank');
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-extrabold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                     >
                       <MessageCircle className="w-4 h-4" /> WhatsApp Chat
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace;
