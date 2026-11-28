import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem } from '../types';
import { openPaystackCheckout } from '../services/paystackService';
import { commerceService } from '../services/commerceService';
import { NIGERIAN_STATES } from '../config/nigeriaStates';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface CartProps {
  items: CartItem[];
  userEmail?: string;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: (provider: 'PAYSTACK' | 'SQUAD', total: number, reference: string) => void;
  onBack: () => void;
}

const Cart: React.FC<CartProps> = ({ items, userEmail, onRemove, onClear, onCheckout, onBack }) => {
  const navigate = useNavigate();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    email: userEmail || '',
    phone: '',
    state: 'Lagos',
    address: '',
    notes: ''
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + deliveryFee;

  // Detect multiple distinct vendors in cart
  const vendorNames = Array.from(new Set(items.map((it) => (it.vendorName || 'Verified Merchant').trim())));
  const isMultiVendor = vendorNames.length > 1;

  // Determine Primary Vendor details from the first cart item
  const primaryItem = items[0];
  const vendorSubaccount = isMultiVendor ? '' : (primaryItem?.paystack_subaccount_code || '');
  const vendorName = isMultiVendor ? `${vendorNames.length} Vendors (Separate Split)` : (primaryItem?.vendorName || 'Verified Merchant');

  useEffect(() => {
    if (items.length === 0 || !checkoutForm.state) {
      setDeliveryFee(0);
      return;
    }
    const productIds = items.map((i) => Number(i.productId || i.id)).filter((n) => Number.isFinite(n) && n > 0);
    if (productIds.length === 0) return;
    commerceService.deliveryQuote(productIds, checkoutForm.state)
      .then((q) => setDeliveryFee(q.total_fee || 0))
      .catch(() => setDeliveryFee(0));
  }, [items, checkoutForm.state]);

  const formatWhatsAppNumber = (phone?: string) => {
    if (!phone) return '';
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 11) {
      clean = '234' + clean.slice(1);
    } else if (clean.length === 10) {
      clean = '234' + clean;
    }
    // Reject dummy numbers
    if (clean === '2348000000000' || clean.length < 10) {
      return '';
    }
    return clean;
  };

  const rawVendorPhone = primaryItem?.whatsapp || (primaryItem as any)?.phone || '';
  const cleanVendorWhatsApp = formatWhatsAppNumber(rawVendorPhone);

  const handlePaystackCheckout = async () => {
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim() || !checkoutForm.address.trim()) {
      toast.error('Please complete your Name, Phone Number, and Delivery Address.');
      return;
    }

    if (isMultiVendor) {
      toast.error('Please checkout items from one vendor at a time for Paystack direct settlement, or use WhatsApp checkout.');
      return;
    }

    setIsProcessing(true);
    toast.loading('Opening secure Paystack gateway...');

    try {
      await openPaystackCheckout({
        email: checkoutForm.email.trim() || userEmail || undefined,
        amount: total,
        customerName: checkoutForm.name,
        customerPhone: checkoutForm.phone,
        customerAddress: `${checkoutForm.address}, ${checkoutForm.state}`,
        orderNotes: checkoutForm.notes,
        subaccountCode: vendorSubaccount,
        metadata: { purpose: 'marketplace_order', delivery_state: checkoutForm.state },
        onSuccess: async (res) => {
          toast.dismiss();
          toast.loading('Confirming order & verifying Paystack settlement...', { id: 'cart-verify' });

          try {
            const orderRes = await api.post('/api/marketplace/orders/create/', {
              items: items.map(item => ({
                productId: item.productId || item.id,
                price: item.price,
                quantity: item.quantity
              })),
              payment_method: 'PAYSTACK',
              reference: res.reference,
              total_amount: total,
              customer_name: checkoutForm.name,
              customer_phone: checkoutForm.phone,
              customer_email: checkoutForm.email.trim() || userEmail || '',
              customer_address: checkoutForm.address,
              delivery_state: checkoutForm.state,
              notes: checkoutForm.notes
            });
            toast.dismiss('cart-verify');
            const wa = orderRes.data?.whatsapp_dispatch;
            const trackingCode = orderRes.data?.orders?.[0]?.tracking_code;
            setShowCheckoutModal(false);
            onClear();
            setIsProcessing(false);
            toast.success(
              trackingCode
                ? `Order confirmed! Tracking code: ${trackingCode}`
                : `Payment verified! Ref: ${res.reference}`,
              { duration: 5000 }
            );
            if (wa?.merchant_wa_url) {
              window.open(wa.merchant_wa_url, '_blank', 'noopener,noreferrer');
            }
            if (trackingCode) {
              navigate(`/track/${trackingCode}`);
            } else {
              void onCheckout;
              navigate('/marketplace');
            }
          } catch (err: any) {
            toast.dismiss('cart-verify');
            setIsProcessing(false);
            const msg = err?.response?.data?.error || 'Order verification failed on server.';
            toast.error(`Payment Ref ${res.reference} captured, but order confirmation returned: ${msg}. Contact support with this reference.`, { duration: 8000 });
          }
        },
        onClose: () => {
          setIsProcessing(false);
          toast.dismiss();
          toast('Payment window closed.');
        }
      });
    } catch (err: any) {
      setIsProcessing(false);
      toast.dismiss();
      console.warn('Paystack gateway notice:', err);
      toast.error(err?.message || 'Could not launch payment gateway. You can complete via WhatsApp below.');
    }
  };

  const handleWhatsAppOrder = async () => {
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim() || !checkoutForm.address.trim()) {
      toast.error('Please fill in your Delivery Details before ordering via WhatsApp.');
      return;
    }

    setIsProcessing(true);
    let orderText = `*New Market Square Order (SmartBiz Coach)*\n\n`;
    orderText += `Hello ${vendorName}, I would like to purchase the following items:\n\n`;
    items.forEach((item) => {
      orderText += `▪️ *${item.title}* x${item.quantity} — ₦${(item.price * item.quantity).toLocaleString()}\n`;
    });
    orderText += `\n💵 *Total Order Amount:* ₦${subtotal.toLocaleString()} (+ Delivery to ${checkoutForm.state})\n`;
    orderText += `\n📍 *Customer & Delivery Profile:*`;
    orderText += `\n👤 *Name:* ${checkoutForm.name}`;
    orderText += `\n📞 *Phone:* ${checkoutForm.phone}`;
    orderText += `\n🏠 *Delivery Address:* ${checkoutForm.address}, ${checkoutForm.state}`;
    if (checkoutForm.notes) {
      orderText += `\n📝 *Notes:* ${checkoutForm.notes}`;
    }
    orderText += `\n\nPlease confirm availability and dispatch waybill terms. Thank you!`;

    const waUrl = cleanVendorWhatsApp
      ? `https://wa.me/${cleanVendorWhatsApp}?text=${encodeURIComponent(orderText)}`
      : `https://wa.me/?text=${encodeURIComponent(orderText)}`;

    try {
      await api.post('/api/marketplace/orders/create/', {
        items: items.map(item => ({
          productId: item.productId || item.id,
          price: item.price,
          quantity: item.quantity
        })),
        payment_method: 'WHATSAPP',
        total_amount: subtotal,
        customer_name: checkoutForm.name,
        customer_phone: checkoutForm.phone,
        customer_address: `${checkoutForm.address}, ${checkoutForm.state}`,
        delivery_state: checkoutForm.state,
        notes: `WhatsApp Order Inquiry: ${checkoutForm.notes}`
      });
      setShowCheckoutModal(false);
      onClear();
      toast.success('Inquiry logged! Redirecting to vendor WhatsApp...', { icon: '💬' });
      const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = waUrl;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not submit inquiry right now. Opening WhatsApp directly.');
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900">Your Cart is Empty</h2>
        <p className="text-gray-500 mt-2 mb-8">Looks like you haven't added any products yet.</p>
        <button 
          onClick={onBack}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95"
        >
          Explore Market Square
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-right duration-300 pb-24">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">
           ← Back to Market
        </button>
        <h2 className="text-2xl font-bold text-slate-900 font-heading">Shopping Bag ({items.length})</h2>
        <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700 font-bold">
          Clear All
        </button>
      </div>

      {/* Cart Items List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex items-center gap-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
            <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200">
               <img src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="font-bold text-slate-900 text-sm truncate">{item.title}</h3>
               <p className="text-[11px] text-slate-500 mt-0.5">
                 Vendor: <span className="font-semibold text-slate-700">{item.vendorName || 'Verified Merchant'}</span>
               </p>
               <p className="text-xs text-slate-500 mt-0.5 font-medium">Qty: {item.quantity}</p>
            </div>
            <div className="text-right">
               <p className="font-bold text-indigo-600 text-base">₦{(item.price * item.quantity).toLocaleString()}</p>
               <button 
                 onClick={() => onRemove(item.id)}
                 className="text-[11px] text-red-400 hover:text-red-600 font-semibold mt-1 inline-block"
               >
                 Remove
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        {isMultiVendor && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
            Your bag contains items from {vendorNames.length} different vendors. Online Paystack settlement supports one vendor per order; remove items from other sellers or submit your inquiry via WhatsApp.
          </div>
        )}
        <div className="flex justify-between items-center text-sm text-slate-600">
           <span>Items Subtotal</span>
           <span className="font-bold text-slate-900">₦{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-slate-600">
           <span>Delivery ({checkoutForm.state})</span>
           <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
             {deliveryFee > 0 ? `₦${deliveryFee.toLocaleString()}` : 'Quoted separately by seller / Pickup'}
           </span>
        </div>
        
        {/* Settlement Reassurance Badge */}
        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
          <span>🛡️</span>
          <span>
            {vendorSubaccount 
              ? 'Direct Bank Settlement: Payments route directly to vendor verified bank account.' 
              : 'Non-custodial Paystack checkout (no card data stored on SmartBiz servers).'}
          </span>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
           <div>
             <span className="font-bold text-lg text-slate-900 block">{deliveryFee > 0 ? 'Total' : 'Items Subtotal'}</span>
             {deliveryFee <= 0 && (
               <span className="text-[11px] text-slate-500">Waybill / dispatch fee arranged separately with vendor if applicable</span>
             )}
           </div>
           <span className="font-extrabold text-2xl text-slate-900">₦{total.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={() => setShowCheckoutModal(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center gap-2 cursor-pointer"
          >
            <span>💳</span> Pay Online (Paystack)
          </button>
          <button 
            onClick={() => setShowCheckoutModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center gap-2 cursor-pointer"
          >
            <span>💬</span> Pay with WhatsApp
          </button>
        </div>
      </div>

      {/* Nigerian Delivery & Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-heading">Complete Your Order</h3>
                <p className="text-xs text-slate-500 mt-0.5">Total: <strong className="text-indigo-600 text-sm">₦{total.toLocaleString()}</strong></p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adeola Johnson"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={checkoutForm.name}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number (WhatsApp Preferred) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08012345678"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Delivery State *
                </label>
                <select
                  value={checkoutForm.state}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, state: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email (For Paystack Receipt)
                </label>
                <input
                  type="email"
                  placeholder="buyer@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={checkoutForm.email}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Delivery Address & City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Order Notes / Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deliver before 4 PM or call upon arrival..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  value={checkoutForm.notes}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Payment Action Buttons */}
            <div className="space-y-3">
              <button
                disabled={isProcessing}
                onClick={handlePaystackCheckout}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>💳</span>
                <span>Pay Online via Paystack (Cards, Transfer, USSD, OPay)</span>
              </button>

              <button
                onClick={handleWhatsAppOrder}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>💬</span>
                <span>Order via WhatsApp (Pay on Delivery / Direct Transfer)</span>
              </button>
            </div>

            <div className="mt-4 text-center">
              <span className="text-[11px] text-slate-400">
                🔒 Verified 256-Bit SSL Encryption • PCI-DSS Certified Gateway
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
