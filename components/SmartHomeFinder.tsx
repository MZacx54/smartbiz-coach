
import React, { useState } from 'react';
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
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right">
                <button onClick={() => setSelectedListing(null)} className="mb-4 text-sm font-bold text-gray-500 hover:text-gray-900">← Back to Listings</button>

                {/* Hero Image */}
                <div className="h-64 bg-gray-200 rounded-xl overflow-hidden mb-6 relative">
                    <img src={selectedListing.media.images[0]} className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 rounded-lg text-xs font-bold shadow-sm text-gray-800">
                        📍 {selectedListing.location.address}, {selectedListing.location.lga}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Title & Price */}
                        <div>
                            <div className="flex justify-between items-start">
                                <h1 className="text-2xl font-bold text-gray-900">{selectedListing.title}</h1>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${selectedListing.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {selectedListing.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-indigo-700 mt-2">
                                ₦{selectedListing.price.toLocaleString()} <span className="text-sm font-normal text-gray-500">/{selectedListing.rentFrequency}</span>
                            </p>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h3 className="font-bold text-gray-500 text-xs uppercase mb-2">Features</h3>
                                <div className="space-y-1 text-sm text-gray-800">
                                    <p>🛏️ {selectedListing.features.bedrooms} Bedrooms</p>
                                    <p>🚿 {selectedListing.features.bathrooms} Bathrooms</p>
                                    <p>🅿️ {selectedListing.features.parkingSpace ? 'Parking Available' : 'No Parking'}</p>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <h3 className="font-bold text-blue-800 text-xs uppercase mb-2">Naija Specs</h3>
                                <div className="space-y-1 text-sm text-blue-900">
                                    <p>⚡ Power: <strong>{selectedListing.naijaSpecs.powerRating}</strong></p>
                                    <p>🌊 Flood Free: <strong>{selectedListing.naijaSpecs.floodFree ? 'Yes' : 'No'}</strong></p>
                                    <p>🛣️ Road: <strong>{selectedListing.naijaSpecs.roadAccess}</strong></p>
                                </div>
                            </div>
                        </div>

                        {/* Fees Breakdown */}
                        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-4">
                            <h3 className="font-bold text-gray-900 mb-3">Total Move-in Cost</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Rent</span><span>₦{selectedListing.price.toLocaleString()}</span></div>
                                <div className="flex justify-between text-gray-600"><span>Agency Fee</span><span>₦{selectedListing.fees.agencyFee.toLocaleString()}</span></div>
                                <div className="flex justify-between text-gray-600"><span>Legal Fee</span><span>₦{selectedListing.fees.legalFee.toLocaleString()}</span></div>
                                <div className="flex justify-between text-gray-600"><span>Caution Fee</span><span>₦{selectedListing.fees.cautionFee.toLocaleString()}</span></div>
                                <div className="border-t pt-2 flex justify-between font-bold text-lg mt-2">
                                    <span>Total</span>
                                    <span>₦{(selectedListing.price + selectedListing.fees.agencyFee + selectedListing.fees.legalFee + selectedListing.fees.cautionFee).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-purple-900 flex items-center gap-2"><span>🤖</span> AI Neighborhood Analyst</h3>
                                {!analysis && (
                                    <button
                                        onClick={() => handleAnalyzeLocation(`${selectedListing.location.lga}, ${selectedListing.location.state}`)}
                                        disabled={isAnalyzing}
                                        className="text-xs bg-white text-purple-700 px-3 py-1 rounded border border-purple-200 font-bold hover:bg-purple-100 disabled:opacity-50"
                                    >
                                        {isAnalyzing ? 'Analyzing...' : 'Analyze Area'}
                                    </button>
                                )}
                            </div>

                            {analysis ? (
                                <div className="space-y-3 text-sm animate-in fade-in">
                                    <div className="bg-white/60 p-2 rounded">
                                        <span className="font-bold text-purple-800">🛡️ Security:</span> {analysis.security}
                                    </div>
                                    <div className="bg-white/60 p-2 rounded">
                                        <span className="font-bold text-purple-800">🚦 Traffic:</span> {analysis.traffic}
                                    </div>
                                    <div className="bg-white/60 p-2 rounded">
                                        <span className="font-bold text-purple-800">⚡ Power:</span> {analysis.power}
                                    </div>
                                    <div className="italic text-gray-600 mt-2">"{analysis.overallVibe}"</div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">Tap Analyze to see what the AI thinks about security, light, and traffic in this area.</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-4">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Interested?</p>
                            <button
                                onClick={handleBookInspection}
                                className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 mb-3"
                            >
                                Book Inspection
                            </button>
                            <button className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 flex items-center justify-center gap-2">
                                <span>💬</span> Chat Agent
                            </button>

                            <div className="mt-4 text-xs text-center text-gray-500">
                                <p>Inspection Fee: <span className="font-bold text-gray-900">₦{selectedListing.fees.inspectionFee.toLocaleString()}</span></p>
                                <p className="mt-1 opacity-70">Fee is refundable if property is taken.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                            <p className="text-xs text-red-800 font-bold">Safety Tip</p>
                            <p className="text-[10px] text-red-600 mt-1">Do not pay rent before inspection. Only pay into verified agency accounts.</p>
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
        <div className="max-w-4xl mx-auto animate-in fade-in">
            <div className="mb-8 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900">SmartHome Finder 🏠</h2>
                <p className="text-gray-600 text-sm mt-1">Find your next home with peace of mind. No fake agents.</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Budget (Yearly)</label>
                    <input
                        type="range" min="100000" max="10000000" step="100000"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                        className="w-full accent-indigo-600"
                    />
                    <div className="text-sm font-bold text-indigo-700">₦{filters.maxPrice.toLocaleString()}</div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Property Type</label>
                    <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                        <option value="All">All Types</option>
                        <option value="Apartment">Apartment/Flat</option>
                        <option value="House">House/Duplex</option>
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleFilterChange('minPower', !filters.minPower)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${filters.minPower ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                        ⚡ Good Light
                    </button>
                    <button
                        onClick={() => handleFilterChange('floodFree', !filters.floodFree)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${filters.floodFree ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                        🌊 Flood Free
                    </button>
                </div>
            </div>

            {/* Listings Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        No houses match your specific taste. Try adjusting the budget.
                    </div>
                )}
                {filteredListings.map(listing => (
                    <div
                        key={listing.id}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => setSelectedListing(listing)}
                    >
                        <div className="h-48 bg-gray-200 relative">
                            <img src={listing.media.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-2 right-2 flex gap-1">
                                {listing.naijaSpecs.powerRating === 'Excellent' && <span className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded shadow">⚡ 24h Light</span>}
                                {listing.naijaSpecs.floodFree && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow">🌊 Dry Land</span>}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-900 truncate flex-1">{listing.title}</h3>
                            </div>
                            <p className="text-gray-500 text-xs mb-3 truncate">📍 {listing.location.address}, {listing.location.lga}</p>

                            <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                                <div>
                                    <p className="text-lg font-bold text-indigo-700">₦{(listing.price / 1000000).toFixed(1)}M</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{listing.rentFrequency}</p>
                                </div>
                                <div className="text-xs text-gray-600 font-medium">
                                    {listing.features.bedrooms} Bed • {listing.features.bathrooms} Bath
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SmartHomeFinder;
