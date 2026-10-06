import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, ShieldCheck, MapPin, Phone, MessageCircle, 
  ExternalLink, ShoppingBag, Store, Award, Package, Sparkles
} from 'lucide-react';
import { UnifiedItem } from '../types';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface MerchantProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: {
    brand_name: string;
    brand_slug?: string;
    brand_logo?: string;
    brand_niche?: string;
    brand_address?: string;
    cac_number?: string;
    smedan_number?: string;
    corporate_entity_type?: string;
    trust_badge_text?: string;
    is_vendor_verified?: boolean;
    whatsapp_number?: string;
    location?: string;
  } | null;
  onAddToCart?: (item: UnifiedItem) => void;
  onSelectItem?: (item: UnifiedItem) => void;
}

export const MerchantProfileDrawer: React.FC<MerchantProfileDrawerProps> = ({
  isOpen,
  onClose,
  merchant,
  onAddToCart,
  onSelectItem,
}) => {
  const [merchantItems, setMerchantItems] = useState<UnifiedItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    if (isOpen && merchant?.brand_slug) {
      fetchMerchantListings(merchant.brand_slug);
    } else if (isOpen && merchant?.brand_name) {
      // Fallback search by brand name
      fetchMerchantListingsByName(merchant.brand_name);
    } else {
      setMerchantItems([]);
    }
  }, [isOpen, merchant]);

  const fetchMerchantListings = async (slug: string) => {
    setIsLoadingItems(true);
    try {
      const response = await api.get(`/api/marketplace/products/u/${slug}/`);
      setMerchantItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.warn('Could not fetch merchant products by slug, falling back to global search:', err);
      fetchMerchantListingsByName(merchant?.brand_name || '');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const fetchMerchantListingsByName = async (brandName: string) => {
    if (!brandName) return;
    setIsLoadingItems(true);
    try {
      const response = await api.get('/api/marketplace/global/', {
        params: { search: brandName }
      });
      const filtered = Array.isArray(response.data) 
        ? response.data.filter((item: UnifiedItem) => 
            (item.brand_name || '').toLowerCase() === brandName.toLowerCase()
          )
        : [];
      setMerchantItems(filtered);
    } catch (err) {
      console.error('Failed to load merchant listings:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  if (!isOpen || !merchant) return null;

  const rawPhone = merchant.whatsapp_number || '2349064556107';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('0') && cleanPhone.length === 11 
    ? '234' + cleanPhone.slice(1) 
    : cleanPhone.startsWith('234') ? cleanPhone : '234' + cleanPhone;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-lg font-black text-indigo-300">
                  {merchant.brand_logo ? (
                    <img src={merchant.brand_logo} alt={merchant.brand_name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Store className="w-5 h-5 text-indigo-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-extrabold line-clamp-1">{merchant.brand_name}</h2>
                  <p className="text-[10px] text-slate-300 font-medium">Verified Nigerian MSME Profile</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Trust & Verification Card */}
              <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-slate-50 border border-indigo-100/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Business Credibility Audit</span>
                  </div>
                  {merchant.is_vendor_verified ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wide">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                    </span>
                  ) : (
                    <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Registered
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50/60">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">CAC Entity</span>
                    <strong className="text-slate-800 font-extrabold text-[10px] block truncate">
                      {merchant.cac_number ? `RC: ${merchant.cac_number}` : (merchant.corporate_entity_type || 'Registered BN')}
                    </strong>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-50/60">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">SMEDAN Status</span>
                    <strong className="text-slate-800 font-extrabold text-[10px] block truncate">
                      {merchant.smedan_number ? `SMEDAN: ${merchant.smedan_number}` : 'MSME Certified'}
                    </strong>
                  </div>
                </div>

                {(merchant.brand_address || merchant.location) && (
                  <div className="flex items-start gap-2 text-xs text-slate-600 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium leading-relaxed">
                      {merchant.brand_address || merchant.location}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: WhatsApp & Direct Storefront */}
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${merchant.brand_name}! I found your business profile on the SmartBiz Nigerian Market Square and would like to make an inquiry.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer text-center"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp Chat
                </a>

                {merchant.brand_slug ? (
                  <a
                    href={`/store/${merchant.brand_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Visit Storefront
                  </a>
                ) : (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer text-center"
                  >
                    <Phone className="w-3.5 h-3.5" /> Direct Call
                  </a>
                )}
              </div>

              {/* Showcase Listings Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                    Showcase Catalog ({merchantItems.length})
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">Available Nationwide</span>
                </div>

                {isLoadingItems ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Loading merchant showcase...</p>
                  </div>
                ) : merchantItems.length > 0 ? (
                  <div className="space-y-2.5">
                    {merchantItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 shadow-sm transition-all group"
                      >
                        <div 
                          onClick={() => onSelectItem && onSelectItem(item)}
                          className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer"
                        >
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div 
                          onClick={() => onSelectItem && onSelectItem(item)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <h4 className="text-xs font-extrabold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {item.name}
                          </h4>
                          <p className="text-xs font-black text-slate-900 font-heading mt-0.5">
                            ₦{Number(item.price).toLocaleString()}
                          </p>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {item.product_type === 'PHYSICAL' ? '🛍️ Retail Good' : item.product_type === 'SERVICE' ? '🛠️ Service' : '📦 B2B'}
                          </span>
                        </div>

                        {item.product_type === 'PHYSICAL' && onAddToCart && (
                          <button
                            onClick={() => {
                              onAddToCart(item);
                              toast.success(`Added "${item.name}" to cart!`);
                            }}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white transition-colors cursor-pointer shrink-0"
                            title="Add to Cart"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">No additional listings found for this merchant.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> SmartBiz Verified Commerce
              </span>
              <button
                onClick={onClose}
                className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
