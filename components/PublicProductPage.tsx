import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { commerceService, productShareUrl } from '../services/commerceService';
import { NIGERIAN_STATES } from '../config/nigeriaStates';
import { useWishlist } from '../hooks/useWishlist';
import ReviewsSection, { Stars } from './ReviewsSection';
import {
  ShoppingBag, ShieldCheck, MapPin, MessageCircle, CreditCard,
  Share2, Store, ArrowLeft, CheckCircle2, Truck, Plus, Minus,
  ExternalLink, Sparkles, Package, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { openPaystackCheckout } from '../services/paystackService';

const PublicProductPage: React.FC = () => {
  const { slug, productId } = useParams<{ slug?: string; productId: string }>();
  const [searchParams] = useSearchParams();
  const trackParam = searchParams.get('track') || undefined;
  const navigate = useNavigate();
  const wishlist = useWishlist();

  const [product, setProduct] = useState<any | null>(null);
  const [moreFromSeller, setMoreFromSeller] = useState<any[]>([]);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'PAYSTACK' | 'WHATSAPP'>('PAYSTACK');
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    state: 'Lagos',
    notes: '',
  });
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryEta, setDeliveryEta] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    reference: string;
    trackingCode?: string;
    total: number;
    waUrl?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/api/marketplace/public-product/${productId}/`);
        if (!cancelled && res.data?.product) {
          setProduct(res.data.product);
          setMoreFromSeller(res.data.more_from_seller || []);
          setSimilarProducts(res.data.similar_products || []);
          setQuantity(1);
        }
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (productId) loadProduct();
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!product?.id || !buyerForm.state) return;
    commerceService.deliveryQuote([product.id], buyerForm.state)
      .then((q) => {
        setDeliveryFee(q.total_fee || 0);
        setDeliveryEta(q.quotes?.[0]?.eta_days || 3);
      })
      .catch(() => setDeliveryFee(0));
  }, [product?.id, buyerForm.state]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading product from SmartBiz Market Square...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-200/70 flex items-center justify-center text-3xl mb-4">📦</div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Product Not Found</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          This item may have been sold out or removed by the merchant. Explore thousands of verified Nigerian products on the Market Square.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {slug && (
            <Link
              to={`/u/${slug}`}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold"
            >
              🏪 Visit Merchant Store
            </Link>
          )}
          <Link
            to="/market"
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/20"
          >
            🇳🇬 Browse Market Square
          </Link>
        </div>
      </div>
    );
  }

  const unitPrice = parseFloat(product.price || '0') || 0;
  const compareAtPrice = parseFloat(product.compare_at_price || product.price_max || '0') || 0;
  const subtotalAmount = unitPrice * quantity;
  const totalAmount = subtotalAmount + (checkoutMode === 'PAYSTACK' ? deliveryFee : 0);
  const storeSlug = product.brand_slug || slug || '';
  const storeUrl = storeSlug ? `/u/${storeSlug}` : '/market';
  const shareUrl = productShareUrl(product.id);

  const cleanWhatsApp = () => {
    const raw = product.whatsapp_number || '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
    if (digits.length === 10) return '234' + digits;
    if (digits === '2348000000000' || digits.length < 10) return '';
    return digits;
  };

  const handleShareProduct = () => {
    const shareText = `🔥 *${product.name}* — ₦${unitPrice.toLocaleString()}\n🏪 Sold by: ${product.brand_name || 'Verified Nigerian MSME'}\n📍 Location: ${product.location || product.brand_address || 'Nigeria'}\n\n👉 View & Order here: ${shareUrl}`;
    if (navigator.share) {
      navigator.share({
        title: `${product.name} | ${product.brand_name || 'SmartBiz Market'}`,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Direct product link copied! Ready to paste on WhatsApp or Instagram.');
    }
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerForm.name.trim() || !buyerForm.phone.trim() || !buyerForm.address.trim()) {
      toast.error('Please enter your name, phone number, and delivery address.');
      return;
    }

    const waNumber = cleanWhatsApp();
    const orderSummaryText =
      `🛒 *NEW SMARTBIZ ORDER*\n\n` +
      `📦 *Item:* ${product.name}\n` +
      `🔢 *Quantity:* ${quantity}\n` +
      `💰 *Total:* ₦${totalAmount.toLocaleString()}\n\n` +
      `👤 *Buyer:* ${buyerForm.name}\n` +
      `📞 *Phone:* ${buyerForm.phone}\n` +
      `📍 *Delivery Address:* ${buyerForm.address}\n` +
      (buyerForm.notes ? `📝 *Notes:* ${buyerForm.notes}\n` : '') +
      `\n🔗 Product Link: ${shareUrl}`;

    if (checkoutMode === 'WHATSAPP') {
      setIsSubmitting(true);
      try {
        await api.post('/api/marketplace/leads/', {
          product: product.id,
          customer_name: buyerForm.name,
          customer_contact: buyerForm.phone,
          message: `WhatsApp Product Order:\nQty: ${quantity}\nTotal: ₦${totalAmount.toLocaleString()}\nAddress: ${buyerForm.address}\nNotes: ${buyerForm.notes}`,
          lead_type: 'ORDER',
          quoted_price: totalAmount.toFixed(2),
        }).catch(() => {});
      } finally {
        setIsSubmitting(false);
        setShowCheckoutModal(false);
      }

      const waUrl = waNumber
        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(orderSummaryText)}`
        : `https://wa.me/?text=${encodeURIComponent(orderSummaryText)}`;
      window.open(waUrl, '_blank');
      toast.success('Order logged! Opening WhatsApp chat with the seller...');
      return;
    }

    // Paystack Online Checkout
    setIsSubmitting(true);
    try {
      await openPaystackCheckout({
        email: buyerForm.email.trim() || undefined,
        amount: totalAmount,
        customerName: buyerForm.name.trim(),
        customerPhone: buyerForm.phone.trim(),
        customerAddress: buyerForm.address.trim() || undefined,
        orderNotes: buyerForm.notes.trim() || `${product.name} x${quantity}`,
        subaccountCode: product.paystack_subaccount_code || undefined,
        onSuccess: async (paystackRes: { reference: string }) => {
          const reference = paystackRes?.reference || `SB-${Date.now()}`;
          try {
            const res = await api.post('/api/marketplace/orders/create/', {
              reference,
              total_amount: totalAmount,
              customer_name: buyerForm.name,
              customer_phone: buyerForm.phone,
              customer_address: buyerForm.address,
              delivery_state: buyerForm.state,
              notes: buyerForm.notes,
              items: [
                {
                  productId: product.id,
                  quantity,
                  price: unitPrice,
                },
              ],
            });
            setProduct((prev: any) =>
              prev && prev.product_type === 'PHYSICAL'
                ? { ...prev, stock_count: Math.max(0, (prev.stock_count || 0) - quantity) }
                : prev
            );
            setShowCheckoutModal(false);
            setOrderSuccess({
              reference,
              trackingCode: res.data?.orders?.[0]?.tracking_code,
              total: totalAmount,
              waUrl: res.data?.whatsapp_dispatch?.merchant_wa_url || (waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(orderSummaryText)}` : undefined),
            });
            toast.success('Payment verified! Order sent to merchant.');
          } catch {
            toast.success('Payment complete! Reference: ' + reference);
            setShowCheckoutModal(false);
          } finally {
            setIsSubmitting(false);
          }
        },
        onClose: () => {
          setIsSubmitting(false);
        },
      });
    } catch {
      setIsSubmitting(false);
      toast.error('Could not launch Paystack checkout. Try WhatsApp Order instead.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top Public Commerce Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Link
              to={storeUrl}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Store className="w-4 h-4 text-emerald-600" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[160px] sm:max-w-xs">
                {product.brand_name || 'Merchant Store'}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareProduct}
              className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Link</span>
            </button>
            <Link
              to="/market"
              className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold"
            >
              <span>🇳🇬 Market Square</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-10">
        {/* Main Product Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Product Image / Video */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-square rounded-3xl bg-slate-100 overflow-hidden relative border border-slate-100">
              {product.video_url || product.video_data ? (
                <video
                  src={product.video_url || product.video_data}
                  controls
                  poster={product.image_url || undefined}
                  className="w-full h-full object-cover"
                />
              ) : product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <ShoppingBag className="w-16 h-16 mb-3 stroke-[1.5]" />
                  <span className="text-sm font-bold">{product.name}</span>
                </div>
              )}

              {/* Top Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {product.is_promoted && (
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                    🔥 Featured Deal
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold">
                  {product.category || product.product_type}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Product Info, Trust & Checkout */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Location & Verification Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  {product.location || product.brand_address || 'Nigeria Nationwide'}
                </span>
                {(product.is_vendor_verified || product.cac_number) && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Nigerian Business {product.cac_number ? `(${product.cac_number})` : ''}
                  </span>
                )}
                {product.product_type === 'PHYSICAL' && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                      (product.stock_count ?? 1) > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    {(product.stock_count ?? 1) > 0
                      ? `${product.stock_count} in stock`
                      : 'Out of stock'}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading leading-tight">
                {product.name}
              </h1>

              {/* Price Display */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Price
                  </p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-emerald-600">
                      ₦{unitPrice.toLocaleString()}
                    </span>
                    {compareAtPrice > unitPrice && (
                      <span className="text-sm font-bold text-slate-400 line-through">
                        ₦{compareAtPrice.toLocaleString()}
                      </span>
                    )}
                    {product.deal_active && product.discount_percent ? (
                      <span className="text-[11px] font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-lg">
                        -{product.discount_percent}% FLASH DEAL
                      </span>
                    ) : null}
                  </div>
                  {(product.review_count || 0) > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Stars value={product.avg_rating || 5} size={13} />
                      <span className="text-xs font-bold text-slate-600">
                        {Number(product.avg_rating || 5).toFixed(1)} ({product.review_count} verified review{product.review_count === 1 ? '' : 's'})
                      </span>
                    </div>
                  )}
                </div>
                {product.metadata?.moq && (
                  <span className="text-xs font-extrabold bg-amber-100 text-amber-800 px-3 py-1 rounded-xl">
                    Wholesale MOQ: {product.metadata.moq}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Product / Service Details
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description || 'Authentic product/service listed by a verified Nigerian MSME on SmartBiz Market Square.'}
                </p>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                <span className="text-xs font-extrabold text-slate-700">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-base font-black text-slate-900 min-w-[28px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm font-black text-emerald-700">
                  Total: ₦{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Primary Checkout Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutMode('PAYSTACK');
                    setShowCheckoutModal(true);
                  }}
                  className="min-h-[54px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Buy Now · ₦{totalAmount.toLocaleString()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCheckoutMode('WHATSAPP');
                    setShowCheckoutModal(true);
                  }}
                  className="min-h-[54px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Order on WhatsApp</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareProduct}
                  className="inline-flex items-center justify-center gap-2 px-3 min-h-[44px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const saved = wishlist.toggle(product.id);
                    toast.success(saved ? 'Saved to your wishlist!' : 'Removed from wishlist');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 min-h-[44px] rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs cursor-pointer"
                >
                  <Heart className={`w-4 h-4 ${wishlist.has(product.id) ? 'fill-pink-600 text-pink-600' : ''}`} />
                  <span>{wishlist.has(product.id) ? 'Saved' : 'Save Item'}</span>
                </button>
              </div>

              {/* Seller Card Link */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Sold & Fulfilled By</p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {product.brand_name || 'Verified Nigerian Merchant'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {product.brand_address || product.location || 'Nationwide Waybill & Pickup'}
                  </p>
                </div>
                {storeSlug && (
                  <Link
                    to={`/u/${storeSlug}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-xs font-extrabold text-slate-800"
                  >
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Visit Store</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verified Customer Reviews & Listing Safety */}
        <div id="reviews" className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-sm">
          <ReviewsSection
            productId={product.id}
            productName={product.name}
            initialTrackingCode={trackParam}
          />
        </div>

        {/* More From This Seller */}
        {moreFromSeller.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                  🏪 More from {product.brand_name}
                </h2>
                <p className="text-xs text-slate-500">Other items available in this merchant's store</p>
              </div>
              {storeSlug && (
                <Link
                  to={`/u/${storeSlug}`}
                  className="text-xs font-extrabold text-emerald-700 hover:underline"
                >
                  View Full Store →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {moreFromSeller.map((item) => (
                <Link
                  key={item.id}
                  to={storeSlug ? `/u/${storeSlug}/p/${item.id}` : `/market/p/${item.id}`}
                  className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{item.name}</h4>
                  </div>
                  <p className="text-sm font-black text-emerald-600 mt-2">
                    ₦{Number(item.price || 0).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Similar Products Across Nigeria */}
        {similarProducts.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading">
                  🇳🇬 Similar Products on SmartBiz Market Square
                </h2>
                <p className="text-xs text-slate-500">Discover more verified small businesses across Nigeria</p>
              </div>
              <Link to="/market" className="text-xs font-extrabold text-emerald-700 hover:underline">
                Explore All →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarProducts.map((item) => (
                <Link
                  key={item.id}
                  to={`/market/p/${item.id}`}
                  className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.brand_name}</p>
                  </div>
                  <p className="text-sm font-black text-emerald-600 mt-2">
                    ₦{Number(item.price || 0).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {checkoutMode === 'PAYSTACK' ? '💳 Instant Online Checkout' : '💬 WhatsApp Direct Order'}
                </h3>
                <p className="text-xs text-slate-500">
                  {quantity}x {product.name} · <strong className="text-emerald-600">₦{totalAmount.toLocaleString()}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteOrder} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Your Full Name *"
                value={buyerForm.name}
                onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              />
              <input
                type="tel"
                required
                placeholder="Your WhatsApp / Phone Number *"
                value={buyerForm.phone}
                onChange={(e) => setBuyerForm({ ...buyerForm, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              />
              {checkoutMode === 'PAYSTACK' && (
                <input
                  type="email"
                  placeholder="Your Email (for payment receipt)"
                  value={buyerForm.email}
                  onChange={(e) => setBuyerForm({ ...buyerForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                />
              )}
              <select
                value={buyerForm.state}
                onChange={(e) => setBuyerForm({ ...buyerForm, state: e.target.value })}
                aria-label="Delivery state"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              >
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <input
                type="text"
                required
                placeholder="Street Address / Landmark *"
                value={buyerForm.address}
                onChange={(e) => setBuyerForm({ ...buyerForm, address: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              />
              {checkoutMode === 'PAYSTACK' && (
                <p className="text-[11px] font-bold text-slate-500 px-1">
                  🚚 Delivery to {buyerForm.state}: {deliveryFee > 0 ? `₦${deliveryFee.toLocaleString()}` : 'Free'} (~{deliveryEta} day(s))
                </p>
              )}
              <input
                type="text"
                placeholder="Order notes (size, colour, waybill instructions)"
                value={buyerForm.notes}
                onChange={(e) => setBuyerForm({ ...buyerForm, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Processing...'
                  : checkoutMode === 'PAYSTACK'
                  ? `Pay ₦${totalAmount.toLocaleString()} Securely via Paystack`
                  : 'Send Order to Seller on WhatsApp'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Order Paid & Confirmed!</h3>
            <p className="text-xs text-slate-500">
              Ref: <strong>{orderSuccess.reference}</strong> · Paid <strong>₦{orderSuccess.total.toLocaleString()}</strong>.
              {orderSuccess.trackingCode && (
                <> Tracking Code: <strong className="text-emerald-700">{orderSuccess.trackingCode}</strong>.</>
              )}
            </p>
            {orderSuccess.trackingCode && (
              <Link
                to={`/track/${orderSuccess.trackingCode}`}
                className="block w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs"
              >
                🔎 Track Your Order ({orderSuccess.trackingCode})
              </Link>
            )}
            {orderSuccess.waUrl && (
              <a
                href={orderSuccess.waUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm"
              >
                💬 Send Receipt to Seller on WhatsApp
              </a>
            )}
            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProductPage;
