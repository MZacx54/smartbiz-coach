
import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';

const InventoryTracker: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('sb_inventory');
    return saved ? JSON.parse(saved) : [];
  });

  const [showForm, setShowForm] = useState(false);
  // Added costPrice to state
  const [newItem, setNewItem] = useState({ name: '', category: '', quantity: '', price: '', costPrice: '' });

  // Profit Calculator State
  const [calcCost, setCalcCost] = useState('');
  const [calcPrice, setCalcPrice] = useState('');

  useEffect(() => {
    localStorage.setItem('sb_inventory', JSON.stringify(items));
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: InventoryItem = {
      id: Date.now().toString(),
      name: newItem.name,
      category: newItem.category || 'General',
      quantity: parseInt(newItem.quantity) || 0,
      price: parseFloat(newItem.price) || 0,
      costPrice: parseFloat(newItem.costPrice) || 0
    };
    setItems([...items, item]);
    setNewItem({ name: '', category: '', quantity: '', price: '', costPrice: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleAdjustStock = (id: string, adjustment: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        return { ...i, quantity: Math.max(0, i.quantity + adjustment) };
      }
      return i;
    }));
  };

  const totalValue = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = items.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
  const potentialProfit = totalValue - totalCost;
  
  const lowStockCount = items.filter(i => i.quantity < 5).length;

  // Simple calculator logic
  const calcProfit = (parseFloat(calcPrice) || 0) - (parseFloat(calcCost) || 0);
  const isLoss = calcProfit < 0;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory & Profit 📦</h2>
          <p className="text-gray-600 text-sm mt-1">Track stock levels and calculate your gains.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Profit Calculator Widget (The Gain Checker) */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-8 shadow-sm">
         <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
            <span>🧮</span> Quick Gain Checker
         </h3>
         <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                 <label className="text-xs font-bold text-green-800 uppercase">Cost Price (Bought)</label>
                 <input 
                    type="number" 
                    placeholder="e.g. 5000"
                    className="w-full p-2 rounded border border-green-200 mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                    value={calcCost}
                    onChange={(e) => setCalcCost(e.target.value)}
                 />
             </div>
             <div className="flex-1 w-full">
                 <label className="text-xs font-bold text-green-800 uppercase">Selling Price (Sold)</label>
                 <input 
                    type="number" 
                    placeholder="e.g. 7500"
                    className="w-full p-2 rounded border border-green-200 mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                    value={calcPrice}
                    onChange={(e) => setCalcPrice(e.target.value)}
                 />
             </div>
             <div className="flex-1 w-full">
                 <div className={`p-2 rounded text-center border ${isLoss ? 'bg-red-100 border-red-300' : 'bg-green-600 border-green-700'}`}>
                     <p className={`text-xs font-bold uppercase ${isLoss ? 'text-red-700' : 'text-green-100'}`}>
                        {isLoss ? 'WARNING: LOSS' : 'YOUR GAIN'}
                     </p>
                     <p className={`text-xl font-bold ${isLoss ? 'text-red-800' : 'text-white'}`}>
                        ₦{Math.abs(calcProfit).toLocaleString()}
                     </p>
                 </div>
             </div>
         </div>
         {isLoss && calcPrice && (
             <p className="text-xs text-red-600 mt-2 font-bold animate-pulse">
                Ah! You go loose money o. Are you sure?
             </p>
         )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs text-gray-500 uppercase font-bold">Total Items</p>
           <p className="text-2xl font-bold text-gray-900">{items.length}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs text-gray-500 uppercase font-bold">Total Value</p>
           <p className="text-2xl font-bold text-gray-900">₦{totalValue.toLocaleString()}</p>
         </div>
         <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
           <p className="text-xs text-emerald-600 uppercase font-bold">Potential Profit</p>
           <p className="text-2xl font-bold text-emerald-700">₦{potentialProfit.toLocaleString()}</p>
         </div>
         <div className={`p-4 rounded-xl border shadow-sm ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
           <p className={`text-xs uppercase font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Low Stock</p>
           <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount}</p>
         </div>
      </div>

      {showForm && (
        <form onSubmit={handleAddItem} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 animate-in slide-in-from-top-2">
          <h3 className="font-bold text-gray-900 mb-4">Add New Product</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="col-span-2 md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
              <input 
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                placeholder="e.g. Rice 50kg"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price (₦)</label>
              <input 
                type="number"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                value={newItem.costPrice}
                onChange={e => setNewItem({...newItem, costPrice: e.target.value})}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price (₦)</label>
              <input 
                type="number"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                value={newItem.price}
                onChange={e => setNewItem({...newItem, price: e.target.value})}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
              <input 
                type="number"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                value={newItem.quantity}
                onChange={e => setNewItem({...newItem, quantity: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700">
            Save Product
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium text-right">Cost</th>
              <th className="px-6 py-3 font-medium text-right">Price</th>
              <th className="px-6 py-3 font-medium text-center">Gain/Unit</th>
              <th className="px-6 py-3 font-medium text-center">Stock</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                  No items in inventory yet.
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.category}</p>
                </td>
                <td className="px-6 py-4 text-right text-gray-500">
                  ₦{(item.costPrice || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                  ₦{item.price.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                     +₦{(item.price - (item.costPrice || 0)).toLocaleString()}
                   </span>
                </td>
                <td className="px-6 py-4 text-center">
                   <div className="flex items-center justify-center gap-2">
                     <button onClick={() => handleAdjustStock(item.id, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">-</button>
                     <span className={`font-bold w-8 text-center ${item.quantity < 5 ? 'text-red-600' : 'text-gray-800'}`}>{item.quantity}</span>
                     <button onClick={() => handleAdjustStock(item.id, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">+</button>
                   </div>
                   {item.quantity < 5 && <p className="text-[10px] text-red-500 mt-1 font-medium">Low Stock</p>}
                </td>
                <td className="px-6 py-4 text-right">
                   <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTracker;