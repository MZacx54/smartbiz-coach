import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { generateStudioPhotoshoot } from '../services/geminiService';
import { billingService } from '../services/billingService';

interface PhotoStudioProps {
    credits: number;
    onUpdateCredits: (newCredits: number) => void;
    businessName?: string;
}

interface QuickStylePreset {
    id: string;
    title: string;
    icon: string;
    prompt: string;
    badge: string;
}

const QUICK_PRESETS: QuickStylePreset[] = [
    {
        id: 'luxury_marble',
        title: 'Luxury Marble & Sunlight',
        icon: '🏛️',
        prompt: 'Placed on a clean Italian white Carrara marble counter with gentle morning golden sunlight, soft realistic contact shadows, surface reflections, and warm fluted oak in background',
        badge: 'Top Seller'
    },
    {
        id: 'warm_sunlight',
        title: 'Outdoor Golden Hour',
        icon: '☀️',
        prompt: 'Placed naturally on a rustic textured terracotta surface outdoors under warm golden hour sunlight, soft natural bokeh background',
        badge: 'Warm Lifestyle'
    },
    {
        id: 'pure_white',
        title: 'Pure White Catalog',
        icon: '⚪',
        prompt: 'Isolated cleanly on a pure studio white cyclorama backdrop with professional softbox lighting and gentle grounded contact shadow, Konga & Jumia standard',
        badge: 'E-Commerce'
    },
    {
        id: 'pastel_podium',
        title: 'Minimalist 3D Podium',
        icon: '📦',
        prompt: 'Resting on an elegant rounded pastel circular pedestal podium, clean studio fill lighting, modern cosmetics advertising style',
        badge: 'Clean 3D'
    },
    {
        id: 'botanical_garden',
        title: 'Botanical Palm & Slate',
        icon: '🌿',
        prompt: 'Resting on a natural slate stone slab beneath organic monstera and palm leaf shadows, morning dew, organic spa feel',
        badge: 'Natural & Organic'
    },
    {
        id: 'warm_oak',
        title: 'Warm Oak Cafe Table',
        icon: '🪵',
        prompt: 'Placed on a rich solid oak cafe tabletop with warm cozy indoor morning lighting and gentle blurred bokeh',
        badge: 'Cozy Artisanal'
    }
];

export const PhotoStudio: React.FC<PhotoStudioProps> = ({
    credits,
    onUpdateCredits,
    businessName = 'SmartBiz Merchant'
}) => {
    // 1. Upload & Photo State
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [rawFileName, setRawFileName] = useState<string>('raw_product.jpg');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 2. Simple Gemini Prompt State
    const [instruction, setInstruction] = useState<string>('Place on a luxury white marble table with warm golden sunlight, sharp contact shadows and reflections');
    const [selectedPresetId, setSelectedPresetId] = useState<string>('luxury_marble');

    // 3. Generation & Result State
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationStep, setGenerationStep] = useState<string>('');
    const [studioResult, setStudioResult] = useState<string | null>(null);
    const [activeResultTitle, setActiveResultTitle] = useState<string>('Commercial Studio Photoshoot');

    // 4. Before / After Toggle & Split Slider
    const [viewMode, setViewMode] = useState<'SLIDER' | 'SIDE_BY_SIDE'>('SLIDER');
    const [sliderPos, setSliderPos] = useState<number>(50);
    const isDraggingRef = useRef<boolean>(false);
    const compareContainerRef = useRef<HTMLDivElement>(null);

    // 5. Merchant Promo Tag / Price Overlay
    const [showBadge, setShowBadge] = useState<boolean>(false);
    const [badgePrice, setBadgePrice] = useState<string>('8,500');
    const [badgePromo, setBadgePromo] = useState<string>('20% OFF');
    const [badgeTheme, setBadgeTheme] = useState<'emerald' | 'gold' | 'ruby' | 'dark'>('emerald');
    const [badgePosition, setBadgePosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');

    // 6. Save to Store Modal
    const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
    const [productTitle, setProductTitle] = useState<string>('');
    const [productPrice, setProductPrice] = useState<string>('');
    const [productCategory, setProductCategory] = useState<string>('General');

    // Demo Sample for instant testing
    const loadSampleProduct = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Simulated bedsheet / wooden background
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, 600, 800);
            ctx.fillStyle = '#e2e8f0';
            for (let i = 0; i < 800; i += 35) {
                ctx.fillRect(0, i, 600, 2);
            }

            // Simulated product bottle
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(180, 260, 240, 420, [30, 30, 20, 20]);
            ctx.fill();

            // Bottle neck & cap
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(250, 180, 100, 80);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(240, 150, 120, 35);

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(200, 340, 200, 260);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('EseFresh', 300, 405);
            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle = '#0284c7';
            ctx.fillText('NATURAL FORMULA', 300, 435);
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.fillText('1 LITRE • MADE IN NIGERIA', 300, 480);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setRawImage(dataUrl);
            setRawFileName('sample_product_raw.jpg');
            setStudioResult(null);
            toast.success('Loaded sample product shot!');
        }
    };

    // File Upload Handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (JPG or PNG).');
            return;
        }

        if (file.size > 12 * 1024 * 1024) {
            toast.error('Image size must be less than 12MB.');
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
                    setRawImage(canvas.toDataURL('image/jpeg', 0.88));
                } else {
                    setRawImage(result);
                }
                setStudioResult(null);
                toast.success('Photo uploaded! Tell Gemini where to place it below.');
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    // Preset Selection
    const handleSelectPreset = (preset: QuickStylePreset) => {
        setSelectedPresetId(preset.id);
        setInstruction(preset.prompt);
    };

    // Launch Generation
    const handleGenerateShoot = async () => {
        if (!rawImage) {
            toast.error('Please upload your product photo first.');
            return;
        }

        const cost = 2;
        if (credits < cost) {
            toast.error(`Insufficient credits (Cost: ${cost} credits, Balance: ${credits}). Please top up!`);
            return;
        }

        setIsGenerating(true);
        setGenerationStep('Gemini Vision isolating foreground subject...');

        try {
            setTimeout(() => {
                if (isGenerating) setGenerationStep('Synthesizing studio lighting, contact shadows & reflections...');
            }, 1200);

            const promptToSend = instruction.trim() || 'Place on luxury marble studio table with warm sunbeams';
            const sceneIdToSend = selectedPresetId || 'luxury_marble';

            const response = await generateStudioPhotoshoot(
                rawImage,
                sceneIdToSend,
                'generative',
                promptToSend
            );

            if (response && (response.studio_image_base64 || response.image_base64)) {
                const finalImg = response.studio_image_base64 || response.image_base64;
                setStudioResult(finalImg);
                setActiveResultTitle(response.scene_title || 'Gemini Studio Photoshoot');

                // Deduct credits
                try {
                    const billingRes = await billingService.deductCredits(cost, `Gemini Photo Studio - ${response.scene_title || 'Photoshoot'}`);
                    if (billingRes && typeof billingRes.credits === 'number') {
                        onUpdateCredits(billingRes.credits);
                    }
                } catch (bErr) {
                    console.warn('Billing deduction notice:', bErr);
                }

                toast.success('✨ Gemini Photoshoot Ready!', { duration: 4000 });
            } else {
                throw new Error('Studio synthesizer did not return image data.');
            }
        } catch (err: any) {
            console.error('Studio photoshoot error:', err);
            toast.error(err.response?.data?.error || err.message || 'Failed to complete photoshoot. Please try again.');
        } finally {
            setIsGenerating(false);
            setGenerationStep('');
        }
    };

    // Slider Dragging Handlers
    const handleSliderMove = (clientX: number) => {
        if (!compareContainerRef.current) return;
        const rect = compareContainerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const newPos = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
        setSliderPos(newPos);
    };

    const handleDownload = () => {
        if (!studioResult) return;

        if (!showBadge) {
            const link = document.createElement('a');
            link.href = studioResult;
            link.download = `gemini_photo_studio_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded HD Studio Image!');
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 800;
            canvas.height = img.naturalHeight || 1000;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const padX = canvas.width * 0.05;
            const padY = canvas.height * 0.05;
            let bx = padX;
            let by = padY;

            if (badgePosition === 'top-right') {
                bx = canvas.width - padX - 220;
                by = padY;
            } else if (badgePosition === 'bottom-left') {
                bx = padX;
                by = canvas.height - padY - 90;
            } else if (badgePosition === 'bottom-right') {
                bx = canvas.width - padX - 220;
                by = canvas.height - padY - 90;
            }

            const themeColors = {
                emerald: { bg: '#059669', badgeBg: '#10b981', text: '#ffffff' },
                ruby: { bg: '#dc2626', badgeBg: '#f43f5e', text: '#ffffff' },
                gold: { bg: '#d97706', badgeBg: '#f59e0b', text: '#000000' },
                dark: { bg: '#0f172a', badgeBg: '#1e293b', text: '#38bdf8' }
            }[badgeTheme];

            if (badgePromo) {
                ctx.fillStyle = themeColors.badgeBg;
                ctx.beginPath();
                ctx.roundRect(bx, by, 180, 36, [18]);
                ctx.fill();
                ctx.fillStyle = themeColors.text;
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🔥 ${badgePromo.toUpperCase()}`, bx + 90, by + 24);
            }

            if (badgePrice) {
                const py = badgePromo ? by + 44 : by;
                ctx.fillStyle = themeColors.bg;
                ctx.beginPath();
                ctx.roundRect(bx, py, 200, 48, [12]);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px monospace';
                ctx.textAlign = 'center';
                const formattedPrice = badgePrice.startsWith('₦') ? badgePrice : `₦${badgePrice}`;
                ctx.fillText(formattedPrice, bx + 100, py + 33);
            }

            const downloadUrl = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `gemini_studio_promo_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded Studio Photo with Promo Badge!');
        };
        img.src = studioResult;
    };

    const handleCopyWhatsAppPromo = () => {
        const promoText = `🔥 NEW ARRIVAL & SPECIAL PROMO! 🔥\n\n📌 Product: ${productTitle || 'Premium Quality Product'}\n🏪 Vendor: ${businessName}\n💰 Price: ${badgePrice ? `₦${badgePrice}` : 'Contact for best deal'}\n${badgePromo ? `🎁 Promo Discount: ${badgePromo}\n` : ''}✅ 100% Verified Quality | Pay on Delivery / Express Shipping Available\n\n👉 Send a message now to order: https://wa.me/?text=${encodeURIComponent(`Hello! I want to order ${productTitle || 'this product'} seen on your status.`)}`;
        navigator.clipboard.writeText(promoText);
        toast.success('WhatsApp text copied! Ready to post on Status 🚀');
    };

    const handleSaveToInventory = () => {
        if (!studioResult) return;
        try {
            const rawStored = localStorage.getItem('smartbiz_products');
            const currentList = rawStored ? JSON.parse(rawStored) : [];
            const newProduct = {
                id: Date.now(),
                name: productTitle || 'Gemini Studio Product',
                price: parseFloat(badgePrice.replace(/[^0-9.]/g, '')) || 5000,
                cost_price: 3000,
                category: productCategory,
                stock: 10,
                sku: `SBZ-${Math.floor(1000 + Math.random() * 9000)}`,
                image_url: studioResult,
                description: `Professional photoshoot created with Google Gemini AI Photo Studio (${activeResultTitle}).`,
                created_at: new Date().toISOString()
            };
            const updatedList = [newProduct, ...currentList];
            localStorage.setItem('smartbiz_products', JSON.stringify(updatedList));
            window.dispatchEvent(new Event('smartbiz_products_updated'));
            setShowInventoryModal(false);
            toast.success(`Saved "${newProduct.name}" to Inventory & Storefront! 📦`);
        } catch (e) {
            console.error('Save to inventory error:', e);
            toast.error('Failed to save product to local inventory.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header: Clean Google Gemini / Studio Styling */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-3">
                    <span>✨</span>
                    <span>Powered by Google Gemini Vision & Flux</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Gemini AI Photo Studio
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto mt-2">
                    Upload your product or picture, tell AI where you want it placed, and get an ultra-photorealistic commercial photoshoot in seconds. No complex drag-and-drop.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800 text-xs font-bold text-slate-300">
                    <span>⚡ 2 BizCredits per shoot</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400">Balance: {credits} Credits</span>
                </div>
            </div>

            {/* Step 1: Upload Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                        1. Upload Your Product Photo
                    </span>
                    <button
                        type="button"
                        onClick={loadSampleProduct}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                        🧪 Load Demo Sample
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />

                {!rawImage ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 group"
                    >
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            📤
                        </div>
                        <p className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                            Click to upload your product or photo
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Bedsheet, floor, wooden table, or counter — Gemini automatically isolates your item and removes clutter.
                        </p>
                        <p className="text-[10px] text-slate-500 mt-3 font-mono uppercase tracking-widest">
                            PNG, JPG, WebP up to 12MB
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3">
                            <img
                                src={rawImage}
                                alt="Raw upload preview"
                                className="w-14 h-14 object-cover rounded-xl border border-slate-700"
                            />
                            <div>
                                <span className="text-xs font-bold text-emerald-400 block">✓ Photo Loaded</span>
                                <span className="text-[11px] text-slate-400 truncate max-w-[220px] block">{rawFileName}</span>
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
                                }}
                                className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-900/40"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: Gemini Prompt & 1-Click Styles */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                    2. Tell Gemini What To Do
                </span>

                {/* Natural Language Prompt Box */}
                <div className="relative">
                    <textarea
                        value={instruction}
                        onChange={(e) => {
                            setInstruction(e.target.value);
                            setSelectedPresetId('');
                        }}
                        placeholder="e.g. Place on a luxury white marble table with morning sunbeams, soft shadows and reflections..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 outline-none resize-none transition-all"
                    />
                </div>

                {/* 1-Click Curated Presets */}
                <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Or pick a fast 1-click studio style:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {QUICK_PRESETS.map((p) => {
                            const isSelected = selectedPresetId === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectPreset(p)}
                                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                        isSelected
                                            ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-600/20'
                                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <span className="text-xl flex-shrink-0">{p.icon}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-white truncate">{p.title}</p>
                                        <span className="text-[10px] text-slate-400">{p.badge}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Launch Shoot Button */}
                <div className="pt-2">
                    <button
                        type="button"
                        disabled={!rawImage || isGenerating}
                        onClick={handleGenerateShoot}
                        className="w-full py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{generationStep || 'Generating Photoshoot...'}</span>
                            </>
                        ) : (
                            <>
                                <span>🚀 Generate Studio Photoshoot (2 Credits)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Step 3: Result View */}
            {studioResult && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                ✓ Studio Photoshoot Ready
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-white">
                                {activeResultTitle}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setViewMode(viewMode === 'SLIDER' ? 'SIDE_BY_SIDE' : 'SLIDER')}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 border border-slate-700 text-slate-300 hover:text-white"
                            >
                                {viewMode === 'SLIDER' ? 'Switch to Side-by-Side' : 'Switch to Split Slider'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBadge(!showBadge)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                    showBadge
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-slate-950 text-slate-300 border-slate-700'
                                }`}
                            >
                                🏷️ {showBadge ? 'Hide Promo Tag' : 'Add Price Tag'}
                            </button>
                        </div>
                    </div>

                    {/* Viewer */}
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
                                {/* Result (After) */}
                                <img
                                    src={studioResult}
                                    alt="Studio Result"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                />

                                {/* Raw (Before) clipped */}
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
                                            Original
                                        </div>
                                    </div>
                                )}

                                <div className="absolute bottom-3 right-3 bg-indigo-600/90 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white">
                                    Gemini Studio
                                </div>

                                {/* Divider */}
                                <div
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
                                    style={{ left: `${sliderPos}%` }}
                                >
                                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center font-black text-xs border border-indigo-600">
                                        ⇄
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                                {rawImage && (
                                    <div className="space-y-1 text-center">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Original Photo</span>
                                        <img src={rawImage} alt="Original" className="w-full aspect-square object-cover rounded-2xl border border-slate-700" />
                                    </div>
                                )}
                                <div className="space-y-1 text-center">
                                    <span className="text-[10px] font-bold uppercase text-emerald-400">Gemini Studio Output</span>
                                    <img src={studioResult} alt="Studio Output" className="w-full aspect-square object-cover rounded-2xl border border-indigo-500 shadow-xl" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Promo Tag Customizer (if enabled) */}
                    {showBadge && (
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Price (₦)</label>
                                <input
                                    type="text"
                                    value={badgePrice}
                                    onChange={(e) => setBadgePrice(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Promo Badge</label>
                                <input
                                    type="text"
                                    value={badgePromo}
                                    onChange={(e) => setBadgePromo(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Theme</label>
                                <select
                                    value={badgeTheme}
                                    onChange={(e) => setBadgeTheme(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                                >
                                    <option value="emerald">🇳🇬 Emerald Green</option>
                                    <option value="gold">🏆 Luxury Gold</option>
                                    <option value="ruby">🔴 Ruby Red Sale</option>
                                    <option value="dark">🖤 Minimal Dark</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>📥 Download HD Image</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCopyWhatsAppPromo}
                            className="py-3.5 px-4 rounded-2xl font-bold text-xs bg-slate-950 hover:bg-slate-900 border border-slate-700 text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>📋 Copy WhatsApp Pitch</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setProductPrice(badgePrice);
                                setShowInventoryModal(true);
                            }}
                            className="py-3.5 px-4 rounded-2xl font-bold text-xs bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>📦 Save to Store & Inventory</span>
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Modal: Save to Storefront */}
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
                                    <span>Save to Storefront & Inventory</span>
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
                                        value={productTitle}
                                        onChange={(e) => setProductTitle(e.target.value)}
                                        placeholder="e.g. EseFresh Disinfectant 1L"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 block mb-1">Price (₦)</label>
                                        <input
                                            type="text"
                                            value={productPrice}
                                            onChange={(e) => setProductPrice(e.target.value)}
                                            placeholder="8500"
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
                                            <option value="General">General</option>
                                            <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                                            <option value="Household & Cleaning">Household & Cleaning</option>
                                            <option value="Food & Beverages">Food & Beverages</option>
                                            <option value="Fashion & Apparel">Fashion & Apparel</option>
                                            <option value="Electronics & Gadgets">Electronics & Gadgets</option>
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
                                    onClick={handleSaveToInventory}
                                    className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                                >
                                    Save to Storefront
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
