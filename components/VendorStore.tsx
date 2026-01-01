import React, { useState } from 'react';
import { Vendor, ProductListing, ServiceGig, RentalListing } from '../types';
// Import the shared card components from Marketplace (assuming they are exported now)
// Since we are in the same project, we will assume Marketplace exports them or define standard ones here.
// For best practice in this file-based structure, I'll rely on the exported ones or fallback to re-implementation if import fails (but we updated Marketplace to export them).
import { ProductCard, GigCard, RentalCard } from './Marketplace';

interface VendorStoreProps {
  vendor: Vendor;
  products: ProductListing[];
  services: ServiceGig[];
  rentals: RentalListing[]; // Added Rentals
  onBack: () => void;
  onBookService: (service: ServiceGig) => void;
  onAddToCart?: (product: ProductListing) => void;
  onRentItem?: (rental: RentalListing) => void; // Added onRentItem
}

const VendorStore: React.FC<VendorStoreProps> = ({ vendor, products, services, rentals, onBack, onBookService, onAddToCart, onRentItem }) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'SERVICES' | 'RENTALS'>('PRODUCTS');

  const handleMessage = () => {
    const text = `Hello ${vendor.name}, I saw your store on SmartBiz.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <button 
        onClick={onBack}
        className="mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium"
      >
        <span>←</span> Back to Market
      </button>

      {/* Vendor Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="h-40 bg-gray-800 relative">
          <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover opacity-60" />
          <div className="absolute bottom-0 left-0 p-6 text-white w-full bg-gradient-to-t from-black/80 to-transparent">
             <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{vendor.name}</h1>
                {vendor.isVerified && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Verified</span>}
             </div>
             <p className="text-sm opacity-90">{vendor.location}</p>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="bg-gray-50 px-6 py-2 border-b border-gray-100 flex gap-6 text-xs text-gray-600">
             <div>
                <span className="font-bold text-gray-900">{products.length + services.length + rentals.length}</span> Listings
             </div>
             <div>
                <span className="font-bold text-gray-900">98%</span> Response Rate
             </div>
             <div>
                <span className="font-bold text-gray-900">120+</span> Orders Completed
             </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase tracking-wider">{vendor.category}</span>
               <span className="text-xs font-bold bg-yellow-100 px-2 py-1 rounded text-yellow-800">★ {vendor.rating} Rating</span>
             </div>
             <p className="text-sm text-gray-500">Verified SmartBiz Vendor</p>
           </div>
           
           <div className="flex gap-3 w-full md:w-auto">
             <button 
               onClick={handleMessage}
               className="flex-1 md:flex-none bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
             >
               <span>💬</span> Message Vendor
             </button>
             <button className="flex-1 md:flex-none border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
               Share Profile
             </button>
           </div>
        </div>
      </div>

      {/* Store Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('PRODUCTS')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PRODUCTS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Products ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('SERVICES')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SERVICES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Services ({services.length})
        </button>
        <button 
          onClick={() => setActiveTab('RENTALS')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'RENTALS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Rentals ({rentals.length})
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[300px]">
        {/* PRODUCTS TAB */}
        {activeTab === 'PRODUCTS' && (
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             {products.length === 0 && <p className="text-gray-500 col-span-full py-8 text-center italic">No products listed yet.</p>}
             {products.map(product => (
               <ProductCard 
                  key={product.id} 
                  product={product} 
                  onView={() => {}} // Optional: Expand logic could be added here if needed inside store
                  onAddToCart={(p) => onAddToCart && onAddToCart(p)}
               />
             ))}
           </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'SERVICES' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {services.length === 0 && <p className="text-gray-500 col-span-full py-8 text-center italic">No services listed yet.</p>}
             {services.map(gig => (
               <GigCard 
                  key={gig.id} 
                  gig={gig} 
                  onView={onBookService} // When clicking a gig in store, open booking details
               />
             ))}
           </div>
        )}

        {/* RENTALS TAB */}
        {activeTab === 'RENTALS' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {rentals.length === 0 && <p className="text-gray-500 col-span-full py-8 text-center italic">No rentals listed yet.</p>}
             {rentals.map(rental => (
               <RentalCard 
                  key={rental.id} 
                  rental={rental} 
                  onRent={(r) => onRentItem && onRentItem(r)}
               />
             ))}
           </div>
        )}
      </div>

    </div>
  );
};

export default VendorStore;