import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { runPrecisionStudio } from '../services/geminiService';
import { billingService } from '../services/billingService';
import api from '../services/api';

interface PhotoStudioProps {
    credits: number;
    onUpdateCredits: (newCredits: number) => void;
    businessName?: string;
}

type StudioTheme = 'pure_white' | 'warm_wood' | 'studio_grey' | 'transparent';
type RelightPreset = 'auto' | 'bright' | 'warm_daylight' | 'vibrant' | 'none';
type WatermarkStyle = 'subtle_footer' | 'diagonal_shield' | 'corner_seal';
type FlyerRatio = '1:1' | '9:16';

interface AngleSlot {
    id: 'front' | 'back' | 'detail';
    label: string;
    subtitle: string;
    rawImage: string | null;
    fileName: string;
    studioResult: string | null;
    transparentCutout: string | null;
}

interface ThemeOption {
    id: StudioTheme;
    name: string;
    subtitle: string;
    icon: string;
    badge: string;
}

const THEME_OPTIONS: ThemeOption[] = [
    {
        id: 'pure_white',
        name: 'Pure Studio White',
        subtitle: '100% clean cyclorama (Jumia, Konga & Amazon standard)',
        icon: '⚪',
        badge: 'Top Seller',
    },
    {
        id: 'warm_wood',
        name: 'Warm Oak Counter',
        subtitle: 'Natural boutique wooden table with soft daylight',
        icon: '🪵',
        badge: 'Artisanal & Cozy',
    },
    {
        id: 'studio_grey',
        name: 'Minimal Studio Grey',
        subtitle: 'Modern boutique slate grey with soft gradient fill',
        icon: '🏢',
        badge: 'Modern Luxury',
    },
    {
        id: 'transparent',
        name: 'Transparent PNG Cutout',
        subtitle: 'Zero background for flyers, posters, stickers & Canva',
        icon: '🏁',
        badge: 'Graphic Ready',
    }
];

const FLYER_TEMPLATES = [
    { id: 'flash', label: '⚡ Flash Sale', banner: '⚡ FLASH SALE — 24 HOURS ONLY!' },
    { id: 'pod', label: '🚚 Pay on Delivery', banner: '🚚 PAY ON DELIVERY AVAILABLE • LAGOS / ABUJA / PH' },
    { id: 'restock', label: '📦 Restocked', banner: '📦 RESTOCKED — ONLY 5 PIECES LEFT!' },
    { id: 'wholesale', label: '🎁 Wholesale Deal', banner: '🎁 WHOLESALE & RETAIL DEAL • DM TO ORDER' },
];

const RELIGHT_PRESETS: { id: RelightPreset; label: string; desc: string }[] = [
    { id: 'auto', label: '🤖 Smart Auto-Relight', desc: 'Automatically fixes dim shop lighting' },
    { id: 'bright', label: '☀️ Brighten Market Stall', desc: '+25% exposure for dark indoor shots' },
    { id: 'warm_daylight', label: '✨ Warm Daylight', desc: 'Fixes yellow fluorescent stall light' },
    { id: 'vibrant', label: '🎨 Vibrant & Crisp HD', desc: 'Pops fabric, food & gadget colors' },
    { id: 'none', label: '📷 Original Lighting', desc: 'Keep exact camera exposure' },
];

// Normalize Nigerian phone numbers to international format (e.g. 0803... -> 234803...)
const formatWhatsAppNumber = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('0') && digits.length === 11) {
        return `234${digits.slice(1)}`;
    }
    if (digits.length === 10) {
        return `234${digits}`;
    }
    return digits;
};

export const PhotoStudio: React.FC<PhotoStudioProps> = ({
    credits,
    onUpdateCredits,
    businessName = 'SmartBiz Merchant'
}) => {
    // 1. Mode: Single Shot vs Batch Multi-Angle Set (Recommendation #4)
    const [studioMode, setStudioMode] = useState<'SINGLE' | 'MULTI_ANGLE'>('SINGLE');
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [rawFileName, setRawFileName] = useState<string>('product_photo.jpg');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Multi-Angle State (Front, Back/Side, In-Hand/Detail)
    const [angleSlots, setAngleSlots] = useState<AngleSlot[]>([
        { id: 'front', label: '1. Front View', subtitle: 'Main hero angle', rawImage: null, fileName: '', studioResult: null, transparentCutout: null },
        { id: 'back', label: '2. Back / Side View', subtitle: 'Show sides or back', rawImage: null, fileName: '', studioResult: null, transparentCutout: null },
        { id: 'detail', label: '3. In-Hand / Label', subtitle: 'Close-up of label/specs', rawImage: null, fileName: '', studioResult: null, transparentCutout: null },
    ]);
    const [activeAngleIdx, setActiveAngleIdx] = useState<number>(0);
    const multiFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingSlotIdx, setUploadingSlotIdx] = useState<number>(0);

    // 2. Studio Theme & Relighting Selection (Recommendation #5)
    const [selectedTheme, setSelectedTheme] = useState<StudioTheme>('pure_white');
    const [relightPreset, setRelightPreset] = useState<RelightPreset>('auto');
    const [liveBrightness, setLiveBrightness] = useState<number>(100); // 85% - 135%
    const [liveContrast, setLiveContrast] = useState<number>(100);     // 90% - 130%
    const [liveSaturation, setLiveSaturation] = useState<number>(100); // 90% - 135%

    // 3. Generation & Result State
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationStep, setGenerationStep] = useState<string>('');
    const [studioResult, setStudioResult] = useState<string | null>(null);
    const [transparentCutout, setTransparentCutout] = useState<string | null>(null);
    const [detectedTitle, setDetectedTitle] = useState<string>('Commercial Product');
    const [detectedPrice, setDetectedPrice] = useState<string>('15,000');

    // 4. Comparison View Mode & Split Slider
    const [viewMode, setViewMode] = useState<'SLIDER' | 'SIDE_BY_SIDE'>('SLIDER');
    const [sliderPos, setSliderPos] = useState<number>(50);
    const isDraggingSliderRef = useRef<boolean>(false);
    const compareContainerRef = useRef<HTMLDivElement>(null);

    // 5. Freely Adjustable Price & Name Tag Badge
    const [showBadge, setShowBadge] = useState<boolean>(true);
    const [badgeTitle, setBadgeTitle] = useState<string>('');
    const [badgePrice, setBadgePrice] = useState<string>('');
    const [badgePromo, setBadgePromo] = useState<string>('VERIFIED QUALITY');
    const [badgeTheme, setBadgeTheme] = useState<'emerald' | 'gold' | 'ruby' | 'dark' | 'white'>('emerald');
    const [badgeStyle, setBadgeStyle] = useState<'card' | 'pill'>('card');
    const [badgeCoords, setBadgeCoords] = useState<{ x: number; y: number }>({ x: 74, y: 78 });
    const [badgeScale, setBadgeScale] = useState<number>(100);
    const isDraggingBadgeRef = useRef<boolean>(false);

    // 6. Interactive Touch-Up / Eraser Brush
    const [isTouchUpActive, setIsTouchUpActive] = useState<boolean>(false);
    const [brushSize, setBrushSize] = useState<number>(22);
    const touchUpCanvasRef = useRef<HTMLCanvasElement>(null);
    const isBrushingRef = useRef<boolean>(false);
    const [initialCutoutBackup, setInitialCutoutBackup] = useState<string | null>(null);

    // 7. Instant WhatsApp Status & Instagram Story Promo Flyers (Recommendation #1)
    const [isPromoFlyerMode, setIsPromoFlyerMode] = useState<boolean>(false);
    const [flyerBannerText, setFlyerBannerText] = useState<string>('⚡ FLASH SALE — 24 HOURS ONLY!');
    const [flyerRatio, setFlyerRatio] = useState<FlyerRatio>('1:1');
    const [merchantPhone, setMerchantPhone] = useState<string>(() => {
        return localStorage.getItem('smartbiz_whatsapp_phone') || '';
    });

    // 8. Anti-Theft Vendor Watermarking (Recommendation #2)
    const [enableWatermark, setEnableWatermark] = useState<boolean>(true);
    const [watermarkStyle, setWatermarkStyle] = useState<WatermarkStyle>('subtle_footer');
    const [watermarkText, setWatermarkText] = useState<string>('');
    const [watermarkOpacity, setWatermarkOpacity] = useState<number>(45); // 15% - 80%

    // 9. Save to Catalog Modal
    const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
    const [productCategory, setProductCategory] = useState<string>('General Merchandise');
    const [isSavingToCatalog, setIsSavingToCatalog] = useState<boolean>(false);

    // Persist merchant phone for WhatsApp deep links
    const handlePhoneChange = (val: string) => {
        setMerchantPhone(val);
        localStorage.setItem('smartbiz_whatsapp_phone', val);
    };

    // Computed WhatsApp Click-to-Order Deep Link (Recommendation #3)
    const activeTitle = badgeTitle || detectedTitle || 'Premium Product';
    const activePrice = badgePrice || detectedPrice || '15,000';
    const formattedPrice = activePrice.startsWith('₦') ? activePrice : `₦${activePrice}`;
    const cleanWaNumber = formatWhatsAppNumber(merchantPhone);
    const whatsAppOrderMessage = `Hello ${businessName}! I want to order "${activeTitle}" for ${formattedPrice} seen on your showcase. Is it available?`;
    const whatsAppDeepLink = cleanWaNumber
        ? `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(whatsAppOrderMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(whatsAppOrderMessage)}`;

    const effectiveWatermarkLabel = (watermarkText.trim() || `Verified Authentic • ${businessName}`).toUpperCase();

    // Instant Demo Sample
    const loadSampleProduct = () => {
        const createSampleCanvas = (angleLabel: string, accentColor: string) => {
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 750;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, 600, 750);
                ctx.fillStyle = '#e2e8f0';
                for (let i = 0; i < 750; i += 30) ctx.fillRect(0, i, 600, 2);
                for (let j = 0; j < 600; j += 30) ctx.fillRect(j, 0, 2, 750);

                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.roundRect(170, 220, 260, 360, [36]);
                ctx.fill();

                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.roundRect(190, 250, 220, 220, [20]);
                ctx.fill();

                ctx.fillStyle = accentColor;
                ctx.beginPath();
                ctx.arc(300, 320, 28, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('4G LTE', 300, 390);

                ctx.fillStyle = '#10b981';
                ctx.font = '13px sans-serif';
                ctx.fillText(angleLabel, 300, 420);

                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(300, 520, 20, 0, Math.PI * 2);
                ctx.fill();
            }
            return canvas.toDataURL('image/jpeg', 0.92);
        };

        if (studioMode === 'MULTI_ANGLE') {
            const fImg = createSampleCanvas('Front Hotspot View', '#ef4444');
            const bImg = createSampleCanvas('Back Battery & IMEI', '#3b82f6');
            const dImg = createSampleCanvas('Side SIM & USB Port', '#f59e0b');
            setAngleSlots([
                { id: 'front', label: '1. Front View', subtitle: 'Main hero angle', rawImage: fImg, fileName: 'front_sample.jpg', studioResult: null, transparentCutout: null },
                { id: 'back', label: '2. Back / Side View', subtitle: 'Show sides or back', rawImage: bImg, fileName: 'back_sample.jpg', studioResult: null, transparentCutout: null },
                { id: 'detail', label: '3. In-Hand / Label', subtitle: 'Close-up of label/specs', rawImage: dImg, fileName: 'detail_sample.jpg', studioResult: null, transparentCutout: null },
            ]);
            setRawImage(fImg);
            setStudioResult(null);
            toast.success('Loaded 3-Angle sample product set!');
        } else {
            const dataUrl = createSampleCanvas('WiFi Mobile Hotspot', '#ef4444');
            setRawImage(dataUrl);
            setRawFileName('airtel_pocket_wifi_sample.jpg');
            setStudioResult(null);
            setTransparentCutout(null);
            toast.success('Loaded sample product photo!');
        }
    };

    // Compress and read uploaded file
    const readAndDownscaleFile = (file: File, callback: (dataUrl: string, name: string) => void) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (JPG, PNG, or WebP).');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            toast.error('Image size must be less than 15MB.');
            return;
        }

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
                    callback(canvas.toDataURL('image/jpeg', 0.9), file.name);
                } else {
                    callback(result, file.name);
                }
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    const processUploadedFile = (file: File) => {
        readAndDownscaleFile(file, (dataUrl, name) => {
            setRawFileName(name);
            setRawImage(dataUrl);
            setStudioResult(null);
            setTransparentCutout(null);
            toast.success('Photo ready! Choose your studio presentation below.');
        });
    };

    const processMultiSlotFile = (file: File, slotIndex: number) => {
        readAndDownscaleFile(file, (dataUrl, name) => {
            setAngleSlots((prev) => {
                const updated = [...prev];
                updated[slotIndex] = {
                    ...updated[slotIndex],
                    rawImage: dataUrl,
                    fileName: name,
                    studioResult: null,
                    transparentCutout: null
                };
                return updated;
            });
            if (slotIndex === 0) setRawImage(dataUrl);
            toast.success(`Loaded ${angleSlots[slotIndex].label}!`);
        });
    };

    // Execute Precision AI Photoshoot (Single or Batch Multi-Angle)
    const handleGenerateShoot = async () => {
        if (studioMode === 'MULTI_ANGLE') {
            const filledSlots = angleSlots.filter((s) => s.rawImage !== null);
            if (filledSlots.length === 0) {
                toast.error('Please upload at least 1 angle in the Multi-Angle slots.');
                return;
            }
            const totalCost = filledSlots.length * 2;
            if (credits < totalCost) {
                toast.error(`Insufficient credits for ${filledSlots.length} angles (Cost: ${totalCost} credits, Balance: ${credits}).`);
                return;
            }

            setIsGenerating(true);
            try {
                const updatedSlots = [...angleSlots];
                let firstTitle = '';
                let firstPrice = '';
                let firstCat = '';

                for (let i = 0; i < updatedSlots.length; i++) {
                    const slot = updatedSlots[i];
                    if (!slot.rawImage) continue;

                    setGenerationStep(`Processing ${slot.label} (${i + 1}/${updatedSlots.length}) — Removing background & relighting...`);
                    const res = await runPrecisionStudio(slot.rawImage, selectedTheme, relightPreset);
                    if (res && res.studio_image_base64) {
                        updatedSlots[i] = {
                            ...slot,
                            studioResult: res.studio_image_base64,
                            transparentCutout: res.transparent_cutout_base64 || res.transparent_image_base64 || null,
                        };
                        if (!firstTitle && res.product_title) {
                            firstTitle = res.product_title;
                            firstPrice = res.suggested_price ? Number(res.suggested_price).toLocaleString() : '15,000';
                            firstCat = res.category || 'General Merchandise';
                        }
                    }
                }

                setAngleSlots(updatedSlots);
                const firstProcessedIdx = updatedSlots.findIndex((s) => s.studioResult !== null);
                if (firstProcessedIdx !== -1) {
                    setActiveAngleIdx(firstProcessedIdx);
                    setRawImage(updatedSlots[firstProcessedIdx].rawImage);
                    setStudioResult(updatedSlots[firstProcessedIdx].studioResult);
                    setTransparentCutout(updatedSlots[firstProcessedIdx].transparentCutout);
                    setInitialCutoutBackup(updatedSlots[firstProcessedIdx].transparentCutout);
                }

                if (firstTitle) {
                    setDetectedTitle(firstTitle);
                    setDetectedPrice(firstPrice);
                    setBadgeTitle(firstTitle);
                    setBadgePrice(firstPrice);
                    setProductCategory(firstCat);
                }

                try {
                    const billingRes = await billingService.deductCredits(totalCost, `AI Multi-Angle Studio (${filledSlots.length} shots)`);
                    if (billingRes && typeof billingRes.credits === 'number') {
                        onUpdateCredits(billingRes.credits);
                    }
                } catch (bErr) {
                    console.warn('Billing notice:', bErr);
                }

                toast.success(`✨ All ${filledSlots.length} product angles processed!`, { duration: 4000 });
            } catch (err: any) {
                console.error('Multi-angle photoshoot error:', err);
                toast.error(err.response?.data?.error || err.message || 'Failed to complete multi-angle shoot.');
            } finally {
                setIsGenerating(false);
                setGenerationStep('');
            }
            return;
        }

        // Single Shot Mode
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
        setGenerationStep('Gemini Vision tracing product contour & subtracting interior holes...');

        try {
            setTimeout(() => {
                if (isGenerating) {
                    setGenerationStep('De-bleeding background edges & applying Studio Relighting...');
                }
            }, 1400);

            const response = await runPrecisionStudio(rawImage, selectedTheme, relightPreset);

            if (response && response.studio_image_base64) {
                const studioImg = response.studio_image_base64;
                const cutoutImg = response.transparent_cutout_base64 || response.transparent_image_base64;

                setStudioResult(studioImg);
                setTransparentCutout(cutoutImg || null);
                setInitialCutoutBackup(cutoutImg || null);

                const title = response.product_title || 'Commercial Product';
                const price = response.suggested_price ? Number(response.suggested_price).toLocaleString() : '15,000';
                const cat = response.category || 'General Merchandise';

                setDetectedTitle(title);
                setDetectedPrice(price);
                setBadgeTitle(title);
                setBadgePrice(price);
                setProductCategory(cat);

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

    // Switch active angle in Multi-Angle Result Showcase
    const handleSelectActiveAngle = (idx: number) => {
        const slot = angleSlots[idx];
        if (!slot || !slot.studioResult) return;
        setActiveAngleIdx(idx);
        setRawImage(slot.rawImage);
        setStudioResult(slot.studioResult);
        setTransparentCutout(slot.transparentCutout);
        setInitialCutoutBackup(slot.transparentCutout);
    };

    // Slider dragging
    const handleSliderMove = (clientX: number) => {
        if (!compareContainerRef.current) return;
        const rect = compareContainerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const newPos = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
        setSliderPos(newPos);
    };

    // Price Badge Dragging
    const handleBadgeDragMove = (clientX: number, clientY: number) => {
        if (!compareContainerRef.current || !isDraggingBadgeRef.current) return;
        const rect = compareContainerRef.current.getBoundingClientRect();
        const xPct = Math.min(90, Math.max(10, ((clientX - rect.left) / rect.width) * 100));
        const yPct = Math.min(90, Math.max(10, ((clientY - rect.top) / rect.height) * 100));
        setBadgeCoords({ x: Math.round(xPct), y: Math.round(yPct) });
    };

    const setPresetPosition = (preset: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center-bottom' | 'center-top') => {
        switch (preset) {
            case 'top-right': setBadgeCoords({ x: 74, y: 18 }); break;
            case 'top-left': setBadgeCoords({ x: 26, y: 18 }); break;
            case 'bottom-right': setBadgeCoords({ x: 74, y: 80 }); break;
            case 'bottom-left': setBadgeCoords({ x: 26, y: 80 }); break;
            case 'center-bottom': setBadgeCoords({ x: 50, y: 82 }); break;
            case 'center-top': setBadgeCoords({ x: 50, y: 18 }); break;
        }
    };

    // Initialize Touch-Up Canvas when activated
    useEffect(() => {
        if (isTouchUpActive && touchUpCanvasRef.current && (transparentCutout || studioResult)) {
            const canvas = touchUpCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                canvas.width = img.naturalWidth || 800;
                canvas.height = img.naturalHeight || 800;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = transparentCutout || studioResult!;
        }
    }, [isTouchUpActive, transparentCutout, studioResult]);

    const handleTouchUpBrush = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isBrushingRef.current || !touchUpCanvasRef.current) return;
        const canvas = touchUpCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize * scaleX, 0, Math.PI * 2);
        ctx.fill();
    };

    const handleApplyTouchUp = () => {
        if (!touchUpCanvasRef.current) return;
        const canvas = touchUpCanvasRef.current;
        const updatedCutout = canvas.toDataURL('image/png');
        setTransparentCutout(updatedCutout);

        if (selectedTheme !== 'transparent') {
            const compCanvas = document.createElement('canvas');
            compCanvas.width = canvas.width;
            compCanvas.height = canvas.height;
            const cCtx = compCanvas.getContext('2d');
            if (cCtx) {
                if (selectedTheme === 'warm_wood') {
                    cCtx.fillStyle = '#f8f2ea';
                    cCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);
                } else if (selectedTheme === 'studio_grey') {
                    cCtx.fillStyle = '#f2f4f7';
                    cCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);
                } else {
                    cCtx.fillStyle = '#ffffff';
                    cCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);
                }

                cCtx.fillStyle = 'rgba(15, 20, 30, 0.12)';
                cCtx.beginPath();
                cCtx.ellipse(compCanvas.width / 2, compCanvas.height * 0.86, compCanvas.width * 0.32, 28, 0, 0, Math.PI * 2);
                cCtx.filter = 'blur(14px)';
                cCtx.fill();
                cCtx.filter = 'none';

                cCtx.drawImage(canvas, 0, 0);
                setStudioResult(compCanvas.toDataURL('image/jpeg', 0.95));
            }
        } else {
            setStudioResult(updatedCutout);
        }

        setIsTouchUpActive(false);
        toast.success('Touch-up applied! Stray background erased cleanly.');
    };

    const handleResetTouchUp = () => {
        if (initialCutoutBackup) {
            setTransparentCutout(initialCutoutBackup);
            handleGenerateShoot();
            toast.success('Reset to initial AI result.');
        }
    };

    // Helper to draw Watermark, Flyer Bars, and Price Badge onto any output Canvas
    const drawOverlaysOnCanvas = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
        // 1. Anti-Theft Vendor Watermark (Recommendation #2)
        if (enableWatermark) {
            const alpha = Math.max(0.1, Math.min(0.85, watermarkOpacity / 100));
            ctx.save();
            if (watermarkStyle === 'diagonal_shield') {
                ctx.translate(cw / 2, ch / 2);
                ctx.rotate(-Math.PI / 6);
                ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.45})`;
                ctx.font = `900 ${Math.round(cw * 0.026)}px sans-serif`;
                ctx.textAlign = 'center';
                const stepY = cw * 0.22;
                const stepX = cw * 0.55;
                for (let y = -ch; y <= ch; y += stepY) {
                    for (let x = -cw; x <= cw; x += stepX) {
                        ctx.fillText(`🛡 ${effectiveWatermarkLabel}`, x, y);
                    }
                }
            } else if (watermarkStyle === 'corner_seal') {
                const sealW = cw * 0.34;
                const sealH = ch * 0.055;
                const sx = cw * 0.035;
                const sy = isPromoFlyerMode ? ch * 0.10 : ch * 0.035;
                ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(0.9, alpha + 0.25)})`;
                ctx.beginPath();
                ctx.roundRect(sx, sy, sealW, sealH, [12]);
                ctx.fill();
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#a7f3d0';
                ctx.font = `bold ${Math.round(cw * 0.017)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(`✓ ${effectiveWatermarkLabel.slice(0, 28)}`, sx + sealW / 2, sy + sealH * 0.64);
            } else {
                // subtle_footer
                const fy = isPromoFlyerMode ? ch * 0.905 : ch * 0.968;
                ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
                ctx.font = `bold ${Math.round(cw * 0.017)}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.fillText(`🛡 ${effectiveWatermarkLabel}`, cw * 0.04, fy);
            }
            ctx.restore();
        }

        // 2. Social Promo Flyer Header & Bottom WhatsApp CTA Strip (Recommendation #1)
        if (isPromoFlyerMode) {
            ctx.save();
            // Top Promo Banner
            const topH = ch * 0.085;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, cw, topH);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(0, topH - 4, cw, 4);

            ctx.fillStyle = '#fbbf24';
            ctx.font = `900 ${Math.round(cw * 0.025)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(flyerBannerText.toUpperCase(), cw / 2, topH * 0.62);

            // Bottom WhatsApp Order Strip
            const botH = ch * 0.075;
            const botY = ch - botH;
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(0, botY, cw, botH);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(0, botY, cw, 3);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(cw * 0.022)}px sans-serif`;
            const contactStr = merchantPhone
                ? `📲 WHATSAPP TO ORDER: ${merchantPhone} • ${businessName.toUpperCase()}`
                : `🏪 DM OR WHATSAPP TO ORDER • ${businessName.toUpperCase()}`;
            ctx.fillText(contactStr, cw / 2, botY + botH * 0.62);
            ctx.restore();
        }

        // 3. Adjustable Price Tag Badge
        if (showBadge) {
            ctx.save();
            const scaleFactor = (badgeScale / 100) * (cw / 1080);
            const badgeW = 360 * scaleFactor;
            const badgeH = 112 * scaleFactor;

            const bx = Math.max(20, Math.min(cw - badgeW - 20, (badgeCoords.x / 100) * cw - badgeW / 2));
            const by = Math.max(20, Math.min(ch - badgeH - 20, (badgeCoords.y / 100) * ch - badgeH / 2));

            const colors = {
                emerald: { bg: '#064e3b', border: '#10b981', text: '#ffffff', pillBg: '#059669', pillText: '#a7f3d0' },
                gold: { bg: '#451a03', border: '#f59e0b', text: '#ffffff', pillBg: '#d97706', pillText: '#fef3c7' },
                ruby: { bg: '#881337', border: '#f43f5e', text: '#ffffff', pillBg: '#e11d48', pillText: '#ffe4e6' },
                dark: { bg: '#0f172a', border: '#38bdf8', text: '#ffffff', pillBg: '#1e293b', pillText: '#bae6fd' },
                white: { bg: '#ffffff', border: '#0f172a', text: '#0f172a', pillBg: '#0f172a', pillText: '#ffffff' }
            }[badgeTheme];

            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 18 * scaleFactor;
            ctx.shadowOffsetY = 6 * scaleFactor;

            if (badgeStyle === 'pill') {
                ctx.fillStyle = colors.bg;
                ctx.beginPath();
                ctx.roundRect(bx, by + 20 * scaleFactor, badgeW, 64 * scaleFactor, [32 * scaleFactor]);
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.lineWidth = 2.5 * scaleFactor;
                ctx.strokeStyle = colors.border;
                ctx.stroke();

                ctx.fillStyle = colors.text;
                ctx.font = `900 ${Math.round(26 * scaleFactor)}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(formattedPrice, bx + badgeW / 2, by + 61 * scaleFactor);
            } else {
                ctx.fillStyle = colors.bg;
                ctx.beginPath();
                ctx.roundRect(bx, by, badgeW, badgeH, [18 * scaleFactor]);
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.lineWidth = 2.5 * scaleFactor;
                ctx.strokeStyle = colors.border;
                ctx.stroke();

                const promoText = (badgePromo || 'AUTHENTIC').toUpperCase();
                ctx.fillStyle = colors.pillBg;
                ctx.beginPath();
                ctx.roundRect(bx + 14 * scaleFactor, by + 12 * scaleFactor, 150 * scaleFactor, 24 * scaleFactor, [12 * scaleFactor]);
                ctx.fill();

                ctx.fillStyle = colors.pillText;
                ctx.font = `bold ${Math.round(11 * scaleFactor)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(promoText.slice(0, 20), bx + 89 * scaleFactor, by + 28 * scaleFactor);

                const displayTitle = activeTitle.slice(0, 24);
                ctx.fillStyle = colors.text;
                ctx.font = `bold ${Math.round(16 * scaleFactor)}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.fillText(displayTitle, bx + 16 * scaleFactor, by + 62 * scaleFactor);

                ctx.fillStyle = badgeTheme === 'white' ? '#0f172a' : '#ffffff';
                ctx.font = `900 ${Math.round(25 * scaleFactor)}px monospace`;
                ctx.textAlign = 'left';
                ctx.fillText(formattedPrice, bx + 16 * scaleFactor, by + 96 * scaleFactor);
            }
            ctx.restore();
        }
    };

    // Bake image with Relighting, Watermark, Flyer Banner, and Price Tag
    const handleDownload = (format: 'studio' | 'transparent' = 'studio') => {
        const targetImage = format === 'transparent' ? transparentCutout : studioResult;
        if (!targetImage) {
            toast.error('No processed image available.');
            return;
        }

        if (format === 'transparent') {
            const link = document.createElement('a');
            link.href = targetImage;
            link.download = `smartbiz_cutout_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded Clean Transparent PNG!');
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const isVerticalStory = isPromoFlyerMode && flyerRatio === '9:16';
            const cw = 1080;
            const ch = isVerticalStory ? 1920 : 1080;
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Fill background for 9:16 vertical status flyer
            if (selectedTheme === 'warm_wood') {
                ctx.fillStyle = '#f5ebe0';
            } else if (selectedTheme === 'studio_grey') {
                ctx.fillStyle = '#f1f5f9';
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.fillRect(0, 0, cw, ch);

            // Apply Live Relighting / Exposure Sliders (Recommendation #5)
            ctx.filter = `brightness(${liveBrightness}%) contrast(${liveContrast}%) saturate(${liveSaturation}%)`;

            if (isVerticalStory) {
                const drawSize = cw;
                const offsetY = (ch - drawSize) / 2;
                ctx.drawImage(img, 0, offsetY, drawSize, drawSize);
            } else {
                ctx.drawImage(img, 0, 0, cw, ch);
            }
            ctx.filter = 'none';

            drawOverlaysOnCanvas(ctx, cw, ch);

            const downloadUrl = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `smartbiz_${isVerticalStory ? 'whatsapp_status' : 'studio'}_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(isVerticalStory ? 'Downloaded 9:16 WhatsApp Status Flyer!' : 'Downloaded HD Studio Showcase!');
        };
        img.src = targetImage;
    };

    // Recommendation #4: Download 3-in-1 Multi-Angle Showcase Collage Card
    const handleDownloadMultiAngleCollage = () => {
        const processed = angleSlots.filter((s) => s.studioResult !== null);
        if (processed.length < 2) {
            toast.error('Process at least 2 angles to generate a Multi-Angle Collage!');
            return;
        }

        const imagesToLoad = processed.map((slot) => {
            return new Promise<{ img: HTMLImageElement; label: string }>((resolve) => {
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => resolve({ img: image, label: slot.label });
                image.src = slot.studioResult!;
            });
        });

        Promise.all(imagesToLoad).then((loaded) => {
            const canvas = document.createElement('canvas');
            const cw = 1200;
            const ch = 1200;
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, cw, ch);

            ctx.filter = `brightness(${liveBrightness}%) contrast(${liveContrast}%) saturate(${liveSaturation}%)`;

            if (loaded.length === 2) {
                ctx.drawImage(loaded[0].img, 20, 110, 570, 960);
                ctx.drawImage(loaded[1].img, 610, 110, 570, 960);
            } else {
                // Hero left + 2 stacked right
                ctx.drawImage(loaded[0].img, 20, 110, 700, 960);
                ctx.drawImage(loaded[1].img, 740, 110, 440, 470);
                ctx.drawImage(loaded[2].img, 740, 600, 440, 470);
            }
            ctx.filter = 'none';

            // Top Collage Header
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, cw, 95);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 28px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${activeTitle.toUpperCase()} — MULTI-ANGLE VIEW`, 30, 60);

            ctx.fillStyle = '#10b981';
            ctx.font = '900 32px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(formattedPrice, cw - 30, 62);

            // Bottom Collage Footer
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(0, 1090, cw, 110);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            const footerMsg = merchantPhone
                ? `📲 ORDER ON WHATSAPP: ${merchantPhone} • ${businessName.toUpperCase()} • VERIFIED AUTHENTIC`
                : `🏪 ${businessName.toUpperCase()} • VERIFIED AUTHENTIC PRODUCT`;
            ctx.fillText(footerMsg, cw / 2, 1155);

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.download = `smartbiz_multi_angle_collage_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Downloaded 3-in-1 Multi-Angle Showcase Collage!');
        });
    };

    // Copy WhatsApp Click-to-Order Deep Link (Recommendation #3)
    const handleCopyOrderLink = () => {
        navigator.clipboard.writeText(whatsAppDeepLink);
        toast.success('1-Tap WhatsApp Order Link copied to clipboard! 🔗');
    };

    // Copy formatted WhatsApp Sales Pitch + Deep Link
    const handleShareWhatsApp = () => {
        const pitch =
            `🔥 *${isPromoFlyerMode ? flyerBannerText : 'NEW ARRIVAL — 100% QUALITY GUARANTEED'}* 🔥\n\n` +
            `📦 *Product:* ${activeTitle}\n` +
            `💰 *Price:* ${formattedPrice}\n` +
            `🏪 *Vendor:* ${businessName}\n` +
            `${badgePromo ? `⭐ *Highlight:* ${badgePromo}\n` : ''}` +
            `✅ Clean, verified & ready for fast delivery / pickup.\n\n` +
            `👇 *Tap this link to order immediately on WhatsApp:*\n` +
            `${whatsAppDeepLink}`;

        navigator.clipboard.writeText(pitch);
        toast.success('WhatsApp Sales Pitch + Direct Order Link copied! Downloading image... 🚀', { duration: 5000 });
        handleDownload('studio');
    };

    // Save directly to Storefront and Marketplace Inventory (Single or Multi-Angle)
    const handleSaveToStore = async () => {
        if (!studioResult) return;
        setIsSavingToCatalog(true);

        const cleanPriceNum = parseFloat(activePrice.replace(/[^0-9.]/g, '')) || 15000;
        const extraAngles = angleSlots
            .filter((s) => s.studioResult !== null)
            .map((s) => ({ angle: s.id, label: s.label, image_url: s.studioResult }));

        try {
            try {
                await api.post('/api/marketplace/products/', {
                    name: activeTitle,
                    price: cleanPriceNum,
                    product_type: 'physical',
                    category: productCategory,
                    description: `Professional photoshoot created with SmartBiz AI Photo Studio (${selectedTheme}). Order on WhatsApp: ${whatsAppDeepLink}`,
                    image_url: studioResult,
                    is_active: true
                });
            } catch (apiErr) {
                console.warn('Backend catalog sync notice:', apiErr);
            }

            const rawStored = localStorage.getItem('smartbiz_products');
            const currentList = rawStored ? JSON.parse(rawStored) : [];
            const newProduct = {
                id: Date.now(),
                name: activeTitle,
                price: cleanPriceNum,
                cost_price: Math.round(cleanPriceNum * 0.7),
                category: productCategory,
                stock: 10,
                sku: `SBZ-${Math.floor(1000 + Math.random() * 9000)}`,
                image_url: studioResult,
                gallery_images: extraAngles.length > 0 ? extraAngles : undefined,
                whatsapp_order_link: whatsAppDeepLink,
                description: `Professional photoshoot created with SmartBiz AI Photo Studio (${selectedTheme}).`,
                created_at: new Date().toISOString()
            };
            localStorage.setItem('smartbiz_products', JSON.stringify([newProduct, ...currentList]));
            window.dispatchEvent(new Event('smartbiz_products_updated'));

            setShowInventoryModal(false);
            toast.success(`Saved "${activeTitle}" with WhatsApp Order Link to your Store Catalog! 📦`, { duration: 4000 });
        } catch (e) {
            console.error('Save to catalog error:', e);
            toast.error('Failed to save product to catalog.');
        } finally {
            setIsSavingToCatalog(false);
        }
    };

    const liveCssFilter = `brightness(${liveBrightness}%) contrast(${liveContrast}%) saturate(${liveSaturation}%)`;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
                    <span>📸</span>
                    <span>AI Product Photo Studio • Pro Merchant Edition</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Clean Studio Cutouts, Flyers & WhatsApp Sales Links
                </h2>

                <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto mt-2 leading-relaxed">
                    Snap on your bedsheet, counter, or market stall. AI strips background clutter, auto-relights dim photos, embeds your anti-theft watermark, and builds WhatsApp Status flyers with 1-tap order links.
                </p>

                <div className="mt-4 inline-flex items-center gap-3 bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800 text-xs font-bold text-slate-300">
                    <span>⚡ 2 BizCredits per angle</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400">Balance: {credits} Credits</span>
                </div>
            </div>

            {/* Step 1: Single Shot vs Batch Multi-Angle Set (Recommendation #4) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                        <span>Upload Product Photo(s)</span>
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Mode Toggle: Single vs Multi-Angle Set */}
                        <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button
                                type="button"
                                onClick={() => setStudioMode('SINGLE')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    studioMode === 'SINGLE'
                                        ? 'bg-emerald-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                📸 Single Shot
                            </button>
                            <button
                                type="button"
                                onClick={() => setStudioMode('MULTI_ANGLE')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    studioMode === 'MULTI_ANGLE'
                                        ? 'bg-emerald-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                🗂️ Multi-Angle Set (3 Shots)
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={loadSampleProduct}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer px-2 py-1"
                        >
                            🧪 Load Demo Sample
                        </button>
                    </div>
                </div>

                {/* Hidden File Inputs */}
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
                <input
                    type="file"
                    ref={multiFileInputRef}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processMultiSlotFile(file, uploadingSlotIdx);
                    }}
                    className="hidden"
                    accept="image/*"
                />

                {studioMode === 'MULTI_ANGLE' ? (
                    <div className="space-y-3">
                        <p className="text-xs text-slate-400">
                            Upload up to 3 angles of the same item (Front, Side/Back, Label/In-Hand). All angles will be processed with matching studio lighting and background.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {angleSlots.map((slot, idx) => (
                                <div
                                    key={slot.id}
                                    className={`p-4 rounded-2xl border transition-all ${
                                        slot.rawImage
                                            ? 'bg-slate-950 border-emerald-500/50'
                                            : 'bg-slate-950/50 border-dashed border-slate-700 hover:border-emerald-500/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-xs font-bold text-white">{slot.label}</p>
                                            <p className="text-[10px] text-slate-400">{slot.subtitle}</p>
                                        </div>
                                        {slot.studioResult && (
                                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                                                ✓ Ready
                                            </span>
                                        )}
                                    </div>

                                    {slot.rawImage ? (
                                        <div className="space-y-2">
                                            <img
                                                src={slot.studioResult || slot.rawImage}
                                                alt={slot.label}
                                                className="w-full h-36 object-cover rounded-xl border border-slate-800"
                                            />
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUploadingSlotIdx(idx);
                                                        multiFileInputRef.current?.click();
                                                    }}
                                                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 text-slate-300 hover:text-white border border-slate-700"
                                                >
                                                    Replace
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAngleSlots((prev) => {
                                                            const next = [...prev];
                                                            next[idx] = { ...next[idx], rawImage: null, fileName: '', studioResult: null, transparentCutout: null };
                                                            return next;
                                                        });
                                                    }}
                                                    className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-rose-950/40 text-rose-400 border border-rose-800/40"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUploadingSlotIdx(idx);
                                                multiFileInputRef.current?.click();
                                            }}
                                            className="w-full h-36 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-emerald-400 cursor-pointer"
                                        >
                                            <span className="text-2xl">➕</span>
                                            <span className="text-xs font-bold">Upload {slot.label}</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !rawImage ? (
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
                                    setIsTouchUpActive(false);
                                }}
                                className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-900/40"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: Studio Background & Auto Relighting (Recommendation #5) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>Choose Studio Presentation & Relighting</span>
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

                {/* Auto Relighting Selector for Dim Market Photos (Recommendation #5) */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span>☀️</span>
                            <span>Studio Relighting (Fixes Dim Shop / Evening Photos)</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">AI Exposure Boost</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {RELIGHT_PRESETS.map((rp) => {
                            const active = relightPreset === rp.id;
                            return (
                                <button
                                    key={rp.id}
                                    type="button"
                                    onClick={() => setRelightPreset(rp.id)}
                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                        active
                                            ? 'bg-amber-500/15 border-amber-400 text-white'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <p className="text-[11px] font-bold truncate">{rp.label}</p>
                                    <p className="text-[9px] text-slate-400 truncate mt-0.5">{rp.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Launch Button */}
                <div className="pt-1">
                    <button
                        type="button"
                        disabled={(studioMode === 'SINGLE' ? !rawImage : angleSlots.every((s) => !s.rawImage)) || isGenerating}
                        onClick={handleGenerateShoot}
                        className="w-full py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{generationStep || 'Processing Studio Shoot...'}</span>
                            </>
                        ) : studioMode === 'MULTI_ANGLE' ? (
                            <span>✨ Process All Uploaded Angles ({angleSlots.filter((s) => s.rawImage).length * 2 || 2} Credits)</span>
                        ) : (
                            <span>✨ Clean Background & Create Studio Shoot (2 Credits)</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Step 3: Interactive Result, Flyers, Watermark & WhatsApp Deep Links */}
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
                                {activeTitle}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setIsTouchUpActive(!isTouchUpActive)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isTouchUpActive
                                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:text-white'
                                }`}
                            >
                                🧹 {isTouchUpActive ? 'Exit Touch-Up' : 'Touch-Up Eraser'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode(viewMode === 'SLIDER' ? 'SIDE_BY_SIDE' : 'SLIDER')}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            >
                                {viewMode === 'SLIDER' ? 'Side-by-Side' : 'Split Slider'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBadge(!showBadge)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    showBadge
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                        : 'bg-slate-950 text-slate-300 border-slate-700'
                                }`}
                            >
                                🏷️ {showBadge ? 'Price Tag: ON' : 'Price Tag: OFF'}
                            </button>
                        </div>
                    </div>

                    {/* Multi-Angle Switcher Bar (When in Multi-Angle Mode) */}
                    {studioMode === 'MULTI_ANGLE' && (
                        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                {angleSlots.map((slot, idx) => (
                                    <button
                                        key={slot.id}
                                        type="button"
                                        disabled={!slot.studioResult}
                                        onClick={() => handleSelectActiveAngle(idx)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 ${
                                            activeAngleIdx === idx
                                                ? 'bg-emerald-600 text-white border-emerald-400'
                                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {slot.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadMultiAngleCollage}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow cursor-pointer"
                            >
                                🖼️ Download 3-in-1 Collage Card
                            </button>
                        </div>
                    )}

                    {/* Touch-Up Brush Toolbar */}
                    {isTouchUpActive && (
                        <div className="bg-amber-950/30 border border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs font-bold text-amber-300">
                                    🧹 Eraser Brush: Drag over any stray background patch to wipe it out
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-400">Size:</span>
                                    <input
                                        type="range"
                                        min="8"
                                        max="50"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                        className="w-24 accent-amber-500"
                                    />
                                    <span className="text-[11px] text-amber-300 font-mono">{brushSize}px</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleResetTouchUp}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyTouchUp}
                                    className="px-4 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md"
                                >
                                    ✓ Save Clean-Up
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Live Showcase Viewer with Flyer Overlays, Watermark & Draggable Price Badge */}
                    <div className="flex flex-col items-center">
                        {isTouchUpActive ? (
                            <div className="relative max-w-lg aspect-square w-full rounded-3xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-black cursor-crosshair">
                                <canvas
                                    ref={touchUpCanvasRef}
                                    onMouseDown={() => { isBrushingRef.current = true; }}
                                    onMouseUp={() => { isBrushingRef.current = false; }}
                                    onMouseLeave={() => { isBrushingRef.current = false; }}
                                    onMouseMove={handleTouchUpBrush}
                                    onTouchStart={() => { isBrushingRef.current = true; }}
                                    onTouchEnd={() => { isBrushingRef.current = false; }}
                                    onTouchMove={handleTouchUpBrush}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ) : viewMode === 'SLIDER' ? (
                            <div
                                ref={compareContainerRef}
                                onMouseMove={(e) => {
                                    if (isDraggingBadgeRef.current) {
                                        handleBadgeDragMove(e.clientX, e.clientY);
                                    } else if (isDraggingSliderRef.current) {
                                        handleSliderMove(e.clientX);
                                    }
                                }}
                                onMouseDown={() => {
                                    if (!isDraggingBadgeRef.current) {
                                        isDraggingSliderRef.current = true;
                                    }
                                }}
                                onMouseUp={() => {
                                    isDraggingBadgeRef.current = false;
                                    isDraggingSliderRef.current = false;
                                }}
                                onMouseLeave={() => {
                                    isDraggingBadgeRef.current = false;
                                    isDraggingSliderRef.current = false;
                                }}
                                onTouchMove={(e) => {
                                    if (e.touches.length > 0) {
                                        if (isDraggingBadgeRef.current) {
                                            handleBadgeDragMove(e.touches[0].clientX, e.touches[0].clientY);
                                        } else if (isDraggingSliderRef.current) {
                                            handleSliderMove(e.touches[0].clientX);
                                        }
                                    }
                                }}
                                onTouchEnd={() => {
                                    isDraggingBadgeRef.current = false;
                                    isDraggingSliderRef.current = false;
                                }}
                                className="w-full max-w-lg aspect-square rounded-3xl overflow-hidden relative select-none border-2 border-slate-700 bg-black shadow-2xl"
                            >
                                {/* Studio Result (After) with Live Relighting Filter */}
                                <img
                                    src={studioResult}
                                    alt="Studio Result"
                                    style={{ filter: liveCssFilter }}
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                />

                                {/* Live Promo Flyer Top & Bottom Bars (Recommendation #1) */}
                                {isPromoFlyerMode && (
                                    <>
                                        <div className="absolute top-0 inset-x-0 z-20 bg-slate-950/95 border-b-2 border-amber-400 py-2 px-3 text-center pointer-events-none">
                                            <p className="text-[11px] sm:text-xs font-black text-amber-400 uppercase tracking-wider truncate">
                                                {flyerBannerText}
                                            </p>
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 z-20 bg-emerald-950/95 border-t-2 border-emerald-400 py-2 px-3 text-center pointer-events-none">
                                            <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wide truncate">
                                                {merchantPhone
                                                    ? `📲 WHATSAPP TO ORDER: ${merchantPhone} • ${businessName}`
                                                    : `🏪 DM OR WHATSAPP TO ORDER • ${businessName}`}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Live Anti-Theft Vendor Watermark Preview (Recommendation #2) */}
                                {enableWatermark && (
                                    <div
                                        style={{ opacity: watermarkOpacity / 100 }}
                                        className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                                    >
                                        {watermarkStyle === 'diagonal_shield' ? (
                                            <div className="w-full h-full flex flex-col items-center justify-around -rotate-12 scale-125 select-none">
                                                {[0, 1, 2, 3].map((row) => (
                                                    <div key={row} className="flex gap-8 text-slate-900/50 font-black text-xs uppercase tracking-widest whitespace-nowrap">
                                                        <span>🛡 {effectiveWatermarkLabel}</span>
                                                        <span>🛡 {effectiveWatermarkLabel}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : watermarkStyle === 'corner_seal' ? (
                                            <div className={`absolute left-3 ${isPromoFlyerMode ? 'top-12' : 'top-3'} bg-slate-950/90 border border-emerald-500 px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-300 shadow`}>
                                                ✓ {effectiveWatermarkLabel}
                                            </div>
                                        ) : (
                                            <div className={`absolute left-4 ${isPromoFlyerMode ? 'bottom-10' : 'bottom-3'} text-[10px] font-bold text-slate-800/80 bg-white/60 px-2 py-0.5 rounded`}>
                                                🛡 {effectiveWatermarkLabel}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Floating Live Price Tag Badge - Freely Draggable */}
                                {showBadge && (
                                    <div
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            isDraggingBadgeRef.current = true;
                                        }}
                                        onTouchStart={(e) => {
                                            e.stopPropagation();
                                            isDraggingBadgeRef.current = true;
                                        }}
                                        style={{
                                            left: `${badgeCoords.x}%`,
                                            top: `${badgeCoords.y}%`,
                                            transform: `translate(-50%, -50%) scale(${badgeScale / 100})`
                                        }}
                                        className={`absolute z-30 p-3 rounded-2xl shadow-2xl border backdrop-blur-md cursor-grab active:cursor-grabbing select-none transition-shadow hover:ring-2 hover:ring-white/40 ${
                                            badgeTheme === 'emerald'
                                                ? 'bg-emerald-950/95 border-emerald-500 text-white'
                                                : badgeTheme === 'gold'
                                                ? 'bg-amber-950/95 border-amber-500 text-white'
                                                : badgeTheme === 'ruby'
                                                ? 'bg-rose-950/95 border-rose-500 text-white'
                                                : badgeTheme === 'white'
                                                ? 'bg-white border-slate-800 text-slate-900'
                                                : 'bg-slate-950/95 border-sky-500 text-white'
                                        }`}
                                    >
                                        {badgeStyle === 'pill' ? (
                                            <p className="text-base font-black font-mono px-2">
                                                {formattedPrice}
                                            </p>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider">
                                                        {badgePromo || 'VERIFIED'}
                                                    </span>
                                                    <span className="text-[10px] opacity-60 font-mono">⇄ Drag</span>
                                                </div>
                                                <p className="text-xs font-bold truncate max-w-[150px]">
                                                    {activeTitle}
                                                </p>
                                                <p className="text-base font-black font-mono tracking-tight mt-0.5">
                                                    {formattedPrice}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Raw Photo (Before) clipped */}
                                {rawImage && (
                                    <div
                                        className="absolute inset-0 overflow-hidden pointer-events-none z-10"
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

                                {/* Divider */}
                                <div
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none z-20"
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
                                    <img src={studioResult} style={{ filter: liveCssFilter }} alt="Studio Output" className="w-full aspect-square object-cover rounded-2xl border border-emerald-500 shadow-xl" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live Relighting Fine-Tune Sliders (Recommendation #5) */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <span>💡</span>
                                <span>Live Lighting & Color Enhancer</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setLiveBrightness(100);
                                    setLiveContrast(100);
                                    setLiveSaturation(100);
                                }}
                                className="text-[11px] font-bold text-slate-400 hover:text-white"
                            >
                                Reset Sliders
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                    <span>Brightness:</span>
                                    <span className="font-mono text-amber-400">{liveBrightness}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="85"
                                    max="135"
                                    value={liveBrightness}
                                    onChange={(e) => setLiveBrightness(Number(e.target.value))}
                                    className="w-full accent-amber-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                    <span>Contrast:</span>
                                    <span className="font-mono text-amber-400">{liveContrast}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="90"
                                    max="130"
                                    value={liveContrast}
                                    onChange={(e) => setLiveContrast(Number(e.target.value))}
                                    className="w-full accent-amber-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                    <span>Color Vibrancy:</span>
                                    <span className="font-mono text-amber-400">{liveSaturation}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="85"
                                    max="140"
                                    value={liveSaturation}
                                    onChange={(e) => setLiveSaturation(Number(e.target.value))}
                                    className="w-full accent-amber-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Adjustable Price Tag Customizer */}
                    {showBadge && (
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>🎯</span>
                                    <span>Adjustable Price Tag & Badges</span>
                                </span>
                                <span className="text-[11px] text-emerald-400 font-mono">
                                    X: {badgeCoords.x}% | Y: {badgeCoords.y}% (Drag on photo)
                                </span>
                            </div>

                            {/* 1-Click Positions */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                <button type="button" onClick={() => setPresetPosition('top-left')} className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">Top Left</button>
                                <button type="button" onClick={() => setPresetPosition('center-top')} className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">Top Center</button>
                                <button type="button" onClick={() => setPresetPosition('top-right')} className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">Top Right</button>
                                <button type="button" onClick={() => setPresetPosition('bottom-left')} className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">Bottom Left</button>
                                <button type="button" onClick={() => setPresetPosition('center-bottom')} className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">Bottom Center</button>
                                <button type="button" onClick={() => setPresetPosition('bottom-right')} className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">Bottom Right</button>
                            </div>

                            {/* Position & Scale Sliders */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                        <span>Horizontal (X):</span>
                                        <span className="font-mono text-emerald-400">{badgeCoords.x}%</span>
                                    </div>
                                    <input type="range" min="10" max="90" value={badgeCoords.x} onChange={(e) => setBadgeCoords({ ...badgeCoords, x: Number(e.target.value) })} className="w-full accent-emerald-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                        <span>Vertical (Y):</span>
                                        <span className="font-mono text-emerald-400">{badgeCoords.y}%</span>
                                    </div>
                                    <input type="range" min="10" max="90" value={badgeCoords.y} onChange={(e) => setBadgeCoords({ ...badgeCoords, y: Number(e.target.value) })} className="w-full accent-emerald-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                        <span>Badge Size:</span>
                                        <span className="font-mono text-emerald-400">{badgeScale}%</span>
                                    </div>
                                    <input type="range" min="75" max="130" value={badgeScale} onChange={(e) => setBadgeScale(Number(e.target.value))} className="w-full accent-emerald-500" />
                                </div>
                            </div>

                            {/* Text, Style and Theme inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Product Title</label>
                                    <input type="text" value={badgeTitle} onChange={(e) => setBadgeTitle(e.target.value)} placeholder="e.g. Airtel 4G WiFi" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Price (₦)</label>
                                    <input type="text" value={badgePrice} onChange={(e) => setBadgePrice(e.target.value)} placeholder="18,500" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Promo Note</label>
                                    <input type="text" value={badgePromo} onChange={(e) => setBadgePromo(e.target.value)} placeholder="NEW ARRIVAL" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Badge Shape</label>
                                    <select value={badgeStyle} onChange={(e) => setBadgeStyle(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none">
                                        <option value="card">🪪 Full Info Card</option>
                                        <option value="pill">💊 Compact Price Pill</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Color Theme</label>
                                    <select value={badgeTheme} onChange={(e) => setBadgeTheme(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none">
                                        <option value="emerald">🇳🇬 Emerald Green</option>
                                        <option value="gold">🏆 Luxury Gold</option>
                                        <option value="ruby">🔴 Crimson Sale</option>
                                        <option value="dark">🖤 Obsidian Dark</option>
                                        <option value="white">⚪ Clean White</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recommendation #1: Instant WhatsApp Status & Instagram Story Promo Flyers */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                    <span>📱</span>
                                    <span>Instant WhatsApp Status & Instagram Story Promo Flyer</span>
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Adds high-converting sales header & bottom WhatsApp order banner directly to your image.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isPromoFlyerMode && (
                                    <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setFlyerRatio('1:1')}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                                flyerRatio === '1:1' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                                            }`}
                                        >
                                            1:1 Square
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFlyerRatio('9:16')}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                                flyerRatio === '9:16' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                                            }`}
                                        >
                                            9:16 Status Story
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsPromoFlyerMode(!isPromoFlyerMode)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                        isPromoFlyerMode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-700'
                                    }`}
                                >
                                    {isPromoFlyerMode ? 'Flyer Mode: ON' : 'Enable Flyer Mode'}
                                </button>
                            </div>
                        </div>

                        {isPromoFlyerMode && (
                            <div className="space-y-3 pt-2 border-t border-slate-800/80">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {FLYER_TEMPLATES.map((tpl) => (
                                        <button
                                            key={tpl.id}
                                            type="button"
                                            onClick={() => setFlyerBannerText(tpl.banner)}
                                            className={`p-2 rounded-xl border text-left text-[11px] font-bold transition-all cursor-pointer ${
                                                flyerBannerText === tpl.banner
                                                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            {tpl.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Custom Header Banner</label>
                                        <input
                                            type="text"
                                            value={flyerBannerText}
                                            onChange={(e) => setFlyerBannerText(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Vendor WhatsApp Number</label>
                                        <input
                                            type="text"
                                            value={merchantPhone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            placeholder="e.g. 08031234567"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recommendation #2: Anti-Theft Vendor Watermarking */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                    <span>🛡️</span>
                                    <span>Anti-Theft Vendor Watermark Protection</span>
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Protects your original product photos from being stolen by other vendors on Instagram or WhatsApp.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEnableWatermark(!enableWatermark)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    enableWatermark ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 text-slate-400 border-slate-700'
                                }`}
                            >
                                {enableWatermark ? 'Watermark: ON' : 'Watermark: OFF'}
                            </button>
                        </div>

                        {enableWatermark && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Protection Style</label>
                                    <select
                                        value={watermarkStyle}
                                        onChange={(e) => setWatermarkStyle(e.target.value as WatermarkStyle)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                                    >
                                        <option value="subtle_footer">🏷️ Subtle Bottom Stamp</option>
                                        <option value="diagonal_shield">🛡️ Diagonal Anti-Theft Grid</option>
                                        <option value="corner_seal">✅ Official Corner Seal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Custom Brand Stamp Text</label>
                                    <input
                                        type="text"
                                        value={watermarkText}
                                        onChange={(e) => setWatermarkText(e.target.value)}
                                        placeholder={`Verified Authentic • ${businessName}`}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                        <span>Watermark Opacity:</span>
                                        <span className="font-mono text-emerald-400">{watermarkOpacity}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="15"
                                        max="85"
                                        value={watermarkOpacity}
                                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                                        className="w-full accent-emerald-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recommendation #3: 1-Tap "Click-to-Order on WhatsApp" Deep Link Generator */}
                    <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <span className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                                    <span>🔗</span>
                                    <span>1-Tap &ldquo;Click-to-Order on WhatsApp&rdquo; Deep Link</span>
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Paste this link on your WhatsApp Status, Instagram bio, or TikTok. Customers tap once to open a pre-filled order chat with you!
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopyOrderLink}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer"
                                >
                                    📋 Copy Order Link
                                </button>
                                <a
                                    href={whatsAppDeepLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40"
                                >
                                    ↗ Test Link
                                </a>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Your WhatsApp Number</label>
                                <input
                                    type="text"
                                    value={merchantPhone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    placeholder="08031234567"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Generated Pre-Filled Order URL</label>
                                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-emerald-400 font-mono truncate">
                                    {whatsAppDeepLink}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Direct High-Impact Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => handleDownload('studio')}
                            className="py-3.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>📥 {isPromoFlyerMode && flyerRatio === '9:16' ? 'Download 9:16 Flyer' : 'Download HD Photo'}</span>
                        </button>

                        {transparentCutout && (
                            <button
                                type="button"
                                onClick={() => handleDownload('transparent')}
                                className="py-3.5 px-3 rounded-2xl font-bold text-xs bg-slate-950 hover:bg-slate-900 border border-slate-700 text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <span>🏁 Cutout (PNG)</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleShareWhatsApp}
                            className="py-3.5 px-3 rounded-2xl font-bold text-xs bg-green-950 hover:bg-green-900 border border-green-700 text-green-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>💬 Copy Pitch + Download</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowInventoryModal(true)}
                            className="py-3.5 px-3 rounded-2xl font-bold text-xs bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>📦 Save to Catalog</span>
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
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                                    <span className="text-emerald-400 font-bold block mb-0.5">✓ Includes WhatsApp Click-to-Order Link</span>
                                    <span className="truncate block font-mono text-[10px]">{whatsAppDeepLink}</span>
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
