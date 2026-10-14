import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { runPrecisionStudio, generateStudioPhotoshoot } from '../services/geminiService';
import { billingService } from '../services/billingService';
import api from '../services/api';

interface PhotoStudioProps {
    credits: number;
    onUpdateCredits: (newCredits: number) => void;
    businessName?: string;
}

type StudioTheme = 'pure_white' | 'warm_wood' | 'studio_grey' | 'transparent';

interface ThemeOption {
    id: StudioTheme;
    name: string;
    subtitle: string;
    icon: string;
    badge: string;
    previewBg: string;
}

const THEME_OPTIONS: ThemeOption[] = [
    {
        id: 'pure_white',
        name: 'Pure Studio White',
        subtitle: 'Jumia, Konga & Amazon E-Commerce standard',
        icon: '⚪',
        badge: 'Top Seller',
        previewBg: 'bg-white text-slate-800 border-slate-300'
    },
    {
        id: 'warm_wood',
        name: 'Warm Oak Counter',
        subtitle: 'Natural boutique table with soft daylight',
        icon: '🪵',
        badge: 'Artisanal & Cozy',
        previewBg: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    {
        id: 'studio_grey',
        name: 'Minimal Studio Grey',
        subtitle: 'Clean luxury slate with soft gradient fill',
        icon: '🏢',
        badge: 'Modern Luxury',
        previewBg: 'bg-slate-200 text-slate-800 border-slate-400'
    },
    {
        id: 'transparent',
        name: 'Transparent PNG Cutout',
        subtitle: 'Zero background for flyers, posters & stickers',
        icon: '🏁',
        badge: 'Graphic Ready',
        previewBg: 'bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:8px_8px] bg-slate-900 text-white border-slate-700'
    }
];

export const PhotoStudio: React.FC<PhotoStudioProps> = ({
    credits,
    onUpdateCredits,
    businessName = 'SmartBiz Merchant'
}) => {
    // 1. Source Photo State
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [rawFileName, setRawFileName] = useState<string>('product_photo.jpg');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // 2. Studio Theme Selection
    const [selectedTheme, setSelectedTheme] = useState<StudioTheme>('pure_white');

    // 3. Generation & Result State
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationStep, setGenerationStep] = useState<string>('');
    const [studioResult, setStudioResult] = useState<string | null>(null);
    const [transparentCutout, setTransparentCutout] = useState<string | null>(null);
    const [detectedTitle, setDetectedTitle] = useState<string>('Commercial Product');
    const [detectedPrice, setDetectedPrice] = useState<string>('5,000');

    // 4. Comparison View Mode & Split Slider
    const [viewMode, setViewMode] = useState<'SLIDER' | 'SIDE_BY_SIDE'>('SLIDER');
    const [sliderPos, setSliderPos] = useState<number>(50);
    const isDraggingRef = useRef<boolean>(false);
    const compareContainerRef = useRef<HTMLDivElement>(null);

    // 5. Smart Price & Name Tag Badge
    const [showBadge, setShowBadge] = useState<boolean>(true);
    const [badgeTitle, setBadgeTitle] = useState<string>('');
    const [badgePrice, setBadgePrice] = useState<string>('');
    const [badgePromo, setBadgePromo] = useState<string>('VERIFIED QUALITY');
    const [badgeTheme, setBadgeTheme] = useState<'emerald' | 'gold' | 'ruby' | 'dark'>('emerald');
    const [badgePosition, setBadgePosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('bottom-right');

    // 6. Save to Catalog Modal
    const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
    const [productCategory, setProductCategory] = useState<string>('General Merchandise');
    const [isSavingToCatalog, setIsSavingToCatalog] = useState<boolean>(false);

    // Instant Demo Sample
    const loadSampleProduct = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 750;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Simulated patterned bedsheet/floor background
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, 600, 750);
            ctx.fillStyle = '#e2e8f0';
            for (let i = 0; i < 750; i += 30) {
                ctx.fillRect(0, i, 600, 2);
            }
            for (let j = 0; j < 600; j += 30) {
                ctx.fillRect(j, 0, 2, 750);
            }

            // Simulated retail item (Mobile Pocket WiFi Device)
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(170, 220, 260, 360, [36]);
            ctx.fill();

            // Screen/Face
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.roundRect(190, 250, 220, 220, [20]);
            ctx.fill();

            // Brand Logo
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(300, 320, 28, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('4G LTE', 300, 390);

            ctx.fillStyle = '#10b981';
            ctx.font = '13px sans-serif';
            ctx.fillText('WiFi Mobile Hotspot', 300, 420);

            // Power button
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(300, 520, 20, 0, Math.PI * 2);
            ctx.fill();

            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            setRawImage(dataUrl);
            setRawFileName('airtel_pocket_wifi_sample.jpg');
            setStudioResult(null);
            setTransparentCutout(null);
            toast.success('Loaded sample product photo!');
        }
    };

    // File Upload Handler with auto-downscaling
    const processUploadedFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (JPG, PNG, or WebP).');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            toast.error('Image size must be less than 15MB.');
            return;
        }

        setRawFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const maxDim = 1280;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, w, h);
                    setRawImage(canvas.toDataURL('image/jpeg', 0.9));
                } else {
                    setRawImage(result);
                }
                setStudioResult(null);
                setTransparentCutout(null);
                toast.success('Photo ready! Choose your studio style below.');
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    // Execute Precision AI Photoshoot
    const handleGenerateShoot = async () => {
        if (!rawImage) {
            toast.error('Please upload or snap a product photo first.');
            return;
        }

        const cost = 2;
        if (credits < cost) {
            toast.error(`Insufficient credits (Cost: ${cost} credits, Balance: ${credits}). Please top up!`);
            return;
        }

        setIsGenerating(true);
        setGenerationStep('Gemini Vision tracing exact product contour...');

        try {
            setTimeout(() => {
                if (isGenerating) {
                    setGenerationStep('Clearing bedsheet/floor clutter & feathers edges...');
                }
            }, 1500);

            setTimeout(() => {
                if (isGenerating) {
                    setGenerationStep('Applying studio background & realistic contact shadow...');
                }
            }, 3000);

            const response = await runPrecisionStudio(rawImage, selectedTheme);

            if (response && response.studio_image_base64) {
                const studioImg = response.studio_image_base64;
                const cutoutImg = response.transparent_cutout_base64 || response.transparent_image_base64;
                
                setStudioResult(studioImg);
                setTransparentCutout(cutoutImg || null);

                const title = response.product_title || 'Commercial Product';
                const price = response.suggested_price ? Number(response.suggested_price).toLocaleString() : '5,000';
                const cat = response.category || 'General Merchandise';

                setDetectedTitle(title);
                setDetectedPrice(price);
                setBadgeTitle(title);
                setBadgePrice(price);
                setProductCategory(cat);

                // Deduct credits
                try {
                    const billingRes = await billingService.deductCredits(cost, `AI Photo Studio - ${selectedTheme}`);
                    if (billingRes && typeof billingRes.credits === 'number') {
                        onUpdateCredits(billingRes.credits);
                    }
                } catch (bErr) {
                    console.warn('Billing notice:', bErr);
                }

                toast.success('✨ Professional Studio Photoshoot Ready!', { duration: 4000 });
            } else {
                throw new Error(response?.error || 'Photo Studio failed to generate clean image.');
            }
        } catch (err: any) {
            console.error('Photo Studio error:', err);
            toast.error(err.response?.data?.error || err.message || 'Failed to complete photoshoot. Please try again.');
        } finally {
            setIsGenerating(false);
            setGenerationStep('');
        }
    };

    // Slider dragging
    const handleSliderMove = (clientX: number) => {
        if (!compareContainerRef.current) return;
        const rect = compareContainerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const newPos = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
        setSliderPos(newPos);
    };

    // Bake image with optional price/name badge and download
    const handleDownload = (format: 'studio' | 'transparent' = 'studio') => {
        const targetImage = format === 'transparent' ? transparentCutout : studioResult;
        if (!targetImage) {
            toast.error('No processed image available.');
            return;
        }

        // If downloading transparent cutout or badge is off, direct download
        if (format === 'transparent' || !showBadge) {
            const link = document.createElement('a');
            link.href = targetImage;
            link.download = `smartbiz_${format === 'transparent' ? 'cutout' : 'studio'}_${Date.now()}.${format === 'transparent' ? 'png' : 'jpg'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Downloaded ${format === 'transparent' ? 'Transparent PNG' : 'Studio Image'}!`);
            return;
        }

        // Render high-res canvas with the floating price/title badge
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 1080;
            canvas.height = img.naturalHeight || 1080;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Compute badge coordinates
            const padX = canvas.width * 0.05;
            const padY = canvas.height * 0.05;
            const badgeW = Math.min(canvas.width * 0.42, 360);
            const badgeH = 110;

            let bx = padX;
            let by = canvas.height - padY - badgeH;

            if (badgePosition === 'top-right') {
                bx = canvas.width - padX - badgeW;
                by = padY;
            } else if (badgePosition === 'top-left') {
                bx = padX;
                by = padY;
            } else if (badgePosition === 'bottom-left') {
                bx = padX;
                by = canvas.height - padY - badgeH;
            } else if (badgePosition === 'bottom-right') {
                bx = canvas.width - padX - badgeW;
                by = canvas.height - padY - badgeH;
            }

            const colors = {
                emerald: { bg: '#064e3b', border: '#10b981', text: '#ffffff', pillBg: '#059669', pillText: '#a7f3d0' },
                gold: { bg: '#451a03', border: '#f59e0b', text: '#ffffff', pillBg: '#d97706', pillText: '#fef3c7' },
                ruby: { bg: '#881337', border: '#f43f5e', text: '#ffffff', pillBg: '#e11d48', pillText: '#ffe4e6' },
                dark: { bg: '#0f172a', border: '#38bdf8', text: '#ffffff', pillBg: '#1e293b', pillText: '#bae6fd' }
            }[badgeTheme];

            // Drop shadow for badge
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 18;
            ctx.shadowOffsetY = 6;

            // Background card
            ctx.fillStyle = colors.bg;
            ctx.beginPath();
            ctx.roundRect(bx, by, badgeW, badgeH, [18]);
            ctx.fill();

            // Card stroke
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = colors.border;
            ctx.stroke();

            // Mini promo pill
            const promoText = (badgePromo || 'AUTHENTIC').toUpperCase();
            ctx.fillStyle = colors.pillBg;
            ctx.beginPath();
            ctx.roundRect(bx + 14, by + 12, 140, 24, [12]);
            ctx.fill();

            ctx.fillStyle = colors.pillText;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(promoText.slice(0, 18), bx + 84, by + 28);

            // Product Title
            const displayTitle = (badgeTitle || detectedTitle || 'Commercial Product').slice(0, 24);
            ctx.fillStyle = colors.text;
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(displayTitle, bx + 16, by + 60);

            // Price
            const displayPrice = badgePrice || detectedPrice || '5,000';
            const priceText = displayPrice.startsWith('₦') ? displayPrice : `₦${displayPrice}`;
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 24px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(priceText, bx + 16, by + 94);

            const downloadUrl = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `smartbiz_studio_showcase_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded Studio Photo with Price Tag!');
        };
        img.src = targetImage;
    };

    // Copy formatted WhatsApp Sales Pitch
    const handleShareWhatsApp = () => {
        const itemTitle = badgeTitle || detectedTitle || 'Premium Product';
        const itemPrice = badgePrice || detectedPrice || '5,000';
        const formattedPrice = itemPrice.startsWith('₦') ? itemPrice : `₦${itemPrice}`;

        const pitch = `🔥 *NEW ARRIVAL - 100% QUALITY GUARANTEED* 🔥\n\n` +
            `📦 *Product:* ${itemTitle}\n` +
            `💰 *Price:* ${formattedPrice}\n` +
            `🏪 *Vendor:* ${businessName}\n` +
            `${badgePromo ? `⭐ *Note:* ${badgePromo}\n` : ''}` +
            `✅ Clean, verified & ready for fast nationwide delivery / pickup.\n\n` +
            `👇 *Click to order directly on WhatsApp:* \n` +
            `https://wa.me/?text=${encodeURIComponent(`Hello ${businessName}! I am interested in buying "${itemTitle}" (${formattedPrice}) seen on your status.`)}`;

        navigator.clipboard.writeText(pitch);
        toast.success('Sales pitch copied! Download your image and share directly to WhatsApp Status 🚀', { duration: 5000 });
        handleDownload('studio');
    };

    // Save directly to Storefront and Marketplace Inventory
    const handleSaveToStore = async () => {
        if (!studioResult) return;
        setIsSavingToCatalog(true);

        const cleanPriceNum = parseFloat((badgePrice || detectedPrice || '5000').replace(/[^0-9.]/g, '')) || 5000;
        const finalTitle = badgeTitle || detectedTitle || 'Studio Product';

        try {
            // 1. Save to Backend Database API
            try {
                await api.post('/api/marketplace/products/', {
                    name: finalTitle,
                    price: cleanPriceNum,
                    product_type: 'physical',
                    category: productCategory,
                    description: `Professional photoshoot created with SmartBiz AI Photo Studio (${selectedTheme}).`,
                    image_url: studioResult,
                    is_active: true
                });
            } catch (apiErr) {
                console.warn('Backend catalog sync notice:', apiErr);
            }

            // 2. Save to Local Storage Cache for instant offline storefront listing
            const rawStored = localStorage.getItem('smartbiz_products');
            const currentList = rawStored ? JSON.parse(rawStored) : [];
            const newProduct = {
                id: Date.now(),
                name: finalTitle,
                price: cleanPriceNum,
                cost_price: Math.round(cleanPriceNum * 0.7),
                category: productCategory,
                stock: 10,
                sku: `SBZ-${Math.floor(1000 + Math.random() * 9000)}`,
                image_url: studioResult,
                description: `Professional photoshoot created with SmartBiz AI Photo Studio (${selectedTheme}).`,
                created_at: new Date().toISOString()
            };
            localStorage.setItem('smartbiz_products', JSON.stringify([newProduct, ...currentList]));
            window.dispatchEvent(new Event('smartbiz_products_updated'));

            setShowInventoryModal(false);
            toast.success(`Saved "${finalTitle}" to your Store Catalog & Storefront! 📦`, { duration: 4000 });
        } catch (e) {
            console.error('Save to catalog error:', e);
            toast.error('Failed to save product to catalog.');
        } finally {
            setIsSavingToCatalog(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header: Clean, Natural, Professional */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
                    <span>📸</span>
                    <span>AI Product Photo Studio</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Professional Studio Shots for Your Products
                </h2>
                
                <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto mt-2 leading-relaxed">
                    Snap items on your bedsheet, table, or shop floor. AI cleanly removes background clutter, preserves your product&apos;s real labels and logos, adds grounded contact shadows, and generates an e-commerce price tag.
                </p>

                <div className="mt-4 inline-flex items-center gap-3 bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800 text-xs font-bold text-slate-300">
                    <span>⚡ 2 BizCredits per shoot</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400">Balance: {credits} Credits</span>
                </div>
            </div>

            {/* Step 1: Upload / Camera Snap */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                        <span>Upload or Snap Product Photo</span>
                    </span>
                    <button
                        type="button"
                        onClick={loadSampleProduct}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                        🧪 Load Demo Sample
                    </button>
                </div>

                {/* Hidden File & Camera Inputs */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processUploadedFile(file);
                    }}
                    className="hidden"
                    accept="image/*"
                />
                <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processUploadedFile(file);
                    }}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                />

                {!rawImage ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                            onClick={() => cameraInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer bg-slate-950/50 hover:bg-slate-950 group"
                        >
                            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                📷
                            </div>
                            <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                Snap with Phone Camera
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Take a live photo of your product right now
                            </p>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer bg-slate-950/50 hover:bg-slate-950 group"
                        >
                            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                🖼️
                            </div>
                            <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                Select from Gallery / Files
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Upload JPG, PNG, or WebP up to 15MB
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3">
                            <img
                                src={rawImage}
                                alt="Raw upload"
                                className="w-14 h-14 object-cover rounded-xl border border-slate-700"
                            />
                            <div>
                                <span className="text-xs font-bold text-emerald-400 block">✓ Photo Loaded</span>
                                <span className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs block">{rawFileName}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700"
                            >
                                Replace
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRawImage(null);
                                    setStudioResult(null);
                                    setTransparentCutout(null);
                                }}
                                className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-900/40"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: Choose Presentation Style */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>Choose Studio Presentation</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {THEME_OPTIONS.map((theme) => {
                        const isSelected = selectedTheme === theme.id;
                        return (
                            <button
                                key={theme.id}
                                type="button"
                                onClick={() => setSelectedTheme(theme.id)}
                                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                                    isSelected
                                        ? 'bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-900/20 ring-1 ring-emerald-500'
                                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <span className="text-2xl mt-0.5">{theme.icon}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs sm:text-sm font-bold text-white">{theme.name}</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            {theme.badge}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{theme.subtitle}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Launch Button */}
                <div className="pt-2">
                    <button
                        type="button"
                        disabled={!rawImage || isGenerating}
                        onClick={handleGenerateShoot}
                        className="w-full py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{generationStep || 'Processing Studio Shoot...'}</span>
                            </>
                        ) : (
                            <>
                                <span>✨ Clean Background & Create Studio Shoot (2 Credits)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Step 3: Interactive Result & Live Price Tag Showcase */}
            {studioResult && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                ✓ Studio Photoshoot Ready
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-white">
                                {detectedTitle}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setViewMode(viewMode === 'SLIDER' ? 'SIDE_BY_SIDE' : 'SLIDER')}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 border border-slate-700 text-slate-300 hover:text-white"
                            >
                                {viewMode === 'SLIDER' ? 'Side-by-Side' : 'Split Slider'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBadge(!showBadge)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                    showBadge
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                        : 'bg-slate-950 text-slate-300 border-slate-700'
                                }`}
                            >
                                🏷️ {showBadge ? 'Price Tag: ON' : 'Price Tag: OFF'}
                            </button>
                        </div>
                    </div>

                    {/* Image Viewer */}
                    <div className="flex flex-col items-center">
                        {viewMode === 'SLIDER' ? (
                            <div
                                ref={compareContainerRef}
                                onMouseMove={(e) => {
                                    if (isDraggingRef.current) handleSliderMove(e.clientX);
                                }}
                                onMouseDown={() => { isDraggingRef.current = true; }}
                                onMouseUp={() => { isDraggingRef.current = false; }}
                                onMouseLeave={() => { isDraggingRef.current = false; }}
                                onTouchMove={(e) => {
                                    if (e.touches.length > 0) handleSliderMove(e.touches[0].clientX);
                                }}
                                className="w-full max-w-lg aspect-square rounded-3xl overflow-hidden relative select-none border-2 border-slate-700 bg-black shadow-2xl cursor-ew-resize"
                            >
                                {/* Studio Result (After) */}
                                <img
                                    src={studioResult}
                                    alt="Studio Result"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                />

                                {/* Floating Live Price Tag Badge */}
                                {showBadge && (
                                    <div
                                        className={`absolute z-20 pointer-events-none p-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
                                            badgePosition === 'top-right'
                                                ? 'top-4 right-4'
                                                : badgePosition === 'top-left'
                                                ? 'top-4 left-4'
                                                : badgePosition === 'bottom-left'
                                                ? 'bottom-4 left-4'
                                                : 'bottom-4 right-4'
                                        } ${
                                            badgeTheme === 'emerald'
                                                ? 'bg-emerald-950/90 border-emerald-500 text-white'
                                                : badgeTheme === 'gold'
                                                ? 'bg-amber-950/90 border-amber-500 text-white'
                                                : badgeTheme === 'ruby'
                                                ? 'bg-rose-950/90 border-rose-500 text-white'
                                                : 'bg-slate-950/90 border-sky-500 text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider">
                                                {badgePromo || 'VERIFIED'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-100 max-w-[150px] truncate">
                                            {badgeTitle || detectedTitle}
                                        </p>
                                        <p className="text-base font-black font-mono tracking-tight text-white mt-0.5">
                                            {(badgePrice || detectedPrice).startsWith('₦') ? (badgePrice || detectedPrice) : `₦${badgePrice || detectedPrice}`}
                                        </p>
                                    </div>
                                )}

                                {/* Raw Photo (Before) clipped */}
                                {rawImage && (
                                    <div
                                        className="absolute inset-0 overflow-hidden pointer-events-none"
                                        style={{ width: `${sliderPos}%` }}
                                    >
                                        <img
                                            src={rawImage}
                                            alt="Raw product before"
                                            className="absolute inset-0 w-full h-full object-cover max-w-none"
                                            style={{
                                                width: compareContainerRef.current ? `${compareContainerRef.current.clientWidth}px` : '100%',
                                                height: compareContainerRef.current ? `${compareContainerRef.current.clientHeight}px` : '100%'
                                            }}
                                        />
                                        <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-300">
                                            Original Shot
                                        </div>
                                    </div>
                                )}

                                <div className="absolute bottom-3 right-3 bg-emerald-600/90 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white">
                                    Studio Clean
                                </div>

                                {/* Divider */}
                                <div
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
                                    style={{ left: `${sliderPos}%` }}
                                >
                                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center font-black text-xs border border-emerald-600">
                                        ⇄
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                {rawImage && (
                                    <div className="space-y-1.5 text-center">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Before: Original Photo</span>
                                        <img src={rawImage} alt="Original" className="w-full aspect-square object-cover rounded-2xl border border-slate-700" />
                                    </div>
                                )}
                                <div className="space-y-1.5 text-center">
                                    <span className="text-[10px] font-bold uppercase text-emerald-400">After: AI Studio Cutout</span>
                                    <img src={studioResult} alt="Studio Output" className="w-full aspect-square object-cover rounded-2xl border border-emerald-500 shadow-xl" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Price Tag Badge Customizer */}
                    {showBadge && (
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                                Customize Showcase Price Tag
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Product Title</label>
                                    <input
                                        type="text"
                                        value={badgeTitle}
                                        onChange={(e) => setBadgeTitle(e.target.value)}
                                        placeholder="e.g. Airtel 4G WiFi"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Price (₦)</label>
                                    <input
                                        type="text"
                                        value={badgePrice}
                                        onChange={(e) => setBadgePrice(e.target.value)}
                                        placeholder="18,500"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Promo Note</label>
                                    <input
                                        type="text"
                                        value={badgePromo}
                                        onChange={(e) => setBadgePromo(e.target.value)}
                                        placeholder="NEW ARRIVAL"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Badge Color</label>
                                    <select
                                        value={badgeTheme}
                                        onChange={(e) => setBadgeTheme(e.target.value as any)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                                    >
                                        <option value="emerald">🇳🇬 Emerald Green</option>
                                        <option value="gold">🏆 Luxury Gold</option>
                                        <option value="ruby">🔴 Crimson Sale</option>
                                        <option value="dark">🖤 Obsidian Dark</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Direct High-Impact Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => handleDownload('studio')}
                            className="py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>📥 Download HD</span>
                        </button>

                        {transparentCutout && (
                            <button
                                type="button"
                                onClick={() => handleDownload('transparent')}
                                className="py-3 px-3 rounded-2xl font-bold text-xs bg-slate-950 hover:bg-slate-900 border border-slate-700 text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <span>🏁 Cutout (PNG)</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleShareWhatsApp}
                            className="py-3 px-3 rounded-2xl font-bold text-xs bg-green-950 hover:bg-green-900 border border-green-700 text-green-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>💬 WhatsApp Pitch</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowInventoryModal(true)}
                            className="py-3 px-3 rounded-2xl font-bold text-xs bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>📦 Add to Catalog</span>
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Modal: Save to Storefront & Catalog */}
            <AnimatePresence>
                {showInventoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <span>📦</span>
                                    <span>Add to Store Catalog & Inventory</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowInventoryModal(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        value={badgeTitle || detectedTitle}
                                        onChange={(e) => setBadgeTitle(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 block mb-1">Price (₦)</label>
                                        <input
                                            type="text"
                                            value={badgePrice || detectedPrice}
                                            onChange={(e) => setBadgePrice(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                                        <select
                                            value={productCategory}
                                            onChange={(e) => setProductCategory(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                                        >
                                            <option value="General Merchandise">General Merchandise</option>
                                            <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                                            <option value="Fashion & Apparel">Fashion & Apparel</option>
                                            <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                                            <option value="Food & Beverages">Food & Beverages</option>
                                            <option value="Household & Cleaning">Household & Cleaning</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInventoryModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingToCatalog}
                                    onClick={handleSaveToStore}
                                    className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg disabled:opacity-50"
                                >
                                    {isSavingToCatalog ? 'Saving...' : 'Confirm & Add to Catalog'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
