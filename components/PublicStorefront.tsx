import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, ShoppingBag, ShieldCheck, Globe, ArrowRight, Star, Heart, MapPin, Phone, Clock, ShoppingCart, Plus, Minus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandIdentity } from '../types';
import api from '../services/api';
import { toast } from 'react-hot-toast';

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
  const isTractionMode = localStorage.getItem('sb_idice_traction_mode') === 'true';

  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart & Checkout State
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let brandData, productsData;
        
        if (slug) {
          const [brandRes, productsRes] = await Promise.all([
            api.get(`/api/brand/u/${slug}/`),
            api.get(`/api/marketplace/products/u/${slug}/`)
          ]);
          brandData = brandRes.data;
          productsData = productsRes.data;
        } else {
          // Preview mode for currently logged-in user
          const [brandRes, productsRes] = await Promise.all([
            api.get('/api/brand/'),
            api.get('/api/marketplace/products/')
          ]);
          brandData = Array.isArray(brandRes.data) ? brandRes.data[0] : brandRes.data;
          productsData = productsRes.data;
        }

        const mockBrand: BrandIdentity = {
          businessName: 'SmartBiz Coach Solutions Ltd',
          niche: 'Consulting',
          vibe: 'Corporate',
          socialBio: 'We provide premium business consultation, logistics dispatch scheduling, and wholesale fabric sourcing for SMEs across Nigeria.',
          colors: { primary: '#0f766e', secondary: '#1e293b', accent: '#f59e0b' },
          fonts: { primary: 'Inter', secondary: 'Inter' },
          logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
          whatsapp: '08123456789',
          phone: '08123456789',
          email: 'admin@smartbizcoach.com.ng',
          location: 'Block 10, Yaba Industrial Estate, Lagos',
          taglines: ['Empowering Nigerian Businesses with Audited Technology'],
          tin: 'TIN-9284102-001',
          cacNumber: 'RC-1849204',
          brandVoice: 'Professional',
          targetAudience: 'SMEs',
          logoPrompt: 'Professional consulting logo',
          whatsappGreeting: 'Hi there!',
          elevatorPitch: 'Elevator pitch',
          trustBadgeText: 'SmartBiz Verified SME',
          policies: {
            payment: 'We accept Paystack secure online cards, bank transfers, and mobile money.',
            delivery: 'Nationwide dispatch shipping via GIG Logistics or pickup at our Yaba office.',
            refund: 'No refunds on services; 7-day returns on physical fabrics.'
          },
          whatsappContent: {
            stickerIdeas: [],
            statusTemplates: [],
            quickReplies: [],
            broadcastMessages: []
          },
          packaging: {
            thankYouNote: 'Thank you for supporting our business!',
            unboxingTip: 'Unbox with care.'
          }
        };

        const finalBrand = brandData || (isTractionMode ? mockBrand : null);
        const finalProducts = Array.isArray(productsData) && productsData.length > 0 
          ? productsData 
          : (isTractionMode ? [
              { id: 101, name: "Premium Ankara Textile - 6 Yards", price: "12500.00", product_type: "PHYSICAL", description: "Premium cotton African print fabric, suitable for all types of traditional outfits.", image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff", stock_count: 240 },
              { id: 102, name: "Logistics Dispatch Delivery Run", price: "3500.00", product_type: "SERVICE", description: "Intra-city dispatch logistics delivery within Lagos mainland.", image_url: "", stock_count: 150 },
              { id: 103, name: "Warehouse Storage Unit - 100sqm", price: "250000.00", product_type: "B2B", description: "Secure, dry, and easily accessible warehouse storage unit located in Ikeja.", image_url: "", stock_count: 3 }
            ] : []);

        if (!finalBrand) {
          setError('Store not found or moved.');
        } else {
          setBrand(finalBrand);
          setProducts(finalProducts);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Store not found or moved.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug, isTractionMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
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

  // Cart actions
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart!`);
  };

  const updateCartQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
    }
  };

  const getCartTotal = () => {
    return cart.reduce((acc, item) => acc + (parseFloat(item.product.price) * item.quantity), 0);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsPlacingOrder(true);
    const cartTotal = getCartTotal();

    // 1. Log order leads in backend
    try {
      for (const item of cart) {
        await api.post('/api/marketplace/leads/', {
          product: item.product.id,
          customer_name: checkoutForm.name,
          customer_contact: checkoutForm.phone,
          message: `Direct Checkout Order:\nQty: ${item.quantity}\nAddress: ${checkoutForm.address}\nNotes: ${checkoutForm.notes}`,
          lead_type: 'ORDER',
          quoted_price: (parseFloat(item.product.price) * item.quantity).toFixed(2)
        });
      }
    } catch (err) {
      console.error('Failed to save order leads', err);
    }

    // 2. Open WhatsApp prefilled message
    let orderText = `Hi ${brand.businessName}, I would like to place an order:\n\n`;
    cart.forEach(item => {
      orderText += `▪️ ${item.product.name} x${item.quantity} - ₦${(parseFloat(item.product.price) * item.quantity).toLocaleString()}\n`;
    });
    orderText += `\n💵 *Total:* ₦${cartTotal.toLocaleString()}\n`;
    orderText += `\n👤 *Customer Details:*\nName: ${checkoutForm.name}\nPhone: ${checkoutForm.phone}\nAddress: ${checkoutForm.address}\nNotes: ${checkoutForm.notes}`;

    setIsPlacingOrder(false);
    setShowCartModal(false);
    setCart([]);
    toast.success('Order placed! Redirecting to WhatsApp...');
    window.open(`https://wa.me/${brand.whatsapp || brand.phone || ''}?text=${encodeURIComponent(orderText)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-20 selection:bg-indigo-100 relative">
      {/* Brand cover Banner */}
      <div 
        className="w-full h-48 md:h-64 relative overflow-hidden bg-cover bg-center shadow-inner"
        style={{ 
          backgroundColor: primaryColor,
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4))`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
      </div>

      {/* Profile Header */}
      <header className="relative -mt-20 px-6 pb-8 border-b border-slate-100 bg-white shadow-sm rounded-t-[32px] max-w-4xl mx-auto z-10">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo container */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 rounded-[36px] shadow-2xl p-1 bg-white border-4 overflow-hidden -mt-14"
            style={{ borderColor: primaryColor }}
          >
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.businessName || 'Business'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-2xl font-black text-slate-350">
                {(brand.businessName || 'B').charAt(0)}
              </div>
            )}
          </motion.div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: headingFont }}>
              {brand.businessName}
            </h1>
            {brand.taglines && brand.taglines.length > 0 && (
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{brand.taglines[0]}</p>
            )}
            <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
              {brand.socialBio}
            </p>
          </div>

          {/* Verification Trust Badges */}
          <div className="flex flex-wrap justify-center gap-2">
             {brand.cacNumber && (
               <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-indigo-700 border border-indigo-150 flex items-center gap-1.5 uppercase tracking-wider">
                 <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> CAC: {brand.cacNumber}
               </span>
             )}
             {brand.tin && (
               <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-650 border border-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                 TIN: {brand.tin}
               </span>
             )}
             <span className="bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black text-emerald-700 border border-emerald-150 flex items-center gap-1.5 uppercase tracking-wider">
               <Check className="w-3.5 h-3.5 text-emerald-600" /> SmartBiz Verified
             </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Sidebar: Business info cards */}
        <div className="md:col-span-1 space-y-6">
          {/* Operations Hours */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-455" /> Opening Hours
            </h3>
            <div className="space-y-2 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span>Mon - Fri</span>
                <span className="font-bold text-slate-800">8:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span className="font-bold text-slate-800">9:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="font-semibold text-rose-500">Closed</span>
              </div>
            </div>
          </div>

          {/* Contact widget */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-455" /> Contact Details
            </h3>
            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <span>📞</span>
                <span>{brand.phone || 'No phone listed'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✉️</span>
                <span>{brand.email || 'No email listed'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>{brand.location || 'No physical office'}</span>
              </div>
            </div>
            
            <a 
              href={`https://wa.me/${brand.whatsapp || brand.phone || ''}?text=${encodeURIComponent(`Hi ${brand.businessName}, I saw your store on SmartBiz and I'm interested in your services!`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black tracking-wide shadow-md transition-all active:scale-98"
            >
              <MessageCircle className="w-4 h-4" /> Message Merchant
            </a>
          </div>
        </div>

        {/* Right Main Panel: Product Catalog */}
        <div className="md:col-span-2 space-y-12">
          {['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B'].map(type => {
            const typeProducts = products.filter(p => p.product_type === type);
            if (typeProducts.length === 0) return null;

            return (
              <section key={type} className="space-y-6">
                 <div className="flex justify-between items-end border-b border-slate-150 pb-3">
                    <div>
                      <h3 className="text-xl font-black text-slate-800" style={{ fontFamily: headingFont }}>
                        {type === 'PHYSICAL' && 'Our Collection'}
                        {type === 'SERVICE' && 'Professional Services'}
                        {type === 'PROPERTY' && 'Real Estate & Properties'}
                        {type === 'B2B' && 'Wholesale & B2B'}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {type === 'PHYSICAL' && 'Premium retail products'}
                        {type === 'SERVICE' && 'Expert solutions for you'}
                        {type === 'PROPERTY' && 'Discover your next space'}
                        {type === 'B2B' && 'Bulk deals and partnerships'}
                      </p>
                    </div>
                    <ShoppingBag className="w-5 h-5 text-slate-300" />
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in">
                    {typeProducts.map((product) => (
                      <motion.div 
                        key={product.id}
                        whileHover={{ y: -4 }}
                        className="group bg-white rounded-3xl overflow-hidden border border-slate-100 flex flex-col transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="aspect-[4/3] relative overflow-hidden bg-slate-50">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-12 h-12 text-slate-200" />
                            </div>
                          )}
                          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg flex justify-between items-center z-10">
                            <span className="text-xs font-black text-slate-800">₦{parseFloat(product.price).toLocaleString()}</span>
                            {product.location && (
                              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-0.5">
                                <MapPin className="w-2 h-2" /> {product.location.slice(0, 15)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5 mb-4">
                            <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{product.name}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-normal">{product.description}</p>
                          </div>
                          
                          <button 
                            onClick={() => addToCart(product)}
                            className="w-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider py-3.5 rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Add to Order Cart
                          </button>
                        </div>
                      </motion.div>
                    ))}
                 </div>
              </section>
            );
          })}

          {products.length === 0 && (
            <div className="bg-white rounded-[40px] p-20 text-center space-y-6 border border-slate-100 shadow-sm">
               <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto" />
               <div className="space-y-2">
                 <p className="text-lg font-black text-slate-850">No Listings Yet</p>
                 <p className="text-xs font-medium text-slate-450">This business catalog is currently empty. Check back later!</p>
               </div>
            </div>
          )}

          {/* Trust Policies */}
          <section className="bg-slate-900 rounded-[36px] p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full -mr-10 -mt-10 opacity-60"></div>
             <h3 className="font-black text-indigo-400 uppercase tracking-widest text-[10px]">Merchant Commitment</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Security</p>
                  <p className="text-xs text-slate-350 leading-relaxed font-medium">{brand.policies?.payment || 'Multiple secure payment options available.'}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch & Delivery</p>
                  <p className="text-xs text-slate-355 leading-relaxed font-medium">{brand.policies?.delivery || 'Efficient shipping to your doorstep.'}</p>
                </div>
             </div>
          </section>
        </div>
      </main>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <motion.button 
          onClick={() => setShowCartModal(true)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center z-45 border-4 border-white"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">
            {cart.length}
          </span>
        </motion.button>
      )}

      {/* Cart & Checkout Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 font-heading text-lg">Checkout Cart</h3>
                <p className="text-[10px] text-slate-400">Review items & request payment link</p>
              </div>
              <button onClick={() => setShowCartModal(false)} className="p-2 hover:bg-slate-50 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-2 space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center py-2">
                  <div className="max-w-[60%]">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.product.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold">₦{parseFloat(item.product.price).toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                      className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                      className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-semibold">Total Order Cost</span>
              <span className="text-sm font-black text-indigo-650">₦{getCartTotal().toLocaleString()}</span>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Customer Profile</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase ml-1">Full Name *</label>
                  <input 
                    required
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                    placeholder="e.g. Meshach"
                    value={checkoutForm.name}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450 uppercase ml-1">Phone Number *</label>
                  <input 
                    required
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                    placeholder="e.g. 08012345678"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 uppercase ml-1">Delivery Address *</label>
                <input 
                  required
                  type="text"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500"
                  placeholder="e.g. 15 Herbert Macaulay Way, Yaba, Lagos"
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 uppercase ml-1">Order Notes / Specifications</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500 resize-none"
                  rows={2}
                  placeholder="e.g. Preferred delivery time, size/color adjustments..."
                  value={checkoutForm.notes}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                />
              </div>

              <button 
                type="submit"
                disabled={isPlacingOrder}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-98"
              >
                <MessageCircle className="w-4 h-4" /> Place Order via WhatsApp Checkout
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicStorefront;
