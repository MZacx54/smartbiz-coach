import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, ShoppingBag, ShieldCheck, Globe, ArrowRight, Star, Heart, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandIdentity } from '../types';
import api from '../services/api';

// Inline SVG replacements for brand icons
const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
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
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandRes, productsRes] = await Promise.all([
          api.get(`/api/brand/u/${slug}/`),
          api.get(`/api/marketplace/products/u/${slug}/`)
        ]);
        setBrand(brandRes.data);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Store not found or moved.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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

  const primaryColor = brand.colors?.primary || '#4f46e5';
  const accentColor = brand.colors?.accent || '#f59e0b';
  const headingFont = brand.fonts?.primary || 'Inter';

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-20 selection:bg-indigo-100">
      {/* Dynamic Header */}
      <header className="relative py-16 px-6 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ background: `radial-gradient(circle at top right, ${primaryColor}, transparent)` }}
        ></div>
        
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-[40px] shadow-2xl p-1 bg-white border-2 overflow-hidden"
            style={{ borderColor: primaryColor }}
          >
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.businessName || 'Business'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-3xl font-black text-slate-300">
                {(brand.businessName || 'B').charAt(0)}
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
      <main className="max-w-4xl mx-auto px-6 space-y-20">
        {/* Contact Links */}
        <div className="max-w-xl mx-auto space-y-4">
           <a 
            href={`https://wa.me/?text=${encodeURIComponent(`Hi ${brand.businessName || 'there'}, I saw your store on SmartBiz and I'm interested in your services!`)}`}
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
        </div>

        {/* Catalog Sections */}
        {['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B'].map(type => {
          const typeProducts = products.filter(p => p.product_type === type);
          if (typeProducts.length === 0) return null;

          return (
            <section key={type} className="space-y-10">
               <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800" style={{ fontFamily: headingFont }}>
                      {type === 'PHYSICAL' && 'Our Collection'}
                      {type === 'SERVICE' && 'Professional Services'}
                      {type === 'PROPERTY' && 'Real Estate & Properties'}
                      {type === 'B2B' && 'Wholesale & B2B'}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {type === 'PHYSICAL' && 'Premium retail products'}
                      {type === 'SERVICE' && 'Expert solutions for you'}
                      {type === 'PROPERTY' && 'Discover your next space'}
                      {type === 'B2B' && 'Bulk deals and partnerships'}
                    </p>
                  </div>
                  <ShoppingBag className="w-6 h-6 text-slate-200" />
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  {typeProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      whileHover={{ y: -8 }}
                      className="group bg-slate-50/30 rounded-[40px] overflow-hidden border border-slate-100 flex flex-col transition-all"
                    >
                      <div className="aspect-[4/5] relative overflow-hidden bg-slate-100">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-16 h-16 text-slate-200" />
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg flex justify-between items-center">
                          <span className="text-xs font-black text-slate-800">₦{parseFloat(product.price).toLocaleString()}</span>
                          {product.location && <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-0.5"><MapPin className="w-2 h-2" /> {product.location}</span>}
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="font-bold text-base text-slate-800 mb-2 line-clamp-1">{product.name}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-6 flex-1 leading-relaxed">{product.description}</p>
                        <button 
                          onClick={async () => {
                            // 1. Log the lead in the backend
                            try {
                              await api.post('/api/marketplace/leads/', {
                                product: product.id,
                                customer_name: 'Store Visitor',
                                customer_contact: 'WhatsApp',
                                message: `Interested in ${product.name} from public storefront.`,
                                lead_type: product.product_type === 'B2B' ? 'B2B' : product.product_type === 'PHYSICAL' ? 'ORDER' : 'INQUIRY'
                              });
                            } catch (err) {
                              console.error('Failed to log lead', err);
                            }

                            // 2. Open WhatsApp for immediate conversion
                            const message = `Hi ${brand.businessName}, I'm interested in "${product.name}" (₦${parseFloat(product.price).toLocaleString()}) from your store!`;
                            window.open(`https://wa.me/${brand.phone || ''}?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="w-full bg-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" /> 
                          {type === 'PHYSICAL' ? 'Order Now' : type === 'SERVICE' ? 'Hire Pro' : 'Inquire'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
               </div>
            </section>
          );
        })}

        {products.length === 0 && (
          <div className="bg-slate-50 rounded-[40px] p-20 text-center space-y-6 border-2 border-dashed border-slate-200">
             <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto" />
             <div className="space-y-2">
               <p className="text-lg font-black text-slate-800">No Products Yet</p>
               <p className="text-sm font-medium text-slate-400">The business catalog is being updated. Check back soon!</p>
             </div>
          </div>
        )}
on>

        {/* Policies */}
        <section className="bg-slate-50 rounded-[50px] p-12 space-y-8">
           <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Our Commitment</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="flex gap-6">
                <div className="mt-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }}></div></div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secure Payment</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{brand.policies?.payment || 'Multiple secure payment options available.'}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="mt-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></div></div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fast Delivery</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{brand.policies?.delivery || 'Efficient shipping to your doorstep.'}</p>
                </div>
              </div>
           </div>
        </section>

        {/* Footer */}
        <footer className="text-center space-y-8 pb-12">
           <div className="flex justify-center gap-8">
              <InstagramIcon className="w-6 h-6 text-slate-300 hover:text-pink-500 transition-colors cursor-pointer" />
              <TwitterIcon className="w-6 h-6 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer" />
              <Globe className="w-6 h-6 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer" />
           </div>
           
           <div className="pt-12 border-t border-slate-100 flex flex-col items-center gap-4">
             <Link to="/" className="inline-flex items-center gap-3 text-slate-300 hover:text-slate-400 transition-all group">
               <span className="text-[11px] font-black uppercase tracking-[0.3em]">Built with</span>
               <div className="bg-slate-100 px-4 py-1.5 rounded-xl text-slate-800 font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">SmartBiz Coach</div>
             </Link>
           </div>
        </footer>
      </main>

      {/* Floating Share */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-80 bg-white shadow-2xl rounded-[32px] p-5 border border-slate-100 flex items-center gap-4 z-50"
      >
        <div className="bg-indigo-50 p-4 rounded-2xl">
          <Heart className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-black text-slate-800">Support MSMEs!</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Share this store link</p>
        </div>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
          }}
          className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-indigo-600 transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
        </button>
      </motion.div>
    </div>
  );
};

export default PublicStorefront;
