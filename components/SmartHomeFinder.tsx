import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PropertyListing } from '../types';
import { analyzeNeighborhood } from '../services/geminiService';
import PaymentModal from './PaymentModal';

interface SmartHomeFinderProps {
    userEmail?: string;
}

// --- Mock Data ---
const mockListings: PropertyListing[] = [
    {
        id: 'h1', agentId: 'ag1', title: 'Newly Built Mini-Flat in Lekki Phase 1', type: 'Apartment', rentFrequency: 'Yearly', price: 2500000,
        location: { address: 'Admiralty Way', lga: 'Eti-Osa', state: 'Lagos' },
        features: { bedrooms: 1, bathrooms: 1, serviced: true, furnished: false, parkingSpace: true },
        naijaSpecs: { powerRating: 'Excellent', waterSource: 'Treatment Plant', floodFree: true, roadAccess: 'Tarred' },
        media: { images: ['https://via.placeholder.com/400x300/333/fff?text=Lekki+Flat'] },
        status: 'AVAILABLE',
        fees: { agencyFee: 250000, legalFee: 250000, cautionFee: 100000, inspectionFee: 5000 }
    },
    {
        id: 'h2', agentId: 'ag2', title: '3 Bedroom Bungalow', type: 'House', rentFrequency: 'Yearly', price: 1200000,
        location: { address: 'Akowonjo Road', lga: 'Alimosho', state: 'Lagos' },
        features: { bedrooms: 3, bathrooms: 3, serviced: false, furnished: false, parkingSpace: true },
        naijaSpecs: { powerRating: 'Average', waterSource: 'Borehole', floodFree: true, roadAccess: 'Tarred' },
        media: { images: ['https://via.placeholder.com/400x300/555/fff?text=Bungalow'] },
        status: 'AVAILABLE',
        fees: { agencyFee: 120000, legalFee: 120000, cautionFee: 50000, inspectionFee: 2000 }
    },
    {
        id: 'h3', agentId: 'ag3', title: 'Self Contain (Student Lodge)', type: 'Apartment', rentFrequency: 'Monthly', price: 80000,
        location: { address: 'Akoka, near Unilag', lga: 'Yaba', state: 'Lagos' },
        features: { bedrooms: 1, bathrooms: 1, serviced: false, furnished: true, parkingSpace: false },
        naijaSpecs: { powerRating: 'Poor', waterSource: 'Well', floodFree: false, roadAccess: 'Untarred' },
        media: { images: ['https://via.placeholder.com/400x300/777/fff?text=Student+Lodge'] },
        status: 'INSPECTION_PENDING',
        fees: { agencyFee: 20000, legalFee: 20000, cautionFee: 10000, inspectionFee: 1000 }
    }
];

const SmartHomeFinder: React.FC<SmartHomeFinderProps> = ({ userEmail }) => {
    const [listings, setListings] = useState<PropertyListing[]>(mockListings);
    const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
    const [showInspectionModal, setShowInspectionModal] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        maxPrice: 3000000,
        type: 'All',
        minPower: false,
        floodFree: false
    });

    // Neighborhood Analysis
    const [analysis, setAnalysis] = useState<{ security: string; traffic: string; power: string; overallVibe: string } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFilterChange = (key: string, value: any) => {
        setFilters({ ...filters, [key]: value });
    };

    const filteredListings = listings.filter(l => {
        if (l.price > filters.maxPrice) return false;
        if (filters.type !== 'All' && l.type !== filters.type) return false;
        if (filters.minPower && l.naijaSpecs.powerRating === 'Poor') return false;
        if (filters.floodFree && !l.naijaSpecs.floodFree) return false;
        return true;
    });

    const handleAnalyzeLocation = async (location: string) => {
        setIsAnalyzing(true);
        setAnalysis(null);
        try {
            const result = await analyzeNeighborhood(location);
            setAnalysis(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleBookInspection = () => {
        setShowInspectionModal(true);
    };

    const handleInspectionConfirmed = (provider: 'PAYSTACK' | 'SQUAD') => {
        setShowInspectionModal(false);
        alert(`Inspection Booked! The agent has been notified. You paid via ${provider}.`);
    };

    // --- Detail View ---
    if (selectedListing) {
        return (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right">
                <button onClick={() => setSelectedListing(null)} className="mb-4 text-sm font-bold text-gray-400 hover:text-gray-900 flex items-center gap-2">
                    <span>←</span> Back to Search
                </button>

                {/* Hero Image */}
                <div className="h-80 bg-gray-200 rounded-3xl overflow-hidden mb-8 relative shadow-xl">
                    <img src={selectedListing.media.images[0]} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black shadow-sm text-gray-800 uppercase tracking-widest">
                            {selectedListing.type}
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-black shadow-sm uppercase tracking-widest ${selectedListing.status === 'AVAILABLE' ? 'bg-green-500/90 text-white' : 'bg-yellow-500/90 text-white'}`}>
                            {selectedListing.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="absolute bottom-6 left-6 text-white text-shadow-lg">
                        <p className="text-sm font-bold opacity-90 mb-1 flex items-center gap-2">
                            <span className="text-lg">📍</span> {selectedListing.location.address}, {selectedListing.location.lga}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        {/* Title & Price */}
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 mb-2 leading-tight">{selectedListing.title}</h1>
                            <p className="text-3xl font-black text-indigo-600 mt-2">
                                ₦{selectedListing.price.toLocaleString()} <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">/ {selectedListing.rentFrequency}</span>
                            </p>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Core Features</h3>
                                <div className="space-y-3 text-sm font-bold text-slate-700">
                                    <p className="flex items-center gap-3">🛏️ {selectedListing.features.bedrooms} Bedrooms</p>
                                    <p className="flex items-center gap-3">🚿 {selectedListing.features.bathrooms} Bath/Toilet</p>
                                    <p className="flex items-center gap-3">🚗 {selectedListing.features.parkingSpace ? 'Ample Parking' : 'No Parking'}</p>
                                    <p className="flex items-center gap-3">🛋️ {selectedListing.features.furnished ? 'Furnished' : 'Unfurnished'}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm hover:border-indigo-200 transition-colors">
                                <h3 className="font-black text-indigo-600 text-[10px] uppercase tracking-widest mb-4">Naija Smart Specs</h3>
                                <div className="space-y-3 text-sm font-bold text-slate-700">
                                    <p className="flex justify-between items-center">
                                        <span className="text-gray-400">⚡ Power:</span>
                                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] uppercase">{selectedListing.naijaSpecs.powerRating}</span>
                                    </p>
                                    <p className="flex justify-between items-center">
                                        <span className="text-gray-400">🌊 Flood Free:</span>
                                        <span className={selectedListing.naijaSpecs.floodFree ? 'text-green-600' : 'text-red-600'}>{selectedListing.naijaSpecs.floodFree ? '✓ Yes' : '✗ Risky'}</span>
                                    </p>
                                    <p className="flex justify-between items-center">
                                        <span className="text-gray-400">🛣️ Access:</span>
                                        <span className="truncate ml-2">{selectedListing.naijaSpecs.roadAccess}</span>
                                    </p>
                                    <p className="flex justify-between items-center">
                                        <span className="text-gray-400">🚰 Water:</span>
                                        <span className="truncate ml-2">{selectedListing.naijaSpecs.waterSource}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Fees Breakdown */}
                        <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-6">Move-in Cost Breakdown</h3>
                            <div className="space-y-4 font-bold">
                                <div className="flex justify-between text-sm"><span>Yearly Rent</span><span>₦{selectedListing.price.toLocaleString()}</span></div>
                                <div className="flex justify-between text-sm text-slate-400"><span>Agency Fee</span><span>₦{selectedListing.fees.agencyFee.toLocaleString()}</span></div>
                                <div className="flex justify-between text-sm text-slate-400"><span>Legal Fee</span><span>₦{selectedListing.fees.legalFee.toLocaleString()}</span></div>
                                <div className="flex justify-between text-sm text-slate-400"><span>Caution Deposit</span><span>₦{selectedListing.fees.cautionFee.toLocaleString()}</span></div>
                                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-500 mb-1">Total Package</p>
                                        <p className="text-3xl font-black">₦{(selectedListing.price + selectedListing.fees.agencyFee + selectedListing.fees.legalFee + selectedListing.fees.cautionFee).toLocaleString()}</p>
                                    </div>
                                    <span className="text-[10px] text-indigo-400 uppercase font-black px-3 py-1 bg-indigo-500/10 rounded-full">Best Deal</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-8 shadow-inner shadow-indigo-100/50">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-indigo-900 flex items-center gap-3">
                                    <span className="bg-white p-2 rounded-xl shadow-sm">🤖</span>
                                    AI Lifestyle Analyst
                                </h3>
                                {!analysis && (
                                    <button
                                        onClick={() => handleAnalyzeLocation(`${selectedListing.location.lga}, ${selectedListing.location.state}`)}
                                        disabled={isAnalyzing}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        {isAnalyzing ? 'Simulating...' : 'Analyze Neighborhood'}
                                    </button>
                                )}
                            </div>

                            {analysis ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Security</p>
                                        <p className="text-sm font-bold text-slate-800">{analysis.security}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Mobility</p>
                                        <p className="text-sm font-bold text-slate-800">{analysis.traffic}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Grid Reliability</p>
                                        <p className="text-sm font-bold text-slate-800">{analysis.power}</p>
                                    </div>
                                    <div className="col-span-full mt-4 p-4 bg-indigo-600 text-white rounded-2xl italic font-medium text-sm text-center">
                                        "{analysis.overallVibe}"
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-indigo-700/60 font-medium text-center py-4 bg-white/40 rounded-2xl border border-dashed border-indigo-200">
                                    Unlock real-world data on traffic, security, and power history to avoid regret.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-slate-200/50 sticky top-4">
                            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-6">Next Action</p>
                            <button
                                onClick={handleBookInspection}
                                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all mb-4"
                            >
                                Book Physical Inspection
                            </button>
                            <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                                <span>💬</span> WhatsApp Agent
                            </button>

                            <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Inspection Fee</p>
                                <p className="text-xl font-black text-slate-800">₦{selectedListing.fees.inspectionFee.toLocaleString()}</p>
                                <p className="mt-4 text-[9px] text-gray-400 font-bold bg-gray-50 p-3 rounded-xl">
                                    This fee ensures we only deal with serious seekers and is fully refundable if you pay rent.
                                </p>
                            </div>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 flex gap-4">
                            <div className="text-2xl">⚠️</div>
                            <div>
                                <p className="text-xs font-black text-orange-900 uppercase">Fraud Protection</p>
                                <p className="text-[10px] text-orange-700/80 font-bold mt-1 leading-relaxed">
                                    Never pay rent or total package into a personal account. All payments on SmartBiz Coach are escrow-protected.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {showInspectionModal && (
                    <PaymentModal
                        amount={selectedListing.fees.inspectionFee}
                        description={`Inspection Fee: ${selectedListing.title}`}
                        email={userEmail}
                        onClose={() => setShowInspectionModal(false)}
                        onSuccess={handleInspectionConfirmed}
                    />
                )}
            </div>
        );
    }

    // --- List View ---
    return (
        <div className="max-w-6xl mx-auto pb-10">
            {/* Premium Hero Section */}
            <section className="relative mb-12 rounded-3xl overflow-hidden bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
                            SmartHome Finder AI 🏠
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold font-heading mb-6 leading-tight">
                            Find Your Next Home <span className="text-indigo-400">Without the Stress</span>
                        </h1>
                        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                            Every listing is verified for real light situation, flood history, and valid documentation. No fake agents, no "Face Me I Face You" surprises.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20">
                                My Saved Houses
                            </button>
                            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 px-8 py-3.5 rounded-xl font-bold transition-all">
                                Request Inspection
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Sticky Search & Filters */}
            <div className="sticky top-0 z-30 bg-gray-50/80 backdrop-blur-md pt-4 pb-6 mb-8 border-b border-gray-200">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full bg-white p-2 rounded-2xl border-2 border-gray-100 flex items-center gap-4 shadow-sm shadow-indigo-100/50">
                        <div className="flex-1 flex flex-col px-4 border-r border-gray-100">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Budget (Yearly)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range" min="100000" max="10000000" step="100000"
                                    value={filters.maxPrice}
                                    onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                                    className="w-full accent-indigo-600 h-1.5"
                                />
                                <span className="text-xs font-bold text-indigo-600 whitespace-nowrap min-w-[50px]">₦{(filters.maxPrice / 1000000).toFixed(1)}M</span>
                            </div>
                        </div>
                        <div className="px-4 border-r border-gray-100 min-w-[150px]">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Property Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="w-full text-sm font-bold text-gray-900 bg-transparent outline-none cursor-pointer"
                            >
                                <option value="All">Anything</option>
                                <option value="Apartment">Apartment</option>
                                <option value="House">House</option>
                                <option value="Office">Office</option>
                            </select>
                        </div>
                        <div className="px-4 flex gap-2">
                            <button
                                onClick={() => handleFilterChange('minPower', !filters.minPower)}
                                className={`p-2.5 rounded-xl transition-all ${filters.minPower ? 'bg-yellow-100 text-yellow-600 shadow-sm border border-yellow-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                title="Minimum 24h Light"
                            >
                                ⚡
                            </button>
                            <button
                                onClick={() => handleFilterChange('floodFree', !filters.floodFree)}
                                className={`p-2.5 rounded-xl transition-all ${filters.floodFree ? 'bg-blue-100 text-blue-600 shadow-sm border border-blue-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                title="Verified Dry Land"
                            >
                                🌊
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Listings Grid */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                {filteredListings.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 font-bold text-gray-400 uppercase tracking-widest">
                        We couldn't find matches for this budget.
                    </div>
                )}
                {filteredListings.map(listing => (
                    <motion.div
                        key={listing.id}
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 }
                        }}
                        className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer group flex flex-col h-full"
                        onClick={() => setSelectedListing(listing)}
                    >
                        <div className="h-56 bg-gray-50 relative overflow-hidden">
                            <img src={listing.media.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                                {listing.naijaSpecs.powerRating === 'Excellent' && <span className="bg-yellow-400/90 backdrop-blur-md text-black text-[9px] font-black px-3 py-1 rounded-full shadow-sm uppercase">⚡ 24h Light</span>}
                                {listing.naijaSpecs.floodFree && <span className="bg-blue-500/90 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full shadow-sm uppercase">🌊 Dry Land</span>}
                            </div>
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-gray-800 shadow-sm">
                                {listing.location.lga}
                            </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                            <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1">{listing.title}</h3>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{listing.type}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs font-bold text-gray-400">{listing.features.bedrooms} Bed • {listing.features.bathrooms} Bath</span>
                            </div>

                            <div className="mt-auto flex justify-between items-end pt-5 border-t border-gray-50">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Total Price</p>
                                    <p className="text-2xl font-black text-slate-800">₦{(listing.price / 1000000).toFixed(1)}M <span className="text-xs font-bold text-gray-400 uppercase">/YR</span></p>
                                </div>
                                <div className="bg-gray-100 group-hover:bg-indigo-600 text-gray-500 group-hover:text-white w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90">
                                    <span className="text-xl">→</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default SmartHomeFinder;
