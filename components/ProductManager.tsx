import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Edit3, Sparkles, Globe, Megaphone, DollarSign, Package, Tag, ArrowRight, Save, X, Download, ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  price_max?: string;
  image_url: string;
  category: string;
  product_type: 'PHYSICAL' | 'SERVICE' | 'PROPERTY' | 'B2B';
  location: string;
  metadata: Record<string, any>;
  is_public: boolean;
  is_promoted: boolean;
  stock_count: number;
  
  // Expanded Audited Fields
  cost_price?: string;
  sku?: string;
  low_stock_threshold?: number;
}

const mockProducts: Product[] = [
  {
    id: 101,
    name: "Premium Ankara Textile - 6 Yards",
    description: "Premium cotton African print fabric, suitable for all types of traditional outfits. High-grade print that does not fade.",
    price: "12500.00",
    price_max: "15000.00",
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    category: "Fashion & Textile",
    product_type: "PHYSICAL",
    location: "Yaba, Lagos",
    metadata: {},
    is_public: true,
    is_promoted: true,
    stock_count: 240,
    cost_price: "7500.00",
    sku: "TEX-ANK-001",
    low_stock_threshold: 15
  },
  {
    id: 102,
    name: "Logistics Dispatch Delivery Run",
    description: "Intra-city dispatch logistics delivery within Lagos mainland. Standard delivery within 4-6 hours.",
    price: "3500.00",
    price_max: "4500.00",
    image_url: "",
    category: "Logistics Services",
    product_type: "SERVICE",
    location: "Mainland, Lagos",
    metadata: {},
    is_public: true,
    is_promoted: false,
    stock_count: 150,
    cost_price: "1500.00",
    sku: "SRV-DIS-002",
    low_stock_threshold: 10
  },
  {
    id: 103,
    name: "Warehouse Storage Unit - 100sqm",
    description: "Secure, dry, and easily accessible warehouse storage unit located in Ikeja. Equipped with 24/7 security.",
    price: "250000.00",
    price_max: "300000.00",
    image_url: "",
    category: "Real Estate & Storage",
    product_type: "B2B",
    location: "Ikeja, Lagos",
    metadata: {},
    is_public: true,
    is_promoted: true,
    stock_count: 3,
    cost_price: "90000.00",
    sku: "B2B-WH-003",
    low_stock_threshold: 2
  },
  {
    id: 104,
    name: "AI Business Consultation Package",
    description: "1-on-1 strategic growth and digitization consultation session for small/medium business owners.",
    price: "50000.00",
    price_max: "60000.00",
    image_url: "",
    category: "Professional Services",
    product_type: "SERVICE",
    location: "Remote / Online",
    metadata: {},
    is_public: true,
    is_promoted: false,
    stock_count: 25,
    cost_price: "10000.00",
    sku: "SRV-CON-004",
    low_stock_threshold: 5
  }
];

const ProductManager: React.FC = () => {
  const isTractionMode = localStorage.getItem('sb_idice_traction_mode') === 'true';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: '',
    price_max: '',
    image_url: '',
    category: '',
    product_type: 'PHYSICAL',
    location: '',
    metadata: {},
    is_public: true,
    is_promoted: false,
    stock_count: 1,
    cost_price: '',
    sku: '',
    low_stock_threshold: 5
  });

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/marketplace/products/');
      let data = Array.isArray(response.data) ? response.data : [];
      if (isTractionMode && data.length === 0) {
        data = mockProducts;
      }
      setProducts(data);
    } catch (err) {
      if (isTractionMode) {
        setProducts(mockProducts);
      } else {
        toast.error('Failed to load catalog');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [isTractionMode]);

  const handleSave = async () => {
    if (!currentProduct.name || !currentProduct.price) {
      toast.error('Name and Price are required');
      return;
    }

    const payload = {
      ...currentProduct,
      price: parseFloat(currentProduct.price as string).toFixed(2),
      price_max: currentProduct.price_max ? parseFloat(currentProduct.price_max as string).toFixed(2) : null,
      cost_price: currentProduct.cost_price ? parseFloat(currentProduct.cost_price as string).toFixed(2) : "0.00",
      stock_count: parseInt(currentProduct.stock_count as any) || 0,
      low_stock_threshold: parseInt(currentProduct.low_stock_threshold as any) || 5
    };

    const toastId = toast.loading('Saving listing...');
    try {
      if (isTractionMode) {
        // Simulate local-storage persistence for Traction mode edit
        const exists = products.some(p => p.id === currentProduct.id);
        let updatedList: Product[] = [];
        if (exists) {
          updatedList = products.map(p => p.id === currentProduct.id ? { ...p, ...payload } as Product : p);
        } else {
          updatedList = [{ ...payload, id: Date.now() } as Product, ...products];
        }
        setProducts(updatedList);
        toast.success('Listing synchronized locally (Traction Mode)', { id: toastId });
      } else {
        if (currentProduct.id) {
          await api.put(`/api/marketplace/products/${currentProduct.id}/`, payload);
          toast.success('Listing updated!', { id: toastId });
        } else {
          await api.post('/api/marketplace/products/', payload);
          toast.success('Listing added to ecosystem!', { id: toastId });
        }
        fetchProducts();
      }
      setIsEditing(false);
    } catch (err) {
      toast.error('Error saving listing', { id: toastId });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this listing?')) return;
    try {
      if (isTractionMode) {
        setProducts(products.filter(p => p.id !== id));
        toast.success('Listing removed locally (Traction Mode)');
      } else {
        await api.delete(`/api/marketplace/products/${id}/`);
        toast.success('Listing removed');
        fetchProducts();
      }
    } catch (err) {
      toast.error('Error deleting listing');
    }
  };

  const polishDescription = async () => {
    if (!currentProduct.name) {
      toast.error('Enter a title first');
      return;
    }
    const toastId = toast.loading('AI is crafting your copy...');
    try {
      const response = await api.post('/api/content/generate-social/', {
        topic: `A professional sales description for a ${currentProduct.product_type || 'PHYSICAL'} named ${currentProduct.name}.`,
        platform: 'Instagram',
        tone: 'Persuasive'
      });
      setCurrentProduct(prev => ({ ...prev, description: response.data.caption || response.data.text }));
      toast.success('AI Copy applied!', { id: toastId });
    } catch (err) {
      toast.error('AI craft failed. Make sure you have credits.', { id: toastId });
    }
  };

  const generateSku = () => {
    if (!currentProduct.name) {
      toast.error('Enter a product name first');
      return;
    }
    const typeCode = (currentProduct.product_type || 'PHY').slice(0, 3).toUpperCase();
    const nameCode = currentProduct.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    const skuCode = `${typeCode}-${nameCode}-${rand}`;
    setCurrentProduct(prev => ({ ...prev, sku: skuCode }));
    toast.success(`Generated SKU: ${skuCode}`);
  };

  const exportInventoryToCSV = () => {
    if (products.length === 0) {
      toast.error('No inventory items to export');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU,Product Name,Type,Selling Price,Cost Price (COGS),Stock Qty,Total Value (Cost),Total Value (Retail),Status\n";

    products.forEach(p => {
      const price = parseFloat(p.price) || 0;
      const cost = parseFloat(p.cost_price || '0') || 0;
      const stock = p.stock_count || 0;
      const valCost = cost * stock;
      const valRetail = price * stock;
      const isLow = stock <= (p.low_stock_threshold || 5) ? 'LOW STOCK' : 'IN STOCK';
      
      csvContent += `"${p.sku || ''}","${p.name}","${p.product_type}",${price},${cost},${stock},${valCost},${valRetail},"${isLow}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmartBiz_Inventory_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Inventory spreadsheet exported!');
  };

  // Metrics calculation
  const totalSkuCount = products.length;
  const totalStockCount = products.reduce((acc, curr) => acc + (curr.stock_count || 0), 0);
  const totalValuationCost = products.reduce((acc, curr) => acc + (parseFloat(curr.cost_price || '0') * (curr.stock_count || 0)), 0);
  const totalValuationRetail = products.reduce((acc, curr) => acc + (parseFloat(curr.price) * (curr.stock_count || 0)), 0);
  const projectedProfit = totalValuationRetail - totalValuationCost;
  const marginPercentage = totalValuationRetail > 0 ? (projectedProfit / totalValuationRetail) * 100 : 0;
  const lowStockCount = products.filter(p => (p.stock_count || 0) <= (p.low_stock_threshold || 5)).length;

  const updateMetadata = (key: string, value: any) => {
    setCurrentProduct(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Ecosystem Catalog</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">Manage inventory assets, valuation parameters, and storefront details.</p>
        </div>
        {!isEditing && (
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={exportInventoryToCSV}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 border border-slate-200 text-slate-600 px-6 py-4 rounded-3xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button 
              onClick={() => {
                setCurrentProduct({ 
                  name: '', description: '', price: '', price_max: '', image_url: '', category: '', 
                  product_type: 'PHYSICAL', location: '', metadata: {},
                  is_public: true, is_promoted: false, stock_count: 1,
                  cost_price: '', sku: '', low_stock_threshold: 5
                });
                setIsEditing(true);
              }}
              className="flex-[2] md:flex-initial flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-3xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" /> Create Listing
            </button>
          </div>
        )}
      </div>

      {/* Audit & Valuation Summary Dashboard (List View Only) */}
      {!isEditing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg">📦</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SKU Assets</p>
              <h4 className="text-xl font-black text-slate-800 font-heading">{totalSkuCount} Items</h4>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg">💰</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Valuation (Cost)</p>
              <h4 className="text-xl font-black text-slate-800 font-heading">₦{totalValuationCost.toLocaleString()}</h4>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg">📈</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Margin %</p>
              <h4 className="text-xl font-black text-slate-800 font-heading">{marginPercentage.toFixed(1)}% ({projectedProfit < 0 ? '-' : ''}₦{Math.abs(projectedProfit).toLocaleString()})</h4>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-lg">⚠️</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Items</p>
              <h4 className={`text-xl font-black font-heading ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{lowStockCount} Alerts</h4>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="p-8 md:p-12 space-y-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  {currentProduct.id ? <Edit3 className="w-6 h-6 text-indigo-500" /> : <Plus className="w-6 h-6 text-indigo-500" />}
                  {currentProduct.id ? 'Edit Listing Details' : 'New Ecosystem Listing'}
                </h2>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Type Selector */}
              <div className="flex flex-wrap gap-3">
                {(['PHYSICAL', 'SERVICE', 'PROPERTY', 'B2B'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCurrentProduct({ ...currentProduct, product_type: type })}
                    className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${
                      currentProduct.product_type === type 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {type === 'PHYSICAL' && '🛍️ Product'}
                    {type === 'SERVICE' && '🛠️ Service'}
                    {type === 'PROPERTY' && '🏠 Property'}
                    {type === 'B2B' && '🤝 B2B/Hub'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Form Side */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Title / Name</label>
                      <input 
                        type="text" 
                        value={currentProduct.name}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                        placeholder="e.g. Ankara Fabric - 6 Yards"
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Retail Selling Price (₦)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" 
                          value={currentProduct.price}
                          onChange={(e) => setCurrentProduct({ ...currentProduct, price: e.target.value })}
                          placeholder="0.00"
                          className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Audited Valuation & SKU Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Price (COGS) (₦)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" 
                          value={currentProduct.cost_price}
                          onChange={(e) => setCurrentProduct({ ...currentProduct, cost_price: e.target.value })}
                          placeholder="0.00"
                          className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-emerald-600"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock SKU</label>
                        <button 
                          onClick={generateSku}
                          className="text-[9px] font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-lg"
                        >
                          Generate SKU
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={currentProduct.sku}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                        placeholder="e.g. TEX-ANK-492"
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Stock Quantity and warnings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Quantity</label>
                      <input 
                        type="number" 
                        value={currentProduct.stock_count}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, stock_count: parseInt(e.target.value) || 0 })}
                        placeholder="1"
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Low Stock Limit Alert</label>
                      <input 
                        type="number" 
                        value={currentProduct.low_stock_threshold}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, low_stock_threshold: parseInt(e.target.value) || 0 })}
                        placeholder="5"
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                      <button 
                        onClick={polishDescription}
                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> AI Sales Copy
                      </button>
                    </div>
                    <textarea 
                      value={currentProduct.description}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                      rows={4}
                      placeholder="High-converting description for your target audience..."
                      className="w-full bg-slate-50 border-none rounded-3xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>

                  {(currentProduct.product_type === 'PROPERTY' || currentProduct.product_type === 'B2B') && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={currentProduct.location}
                          onChange={(e) => setCurrentProduct({ ...currentProduct, location: e.target.value })}
                          placeholder="e.g. Lagos, Lekki Phase 1"
                          className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings Side */}
                <div className="space-y-8">
                   <div className="bg-slate-50 rounded-[32px] p-8 space-y-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ecosystem Distribution</h3>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-100 p-2 rounded-xl">
                            <Globe className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Public Storefront</p>
                            <p className="text-[10px] text-slate-400">List on personal store website</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={currentProduct.is_public}
                          onChange={(e) => setCurrentProduct({ ...currentProduct, is_public: e.target.checked })}
                          className="w-5 h-5 text-indigo-600 rounded-lg"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 p-2 rounded-xl">
                            <Megaphone className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Ecosystem Market Square</p>
                            <p className="text-[10px] text-slate-400">List in global search & directory</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={currentProduct.is_promoted}
                          onChange={(e) => setCurrentProduct({ ...currentProduct, is_promoted: e.target.checked })}
                          className="w-5 h-5 text-indigo-600 rounded-lg"
                        />
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Featured Image URL</label>
                      <input 
                        type="text" 
                        value={currentProduct.image_url}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, image_url: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm"
                      />
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 px-8 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSave}
                        className="flex-[2] flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-3xl font-bold hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                      >
                        <Save className="w-5 h-5" /> Sync Listing
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {Array.isArray(products) && products.map((product) => {
                const stock = product.stock_count || 0;
                const threshold = product.low_stock_threshold || 5;
                const isLowStock = stock <= threshold;
                
                return (
                  <motion.div 
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-300 relative"
                  >
                    <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-slate-200" />
                        </div>
                      )}
                      
                      {/* Top Badge Overlay */}
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                         <div className="bg-slate-900/95 backdrop-blur-md text-[8px] text-white px-2 py-1 rounded-lg uppercase font-black tracking-widest w-max">{product.product_type}</div>
                         {product.is_public && <div className="bg-emerald-500/95 backdrop-blur-md text-[8px] text-white px-2 py-1 rounded-lg uppercase font-black tracking-widest w-max">Live Store</div>}
                         {isLowStock && (
                           <div className="bg-rose-500/95 backdrop-blur-md text-[8px] text-white px-2.5 py-1 rounded-lg uppercase font-black tracking-widest flex items-center gap-1 w-max shadow-sm shadow-rose-100">
                             <AlertTriangle className="w-2.5 h-2.5 text-white" /> Low Stock
                           </div>
                         )}
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="max-w-[70%]">
                          <h4 className="font-bold text-slate-800 line-clamp-1">{product.name}</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{product.location || product.category || 'Local Listing'}</p>
                          {product.sku && (
                            <p className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">SKU: {product.sku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-indigo-600 leading-none">₦{parseFloat(product.price).toLocaleString()}</p>
                          {product.cost_price && parseFloat(product.cost_price) > 0 && (
                            <p className="text-[9px] text-emerald-600 font-bold mt-1">COGS: ₦{parseFloat(product.cost_price).toLocaleString()}</p>
                          )}
                        </div>
                      </div>

                      {/* Stock stats overlay */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <span>Stock Quantity: <strong className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>{stock} units</strong></span>
                        <span>Value: <strong className="text-slate-800">₦{(stock * parseFloat(product.price)).toLocaleString()}</strong></span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                         <button 
                          onClick={() => {
                            setCurrentProduct(product);
                            setIsEditing(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-600 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                         >
                           <Edit3 className="w-3.5 h-3.5" /> Manage
                         </button>
                         <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {products.length === 0 && !isLoading && (
              <div className="col-span-full py-20 text-center space-y-6 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">Your Catalog is Empty</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">Start listing Products, Services or Properties to populate your ecosystem.</p>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100"
                >
                  List My First Item
                </button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductManager;
