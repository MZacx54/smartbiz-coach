import React, { useState, useRef } from 'react';
import { Camera, Upload, Layers, CheckCircle, RefreshCw, X, Sparkles, Loader2, Plus, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

interface ShelfItem {
  name: string;
  category: string;
  estimated_stock: number;
  suggested_selling_price: number;
  suggested_cost_price: number;
  selected?: boolean;
}

interface ShelfScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsImported: () => void;
}

export const ShelfScannerModal: React.FC<ShelfScannerModalProps> = ({
  isOpen,
  onClose,
  onProductsImported
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [batchTitle, setBatchTitle] = useState('');
  const [detectedItems, setDetectedItems] = useState<ShelfItem[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setDetectedItems([]);
  };

  const handleScanShelf = async () => {
    if (!imageFile) {
      toast.error('Please take or upload a photo of your shelf or carton first.');
      return;
    }

    setIsScanning(true);
    const toastId = toast.loading('Multimodal AI counting items & identifying shelf stock...');
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await api.post('/api/marketplace/shelf-scan/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.items && res.data.items.length > 0) {
        setBatchTitle(res.data.batch_title || 'Detected Shelf Batch');
        setDetectedItems(res.data.items.map((i: any) => ({ ...i, selected: true })));
        toast.success(`Identified ${res.data.items.length} items on display!`, { id: toastId, icon: '📦' });
      } else {
        toast.error('No clear commercial goods detected. Try snapping closer with more lighting.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to scan shelf image. Check internet connection.', { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmBatch = async () => {
    const selected = detectedItems.filter(i => i.selected);
    if (selected.length === 0) {
      toast.error('Please select at least 1 item to add to your catalog.');
      return;
    }

    setIsApplying(true);
    const toastId = toast.loading(`Adding ${selected.length} items to your catalog & stock...`);
    try {
      const payload = {
        line_items: selected.map(i => ({
          name: i.name,
          category: i.category,
          estimated_stock: i.estimated_stock,
          suggested_selling_price: i.suggested_selling_price,
          suggested_cost_price: i.suggested_cost_price
        }))
      };

      const res = await api.post('/api/marketplace/restock-from-receipt/', payload);
      toast.success(res.data.message || `Added ${selected.length} items to inventory!`, { id: toastId, icon: '🎉', duration: 5000 });
      onProductsImported();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add items to catalog.', { id: toastId });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 font-heading">AI Snap-a-Shelf Stocktaker</h3>
              <p className="text-xs text-slate-500">Snap your shop shelf, display carton, or racks to count & list items in bulk.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload or Snap Photo */}
        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer ${
              imagePreview ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-500 hover:bg-slate-50'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <div className="space-y-3">
                <img 
                  src={imagePreview} 
                  alt="Shelf capture" 
                  className="max-h-56 mx-auto rounded-2xl object-contain shadow-md"
                />
                <p className="text-xs font-bold text-indigo-600 flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Tap to retake photo
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-black text-slate-800">Tap to Snap Shelf or Carton Photo</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hold camera steady facing your store display or fresh supplier carton box.
                </p>
              </div>
            )}
          </div>

          {imagePreview && detectedItems.length === 0 && (
            <button
              onClick={handleScanShelf}
              disabled={isScanning}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-indigo-200" />}
              {isScanning ? 'AI Counting & Identifying Products...' : 'Detect & Count Shelf Items'}
            </button>
          )}
        </div>

        {/* Step 2: Review Detected Items */}
        {detectedItems.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">AI Detection Summary</span>
                <h4 className="text-sm font-black text-slate-800">{batchTitle}</h4>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                {detectedItems.filter(i => i.selected).length} of {detectedItems.length} selected
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
              {detectedItems.map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                    item.selected ? 'bg-white' : 'bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        const next = [...detectedItems];
                        next[idx].selected = e.target.checked;
                        setDetectedItems(next);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <input 
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const next = [...detectedItems];
                          next[idx].name = e.target.value;
                          setDetectedItems(next);
                        }}
                        className="font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none text-xs w-52 sm:w-64"
                      />
                      <span className="text-[10px] text-slate-400 block">{item.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Est. Qty</span>
                      <input 
                        type="number"
                        min="1"
                        value={item.estimated_stock}
                        onChange={(e) => {
                          const next = [...detectedItems];
                          next[idx].estimated_stock = Math.max(1, parseInt(e.target.value) || 1);
                          setDetectedItems(next);
                        }}
                        className="w-12 text-center font-black text-slate-800 bg-slate-50 rounded-lg p-1 text-xs border border-slate-200"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Retail (₦)</span>
                      <input 
                        type="number"
                        min="0"
                        value={item.suggested_selling_price}
                        onChange={(e) => {
                          const next = [...detectedItems];
                          next[idx].suggested_selling_price = parseFloat(e.target.value) || 0;
                          setDetectedItems(next);
                        }}
                        className="w-20 text-right font-black text-emerald-700 bg-slate-50 rounded-lg p-1 text-xs border border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirmBatch}
              disabled={isApplying || detectedItems.filter(i => i.selected).length === 0}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {isApplying ? 'Importing Batch...' : `Confirm & Add ${detectedItems.filter(i => i.selected).length} Items to Inventory`}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ShelfScannerModal;
