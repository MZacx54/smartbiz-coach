
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    onClick={() => onView(product)}
    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-orange-500/10 transition-all cursor-pointer group flex flex-col h-full"
  >
    <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden">
      <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md ${product.condition === 'New' ? 'bg-green-500/90 text-white' : 'bg-orange-500/90 text-white'}`}>{product.condition}</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
    <div className="p-5 flex flex-col flex-1">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">{product.title}</h3>
      </div>
      <p className="text-[11px] text-gray-400 mb-4 flex items-center gap-1">
        <span className="opacity-50">📍</span> {product.location}
      </p>
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Starting from</p>
          <p className="font-extrabold text-gray-900 text-lg font-heading">₦{product.price.toLocaleString()}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          className="bg-slate-900 hover:bg-orange-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95"
        >
          <span className="text-xl">+</span>
        </button>
      </div>
    </div>
  </motion.div>
);

const GigCard: React.FC<{ gig: ServiceGig; onView: (g: ServiceGig) => void }> = ({ gig, onView }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    onClick={() => onView(gig)}
    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer group flex flex-col h-full"
  >
    <div className="h-48 bg-gray-50 relative overflow-hidden">
      <img src={gig.images[0]} alt={gig.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-3 left-3">
        <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm">{gig.category}</span>
      </div>
      {gig.isOnline && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm animate-pulse">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Online
        </div>
      )}
    </div>
    <div className="p-5 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <img src={gig.vendorAvatar} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-900 leading-none">{gig.vendorName}</p>
          <p className="text-[9px] text-gray-400 font-medium uppercase tracking-tight">{gig.vendorLevel}</p>
        </div>
      </div>
      <h3 className="font-bold text-gray-900 text-sm mb-3 line-clamp-2 leading-normal group-hover:text-indigo-600 transition-colors font-heading">{gig.title}</h3>
      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-orange-400 text-xs">★</span>
          <span className="text-xs font-bold text-gray-700">{gig.rating}</span>
          <span className="text-[10px] text-gray-400">({gig.reviewsCount})</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Starts at</p>
          <p className="font-extrabold text-indigo-600 text-base">₦{gig.startingPrice.toLocaleString()}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

const RentalCard: React.FC<{ rental: RentalListing; onRent: (r: RentalListing) => void }> = ({ rental, onRent }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl transition-all group"
  >
    <div className="h-44 bg-gray-50 relative overflow-hidden">
      <img src={rental.image} alt={rental.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-purple-700 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider">{rental.category}</span>
    </div>
    <div className="p-5">
      <h3 className="font-bold text-gray-900 truncate font-heading group-hover:text-purple-600 transition-colors mb-4">{rental.title}</h3>
      <div className="flex justify-between items-center pt-4 border-t border-gray-50">
        <div>
          <p className="text-lg font-black text-slate-800">₦{rental.pricePerDay.toLocaleString()}<span className="text-[10px] font-bold text-gray-400 uppercase ml-1">/ day</span></p>
        </div>
        <button onClick={() => onRent(rental)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95">Rent Now</button>
      </div>
    </div>
  </motion.div>
);

const VendorCard: React.FC<{ vendor: Vendor; onVisit: (v: Vendor) => void }> = ({ vendor, onVisit }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl transition-all group p-4"
  >
    <div className="h-40 relative rounded-2xl overflow-hidden mb-4">
      <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      {vendor.isVerified && (
        <span className="absolute top-3 right-3 bg-blue-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg"> Verified </span>
      )}
      <div className="absolute bottom-3 left-3 text-white">
        <p className="text-[10px] font-bold opacity-80 flex items-center gap-1">
          <span className="text-xs">📍</span> {vendor.location}
        </p>
      </div>
    </div>
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 text-xl font-heading leading-tight truncate mr-2">{vendor.name}</h3>
        <div className="flex items-center bg-gray-50 px-2 py-1 rounded-lg">
          <span className="text-orange-400 text-xs">★</span>
          <span className="text-xs font-bold ml-1">{vendor.rating}</span>
        </div>
      </div>
      <button
        onClick={() => onVisit(vendor)}
        className="w-full bg-slate-100 group-hover:bg-slate-900 text-slate-900 group-hover:text-white text-xs font-bold py-3 rounded-xl transition-all shadow-sm active:scale-[0.98]"
      >
        Visit Storefront
      </button>
    </div>
  </motion.div>
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
      const response: VendorSearchResponse = await searchLocalVendors(searchQuery);
      setSearchResultText(response.text || '');
      setNearbyPlaces(response.places || []);
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
    <div className="max-w-6xl mx-auto pb-10">
      {/* Premium Hero Section */}
      <section className="relative mb-12 rounded-3xl overflow-hidden bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/20 to-transparent pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest mb-6">
              Official B2B Marketplace
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold font-heading mb-6 leading-tight">
              Fuel Your Business with <span className="text-orange-500">Premium Supplies</span>
            </h1>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Find verified wholesalers, book pro services, and scale your operations with the most trusted network in Nigeria.
            </p>

            <div className="flex flex-wrap gap-4">
              {currentUser && (
                <button
                  onClick={() => setShowSellerModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 group"
                >
                  List Your Products <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              )}
              <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 px-8 py-3.5 rounded-xl font-bold transition-all">
                Wholesale Deals
              </button>
            </div>
          </motion.div>
        </div>

        {/* Floating Stat badges for decoration */}
        <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 space-y-4">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl w-48"
          >
            <div className="text-orange-500 text-xl mb-1">✓</div>
            <div className="text-sm font-bold">Verified Vendors</div>
            <div className="text-xs text-slate-500">100% Quality Assurance</div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl w-48 ml-8"
          >
            <div className="text-indigo-400 text-xl mb-1">🚀</div>
            <div className="text-sm font-bold">Fast Delivery</div>
            <div className="text-xs text-slate-500">Lagos-wide & Nationwide</div>
          </motion.div>
        </div>
      </section>

      {/* Search & Tabs Header Container */}
      <div className="sticky top-0 z-30 bg-gray-50/80 backdrop-blur-md pt-4 pb-6 mb-8 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          {/* Custom Tabs */}
          <div className="flex bg-gray-200/50 p-1.5 rounded-2xl self-start">
            {[
              { id: 'VENDORS', l: 'All Vendors', i: '🏪' },
              { id: 'PRODUCTS', l: 'Shop Products', i: '📦' },
              { id: 'SERVICES', l: 'Pro Services', i: '🛠️' },
              { id: 'RENTALS', l: 'Equipment Rental', i: '🏗️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <span>{tab.i}</span>
                <span>{tab.l}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-96 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={`Search in ${activeTab.toLowerCase()}...`}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-gray-200 bg-white outline-none focus:border-orange-500 focus:ring-0 transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl border-2 transition-all ${showFilters
                ? 'bg-orange-50 border-orange-200 text-orange-600'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <motion.div
        initial={false}
        animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
        className="overflow-hidden mb-8"
      >
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center md:text-left">Category</label>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {uniqueCategories().map(c => (
                  <button
                    key={c}
                    onClick={() => setFilters({ ...filters, category: c })}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${filters.category === c
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {activeTab !== 'VENDORS' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Price Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-1/2 p-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 outline-none focus:border-orange-500"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    />
                    <input
                      type="number"
                      className="w-1/2 p-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 outline-none focus:border-orange-500"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
            <div className={activeTab === 'VENDORS' ? 'md:col-span-3' : 'md:col-span-2'}>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Primary Location</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm outline-none focus:border-orange-500"
                  placeholder="Filter by city (e.g. Lagos, Abuja...)"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30">📍</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 italic">Finding the best matches for your business...</p>
            <button
              onClick={() => setFilters({ category: 'All', minPrice: '', maxPrice: '', location: '' })}
              className="text-xs text-orange-600 font-bold hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      </motion.div>

      {/* Grid Content with Staggered Animations */}
      <motion.div
        key={activeTab}
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
      >
        {/* VENDORS */}
        {activeTab === 'VENDORS' && (
          <>
            {filteredVendors.length === 0 && <div className="col-span-full text-center text-gray-500 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 font-bold">No verified vendors found in this category.</div>}
            {filteredVendors.map(v => <VendorCard key={v.id} vendor={v} onVisit={setSelectedVendor} />)}
          </>
        )}

        {/* PRODUCTS */}
        {activeTab === 'PRODUCTS' && (
          <>
            {filteredProducts.length === 0 && <div className="col-span-full text-center text-gray-500 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 font-bold">No products found for your search.</div>}
            {filteredProducts.map(p => <ProductCard key={p.id} product={p} onView={setSelectedProduct} onAddToCart={(itm) => onAddToCart && onAddToCart(itm)} />)}
          </>
        )}

        {/* SERVICES */}
        {activeTab === 'SERVICES' && (
          <>
            {filteredGigs.length === 0 && <div className="col-span-full text-center text-gray-500 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 font-bold">No pro services found matching filters.</div>}
            {filteredGigs.map(g => <GigCard key={g.id} gig={g} onView={setSelectedGig} />)}
          </>
        )}

        {/* RENTALS */}
        {activeTab === 'RENTALS' && (
          <>
            {filteredRentals.length === 0 && <div className="col-span-full text-center text-gray-500 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 font-bold">No rental equipment available here.</div>}
            {filteredRentals.map(r => <RentalCard key={r.id} rental={r} onRent={setBookingRental} />)}
          </>
        )}
      </motion.div>

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
