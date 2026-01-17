
import React, { useState } from 'react';
import { CartItem } from '../types';
import PaymentModal from './PaymentModal';

interface CartProps {
  items: CartItem[];
  userEmail?: string;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: (provider: 'PAYSTACK' | 'SQUAD', total: number, reference: string) => void;
  onBack: () => void;
}

const Cart: React.FC<CartProps> = ({ items, userEmail, onRemove, onClear, onCheckout, onBack }) => {
  const [showPayment, setShowPayment] = useState(false);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePaymentSuccess = (provider: 'PAYSTACK' | 'SQUAD', reference: string) => {
    setShowPayment(false);
    onCheckout(provider, total, reference);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900">Your Cart is Empty</h2>
        <p className="text-gray-500 mt-2 mb-8">Looks like you haven't added any products yet.</p>
        <button 
          onClick={onBack}
          className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800"
        >
          Go to Market
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm font-medium text-gray-500 hover:text-gray-900">
           ← Back to Market
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Shopping Cart ({items.length})</h2>
        <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700 font-medium">
          Clear All
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex items-center gap-4 border-b border-gray-100 last:border-0">
            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
               <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
               <h3 className="font-bold text-gray-900">{item.title}</h3>
               <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
            </div>
            <div className="text-right">
               <p className="font-bold text-indigo-600">₦{(item.price * item.quantity).toLocaleString()}</p>
               <button 
                 onClick={() => onRemove(item.id)}
                 className="text-[10px] text-red-400 hover:text-red-600 mt-1"
               >
                 Remove
               </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-2 text-gray-600">
           <span>Subtotal</span>
           <span>₦{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center mb-4 text-gray-600">
           <span>Delivery Fee</span>
           <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Free</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 mb-6">
           <span className="font-bold text-lg text-gray-900">Total</span>
           <span className="font-bold text-2xl text-gray-900">₦{total.toLocaleString()}</span>
        </div>

        <button 
          onClick={() => setShowPayment(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center gap-2"
        >
          <span>💳</span> Checkout Securely
        </button>
      </div>

      {showPayment && (
        <PaymentModal 
          amount={total} 
          description={`Checkout - ${items.length} items`}
          email={userEmail}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Cart;
