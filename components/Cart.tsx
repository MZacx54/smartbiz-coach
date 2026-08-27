import React, { useState } from 'react';
import { CartItem } from '../types';
import { openPaystackCheckout } from '../services/paystackService';
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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Determine Primary Vendor details from the first cart item
  const primaryItem = items[0];
  const vendorSubaccount = primaryItem?.paystack_subaccount_code || '';
  const vendorWhatsApp = primaryItem?.whatsapp || '2348000000000';
  const vendorName = primaryItem?.vendorName || 'Verified Merchant';

  const handlePaystackCheckout = async () => {
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim() || !checkoutForm.address.trim()) {
      toast.error('Please complete your Name, Phone Number, and Delivery Address.');
      return;
    }

    setIsProcessing(true);
    toast.loading('Opening secure Paystack gateway...');

    try {
      await openPaystackCheckout({
        amount: total,
        customerName: checkoutForm.name,
        customerPhone: checkoutForm.phone,
        customerAddress: checkoutForm.address,
        orderNotes: checkoutForm.notes,
        subaccountCode: vendorSubaccount,
        onSuccess: async (res) => {
          toast.dismiss();
          toast.success(`Payment verified! Reference: ${res.reference}`);

          try {
            // Log order and create vendor lead audit trail
            await api.post('/api/marketplace/orders/create/', {
              items: items.map(item => ({
                productId: item.productId || item.id,
                price: item.price,
                quantity: item.quantity
              })),
              reference: res.reference,
              total_amount: total,
              customer_name: checkoutForm.name,
              customer_phone: checkoutForm.phone,
              customer_address: checkoutForm.address,
              notes: checkoutForm.notes
            });
          } catch (err) {
            console.error('Order lead audit log notice:', err);
          }

          setShowCheckoutModal(false);
          onCheckout('PAYSTACK', total, res.reference);
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
      toast.error(err?.message || 'Could not launch payment gateway. Redirecting to WhatsApp...');
      handleWhatsAppOrder();
    }
  };

  const handleWhatsAppOrder = async () => {
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim() || !checkoutForm.address.trim()) {
      toast.error('Please fill in your Delivery Details before ordering via WhatsApp.');
      return;
    }

    try {
      // Create lead in background
      await api.post('/api/marketplace/orders/create/', {
        items: items.map(item => ({
          productId: item.productId || item.id,
          price: item.price,
          quantity: item.quantity
        })),
        reference: `WA-ORDER-${Date.now()}`,
        total_amount: total,
        customer_name: checkoutForm.name,
        customer_phone: checkoutForm.phone,
        customer_address: checkoutForm.address,
        notes: `WhatsApp Order Inquiry: ${checkoutForm.notes}`
      });
    } catch (err) {
      console.warn('Could not log WhatsApp lead:', err);
    }

    let orderText = `*New Market Square Order (SmartBiz Coach)*\n\n`;
    orderText += `Hello ${vendorName}, I would like to purchase the following items:\n\n`;
    items.forEach((item) => {
      orderText += `▪️ *${item.title}* x${item.quantity} — ₦${(item.price * item.quantity).toLocaleString()}\n`;
    });
    orderText += `\n💵 *Total Order Amount:* ₦${total.toLocaleString()}\n`;
    orderText += `\n📍 *Customer & Delivery Profile:*`;
    orderText += `\n👤 *Name:* ${checkoutForm.name}`;
    orderText += `\n📞 *Phone:* ${checkoutForm.phone}`;
    orderText += `\n🏠 *Delivery Address:* ${checkoutForm.address}`;
    if (checkoutForm.notes) {
      orderText += `\n📝 *Notes:* ${checkoutForm.notes}`;
    }
    orderText += `\n\nPlease confirm availability and dispatch waybill terms. Thank you!`;

    setShowCheckoutModal(false);
    onClear();
    toast.success('Order recorded! Redirecting to vendor WhatsApp...');
    window.open(`https://wa.me/${vendorWhatsApp}?text=${encodeURIComponent(orderText)}`, '_blank');
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
        <div className="flex justify-between items-center text-sm text-slate-600">
           <span>Items Subtotal</span>
           <span className="font-bold text-slate-900">₦{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-slate-600">
           <span>Estimated Delivery Fee</span>
           <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
             Standard Park / Doorstep Dispatch
           </span>
        </div>
        
        {/* Settlement Reassurance Badge */}
        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
          <span>🛡️</span>
          <span>
            {vendorSubaccount 
              ? 'Direct Bank Settlement: Payments route directly to vendor verified bank account.' 
              : 'Secured via Paystack Escrow Protection.'}
          </span>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
           <span className="font-bold text-lg text-slate-900">Total</span>
           <span className="font-extrabold text-2xl text-slate-900">₦{total.toLocaleString()}</span>
        </div>

        <button 
          onClick={() => setShowCheckoutModal(true)}
          className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center gap-2"
        >
          <span>💳</span> Proceed to Checkout (Paystack / WhatsApp)
        </button>
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
