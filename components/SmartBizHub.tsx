import React, { useState, useEffect } from 'react';
import { Search, MapPin, Truck, Store, Users, Briefcase, CheckCircle, MessageCircle, ArrowRight } from 'lucide-react';
import { api } from '../utils/api'; // Ensure this uses your authenticated fetch wrapper

interface Vendor {
  id: number;
  business_name: string;
  is_verified: boolean;
  whatsapp_number: string;
}

interface Listing {
  id: number;
  vendor: Vendor;
  title: string;
  description: string;
  category: string;
  price_min: string | null;
  price_max: string | null;
  location: string;
  created_at: string;
}

export function SmartBizHub() {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'ALL', name: 'All Categories', icon: Search },
    { id: 'LOGISTICS', name: 'Logistics', icon: Truck },
    { id: 'WHOLESALE', name: 'Wholesale', icon: Store },
    { id: 'INFLUENCER', name: 'Influencers', icon: Users },
    { id: 'SERVICES', name: 'Services', icon: Briefcase },
  ];

  useEffect(() => {
    fetchListings();
  }, [activeCategory, searchQuery]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = '/api/marketplace/listings/?';
      if (activeCategory !== 'ALL') url += `category=${activeCategory}&`;
      if (searchQuery) url += `search=${searchQuery}`;
      
      const response = await api.get(url);
      setListings(response); // Adjust depending on your api.get implementation
    } catch (error) {
      console.error("Failed to fetch listings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = (vendor: Vendor, listingTitle: string) => {
    const text = encodeURIComponent(`Hi ${vendor.business_name}, I saw your listing for "${listingTitle}" on SmartBiz Hub. I would like to make an inquiry.`);
    const number = vendor.whatsapp_number.replace(/\D/g, ''); // strip non-numeric
    window.open(`https://wa.me/${number}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-900 to-indigo-800 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">SmartBiz Hub</h1>
          <p className="text-blue-100 max-w-2xl">
            The trusted B2B marketplace for Nigerian MSMEs. Find verified dispatch riders, wholesale suppliers, and micro-influencers to scale your business.
          </p>
        </div>
        <button className="bg-white text-blue-900 px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2 shrink-0">
          Post a Listing <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search for dispatch riders in Yaba, Aba shoemakers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all font-medium ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100 shadow-sm" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No listings found</h3>
          <p className="text-gray-500">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {listing.category.replace('_', ' ')}
                  </span>
                  {listing.price_min && (
                    <span className="font-bold text-gray-900">
                      ₦{parseInt(listing.price_min).toLocaleString()}
                      {listing.price_max ? ` - ₦${parseInt(listing.price_max).toLocaleString()}` : ''}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                  {listing.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {listing.description}
                </p>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <MapPin className="w-4 h-4" />
                  {listing.location}
                </div>
              </div>

              <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    {listing.vendor.business_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                      {listing.vendor.business_name}
                      {listing.vendor.is_verified && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleWhatsAppContact(listing.vendor, listing.title)}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
