import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { generateStudioPhotoshoot } from '../services/geminiService';
import { billingService } from '../services/billingService';

interface PhotoStudioProps {
    credits: number;
    onUpdateCredits: (newCredits: number) => void;
    businessName?: string;
}

interface StudioScene {
    id: string;
    title: string;
    category: 'all' | 'luxury' | 'outdoor' | 'podium' | 'beauty' | 'craft';
    categoryLabel: string;
    description: string;
    badge: string;
    thumbnail: string;
}

const STUDIO_SCENES: StudioScene[] = [
    {
        id: 'luxury_marble',
        title: 'Luxury Marble & Fluted Wood',
        category: 'luxury',
        categoryLabel: 'Luxury & Premium',
        description: 'Polished marble counter with natural plant, fluted wood slats, and warm LED backlight.',
        badge: '🔥 Top Seller',
        thumbnail: '/studio_backdrops/luxury_marble.jpg'
    },
    {
        id: 'outdoor_sunlight',
        title: 'Azure Sky & Sun Flare',
        category: 'outdoor',
        categoryLabel: 'Outdoor & Nature',
        description: 'Elevated platform against vibrant blue sky, natural clouds, and sun flare.',
        badge: '☀️ Viral Outdoor',
        thumbnail: '/studio_backdrops/outdoor_sunlight.jpg'
    },
    {
        id: 'rustic_oak',
        title: 'Warm Oak Cafe Table',
        category: 'craft',
        categoryLabel: 'Kitchen & Craft',
        description: 'Rich solid oak cafe tabletop with warm ambient bokeh lighting.',
        badge: 'Cozy Cafe',
        thumbnail: '/studio_backdrops/rustic_oak.jpg'
    },
    {
        id: 'pastel_podium',
        title: 'Minimalist Pastel Podium',
        category: 'podium',
        categoryLabel: '3D Podiums',
        description: 'Clean 3D circular podium with soft studio fill lighting for cosmetics and perfumes.',
        badge: 'Clean 3D',
        thumbnail: '/studio_backdrops/pastel_podium.jpg'
    },
    {
        id: 'botanical_garden',
        title: 'Tropical Palm & Sunlit Slate',
        category: 'outdoor',
        categoryLabel: 'Outdoor & Nature',
        description: 'Natural stone pedestal beneath organic palm and monstera leaf shadows.',
        badge: 'Natural & Organic',
        thumbnail: '/studio_backdrops/botanical_garden.jpg'
    },
    {
        id: 'spa_mist',
        title: 'Spa Vanity & Fresh Dew',
        category: 'beauty',
        categoryLabel: 'Beauty & Lifestyle',
        description: 'Carrara marble vanity with delicate morning water mist droplets.',
        badge: 'Skincare Fresh',
        thumbnail: '/studio_backdrops/spa_mist.jpg'
    },
    {
        id: 'velvet_noir',
        title: 'Velvet Noir & Matte Slate',
        category: 'luxury',
        categoryLabel: 'Luxury & Premium',
        description: 'Matte charcoal slate pedestal with dramatic high-contrast rim lighting.',
        badge: 'High-End Noir',
        thumbnail: '/studio_backdrops/velvet_noir.jpg'
    },
    {
        id: 'pure_white',
        title: 'Pure White Cyclorama',
        category: 'beauty',
        categoryLabel: 'Beauty & Lifestyle',
        description: '100% pure high-key white studio with soft contact shadow. Konga & Jumia standard.',
        badge: 'E-Commerce Standard',
        thumbnail: '/studio_backdrops/pure_white.jpg'
    },
    {
        id: 'afro_rattan',
        title: 'Handwoven African Raffia',
        category: 'craft',
        categoryLabel: 'Kitchen & Craft',
        description: 'Traditional Nigerian woven rattan mat texture celebrating authentic craftsmanship.',
        badge: '🇳🇬 Naija Heritage',
        thumbnail: '/studio_backdrops/afro_rattan.jpg'
    },
    {
        id: 'golden_hour',
        title: 'Terracotta Golden Hour',
        category: 'outdoor',
        categoryLabel: 'Outdoor & Nature',
        description: 'Warm sunset rays cascading across natural earthen Mediterranean clay.',
        badge: 'Warm Sunset',
        thumbnail: '/studio_backdrops/golden_hour.jpg'
    },
    {
        id: 'executive_glass',
        title: 'Executive Glass Counter',
        category: 'luxury',
        categoryLabel: 'Luxury & Premium',
        description: 'Sleek tempered glass counter with modern skyline reflections for premium gear.',
        badge: 'Corporate Modern',
        thumbnail: '/studio_backdrops/luxury_marble.jpg'
    },
    {
        id: 'cozy_living',
        title: 'Cozy Living Table',
        category: 'craft',
        categoryLabel: 'Kitchen & Craft',
        description: 'Warm indoor wooden surface with natural diffused window morning light.',
        badge: 'Homely Warmth',
        thumbnail: '/studio_backdrops/rustic_oak.jpg'
    },
    {
        id: 'colorblock_pop',
        title: 'Vibrant Colorblock Pop',
        category: 'podium',
        categoryLabel: '3D Podiums',
        description: 'Energetic geometric platforms in playful pastel tones for youth fashion.',
        badge: 'Playful Pop',
        thumbnail: '/studio_backdrops/pastel_podium.jpg'
    },
    {
        id: 'urban_cyber',
        title: 'Urban Cyber Pedestal',
        category: 'luxury',
        categoryLabel: 'Luxury & Premium',
        description: 'Futuristic pedestal with subtle neon rim light reflections for electronics.',
        badge: 'Tech & Gadgets',
        thumbnail: '/studio_backdrops/velvet_noir.jpg'
    },
    {
        id: 'kitchen_quartz',
        title: 'Modern Kitchen Quartz',
        category: 'craft',
        categoryLabel: 'Kitchen & Craft',
        description: 'Polished kitchen quartz countertop with clean modern subway tile background.',
        badge: 'Food & Home',
        thumbnail: '/studio_backdrops/luxury_marble.jpg'
    },
    {
        id: 'floral_silk',
        title: 'Soft Floral Silk',
        category: 'beauty',
        categoryLabel: 'Beauty & Lifestyle',
        description: 'Flowing satin fabric with gentle flower petals for fragrances and luxury oils.',
        badge: 'Soft Silk',
        thumbnail: '/studio_backdrops/pastel_podium.jpg'
    }
];

const CATEGORIES = [
    { id: 'all', label: '🌟 All Scenes' },
    { id: 'luxury', label: '🏛️ Luxury & Premium' },
    { id: 'outdoor', label: '☀️ Outdoor & Nature' },
    { id: 'podium', label: '📦 3D Podiums' },
    { id: 'beauty', label: '💄 Beauty & Spa' },
    { id: 'craft', label: '🪵 Kitchen & Craft' },
    { id: 'custom', label: '✨ Custom AI Prompt' }
];

export const PhotoStudio: React.FC<PhotoStudioProps> = ({
    credits,
    onUpdateCredits,
    businessName = 'SmartBiz Merchant'
}) => {
    // 1. Image upload state
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [rawFileName, setRawFileName] = useState<string>('raw_product.jpg');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 2. Scene selection state
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSceneId, setSelectedSceneId] = useState<string>('luxury_marble');
    const [customPrompt, setCustomPrompt] = useState<string>('');
    const [shootMode, setShootMode] = useState<'composite' | 'generative'>('composite');

    // 3. Processing & output state
    const [isShooting, setIsShooting] = useState<boolean>(false);
    const [shootStepMessage, setShootStepMessage] = useState<string>('');
    const [studioImage, setStudioImage] = useState<string | null>(null);
    const [activeSceneTitle, setActiveSceneTitle] = useState<string>('Luxury Marble & Fluted Wood');

    // 4. Comparison slider state
    const [sliderPos, setSliderPos] = useState<number>(50); // percentage (0-100)
    const isDraggingRef = useRef<boolean>(false);
    const compareContainerRef = useRef<HTMLDivElement>(null);

    // 5. Merchant promo badge overlay state
    const [showBadge, setShowBadge] = useState<boolean>(false);
    const [badgePrice, setBadgePrice] = useState<string>('8,500');
    const [badgePromo, setBadgePromo] = useState<string>('20% OFF');
    const [badgeTheme, setBadgeTheme] = useState<'gold' | 'emerald' | 'ruby' | 'dark'>('emerald');
    const [badgePosition, setBadgePosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');

    // 6. Inventory save modal state
    const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
    const [productTitle, setProductTitle] = useState<string>('');
    const [productPrice, setProductPrice] = useState<string>('');
    const [productCategory, setProductCategory] = useState<string>('General');

    // Load sample raw image for instant testing
    const loadSampleProduct = () => {
        // High quality transparent sample or standard bottle
        const sampleUrl = '/studio_backdrops/luxury_marble.jpg';
        // We'll create a canvas with a simulated product sample
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Simulated bedsheet floor
            ctx.fillStyle = '#dbeafe';
            ctx.fillRect(0, 0, 600, 800);
            
            // Texture
            ctx.fillStyle = '#bfdbfe';
            for (let i = 0; i < 800; i += 40) {
                ctx.fillRect(0, i, 600, 3);
            }

            // Simulated product bottle
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(180, 260, 240, 420, [30, 30, 20, 20]);
            ctx.fill();

            // Bottle neck & cap
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(250, 180, 100, 80);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(240, 150, 120, 35);

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(200, 340, 200, 260);

            // Label text
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('EseFresh', 300, 400);
            ctx.font = 'bold 15px sans-serif';
            ctx.fillStyle = '#0284c7';
            ctx.fillText('DISINFECTANT', 300, 430);
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.fillText('1 LITRE', 300, 470);
            ctx.font = '11px monospace';
            ctx.fillText('TEL: 08140255866', 300, 520);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setRawImage(dataUrl);
            setRawFileName('sample_raw_bedsheet.jpg');
            setStudioImage(null);
            toast.success('Loaded sample product shot on bedsheet!');
        }
    };

    // Handle file selection
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload a valid image file (JPG or PNG).');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB.');
            return;
        }

        setRawFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setRawImage(result);
            setStudioImage(null);
            toast.success('Raw photo loaded! Now choose a commercial scene.');
        };
        reader.readAsDataURL(file);
    };

    // Trigger Studio Shoot
    const handleShootPhotoshoot = async () => {
        if (!rawImage) {
            toast.error('Please upload a raw product photo first.');
            return;
        }

        const cost = 2;
        if (credits < cost) {
            toast.error(`Insufficient studio credits (Cost: ${cost} credits, Balance: ${credits}). Please top up!`);
            return;
        }

        setIsShooting(true);
        setShootStepMessage('Isolating product foreground from background...');

        try {
            // Update step status
            setTimeout(() => {
                if (isShooting) setShootStepMessage('Synthesizing 4K studio lighting, shadows & reflections...');
            }, 1200);

            const isGenerative = selectedCategory === 'custom' || shootMode === 'generative';
            const sceneToUse = isGenerative ? 'luxury_marble' : selectedSceneId;
            const promptToUse = isGenerative ? customPrompt : '';

            const response = await generateStudioPhotoshoot(
                rawImage,
                sceneToUse,
                isGenerative ? 'generative' : 'composite',
                promptToUse
            );

            if (response && (response.studio_image_base64 || response.image_base64)) {
                const finalImg = response.studio_image_base64 || response.image_base64;
                setStudioImage(finalImg);
                setActiveSceneTitle(response.scene_title || 'Commercial Studio Shoot');

                // Deduct credits
                try {
                    const billingRes = await billingService.deductCredits(cost, `AI Photo Studio - ${response.scene_title || 'Photoshoot'}`);
                    if (billingRes && typeof billingRes.credits === 'number') {
                        onUpdateCredits(billingRes.credits);
                    }
                } catch (bErr) {
                    console.warn('Billing deduction notice:', bErr);
                }

                toast.success('🎉 Commercial Photoshoot Ready! Drag slider to compare.', { duration: 4000 });
            } else {
                throw new Error('Studio synthesizer did not return image data.');
            }
        } catch (err: any) {
            console.error('Studio Photoshoot error:', err);
            toast.error(err.response?.data?.error || err.message || 'Failed to complete photoshoot. Please try again.');
        } finally {
            setIsShooting(false);
            setShootStepMessage('');
        }
    };

    // Before / After slider drag handling
    const handleSliderMove = (clientX: number) => {
        if (!compareContainerRef.current) return;
        const rect = compareContainerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const newPos = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
        setSliderPos(newPos);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            handleSliderMove(e.touches[0].clientX);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingRef.current) {
            handleSliderMove(e.clientX);
        }
    };

    // Generate downloadable image with optional promo badge baked in
    const handleDownload = () => {
        if (!studioImage) return;

        if (!showBadge) {
            // Direct download clean image
            const link = document.createElement('a');
            link.href = studioImage;
            link.download = `smartbiz_photoshoot_${selectedSceneId}_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded HD Studio Photoshoot!');
            return;
        }

        // Bake badge onto canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 800;
            canvas.height = img.naturalHeight || 1000;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw base studio image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw promo badge
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

            // Theme colors
            const themeColors = {
                emerald: { bg: '#059669', badgeBg: '#10b981', text: '#ffffff' },
                ruby: { bg: '#dc2626', badgeBg: '#f43f5e', text: '#ffffff' },
                gold: { bg: '#d97706', badgeBg: '#f59e0b', text: '#000000' },
                dark: { bg: '#0f172a', badgeBg: '#1e293b', text: '#38bdf8' }
            }[badgeTheme];

            // Badge pill
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

            // Price pill
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
            link.download = `smartbiz_photoshoot_promo_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded Studio Photoshoot with Promo Badge!');
        };
        img.src = studioImage;
    };

    // Copy formatted WhatsApp promo pitch
    const handleCopyWhatsAppPromo = () => {
        const promoText = `🔥 NEW ARRIVAL & SPECIAL PROMO! 🔥\n\n📌 Product: ${productTitle || 'Premium Quality Product'}\n🏪 Vendor: ${businessName}\n💰 Price: ${badgePrice ? `₦${badgePrice}` : 'Contact for best deal'}\n${badgePromo ? `🎁 Promo Discount: ${badgePromo}\n` : ''}✅ 100% Verified Quality | Pay on Delivery / Express Shipping Available\n\n👉 Send a message now to order: https://wa.me/?text=${encodeURIComponent(`Hello! I want to order ${productTitle || 'this product'} seen on your status.`)}`;
        navigator.clipboard.writeText(promoText);
        toast.success('WhatsApp Promo text copied! Ready to post on WhatsApp Status 🚀');
    };

    // Open WhatsApp directly
    const handleShareDirectWhatsApp = () => {
        const text = `🔥 SPECIAL PROMO OFFER! 🔥\n\n📌 Product: ${productTitle || 'Premium Product'}\n💰 Price: ₦${badgePrice || 'Contact Us'}\n${badgePromo ? `🎁 Offer: ${badgePromo}\n` : ''}🏪 By: ${businessName}\n\nChat with us directly to place your order!`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Save directly to inventory
    const handleSaveToInventory = () => {
        if (!studioImage) return;

        try {
            const rawStored = localStorage.getItem('smartbiz_products');
            const currentList = rawStored ? JSON.parse(rawStored) : [];
            const newProduct = {
                id: Date.now(),
                name: productTitle || 'Studio Catalog Product',
                price: parseFloat(badgePrice.replace(/[^0-9.]/g, '')) || 5000,
                cost_price: 3000,
                category: productCategory,
                stock: 10,
                sku: `SBZ-${Math.floor(1000 + Math.random() * 9000)}`,
                image_url: studioImage,
                description: `Professional photoshoot created with SmartBiz AI Photo Studio (${activeSceneTitle}).`,
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

    // Filter scenes by category
    const displayedScenes = selectedCategory === 'all'
        ? STUDIO_SCENES
        : selectedCategory === 'custom'
            ? []
            : STUDIO_SCENES.filter(s => s.category === selectedCategory);

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl border border-indigo-900/40 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[11px] font-black uppercase tracking-wider border border-indigo-500/30">
                                Snap-To-Studio 2.0
                            </span>
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-500/30">
                                4K Commercial Grade
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            AI Commercial Product Photo Studio
                        </h2>
                        <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                            Snap any product on your bedsheet, floor, or table. Our AI isolates your product, fixes lighting, adds contact shadows and surface reflections, and places it into 16 photorealistic commercial studio sets.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl">
                            📸
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Photoshoot Cost</p>
                            <p className="text-white font-black text-sm">2 Credits / Shoot</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 1: Upload Raw Photo */}
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">1</span>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                            Upload Raw Product Photo (Bedsheet, Floor, or Counter)
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={loadSampleProduct}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-800/50 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <span>🧪 Load Demo Sample</span>
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
                        className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-10 text-center transition-all cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 group"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            📷
                        </div>
                        <p className="text-base font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                            Click to upload your product photo
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Don't worry about bedsheets, carpets, or background clutter. Our AI cutout engine automatically detects and extracts your item.
                        </p>
                        <p className="text-[10px] text-slate-500 mt-3 uppercase tracking-widest font-mono">
                            Supports PNG, JPG, JPEG (Up to 10MB)
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 flex items-center justify-center">
                            <img src={rawImage} alt="Raw product preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-400 text-xs font-black">✓ Raw Photo Loaded</span>
                                <span className="text-slate-500 text-xs truncate max-w-[200px]">({rawFileName})</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Ready to transform! Pick your commercial scene below.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                            >
                                🔄 Replace Photo
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRawImage(null);
                                    setStudioImage(null);
                                }}
                                className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 px-3 py-2 rounded-xl border border-rose-900/40 transition-colors cursor-pointer"
                            >
                                ✕ Remove
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: Choose Commercial Scene Catalog */}
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">2</span>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                            Select Commercial Photoshoot Scene ({STUDIO_SCENES.length} Options)
                        </h3>
                    </div>

                    <span className="text-xs text-indigo-400 font-bold">
                        {STUDIO_SCENES.find(s => s.id === selectedSceneId)?.title || 'Selected Scene'}
                    </span>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                selectedCategory === cat.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500'
                                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Custom AI Prompt View */}
                {selectedCategory === 'custom' ? (
                    <div className="p-6 bg-slate-950/80 rounded-2xl border border-indigo-500/30 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                                Custom Generative AI Photoshoot Scene
                            </h4>
                        </div>
                        <p className="text-xs text-slate-400">
                            Describe any custom environment, lighting, or setting. Our Flux generative synthesizer will build the commercial photoshoot scene from scratch.
                        </p>
                        <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="e.g. On a polished dark obsidian stone platform with floating water lilies, misty morning fog, warm sunbeam rays filtering through bamboo trees..."
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Minimalist zen garden with raked white sand and cherry blossom petals',
                                'Modern Scandinavian pine desk with warm reading lamp and coffee cup',
                                'Golden Moroccan tiled courtyard with arches and afternoon sunbeams',
                                'Futuristic metallic sci-fi pedestal with cyan and magenta ambient lighting'
                            ].map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setCustomPrompt(preset)}
                                    className="text-[11px] font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors text-left"
                                >
                                    + {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* 16 Scene Grid */
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[480px] overflow-y-auto pr-1">
                        {displayedScenes.map((scene) => {
                            const isSelected = selectedSceneId === scene.id;
                            return (
                                <div
                                    key={scene.id}
                                    onClick={() => setSelectedSceneId(scene.id)}
                                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-950 flex flex-col ${
                                        isSelected
                                            ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                                            : 'border-slate-800 hover:border-slate-700 hover:scale-[1.01]'
                                    }`}
                                >
                                    {/* Thumbnail container */}
                                    <div className="aspect-[4/3] w-full bg-slate-900 relative overflow-hidden">
                                        <img
                                            src={scene.thumbnail}
                                            alt={scene.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                // Fallback if image path not ready
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

                                        {/* Scene Badge */}
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/10">
                                                {scene.badge}
                                            </span>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                                                ✓
                                            </div>
                                        )}
                                    </div>

                                    {/* Text Info */}
                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h4 className={`text-xs font-black line-clamp-1 ${isSelected ? 'text-indigo-400' : 'text-slate-200'}`}>
                                                {scene.title}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                                {scene.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Shoot Action Button */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-400">
                        {rawImage ? (
                            <span className="text-emerald-400 font-bold">✓ Ready for Shoot: 1 Raw Image + Scene Selected</span>
                        ) : (
                            <span className="text-amber-400 font-medium">⚠️ Please upload a product image in Step 1 first.</span>
                        )}
                    </div>

                    <button
                        type="button"
                        disabled={!rawImage || isShooting}
                        onClick={handleShootPhotoshoot}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    >
                        {isShooting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Generating Photoshoot...</span>
                            </>
                        ) : (
                            <>
                                <span>📸 Launch Commercial Photoshoot (2 Credits)</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Progress Status Bar when shooting */}
                {isShooting && (
                    <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-500/30 flex items-center gap-3 animate-pulse">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                            ⏳
                        </div>
                        <p className="text-xs font-bold text-indigo-200">
                            {shootStepMessage || 'Processing high-res studio lighting & contact shadow synthesis...'}
                        </p>
                    </div>
                )}
            </div>

            {/* Step 3: Interactive Results & MSME Studio Workbench */}
            {studioImage && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/80 p-6 md:p-8 rounded-3xl border border-indigo-500/40 shadow-2xl space-y-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                Transformation Complete
                            </span>
                            <h3 className="text-lg font-black text-white">
                                {activeSceneTitle} Commercial Shoot
                            </h3>
                            <p className="text-xs text-slate-400">
                                Drag the interactive center slider left and right to inspect the before-and-after transformation.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowBadge(!showBadge)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                                    showBadge
                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
                                }`}
                            >
                                <span>🏷️</span>
                                <span>{showBadge ? 'Hide Promo Badge' : 'Add Price / Promo Tag'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Interactive Split Comparison Slider Box */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Interactive Viewer Canvas */}
                        <div className="lg:col-span-8 flex flex-col items-center">
                            <div
                                ref={compareContainerRef}
                                onMouseMove={handleMouseMove}
                                onMouseDown={() => { isDraggingRef.current = true; }}
                                onMouseUp={() => { isDraggingRef.current = false; }}
                                onMouseLeave={() => { isDraggingRef.current = false; }}
                                onTouchMove={handleTouchMove}
                                className="w-full max-w-[550px] aspect-square rounded-3xl overflow-hidden relative select-none border-2 border-slate-700 bg-black shadow-2xl cursor-ew-resize"
                            >
                                {/* AFTER: Studio Result Image (Full background) */}
                                <img
                                    src={studioImage}
                                    alt="Commercial Photoshoot Result"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                />

                                {/* BEFORE: Raw Original Image (Clipped by slider position) */}
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
                                        <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-300 border border-white/10">
                                            Original (Bedsheet)
                                        </div>
                                    </div>
                                )}

                                {/* AFTER Label */}
                                <div className="absolute bottom-3 right-3 bg-indigo-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-indigo-400/40 shadow-lg pointer-events-none">
                                    AI Studio Photoshoot
                                </div>

                                {/* Divider Line and Drag Handle */}
                                <div
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
                                    style={{ left: `${sliderPos}%` }}
                                >
                                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center font-black text-xs border-2 border-indigo-600">
                                        ⇄
                                    </div>
                                </div>

                                {/* Overlay Badge Preview if enabled */}
                                {showBadge && (
                                    <div className={`absolute z-20 flex flex-col gap-1.5 p-3 pointer-events-none ${
                                        badgePosition === 'top-left' ? 'top-3 left-3 items-start' :
                                        badgePosition === 'bottom-left' ? 'bottom-12 left-3 items-start' :
                                        badgePosition === 'bottom-right' ? 'bottom-12 right-3 items-end' :
                                        'top-3 right-3 items-end'
                                    }`}>
                                        {badgePromo && (
                                            <span className={`px-3 py-1 rounded-full font-black text-[11px] uppercase tracking-wider shadow-xl border ${
                                                badgeTheme === 'emerald' ? 'bg-emerald-500 text-white border-emerald-400' :
                                                badgeTheme === 'ruby' ? 'bg-rose-600 text-white border-rose-500' :
                                                badgeTheme === 'dark' ? 'bg-slate-950 text-sky-400 border-slate-700' :
                                                'bg-amber-500 text-slate-950 border-amber-300'
                                            }`}>
                                                🔥 {badgePromo}
                                            </span>
                                        )}
                                        {badgePrice && (
                                            <span className={`px-4 py-1.5 rounded-xl font-black text-sm shadow-2xl font-mono tracking-tight border ${
                                                badgeTheme === 'emerald' ? 'bg-emerald-700 text-white border-emerald-500' :
                                                badgeTheme === 'ruby' ? 'bg-rose-700 text-white border-rose-600' :
                                                badgeTheme === 'dark' ? 'bg-slate-900 text-white border-slate-700' :
                                                'bg-slate-950 text-amber-300 border-slate-800'
                                            }`}>
                                                {badgePrice.startsWith('₦') ? badgePrice : `₦${badgePrice}`}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Slider control helper */}
                            <div className="w-full max-w-[550px] flex items-center justify-between mt-3 text-xs text-slate-400">
                                <span>← Raw Bedsheet Photo</span>
                                <span className="font-mono text-[11px] text-indigo-400">{Math.round(sliderPos)}% Split</span>
                                <span>Commercial Photoshoot →</span>
                            </div>
                        </div>

                        {/* Right Column: MSME Commercial Actions */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Promo Badge Configurator */}
                            {showBadge && (
                                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Price & Promo Sticker
                                        </h4>
                                        <span className="text-[10px] text-indigo-400 font-bold">Baked into Download</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Price Tag</label>
                                            <input
                                                type="text"
                                                value={badgePrice}
                                                onChange={(e) => setBadgePrice(e.target.value)}
                                                placeholder="8,500"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Promo Badge</label>
                                            <input
                                                type="text"
                                                value={badgePromo}
                                                onChange={(e) => setBadgePromo(e.target.value)}
                                                placeholder="20% OFF"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Color Theme</label>
                                            <select
                                                value={badgeTheme}
                                                onChange={(e) => setBadgeTheme(e.target.value as any)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 outline-none"
                                            >
                                                <option value="emerald">🇳🇬 Emerald Green</option>
                                                <option value="gold">🏆 Luxury Gold</option>
                                                <option value="ruby">🔴 Ruby Red Sale</option>
                                                <option value="dark">🖤 Minimal Dark</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Position</label>
                                            <select
                                                value={badgePosition}
                                                onChange={(e) => setBadgePosition(e.target.value as any)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 outline-none"
                                            >
                                                <option value="top-right">↗️ Top Right</option>
                                                <option value="top-left">↖️ Top Left</option>
                                                <option value="bottom-right">↘️ Bottom Right</option>
                                                <option value="bottom-left">↙️ Bottom Left</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {/* 1-Click HD Download */}
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>📥 Download HD Studio Image</span>
                                </button>

                                {/* 1-Click WhatsApp Copy & Broadcast */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyWhatsAppPromo}
                                        className="py-3 px-3 rounded-xl font-bold text-xs bg-slate-950 hover:bg-slate-900 border border-slate-700 text-slate-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                    >
                                        <span>📋 Copy Pitch</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleShareDirectWhatsApp}
                                        className="py-3 px-3 rounded-xl font-bold text-xs bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                    >
                                        <span>📲 Share to WA</span>
                                    </button>
                                </div>

                                {/* 1-Click Save to Inventory */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProductPrice(badgePrice);
                                        setShowInventoryModal(true);
                                    }}
                                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>📦 Save to Store & Inventory</span>
                                </button>

                                {/* Try Another Scene Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.scrollTo({ top: 400, behavior: 'smooth' });
                                    }}
                                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-900/50 transition-colors"
                                >
                                    ✨ Try Another Commercial Scene Above
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Modal: Save to Inventory */}
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
                                <h3 className="text-base font-black text-white flex items-center gap-2">
                                    <span>📦</span>
                                    <span>Save Photoshoot to Inventory</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowInventoryModal(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <p className="text-xs text-slate-400">
                                This will add your product with its new studio photo directly into your product inventory and online storefront.
                            </p>

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
                                        <label className="text-xs font-bold text-slate-300 block mb-1">Selling Price (₦)</label>
                                        <input
                                            type="text"
                                            value={productPrice}
                                            onChange={(e) => setProductPrice(e.target.value)}
                                            placeholder="8500"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-bold"
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
                                    className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
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
