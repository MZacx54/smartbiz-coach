
import React, { useState, useEffect } from 'react';
import { Vendor, ProductListing, ServiceGig, RentalListing, User } from '../types';
import { searchLocalVendors, LocalSearchResult, VendorSearchResponse } from '../services/geminiService';
import VendorStore from './VendorStore';
import PaymentModal from './PaymentModal';

interface MarketplaceProps {
  onAddToCart?: (product: ProductListing) => void;
  currentUser?: User;
}

// --- Mock Data ---

const initialVendors: Vendor[] = [
  {
    id: '1',
    name: "Mama Nkechi Fabrics",
    category: "Fashion",
    location: "Balogun Market, Lagos",
    coordinates: { lat: 6.4555, lng: 3.3903 },
    rating: 4.8,
    image: "https://via.placeholder.com/400x200/FF5733/FFFFFF?text=Mama+Nkechi+Fabrics",
    isVerified: true
  },
  {
    id: '2',
    name: "Olu Tech Solutions",
    category: "Services",
    location: "Computer Village, Ikeja",
    coordinates: { lat: 6.5965, lng: 3.3448 },
    rating: 4.5,
    image: "https://via.placeholder.com/400x200/3357FF/FFFFFF?text=Olu+Tech",
    isVerified: true
  },
  {
    id: '3',
    name: "Iya Basira Catering",
    category: "Food",
    location: "Yaba, Lagos",
    coordinates: { lat: 6.5095, lng: 3.3711 },
    rating: 4.9,
    image: "https://via.placeholder.com/400x200/33FF57/FFFFFF?text=Iya+Basira",
    isVerified: false
  },
];

const initialProducts: ProductListing[] = [
  {
    id: 'p1',
    vendorId: '1',
    title: 'Ankara Fabric (6 Yards) - High Target',
    price: 5000,
    category: 'Fashion',
    image: 'https://via.placeholder.com/400x400/FF5733/FFFFFF?text=Ankara+High+Target',
    images: ['https://via.placeholder.com/400x400/FF5733/FFFFFF?text=Ankara+1', 'https://via.placeholder.com/400x400/FF5733/FFFFFF?text=Ankara+Texture'],
    description: 'Original high-target Ankara fabric. 100% Cotton. Does not wash. Perfect for Aso-Ebi.',
    condition: 'New',
    stockCount: 50,
    minOrderQuantity: 1,
    wholesalePrice: { minQty: 6, price: 4200 },
    deliveryOptions: { pickup: true, dispatch: true, interstate: true },
    location: "Balogun, Lagos"
  },
  {
    id: 'p2',
    vendorId: '2',
    title: 'iPhone 11 (128GB) - UK Used',
    price: 280000,
    category: 'Gadgets',
    image: 'https://via.placeholder.com/400x400/333/FFFFFF?text=iPhone+11',
    images: ['https://via.placeholder.com/400x400/333/FFFFFF?text=Front', 'https://via.placeholder.com/400x400/333/FFFFFF?text=Back'],
    description: 'Clean UK Used iPhone 11. Battery health 89%. True Tone active. No FaceID issues. Comes with charger cable.',
    condition: 'Foreign Used',
    stockCount: 5,
    minOrderQuantity: 1,
    deliveryOptions: { pickup: true, dispatch: true, interstate: false },
    location: "Computer Village, Ikeja"
  },
  {
    id: 'p3',
    vendorId: '3',
    title: 'Party Jollof Rice (5 Liters Cooler)',
    price: 15000,
    category: 'Food',
    image: 'https://via.placeholder.com/400x400/FFC300/FFFFFF?text=Jollof+Cooler',
    description: 'Smoky Nigerian party jollof. Includes 5 pieces of Chicken and Moi Moi. Order 4 hours ahead.',
    condition: 'New',
    stockCount: 10,
    minOrderQuantity: 1,
    wholesalePrice: { minQty: 5, price: 13500 },
    deliveryOptions: { pickup: true, dispatch: true, interstate: false },
    location: "Yaba, Lagos"
  },
  {
    id: 'p4',
    vendorId: '2',
    title: 'Dell Latitude 7490 (Core i7)',
    price: 320000,
    category: 'Gadgets',
    image: 'https://via.placeholder.com/400x400/111/FFFFFF?text=Dell+Laptop',
    description: 'Direct UK Used. 16GB RAM, 512GB SSD. Backlit keyboard. Rugged business laptop.',
    condition: 'Foreign Used',
    stockCount: 3,
    minOrderQuantity: 1,
    deliveryOptions: { pickup: true, dispatch: true, interstate: true },
    location: "Computer Village, Ikeja"
  }
];

const initialGigs: ServiceGig[] = [
  {
    id: 'g1',
    vendorId: '2',
    vendorName: 'Olu Tech',
    vendorAvatar: 'https://via.placeholder.com/50/3357FF/FFFFFF?text=Olu',
    vendorLevel: 'Top Rated',
    title: 'I will design a professional logo for your business',
    category: 'Digital',
    subCategory: 'Graphics',
    rating: 4.9,
    reviewsCount: 120,
    startingPrice: 5000,
    deliveryTime: '2 Days',
    images: ['https://via.placeholder.com/400x300/3357FF/FFFFFF?text=Logo+Design', 'https://via.placeholder.com/400x300/3357FF/FFFFFF?text=Portfolio+1'],
    isOnline: true,
    packages: [
      { name: 'Basic', price: 5000, description: '1 Logo Concept + JPG', features: ['1 Concept', 'High Res JPG'] },
      { name: 'Standard', price: 15000, description: '3 Concepts + Source File', features: ['3 Concepts', 'Source File', 'Transparent PNG'] },
      { name: 'Premium', price: 30000, description: 'Full Brand Kit', features: ['5 Concepts', 'Social Media Kit', 'Stationery Design', 'VIP Support'] }
    ]
  },
  {
    id: 'g2',
    vendorId: '1',
    vendorName: 'Mama Nkechi',
    vendorAvatar: 'https://via.placeholder.com/50/FF5733/FFFFFF?text=Mama',
    vendorLevel: 'Pro',
    title: 'I will sew bespoke Aso-Ebi styles for weddings',
    category: 'Artisan',
    subCategory: 'Fashion',
    location: 'Lagos',
    rating: 4.8,
    reviewsCount: 85,
    startingPrice: 10000,
    deliveryTime: '5 Days',
    images: ['https://via.placeholder.com/400x300/FF5733/FFFFFF?text=Aso+Ebi', 'https://via.placeholder.com/400x300/FF5733/FFFFFF?text=Sewing'],
    isOnline: false,
    packages: [
      { name: 'Basic', price: 10000, description: 'Simple Gown Sewing', features: ['Measurements', 'Sewing'] },
      { name: 'Standard', price: 25000, description: 'Detailed Style with Stones', features: ['Lining', 'Stoning', 'Complex Cut'] },
      { name: 'Premium', price: 60000, description: 'Bridal Train Package (per person)', features: ['Premium Finish', 'Accessories', 'Express Delivery'] }
    ]
  }
];

const initialRentals: RentalListing[] = [
  { id: 'r1', vendorId: '1', title: '1000 Plastic Chairs', description: 'White plastic chairs for events. Minimum rent 50.', category: 'Event', pricePerDay: 50, location: 'Surulere', image: 'https://via.placeholder.com/150/9333EA/FFFFFF?text=Chairs', isAvailable: true },
  { id: 'r2', vendorId: '2', title: 'Toyota Sienna (Logistics)', description: 'Available for goods delivery within Lagos.', category: 'Logistics', pricePerDay: 25000, location: 'Ikeja', image: 'https://via.placeholder.com/150/333333/FFFFFF?text=Sienna', isAvailable: true },
];

// --- Sub-Components ---

const ProductCard: React.FC<{ product: ProductListing; onView: (p: ProductListing) => void; onAddToCart: (p: ProductListing) => void }> = ({ product, onView, onAddToCart }) => (
  <div onClick={() => onView(product)} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full">
    <div className="aspect-square bg-gray-100 relative overflow-hidden">
      <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded shadow-sm ${product.condition === 'New' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>{product.condition}</span>
    </div>
    <div className="p-3 flex flex-col flex-1">
      <h3 className="font-bold text-gray-900 text-sm truncate mb-1">{product.title}</h3>
      <p className="text-xs text-gray-500 mb-2 truncate">📍 {product.location}</p>
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-50">
        <p className="font-bold text-gray-900 font-heading">₦{product.price.toLocaleString()}</p>
        <button onClick={(e) => { e.stopPropagation(); onAddToCart(product); }} className="bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-900 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-lg">+</button>
      </div>
    </div>
  </div>
);

const GigCard: React.FC<{ gig: ServiceGig; onView: (g: ServiceGig) => void }> = ({ gig, onView }) => (
  <div onClick={() => onView(gig)} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full">
    <div className="h-40 bg-gray-200 relative overflow-hidden">
      <img src={gig.images[0]} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">{gig.category}</span>
    </div>
    <div className="p-4 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-3">
        <img src={gig.vendorAvatar} className="w-6 h-6 rounded-full border border-gray-100" />
        <p className="text-xs font-bold text-gray-900 truncate">{gig.vendorName}</p>
      </div>
      <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-indigo-600 transition-colors font-heading">{gig.title}</h3>
      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-800">★ {gig.rating}</span>
        <p className="font-bold text-gray-900 text-sm">₦{gig.startingPrice.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

const RentalCard: React.FC<{ rental: RentalListing; onRent: (r: RentalListing) => void }> = ({ rental, onRent }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
    <div className="h-40 bg-gray-200 relative overflow-hidden">
      <img src={rental.image} alt={rental.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <span className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">{rental.category}</span>
    </div>
    <div className="p-4">
      <h3 className="font-bold text-gray-900 truncate font-heading">{rental.title}</h3>
      <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-50">
        <p className="font-bold text-purple-700">₦{rental.pricePerDay.toLocaleString()}<span className="text-xs font-normal text-gray-500">/day</span></p>
        <button onClick={() => onRent(rental)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm">Rent</button>
      </div>
    </div>
  </div>
);

const VendorCard: React.FC<{ vendor: Vendor; onVisit: (v: Vendor) => void }> = ({ vendor, onVisit }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
    <div className="h-36 bg-gray-100 relative">
      <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
      {vendor.isVerified && <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">✓ Verified</span>}
    </div>
    <div className="p-4">
      <h3 className="font-bold text-gray-900 truncate text-lg font-heading">{vendor.name}</h3>
      <p className="text-xs text-gray-500 mb-4">📍 {vendor.location}</p>
      <button onClick={() => onVisit(vendor)} className="w-full bg-gray-900 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-black transition-colors">Visit Store</button>
    </div>
  </div>
);

// --- Modals ---

const ProductDetailModal: React.FC<any> = ({ product, onClose, onAddToCart }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl max-w-lg w-full p-6 relative">
      <button onClick={onClose} className="absolute top-2 right-2 text-2xl">×</button>
      <img src={product.image} className="w-full h-64 object-cover rounded-lg mb-4" />
      <h2 className="text-2xl font-bold">{product.title}</h2>
      <p className="text-xl font-bold text-green-700 my-2">₦{product.price.toLocaleString()}</p>
      <p className="text-gray-600 mb-4">{product.description}</p>
      <button onClick={() => onAddToCart(product)} className="w-full bg-black text-white py-3 rounded-lg font-bold">Add to Cart</button>
    </div>
  </div>
);

const GigDetailModal: React.FC<any> = ({ gig, onClose, onBook }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl max-w-lg w-full p-6 relative">
      <button onClick={onClose} className="absolute top-2 right-2 text-2xl">×</button>
      <h2 className="text-xl font-bold mb-2">{gig.title}</h2>
      <p className="text-sm text-gray-500 mb-4">By {gig.vendorName}</p>
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <p className="font-bold">Basic Package</p>
        <p className="text-green-700 font-bold">₦{gig.startingPrice.toLocaleString()}</p>
      </div>
      <button onClick={() => onBook('Basic', gig.startingPrice)} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Book Now</button>
    </div>
  </div>
);

const RentalBookingModal: React.FC<any> = ({ rental, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl max-w-sm w-full p-6 relative">
      <button onClick={onClose} className="absolute top-2 right-2 text-2xl">×</button>
      <h2 className="text-lg font-bold mb-4">Rent {rental.title}</h2>
      <button onClick={() => onConfirm('2024-01-01', 1)} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold">Confirm Rental</button>
    </div>
  </div>
);

// --- SELLER MODAL ---
interface SellerModalProps {
  user: User;
  onClose: () => void;
  onAddItem: (item: any, type: 'PRODUCT' | 'GIG' | 'RENTAL') => void;
}

const SellerModal: React.FC<SellerModalProps> = ({ user, onClose, onAddItem }) => {
  const [type, setType] = useState<'PRODUCT' | 'GIG' | 'RENTAL'>('PRODUCT');
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: 'General',
    image: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      id: Date.now().toString(),
      vendorId: user.id || 'u1',
      vendorName: user.businessName,
      vendorAvatar: user.logo || 'https://via.placeholder.com/50',
      ...formData,
      price: parseFloat(formData.price),
      startingPrice: parseFloat(formData.price),
      pricePerDay: parseFloat(formData.price),
      condition: 'New',
      location: user.location || 'Lagos',
      isVerified: false,
      rating: 5.0,
      images: [formData.image],
      packages: type === 'GIG' ? [{ name: 'Basic', price: parseFloat(formData.price), description: 'Standard Service', features: ['Consultation'] }] : undefined
    };
    onAddItem(newItem, type);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl text-gray-900">List an Item</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl">×</button>
        </div>

        <div className="flex gap-2 mb-6">
          {['PRODUCT', 'GIG', 'RENTAL'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border ${type === t ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {t === 'GIG' ? 'Service' : t === 'PRODUCT' ? 'Product' : 'Rental'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
            <input required className="w-full p-3 border rounded-lg" placeholder="e.g. Red Shoe" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (₦)</label>
            <input required type="number" className="w-full p-3 border rounded-lg" placeholder="5000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
            <select className="w-full p-3 border rounded-lg" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="General">General</option>
              <option value="Fashion">Fashion</option>
              <option value="Food">Food</option>
              <option value="Tech">Tech</option>
              <option value="Services">Services</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
            <textarea required className="w-full p-3 border rounded-lg" rows={3} placeholder="Describe your item..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm" />
            {formData.image && <img src={formData.image} className="h-20 mt-2 rounded border" />}
          </div>

          <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 mt-4">
            Post Listing
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main Marketplace Component ---

const Marketplace: React.FC<MarketplaceProps> = ({ onAddToCart, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'SERVICES' | 'RENTALS' | 'PRODUCTS'>('VENDORS');
  const [searchQuery, setSearchQuery] = useState('');

  // Local State for Data (so we can add to it)
  const [vendors] = useState<Vendor[]>(initialVendors);
  const [products, setProducts] = useState<ProductListing[]>(initialProducts);
  const [gigs, setGigs] = useState<ServiceGig[]>(initialGigs);
  const [rentals, setRentals] = useState<RentalListing[]>(initialRentals);

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'All',
    minPrice: '',
    maxPrice: '',
    location: ''
  });

  // Navigation State
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedGig, setSelectedGig] = useState<ServiceGig | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductListing | null>(null);
  const [bookingRental, setBookingRental] = useState<RentalListing | null>(null);
  const [showSellerModal, setShowSellerModal] = useState(false);

  const [showGigPayment, setShowGigPayment] = useState(false);
  const [gigPaymentDetails, setGigPaymentDetails] = useState<{ pkg: string, price: number } | null>(null);

  // Map State
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [searchResultText, setSearchResultText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Reset filters when tab changes to avoid confusion
    setFilters({ category: 'All', minPrice: '', maxPrice: '', location: '' });
  }, [activeTab]);

  const handleManualSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const result: VendorSearchResponse = await searchLocalVendors(searchQuery);
      setSearchResultText(result.text || '');
      setNearbyPlaces(result.places);
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const handleAddItem = (item: any, type: string) => {
    if (type === 'PRODUCT') setProducts([item, ...products]);
    if (type === 'GIG') setGigs([item, ...gigs]);
    if (type === 'RENTAL') setRentals([item, ...rentals]);
    alert("Listing Created Successfully!");
  };

  const uniqueCategories = () => {
    let items: any[] = [];
    if (activeTab === 'PRODUCTS') items = products;
    if (activeTab === 'SERVICES') items = gigs;
    if (activeTab === 'RENTALS') items = rentals;
    if (activeTab === 'VENDORS') items = vendors;

    const cats = Array.from(new Set(items.map(i => i.category)));
    return ['All', ...cats];
  };

  const applyFilters = (items: any[]) => {
    return items.filter(item => {
      // Category
      if (filters.category !== 'All' && item.category !== filters.category) return false;

      // Location
      if (filters.location) {
        const loc = item.location || '';
        if (!loc.toLowerCase().includes(filters.location.toLowerCase())) return false;
      }

      // Price (Skip for vendors as they don't have a single price)
      if (activeTab !== 'VENDORS') {
        const price = item.price || item.startingPrice || item.pricePerDay || 0;
        if (filters.minPrice && price < Number(filters.minPrice)) return false;
        if (filters.maxPrice && price > Number(filters.maxPrice)) return false;
      }

      return true;
    });
  };

  const filteredVendors = applyFilters(vendors);
  const filteredProducts = applyFilters(products);
  const filteredGigs = applyFilters(gigs);
  const filteredRentals = applyFilters(rentals);

  // Vendor View
  if (selectedVendor) {
    return (
      <div className="max-w-4xl mx-auto">
        <VendorStore
          vendor={selectedVendor}
          products={products.filter(p => p.vendorId === selectedVendor.id)}
          services={gigs.filter(g => g.vendorId === selectedVendor.id)}
          rentals={rentals.filter(r => r.vendorId === selectedVendor.id)}
          onBack={() => setSelectedVendor(null)}
          onBookService={setSelectedGig}
          onAddToCart={onAddToCart}
          onRentItem={setBookingRental}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-gray-900">Market Square 🛒</h2>
          <p className="text-gray-600 text-sm mt-1">Connect with vendors, book services, rent equipment, and trade.</p>
        </div>
        {currentUser && (
          <button
            onClick={() => setShowSellerModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2"
          >
            <span>+</span> Sell Something
          </button>
        )}
      </div>

      {/* Search Bar & Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search market..."
            className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={handleManualSearch} className="bg-gray-900 text-white px-6 rounded-xl font-bold">{isSearching ? '...' : 'Search'}</button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 rounded-xl border font-bold flex items-center gap-2 ${showFilters ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-700'}`}
        >
          <span>Filters</span>
          <span className="text-[10px]">{showFilters ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
              <select
                className="w-full p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                {uniqueCategories().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {activeTab !== 'VENDORS' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Price (₦)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Price (₦)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className={activeTab === 'VENDORS' ? 'md:col-span-3' : ''}>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. Ikeja"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setFilters({ category: 'All', minPrice: '', maxPrice: '', location: '' })}
              className="text-xs text-red-500 font-bold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {searchResultText && (
        <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-gray-700">
          <p>{searchResultText}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
        {[{ id: 'VENDORS', l: 'Vendors' }, { id: 'PRODUCTS', l: 'Products' }, { id: 'SERVICES', l: 'Services' }, { id: 'RENTALS', l: 'Rentals' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-5 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}
          >
            {tab.l}
          </button>
        ))}
      </div>

      {/* VENDORS */}
      {activeTab === 'VENDORS' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.length === 0 && <div className="col-span-full text-center text-gray-500 py-10">No vendors found matching filters.</div>}
          {filteredVendors.map(v => <VendorCard key={v.id} vendor={v} onVisit={setSelectedVendor} />)}
        </div>
      )}

      {/* PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProducts.length === 0 && <div className="col-span-full text-center text-gray-500 py-10">No products found matching filters.</div>}
          {filteredProducts.map(p => <ProductCard key={p.id} product={p} onView={setSelectedProduct} onAddToCart={(itm) => onAddToCart && onAddToCart(itm)} />)}
        </div>
      )}

      {/* SERVICES */}
      {activeTab === 'SERVICES' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGigs.length === 0 && <div className="col-span-full text-center text-gray-500 py-10">No services found matching filters.</div>}
          {filteredGigs.map(g => <GigCard key={g.id} gig={g} onView={setSelectedGig} />)}
        </div>
      )}

      {/* RENTALS */}
      {activeTab === 'RENTALS' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRentals.length === 0 && <div className="col-span-full text-center text-gray-500 py-10">No rentals found matching filters.</div>}
          {filteredRentals.map(r => <RentalCard key={r.id} rental={r} onRent={setBookingRental} />)}
        </div>
      )}

      {/* Modals */}
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p: any) => { onAddToCart && onAddToCart(p); setSelectedProduct(null); }} />}
      {selectedGig && <GigDetailModal gig={selectedGig} onClose={() => setSelectedGig(null)} onBook={(pkg: string, price: number) => { setGigPaymentDetails({ pkg, price }); setShowGigPayment(true); }} />}

      {showGigPayment && (
        <PaymentModal
          amount={gigPaymentDetails?.price || 0}
          description="Service Booking"
          email={currentUser?.email}
          onClose={() => setShowGigPayment(false)}
          onSuccess={() => { setShowGigPayment(false); alert("Paid!"); setSelectedGig(null); }}
        />
      )}

      {bookingRental && <RentalBookingModal rental={bookingRental} onClose={() => setBookingRental(null)} onConfirm={() => { alert("Booked!"); setBookingRental(null); }} />}

      {showSellerModal && currentUser && (
        <SellerModal
          user={currentUser}
          onClose={() => setShowSellerModal(false)}
          onAddItem={handleAddItem}
        />
      )}
    </div>
  );
};

export { ProductCard, GigCard, RentalCard }; // Export for VendorStore
export default Marketplace;
