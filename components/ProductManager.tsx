import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Edit3, Sparkles, Globe, Megaphone, DollarSign, Package, Tag, ArrowRight, Save, X } from 'lucide-react';
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
}

const ProductManager: React.FC = () => {
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
    stock_count: 1
  });

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/marketplace/products/');
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      toast.error('Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSave = async () => {
    if (!currentProduct.name || !currentProduct.price) {
      toast.error('Name and Price are required');
      return;
    }

    const toastId = toast.loading('Saving to catalog...');
    try {
      if (currentProduct.id) {
        await api.put(`/api/marketplace/products/${currentProduct.id}/`, currentProduct);
        toast.success('Listing updated!', { id: toastId });
      } else {
        await api.post('/api/marketplace/products/', currentProduct);
        toast.success('Listing added to ecosystem!', { id: toastId });
      }
      setIsEditing(false);
      fetchProducts();
    } catch (err) {
      toast.error('Error saving listing', { id: toastId });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this listing?')) return;
    try {
      await api.delete(`/api/marketplace/products/${id}/`);
      toast.success('Listing removed');
      fetchProducts();
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
      const response = await api.post('/api/content/generate-post/', {
        topic: `A professional sales description for a ${currentProduct.product_type} named ${currentProduct.name}.`
      });
      setCurrentProduct({ ...currentProduct, description: response.data.caption });
      toast.success('AI Copy applied!', { id: toastId });
    } catch (err) {
      toast.error('AI craft failed', { id: toastId });
    }
  };

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
            <h1 className="text-3xl font-black text-slate-800 font-heading tracking-tight">Unified Catalog</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">Manage Products, Services, and Properties across all SmartBiz channels.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => {
              setCurrentProduct({ 
                name: '', description: '', price: '', image_url: '', category: '', 
                product_type: 'PHYSICAL', location: '', metadata: {},
                is_public: true, is_promoted: false, stock_count: 1 
              });
              setIsEditing(true);
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-3xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
          >
            <Plus className="w-5 h-5" /> Create New Listing
          </button>
        )}
      </div>

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
                  {currentProduct.id ? 'Edit Listing' : 'New Ecosystem Listing'}
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
                        placeholder="e.g. 3 Bedroom Apartment"
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₦)</label>
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

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                      <button 
                        onClick={polishDescription}
                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-all"
                      >
                        <Sparkles className="w-3 h-3" /> AI Sales Copy
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
                          className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Dynamic Metadata Fields */}
                  {currentProduct.product_type === 'PROPERTY' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['Bedrooms', 'Bathrooms', 'Floors', 'Parking'].map(field => (
                        <div key={field} className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field}</label>
                          <input 
                            type="number"
                            value={currentProduct.metadata?.[field.toLowerCase()] || ''}
                            onChange={(e) => updateMetadata(field.toLowerCase(), e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {currentProduct.product_type === 'B2B' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Minimum Order (MOQ)</label>
                        <input 
                          type="text"
                          value={currentProduct.metadata?.moq || ''}
                          onChange={(e) => updateMetadata('moq', e.target.value)}
                          placeholder="e.g. 50 units"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lead Time</label>
                        <input 
                          type="text"
                          value={currentProduct.metadata?.lead_time || ''}
                          onChange={(e) => updateMetadata('lead_time', e.target.value)}
                          placeholder="e.g. 3-5 days"
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs"
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
                            <p className="text-sm font-bold text-slate-800">Public Storefront</p>
                            <p className="text-[10px] text-slate-400">Show on your personal URL</p>
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
                          <div className="bg-amber-100 p-2 rounded-xl">
                            <Megaphone className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Market Square / Hub</p>
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
              {Array.isArray(products) && products.map((product) => (
                <motion.div 
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-slate-200" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                       <div className="bg-slate-900/90 backdrop-blur-md text-[8px] text-white px-2 py-1 rounded-lg uppercase font-black tracking-widest">{product.product_type}</div>
                       {product.is_public && <div className="bg-emerald-500/90 backdrop-blur-md text-[8px] text-white px-2 py-1 rounded-lg uppercase font-black tracking-widest">Live</div>}
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="max-w-[70%]">
                        <h4 className="font-bold text-slate-800 line-clamp-1">{product.name}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{product.location || product.category || 'Local Listing'}</p>
                      </div>
                      <p className="text-sm font-black text-indigo-600">₦{parseFloat(product.price).toLocaleString()}</p>
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
              ))}
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
