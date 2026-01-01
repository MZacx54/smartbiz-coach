
import React, { useState } from 'react';
import { Invoice, InvoiceItem } from '../types';
import ShareActions from './ShareActions';

const InvoiceGenerator: React.FC = () => {
  const [step, setStep] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [invoice, setInvoice] = useState<Invoice>({
    id: `INV-${Math.floor(Math.random() * 10000)}`,
    clientName: '',
    clientPhone: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ id: '1', description: '', quantity: 1, price: 0 }],
    discount: 0,
    taxRate: 0,
    currency: '₦',
    note: 'Thank you for your patronage!'
  });

  const addItem = () => {
    setInvoice({
      ...invoice,
      items: [...invoice.items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (id: string) => {
    setInvoice({
      ...invoice,
      items: invoice.items.filter(i => i.id !== id)
    });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoice({
      ...invoice,
      items: invoice.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    });
  };

  const calculateSubtotal = () => invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const discountAmt = sub * (invoice.discount / 100);
    const taxAmt = (sub - discountAmt) * (invoice.taxRate / 100);
    return sub - discountAmt + taxAmt;
  };

  if (step === 'PREVIEW') {
    const total = calculateTotal();
    const shareText = `Hello ${invoice.clientName}, here is your invoice for ₦${total.toLocaleString()}. Please view details attached.`;

    return (
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
          <button onClick={() => setStep('EDIT')} className="text-sm text-gray-600 hover:text-gray-900 font-medium">Edit Invoice</button>
        </div>

        <div id="invoice-preview" className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 mb-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
            <div>
              <div className="text-3xl font-bold text-indigo-900 tracking-tight">INVOICE</div>
              <div className="text-gray-500 text-sm mt-1">#{invoice.id}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">Your Business Name</div>
              <div className="text-sm text-gray-500">Date: {invoice.date}</div>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
            <h3 className="text-xl font-bold text-gray-900">{invoice.clientName || 'Client Name'}</h3>
            <p className="text-gray-600">{invoice.clientPhone}</p>
          </div>

          {/* Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                <th className="py-3 px-4 rounded-l-lg">Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {invoice.items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-4 px-4 font-medium">{item.description}</td>
                  <td className="py-4 px-4 text-center">{item.quantity}</td>
                  <td className="py-4 px-4 text-right">₦{item.price.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-bold">₦{(item.quantity * item.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
             <div className="w-1/2 space-y-2">
               <div className="flex justify-between text-sm text-gray-600">
                 <span>Subtotal</span>
                 <span>₦{calculateSubtotal().toLocaleString()}</span>
               </div>
               {invoice.discount > 0 && (
                 <div className="flex justify-between text-sm text-green-600">
                   <span>Discount ({invoice.discount}%)</span>
                   <span>- ₦{(calculateSubtotal() * (invoice.discount / 100)).toLocaleString()}</span>
                 </div>
               )}
               {invoice.taxRate > 0 && (
                 <div className="flex justify-between text-sm text-gray-600">
                   <span>Tax ({invoice.taxRate}%)</span>
                   <span>+ ₦{((calculateSubtotal() * (1 - invoice.discount/100)) * (invoice.taxRate/100)).toLocaleString()}</span>
                 </div>
               )}
               <div className="flex justify-between text-xl font-bold text-indigo-900 border-t border-gray-200 pt-2 mt-2">
                 <span>Total</span>
                 <span>₦{total.toLocaleString()}</span>
               </div>
             </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500 italic">
            {invoice.note}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => window.print()}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <span>🖨️</span> Print / Save as PDF
          </button>
          
          <div className="bg-gray-100 p-4 rounded-xl">
             <ShareActions text={shareText} title={`Invoice #${invoice.id}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Invoice Generator 🧾</h2>
           <p className="text-gray-600 text-sm mt-1">Create professional receipts in seconds.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        
        {/* Client Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Name</label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Mr. Johnson"
              value={invoice.clientName}
              onChange={(e) => setInvoice({...invoice, clientName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Phone (Optional)</label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 08012345678"
              value={invoice.clientPhone}
              onChange={(e) => setInvoice({...invoice, clientPhone: e.target.value})}
            />
          </div>
        </div>

        {/* Items */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Items</label>
          <div className="space-y-3">
            {invoice.items.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start">
                <span className="pt-2 text-gray-400 text-xs font-mono">{index + 1}.</span>
                <div className="flex-1 grid grid-cols-12 gap-2">
                  <input 
                    className="col-span-6 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                  <input 
                    type="number"
                    className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                  />
                  <input 
                    type="number"
                    className="col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  />
                  <div className="col-span-1 flex items-center justify-center">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600 font-bold"
                    >✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={addItem}
            className="mt-3 text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1"
          >
            <span>+</span> Add Item
          </button>
        </div>

        {/* Extras */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount (%)</label>
             <input 
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={invoice.discount}
                onChange={(e) => setInvoice({...invoice, discount: parseFloat(e.target.value) || 0})}
             />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax / VAT (%)</label>
             <input 
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={invoice.taxRate}
                onChange={(e) => setInvoice({...invoice, taxRate: parseFloat(e.target.value) || 0})}
             />
           </div>
        </div>
        
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Footer Note</label>
          <textarea 
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none resize-none"
            rows={2}
            value={invoice.note}
            onChange={(e) => setInvoice({...invoice, note: e.target.value})}
          />
        </div>

        <button 
          onClick={() => setStep('PREVIEW')}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg mt-4"
        >
          Generate Invoice
        </button>
      </div>
    </div>
  );
};

export default InvoiceGenerator;