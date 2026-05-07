import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, ShoppingBag, ShieldCheck, Globe, ArrowRight, Star, Heart, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandIdentity } from '../types';
import api from '../services/api';

// Inline SVG replacements for brand icons removed from lucide-react v1.x
const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
  </svg>
);

const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const PublicStorefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await api.get(`/api/brand/u/${slug}/`);
        setBrand(response.data);
      } catch (err) {
        setError('Store not found or moved.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrand();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-slate-800 mb-4">404</h1>
        <p className="text-slate-500 mb-8 max-w-md">{error}</p>
        <Link to="/" className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">
          Back to SmartBiz
        </Link>
      </div>
    );
  }

  // Dynamic Styles based on Brand Identity
  const primaryColor = brand.colors?.primary || '#4f46e5';
  const accentColor = brand.colors?.accent || '#f59e0b';
  const headingFont = brand.fonts?.primary || 'Inter';

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-20 selection:bg-indigo-100">
      {/* Dynamic Header / Hero */}
      <header className="relative py-16 px-6 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ background: `radial-gradient(circle at top right, ${primaryColor}, transparent)` }}
        ></div>
        
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          {/* Logo */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-[40px] shadow-2xl p-1 bg-white border-2 overflow-hidden"
            style={{ borderColor: primaryColor }}
          >
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.businessName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-3xl font-black text-slate-300">
                {brand.businessName.charAt(0)}
              </div>
            )}
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: headingFont }}>
              {brand.businessName}
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
              {brand.socialBio}
            </p>
          </div>

          {/* Social Proof Badges */}
          <div className="flex flex-wrap justify-center gap-3">
             <span className="bg-slate-100 px-4 py-2 rounded-full text-xs font-bold text-slate-500 flex items-center gap-2">
               <ShieldCheck className="w-3.5 h-3.5" style={{ color: primaryColor }} /> {brand.trustBadgeText || 'Verified Merchant'}
             </span>
             <span className="bg-slate-100 px-4 py-2 rounded-full text-xs font-bold text-slate-500 flex items-center gap-2">
               <Star className="w-3.5 h-3.5 text-amber-500" /> 4.9 (50+ Reviews)
             </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-6 space-y-12">
        {/* Call to Action Buttons (The "Link-in-Bio" Core) */}
        <div className="space-y-4">
           <a 
            href={`https://wa.me/?text=Hi ${brand.businessName}, I saw your store on SmartBiz and I'm interested in your services!`}
            target="_blank"
            className="group flex items-center justify-between p-5 rounded-3xl text-white shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95"
            style={{ backgroundColor: primaryColor }}
           >
             <div className="flex items-center gap-4">
               <div className="bg-white/20 p-2.5 rounded-2xl">
                 <MessageCircle className="w-6 h-6" />
               </div>
               <div>
                 <p className="font-bold">Chat on WhatsApp</p>
                 <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">Fastest Reply</p>
               </div>
             </div>
             <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-all" />
           </a>

           <button 
            className="group flex items-center justify-between p-5 rounded-3xl bg-white border-2 border-slate-100 text-slate-800 transition-all hover:border-slate-300 hover:-translate-y-1 active:scale-95 shadow-sm"
           >
             <div className="flex items-center gap-4">
               <div className="bg-slate-50 p-2.5 rounded-2xl">
                 <ShoppingBag className="w-6 h-6 text-slate-400" />
               </div>
               <div>
                 <p className="font-bold">View Product Catalog</p>
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Explore Items</p>
               </div>
             </div>
             <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900" />
           </button>
        </div>

        {/* Business Policy / Info Section */}
        <section className="bg-slate-50 rounded-[40px] p-8 space-y-6">
           <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Our Policies</h3>
           <div className="grid grid-cols-1 gap-6">
              <div className="flex gap-4">
                <div className="mt-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{brand.policies?.payment || 'Flexible payment options available.'}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></div></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{brand.policies?.delivery || 'Fast shipping across Nigeria.'}</p>
                </div>
              </div>
           </div>
        </section>

        {/* Footer */}
        <footer className="text-center space-y-6 pb-12">
           <div className="flex justify-center gap-6">
              <InstagramIcon className="w-5 h-5 text-slate-400 hover:text-pink-500 transition-colors cursor-pointer" />
              <TwitterIcon className="w-5 h-5 text-slate-400 hover:text-sky-500 transition-colors cursor-pointer" />
              <Globe className="w-5 h-5 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer" />
           </div>
           
           <div className="pt-8 border-t border-slate-100">
             <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-slate-400 transition-all group">
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Powered by</span>
               <div className="bg-slate-100 px-3 py-1 rounded-lg text-slate-800 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">SmartBiz</div>
             </Link>
           </div>
        </footer>
      </main>

      {/* Floating Sticky Note */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white shadow-2xl rounded-3xl p-4 border border-slate-100 flex items-center gap-4 z-50"
      >
        <div className="bg-indigo-100 p-3 rounded-2xl">
          <Heart className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Support this business!</p>
          <p className="text-[10px] text-slate-400">Share this store with your friends</p>
        </div>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
          }}
          className="ml-auto bg-slate-900 text-white p-2 rounded-xl"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
};

const Share2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
);

export default PublicStorefront;
