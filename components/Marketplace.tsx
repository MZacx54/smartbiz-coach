import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Filter, MapPin, Star, ArrowRight, Tag, ShieldCheck, Zap, Home, Briefcase, Globe, X } from 'lucide-react';
import { UnifiedItem, User } from '../types';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface MarketplaceProps {
  onAddToCart?: (item: UnifiedItem) => void;
  currentUser?: User;
  initialType?: 'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B';
}

const Marketplace: React.FC<MarketplaceProps> = ({ onAddToCart, initialType = 'PHYSICAL' }) => {
  const [activeTab, setActiveTab] = useState<'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B'>(initialType);
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/marketplace/global/', {
        params: { 
          product_type: activeTab, 
          search: searchQuery,
          category: selectedCategory 
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
    // Reset category filter when switching tabs
    setSelectedCategory('');
    fetchItems();
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Premium Hero (Compact & Elegant) */}
      <section className="relative rounded-[32px] overflow-hidden bg-slate-900 text-white p-8 md:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl space-y-5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified MSME Network
             </div>
             <h1 className="text-3xl md:text-5xl font-black font-heading tracking-tight leading-tight">
               The <span className="text-indigo-400">Unified</span> Market Square
             </h1>
             <p className="text-slate-400 text-sm md:text-base max-w-xl mt-3 leading-relaxed">
               Discover verified products, B2B wholesale listings, and professional service offers from Nigeria's top emerging brands.
             </p>
          </motion.div>
 
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, services, or locations..."
                className="w-full bg-white/10 backdrop-blur-md border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all shadow-xl"
              />
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Unified Navigation Tabs */}
      <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-2xl border border-slate-200 p-2 rounded-[32px] shadow-2xl shadow-slate-200/50 flex flex-wrap items-center justify-center gap-2">
        {(['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`flex items-center gap-2.5 px-8 py-4 rounded-2xl text-xs font-black transition-all ${
              activeTab === type 
                ? 'bg-slate-900 text-white shadow-xl scale-105' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            {type === 'PHYSICAL' && <ShoppingBag className="w-4 h-4" />}
            {type === 'SERVICE' && <Briefcase className="w-4 h-4" />}
            {type === 'PROPERTY' && <Home className="w-4 h-4" />}
            {type === 'B2B' && <Zap className="w-4 h-4" />}
            {type === 'PHYSICAL' ? 'Shop' : type === 'SERVICE' ? 'Services' : type === 'PROPERTY' ? 'Real Estate' : 'B2B Hub'}
          </button>
        ))}
      </div>

      {/* Category Pills (For B2B listings) */}
      {activeTab === 'B2B' && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 animate-in fade-in">
          {[
            { value: '', label: 'All B2B' },
            { value: 'LOGISTICS', label: '🚚 Logistics & Dispatch' },
            { value: 'WHOLESALE', label: '📦 Wholesale Suppliers' },
            { value: 'INFLUENCER', label: '📣 Micro-Influencers' },
            { value: 'SERVICES', label: '💼 Business Services' },
            { value: 'RAW_MATERIALS', label: '🏭 Raw Materials' },
          ].map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                selectedCategory === cat.value
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-650'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setSelectedItem(item)}
              className="group bg-white rounded-[40px] border border-slate-100 overflow-hidden hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer flex flex-col h-full"
            >
              <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <ShoppingBag className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute top-6 left-6 flex gap-2">
                   <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                      {item.category}
                   </div>
                   {item.location && (
                     <div className="bg-indigo-600/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-sm flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {item.location}
                     </div>
                   )}
                </div>
              </div>

              <div className="p-8 flex flex-col flex-1 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{item.brand_name || 'Verified Partner'}</p>
                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors leading-tight">{item.name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 font-heading">₦{item.price.toLocaleString()}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
                   <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-black text-slate-700">4.9</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase ml-1 tracking-tighter">12+ Reviews</span>
                   </div>
                   <button className="flex items-center justify-center w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <ArrowRight className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && !isLoading && (
          <div className="col-span-full py-32 text-center space-y-6 bg-slate-50 rounded-[64px] border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
               <Globe className="w-10 h-10 text-slate-200 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800">No Listings Found</h3>
              <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">We couldn't find any verified listings matching your current filters. Try adjusting your search or switching categories.</p>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[48px] shadow-3xl overflow-hidden flex flex-col md:flex-row"
            >
               <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/20 backdrop-blur-md text-white md:text-slate-400 md:bg-slate-50 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
               >
                 <X className="w-6 h-6" />
               </button>

               {/* Media Section */}
               <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-slate-100 relative">
                  {selectedItem.image_url ? (
                    <img src={selectedItem.image_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-24 h-24 text-slate-200" /></div>
                  )}
                  <div className="absolute bottom-10 left-10 right-10 flex gap-4">
                     <div className="flex-1 bg-white/20 backdrop-blur-md border border-white/30 p-4 rounded-3xl text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Listed By</p>
                        <p className="font-bold">{selectedItem.brand_name || 'Verified Vendor'}</p>
                     </div>
                  </div>
               </div>

               {/* Info Section */}
               <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col overflow-y-auto max-h-[80vh] md:max-h-none">
                  <div className="space-y-2 mb-8">
                     <div className="flex items-center gap-2">
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{selectedItem.product_type}</span>
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">In Stock</span>
                     </div>
                     <h2 className="text-4xl font-black text-slate-800 font-heading leading-tight">{selectedItem.name}</h2>
                     <p className="text-3xl font-black text-indigo-600">₦{selectedItem.price.toLocaleString()}</p>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</h4>
                        <p className="text-slate-600 leading-relaxed">{selectedItem.description}</p>
                     </div>

                     {/* Type Specific Metadata */}
                     {selectedItem.product_type === 'PROPERTY' && (
                       <div className="grid grid-cols-2 gap-4">
                          {Object.entries(selectedItem.metadata || {}).map(([k, v]) => (
                            <div key={k} className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-1">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{k}</span>
                               <span className="text-lg font-bold text-slate-800">{String(v)}</span>
                            </div>
                          ))}
                       </div>
                     )}

                     {selectedItem.product_type === 'SERVICE' && (
                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                           <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-indigo-600" />
                              <p className="text-sm font-bold text-indigo-900">Professional Service Guarantee</p>
                           </div>
                           <p className="text-xs text-indigo-700 leading-relaxed">This service is delivered by a vetted professional on the SmartBiz network. Quality assurance and timely delivery guaranteed.</p>
                        </div>
                     )}
                  </div>

                  <div className="mt-auto pt-10 flex gap-4">
                     {selectedItem.product_type === 'PHYSICAL' ? (
                       <button 
                        onClick={() => {
                          onAddToCart && onAddToCart(selectedItem);
                          setSelectedItem(null);
                        }}
                        className="flex-1 bg-slate-900 text-white py-5 rounded-[24px] font-black hover:bg-indigo-600 transition-all shadow-2xl active:scale-95"
                       >
                         Add to Bag
                       </button>
                     ) : (
                       <button 
                        onClick={async () => {
                          try {
                            await api.post('/api/marketplace/leads/', {
                              product: selectedItem.id,
                              customer_name: 'Visitor', // In a real app, this would be from a form
                              customer_contact: 'WhatsApp',
                              message: `I am interested in ${selectedItem.name}.`,
                              lead_type: selectedItem.product_type === 'B2B' ? 'B2B' : 'INQUIRY'
                            });
                            toast.success('Inquiry sent! The vendor will contact you.');
                            setSelectedItem(null);
                          } catch (err) {
                            toast.error('Failed to send inquiry');
                          }
                        }}
                        className="flex-1 bg-indigo-600 text-white py-5 rounded-[24px] font-black hover:bg-indigo-700 transition-all shadow-2xl active:scale-95"
                       >
                         {selectedItem.product_type === 'SERVICE' ? 'Hire Professional' : 'Request Inspection'}
                       </button>
                     )}
                     <button className="w-16 h-16 bg-slate-50 text-slate-400 rounded-[24px] flex items-center justify-center hover:bg-slate-100 transition-all">
                        <Tag className="w-6 h-6" />
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
