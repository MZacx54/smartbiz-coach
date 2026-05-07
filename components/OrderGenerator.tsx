import React, { useState, useRef } from 'react';
import { Receipt, Plus, Trash2, Download, Share2, User, Phone, MapPin, Calculator, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { toast } from 'react-hot-toast';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

const OrderGenerator: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ id: '1', name: '', qty: 1, price: 0 }]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [note, setNote] = useState('Thank you for your patronage! 🚀');
  const [orderNumber] = useState(`ORD-${Math.floor(Math.random() * 9000) + 1000}`);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', qty: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
  const total = subtotal + deliveryFee;

  const handleDownload = async () => {
    if (receiptRef.current === null) return;
    
    const toastId = toast.loading('Generating your professional receipt...');
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#f8fafc' });
      const link = document.createElement('a');
      link.download = `${customerName || 'customer'}-order.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Receipt saved! You can now send it on WhatsApp.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate image. Please take a screenshot instead.', { id: toastId });
    }
  };

  const handleShareText = () => {
    const text = `
📜 *ORDER CONFIRMATION*
Order ID: #${orderNumber}

👤 *CUSTOMER:* ${customerName || 'N/A'}
📞 *PHONE:* ${customerPhone || 'N/A'}
📍 *ADDRESS:* ${address || 'N/A'}

📦 *ITEMS:*
${items.map(i => `- ${i.name} (${i.qty}x) @ ₦${i.price.toLocaleString()}`).join('\n')}

---
💸 Subtotal: ₦${subtotal.toLocaleString()}
🚚 Delivery: ₦${deliveryFee.toLocaleString()}
💰 *TOTAL: ₦${total.toLocaleString()}*

📝 *NOTE:* ${note}
    `.trim();
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-2xl">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold font-heading">Order Generator</h1>
            </div>
            <p className="text-indigo-100 max-w-md text-sm">
              Convert your WhatsApp chats into professional order summaries. Build trust with your customers instantly.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleDownload}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-indigo-700 px-6 py-3.5 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
            >
              <Download className="w-5 h-5" /> Save Image
            </button>
            <button 
              onClick={handleShareText}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-500 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-indigo-400 transition-all shadow-lg active:scale-95"
            >
              <Share2 className="w-5 h-5" /> Share Text
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Side */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-indigo-500" />
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Mrs. Adebayo"
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Phone</label>
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="080..."
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Delivery Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Lekki Phase 1, Lagos"
                    className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Calculator className="w-5 h-5 text-indigo-500" />
                Items & Pricing
              </h3>
              <button 
                onClick={addItem}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-12 gap-3 items-end group"
                  >
                    <div className="col-span-6 md:col-span-7 space-y-1">
                      {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Item Name</label>}
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Product Name"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2 space-y-1">
                      {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Qty</label>}
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 space-y-1">
                      {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Price</label>}
                      <input 
                        type="number" 
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pb-1">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="pt-4 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Delivery Fee (₦)</label>
                <input 
                  type="number" 
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Special Note</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Preview Side */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-8 space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800">Preview</h3>
            </div>
            
            {/* The Actual Receipt Card */}
            <div 
              ref={receiptRef}
              className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="p-10 space-y-8">
                {/* Receipt Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black font-heading text-indigo-600 tracking-tight">ORDER</h2>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Confirmation</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Order ID</p>
                    <p className="text-sm font-black text-slate-800">#{orderNumber}</p>
                  </div>
                </div>

                {/* Customer Box */}
                <div className="bg-slate-50 rounded-3xl p-6 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Billed To</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{customerName || 'Pending...'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                    <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
                  </div>
                  {address && (
                    <div className="col-span-2 space-y-1 pt-2 border-t border-slate-200/50">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ship To</p>
                      <p className="text-[11px] font-medium text-slate-600 leading-snug">{address}</p>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  <div className="flex justify-between px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    <span>Item</span>
                    <div className="flex gap-8">
                      <span>Qty</span>
                      <span>Total</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {items.filter(i => i.name).map((item) => (
                      <div key={item.id} className="flex justify-between items-center group">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">₦{item.price.toLocaleString()} per unit</p>
                        </div>
                        <div className="flex gap-8 items-center">
                          <span className="text-sm font-bold text-slate-500">x{item.qty}</span>
                          <span className="text-sm font-black text-slate-800">₦{(item.qty * item.price).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-6 border-t-2 border-dashed border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-400">Subtotal</span>
                    <span className="font-bold text-slate-800">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-400">Delivery Fee</span>
                    <span className="font-bold text-slate-800">₦{deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-indigo-600 p-5 rounded-2xl text-white shadow-xl shadow-indigo-100 mt-4">
                    <span className="font-bold text-sm uppercase tracking-widest opacity-80">Amount Paid</span>
                    <span className="text-2xl font-black">₦{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-center space-y-2 pt-4">
                   <div className="flex justify-center">
                     <CheckCircle className="w-5 h-5 text-indigo-500" />
                   </div>
                   <p className="text-[11px] font-medium text-slate-500 italic max-w-[200px] mx-auto">
                    "{note}"
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderGenerator;
