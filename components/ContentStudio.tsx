import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, ArrowRight, Eye, Copy, Check, Calendar, Mail, FileText, Plus, HelpCircle, Download, Phone, Truck, ShieldCheck, Award, Trash2 } from 'lucide-react';
import { BrandIdentity } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import * as geminiService from '../services/geminiService';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';
import { toast } from 'react-hot-toast';
import { toPng } from 'html-to-image';

// Types
type TabType = 'Post Writer' | 'Video Script' | 'Photo Studio' | 'Weekly Plan' | 'Blog Writer' | 'Partnership Pitch' | 'Creations History';
type Platform = 'Instagram' | 'Facebook' | 'Twitter' | 'LinkedIn' | 'TikTok';
type Tone = 'Exciting' | 'Professional' | 'Funny' | 'Informative';
type Format = 'Single Post' | 'Carousel' | 'Story' | 'Reel';

type VideoPlatform = 'TikTok' | 'Instagram Reel' | 'YouTube Shorts';
type HookStyle = 'Educational' | 'Controversial' | 'Storytelling';
type VideoLength = '15s' | '30s' | '60s';

type ArtStyle = 'Realistic' | '3D Render' | 'Minimalist' | 'Cartoon';
type AspectRatio = 'Square (1:1)' | 'Portrait (4:5)' | 'Landscape (16:9)';

type PrimaryGoal = 'Sales' | 'Brand Awareness' | 'Engagement';
type PostFrequency = 'Daily' | '5 times/week' | '3 times/week';

interface ContentStudioProps {
    brand?: BrandIdentity | null;
    credits: number;
    onUpdateCredits: (credits: number) => void;
}

const ContentStudio: React.FC<ContentStudioProps> = ({ brand, credits, onUpdateCredits }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('Photo Studio');

    // Credit limits modal state
    const [showCreditPrompt, setShowCreditPrompt] = useState(false);
    const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

    // Post Writer State
    const [postTopic, setPostTopic] = useState('');
    const [platform, setPlatform] = useState<Platform>('Instagram');
    const [tone, setTone] = useState<Tone>('Exciting');
    const [format, setFormat] = useState<Format>('Single Post');

    // Trends State
    const [trends, setTrends] = useState<any[]>([]);

    useEffect(() => {
        const loadTrends = async () => {
            try {
                const data = await geminiService.generateTrendIdeas(brand?.niche || "Small Business");
                setTrends(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Failed to load trends:", e);
                setTrends([]);
            }
        };
        loadTrends();
    }, [brand]);

    // Video Script State
    const [videoTopic, setVideoTopic] = useState('');
    const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('TikTok');
    const [hookStyle, setHookStyle] = useState<HookStyle>('Educational');
    const [videoLength, setVideoLength] = useState<VideoLength>('30s');

    // Photo Studio State
    const [photoDesc, setPhotoDesc] = useState('');

    // Weekly Plan State
    const [planGoal, setPlanGoal] = useState<PrimaryGoal>('Brand Awareness');
    const [planFrequency, setPlanFrequency] = useState<PostFrequency>('5 times/week');

    // Blog Writer State
    const [blogTopic, setBlogTopic] = useState('');
    const [blogTone, setBlogTone] = useState<string>('Informative');
    const [blogLength, setBlogLength] = useState<string>('Medium');

    // AI Magic Ideas States
    const [magicIdeasPost, setMagicIdeasPost] = useState<string[]>([]);
    const [isLoadingMagicPost, setIsLoadingMagicPost] = useState(false);

    const [magicIdeasVideo, setMagicIdeasVideo] = useState<string[]>([]);
    const [isLoadingMagicVideo, setIsLoadingMagicVideo] = useState(false);

    const fetchMagicIdeasPost = async () => {
        setIsLoadingMagicPost(true);
        try {
            const result = await geminiService.generateSuggestedPrompts(brand?.niche || 'Small Business', 'POST');
            if (Array.isArray(result) && result.length > 0) {
                setMagicIdeasPost(result);
            } else {
                setMagicIdeasPost([
                    "Write a compelling story about how my product solves a common Nigerian problem.",
                    "Behind the scenes look at my daily business hustle.",
                    "A warm thank you post spotlighting recent customer feedback."
                ]);
            }
        } catch (e) {
            console.error("Failed to load magic ideas:", e);
            setMagicIdeasPost([
                "Write a compelling story about how my product solves a common Nigerian problem.",
                "Behind the scenes look at my daily business hustle.",
                "A warm thank you post spotlighting recent customer feedback."
            ]);
        } finally {
            setIsLoadingMagicPost(false);
        }
    };

    const fetchMagicIdeasVideo = async () => {
        setIsLoadingMagicVideo(true);
        try {
            const result = await geminiService.generateSuggestedPrompts(brand?.niche || 'Small Business', 'SCRIPT');
            if (Array.isArray(result) && result.length > 0) {
                setMagicIdeasVideo(result);
            } else {
                setMagicIdeasVideo([
                    "A funny sketch about customers who promise to pay tomorrow but never do.",
                    "A day in the life of a small business owner in Lagos.",
                    "3 reasons to digitize your retail inventory list."
                ]);
            }
        } catch (e) {
            console.error("Failed to load magic ideas:", e);
            setMagicIdeasVideo([
                "A funny sketch about customers who promise to pay tomorrow but never do.",
                "A day in the life of a small business owner in Lagos.",
                "3 reasons to digitize your retail inventory list."
            ]);
        } finally {
            setIsLoadingMagicVideo(false);
        }
    };

    // Partnership Pitch State
    const [partnerName, setPartnerName] = useState<string>('SMEDAN');
    const [pitchType, setPitchType] = useState<string>('Free Digital Literacy Workshops');
    const [pitchCta, setPitchCta] = useState<string>('Schedule a 10-minute Zoom call');

    // Multimodal State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const result = reader.result as string;
                setImagePreview(result);
                setImageHistory([result]);
                setHistoryIndex(0);
                setIsFlyerMode(true); // Automatically show price tag and discount stickers!
                toast.success("Image uploaded!");
                
                // Automatically run background removal and image enhancements!
                await performImageEdit('[ACTION] auto_studio', result);
            };
            reader.readAsDataURL(file);
        }
    };

    // AI Photo Studio Overhaul States
    const [imageHistory, setImageHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [photoPrompt, setPhotoPrompt] = useState<string>('');
    const [studioAspectRatio, setStudioAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
    const [customText, setCustomText] = useState<string>('');
    const [showTextModal, setShowTextModal] = useState<boolean>(false);
    const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
    
    // Saved Projects state
    interface SavedPhotoProject {
        id: string;
        image: string;
        studioAspectRatio: '1:1' | '9:16' | '16:9';
        isFlyerMode: boolean;
        flyerPrice: string;
        flyerPromo: string;
        flyerPhone: string;
        selectedTrustBadges: string[];
        timestamp: number;
    }
    const [savedProjects, setSavedProjects] = useState<SavedPhotoProject[]>(() => {
        const saved = localStorage.getItem('sb_saved_photo_projects');
        return saved ? JSON.parse(saved) : [];
    });

    const handleLoadProject = (proj: SavedPhotoProject) => {
        setImagePreview(proj.image);
        setImageHistory([proj.image]);
        setHistoryIndex(0);
        setStudioAspectRatio(proj.studioAspectRatio);
        setIsFlyerMode(proj.isFlyerMode);
        setFlyerPrice(proj.flyerPrice);
        setFlyerPromo(proj.flyerPromo);
        setFlyerPhone(proj.flyerPhone);
        setSelectedTrustBadges(proj.selectedTrustBadges);
        toast.success("Loaded project successfully!");
    };

    const handleSaveProject = () => {
        const currentImg = historyIndex >= 0 ? imageHistory[historyIndex] : imagePreview;
        if (!currentImg) {
            toast.error("No image to save!");
            return;
        }
        const newProj: SavedPhotoProject = {
            id: Date.now().toString(),
            image: currentImg,
            studioAspectRatio,
            isFlyerMode,
            flyerPrice,
            flyerPromo,
            flyerPhone,
            selectedTrustBadges,
            timestamp: Date.now()
        };
        const updated = [newProj, ...savedProjects];
        setSavedProjects(updated);
        localStorage.setItem('sb_saved_photo_projects', JSON.stringify(updated));
        toast.success("Project saved successfully!");
    };

    const handleDeleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = savedProjects.filter(p => p.id !== id);
        setSavedProjects(updated);
        localStorage.setItem('sb_saved_photo_projects', JSON.stringify(updated));
        toast.success("Project deleted.");
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            toast.success("Undo applied");
        }
    };

    const handleRedo = () => {
        if (historyIndex < imageHistory.length - 1) {
            setHistoryIndex(historyIndex + 1);
            toast.success("Redo applied");
        }
    };

    const performImageEdit = async (prompt: string, overrideImage?: string) => {
        const currentImg = overrideImage || (historyIndex >= 0 ? imageHistory[historyIndex] : imagePreview);
        if (!currentImg) {
            toast.error("Please upload a product photo first!");
            return;
        }
        
        const cost = 5;
        if (credits < cost) {
            toast.error(`Insufficient credits. AI Photo edits require ${cost} BizCredits.`);
            return;
        }

        setIsApplyingAiEdit(true);
        toast.loading("Applying AI Image processing...", { id: 'image-edit' });
        try {
            const mimeType = selectedImage?.type || 'image/png';
            const result = await geminiService.editProductImage(currentImg, mimeType, prompt);
            
            if (result && result.image_base64) {
                // Deduct credits on success
                const billingResponse = await billingService.deductCredits(cost, "AI Photo Studio Edit");
                onUpdateCredits(billingResponse.credits);
                
                const newImg = `data:${mimeType};base64,${result.image_base64}`;
                const nextHistory = (overrideImage ? [overrideImage] : imageHistory).slice(0, (overrideImage ? 0 : historyIndex) + 1);
                nextHistory.push(newImg);
                setImageHistory(nextHistory);
                setHistoryIndex(nextHistory.length - 1);
                
                toast.success("AI Edit applied successfully!", { id: 'image-edit' });
            } else {
                throw new Error("No image data returned from editor.");
            }
        } catch (err: any) {
            console.error("AI edit error:", err);
            toast.error(err.response?.data?.error || err.message || "Failed to edit image.", { id: 'image-edit' });
        } finally {
            setIsApplyingAiEdit(false);
            setShowTextModal(false);
            setShowPromptModal(false);
        }
    };

    // Nano Banana Flyer Mode States
    const [isFlyerMode, setIsFlyerMode] = useState(false);
    const [flyerPrice, setFlyerPrice] = useState('15,000');
    const [flyerPromo, setFlyerPromo] = useState('20% OFF');
    const [flyerPhone, setFlyerPhone] = useState('0801 234 5678');
    const [selectedTrustBadges, setSelectedTrustBadges] = useState<string[]>(['POD', 'FAST']);
    const [flyerBadgeColor, setFlyerBadgeColor] = useState('indigo'); // indigo, emerald, amber, rose, slate
    const [flyerWatermark, setFlyerWatermark] = useState(true);
    
    // Background Removal States
    const [bgRemovalActive, setBgRemovalActive] = useState(false);
    const [tolerance, setTolerance] = useState(30); // 0 to 100
    const [selectedBackdrop, setSelectedBackdrop] = useState('gradient-warm'); // white, grey, gradient-warm, gradient-cool, wood, marble
    const [processedImage, setProcessedImage] = useState<string | null>(null);

    // Nano Banana Pro Studio Workspace States
    const [activeAccordion, setActiveAccordion] = useState<string>('save');
    const [zoomFit, setZoomFit] = useState<boolean>(true);
    const [isStarred, setIsStarred] = useState<boolean>(false);
    const [flyerVersion, setFlyerVersion] = useState<string>('Original');
    const [aiPrompterText, setAiPrompterText] = useState<string>('A high-fidelity commercial studio shot of this product, premium warm lighting, shadows, highly detailed');
    const [generationSeed, setGenerationSeed] = useState<number>(42389);
    const [isApplyingAiEdit, setIsApplyingAiEdit] = useState<boolean>(false);

    // Interactive BG Remover Tools & Transforms
    const [activeTool, setActiveTool] = useState<'move' | 'picker' | 'eraser'>('move');
    const [keyColor, setKeyColor] = useState<{ r: number; g: number; b: number } | null>(null);
    const [eraserBrushSize, setEraserBrushSize] = useState<number>(30);
    const [triggerProcess, setTriggerProcess] = useState<number>(0);
    const [isErasing, setIsErasing] = useState<boolean>(false);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // Transform states
    const [productScale, setProductScale] = useState<number>(100);
    const [productRotation, setProductRotation] = useState<number>(0);
    const [productPos, setProductPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDraggingProduct, setIsDraggingProduct] = useState<boolean>(false);
    const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Initialize or reset mask canvas and transforms whenever imagePreview changes
    useEffect(() => {
        if (!imagePreview) {
            maskCanvasRef.current = null;
            setKeyColor(null);
            setProductPos({ x: 0, y: 0 });
            setProductScale(100);
            setProductRotation(0);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff'; // Start fully opaque (white)
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            maskCanvasRef.current = canvas;
            setTriggerProcess(prev => prev + 1);
        };
        img.src = imagePreview;
    }, [imagePreview]);

    // AI Image Edit Handler
    const handleApplyAiEdit = async (mode: 'edit' | 'subtle' | 'strong') => {
        if (!imagePreview) {
            toast.error("No product photo uploaded yet!");
            return;
        }
        setIsApplyingAiEdit(true);
        try {
            const base64Image = imagePreview.split(',')[1];
            const mimeType = selectedImage?.type || 'image/jpeg';
            let promptText = aiPrompterText;
            if (mode === 'subtle') {
                promptText = `Subtle variation: ${aiPrompterText}`;
                setGenerationSeed(prev => prev + 1);
            } else if (mode === 'strong') {
                promptText = `Strong variation: ${aiPrompterText}`;
                setGenerationSeed(prev => Math.floor(Math.random() * 90000) + 1000);
            }
            
            const result = await geminiService.editImage(base64Image, mimeType, promptText);
            if (result && result.text) {
                toast.success("AI Enhancements applied successfully!");
                setPhotoDesc(result.text);
            } else {
                toast.success('AI Enhancements applied successfully!');
            }
        } catch (err: any) {
            console.error("AI edit error:", err);
            toast.error(err.message || "Failed to apply AI edit");
        } finally {
            setIsApplyingAiEdit(false);
        }
    };

    // Process image pixels to remove background + apply manual eraser mask
    useEffect(() => {
        if (!imagePreview) {
            setProcessedImage(null);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Apply chroma key if active
            if (bgRemovalActive) {
                // Auto-detect color from top-left pixel if keyColor is not set
                const rColor = keyColor ? keyColor.r : data[0];
                const gColor = keyColor ? keyColor.g : data[1];
                const bColor = keyColor ? keyColor.b : data[2];

                const maxDist = (tolerance / 100) * 440; // Max distance in RGB space

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    const dist = Math.sqrt(
                        Math.pow(r - rColor, 2) +
                        Math.pow(g - gColor, 2) +
                        Math.pow(b - bColor, 2)
                    );

                    if (dist < maxDist) {
                        data[i + 3] = 0; // Set alpha to 0
                    }
                }
            }

            // Apply manual eraser mask if available
            if (maskCanvasRef.current) {
                const maskCtx = maskCanvasRef.current.getContext('2d');
                if (maskCtx) {
                    const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height).data;
                    for (let i = 0; i < data.length; i += 4) {
                        // If the mask pixel is black (R=0, G=0, B=0), make it transparent
                        if (maskData[i] < 128) {
                            data[i + 3] = 0;
                        }
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);
            setProcessedImage(canvas.toDataURL());
        };
        img.src = imagePreview;
    }, [imagePreview, bgRemovalActive, tolerance, keyColor, triggerProcess]);

    // Click on image to sample background color (Eye-dropper)
    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (activeTool !== 'picker' || !imagePreview) return;

        const imgElement = imgRef.current;
        if (!imgElement) return;

        const rect = imgElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Map relative position to natural dimensions
        const naturalX = Math.floor((x / rect.width) * imgElement.naturalWidth);
        const naturalY = Math.floor((y / rect.height) * imgElement.naturalHeight);

        // Draw image temporarily to sample color
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            try {
                const pixel = ctx.getImageData(naturalX, naturalY, 1, 1).data;
                setKeyColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
                setBgRemovalActive(true);
                toast.success(`Color sampled: RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
            } catch (err) {
                console.error("Sampling error:", err);
            }
        };
        img.src = imagePreview;
    };

    // Eraser drawing actions mapped to image dimensions
    const drawEraserStroke = (clientX: number, clientY: number) => {
        const maskCanvas = maskCanvasRef.current;
        const imgElement = imgRef.current;
        if (!maskCanvas || !imgElement) return;

        const rect = imgElement.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const naturalX = (x / rect.width) * imgElement.naturalWidth;
        const naturalY = (y / rect.height) * imgElement.naturalHeight;
        
        // Calculate brush size relative to natural dimensions
        const naturalSize = (eraserBrushSize / rect.width) * imgElement.naturalWidth;

        const ctx = maskCanvas.getContext('2d');
        if (ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(naturalX, naturalY, naturalSize / 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#000000'; // Black represents transparent mask
            ctx.fill();
            ctx.restore();
        }
        setTriggerProcess(prev => prev + 1);
    };

    const handleEraserStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'eraser') return;
        setIsErasing(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        drawEraserStroke(clientX, clientY);
    };

    const handleEraserMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isErasing || activeTool !== 'eraser') return;
        if ('touches' in e) {
            e.preventDefault();
        }
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        drawEraserStroke(clientX, clientY);
    };

    const handleEraserEnd = () => {
        setIsErasing(false);
    };

    // Drag-and-drop position handlers
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'move') return;
        setIsDraggingProduct(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        dragStart.current = {
            x: clientX - productPos.x,
            y: clientY - productPos.y
        };
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingProduct || activeTool !== 'move') return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setProductPos({
            x: clientX - dragStart.current.x,
            y: clientY - dragStart.current.y
        });
    };

    const handleDragEnd = () => {
        setIsDraggingProduct(false);
    };

    const flyerRef = useRef<HTMLDivElement>(null);

    const handleDownloadFlyer = async () => {
        if (!flyerRef.current) return;
        toast.loading("Exporting your premium flyer...", { id: "flyer-download" });
        try {
            const dataUrl = await toPng(flyerRef.current, {
                quality: 0.98,
                pixelRatio: 2, // Retains high-res sharpness
                cacheBust: true,
            });
            const link = document.createElement('a');
            link.download = `smartbiz_flyer_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Flyer exported successfully! Post it to your WhatsApp Status! 🚀", { id: "flyer-download" });
        } catch (err) {
            console.error("Flyer export failed:", err);
            toast.error("Failed to export flyer. Please try again.", { id: "flyer-download" });
        }
    };

    // Check for Trend Jacking on mount
    useEffect(() => {
        const activeTrend = localStorage.getItem('sb_active_trend');
        if (activeTrend) {
            setPostTopic(`Write a viral post about my product, incorporating the trending topic: ${activeTrend}`);
            setVideoTopic(`Create a video script that ties my business into the trending topic: ${activeTrend}`);
            setPhotoDesc(`A scene relating my product to the trending topic: ${activeTrend}`);
            localStorage.removeItem('sb_active_trend'); // Clear it so it doesn't persist forever
        }
    }, []);
    const [artStyle, setArtStyle] = useState<ArtStyle>('Realistic');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Square (1:1)');

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [storyboard, setStoryboard] = useState<any>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [spokenText, setSpokenText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const executeGeneration = async (deduct: boolean, cost: number) => {
        setIsGenerating(true);
        setError(null);
        setGeneratedContent(null);
        setStoryboard(null);
        setAudioUrl(null);
        setSpokenText(null);

        try {
            let result;
            const base64Image = imagePreview ? imagePreview.split(',')[1] : null;
            const mimeType = selectedImage?.type || 'image/jpeg';

            if (activeTab === 'Post Writer') {
                const context = `Niche: ${brand?.niche || 'General'}. Vibe: ${brand?.vibe || 'Professional'}. Targets: ${brand?.targetAudience || 'Nigerian Audience'}.`;
                result = await geminiService.generateSocialContent(postTopic, platform, tone, format, context);
            } else if (activeTab === 'Video Script') {
                result = await geminiService.generateVideoScript(videoTopic, videoPlatform, tone, hookStyle);
            } else if (activeTab === 'Weekly Plan') {
                result = await geminiService.generateWeeklyPlan(planGoal);
            } else if (activeTab === 'Blog Writer') {
                result = await geminiService.generateBlogPost(blogTopic, blogTone, blogLength);
            } else if (activeTab === 'Partnership Pitch') {
                result = await geminiService.generatePartnershipPitch(partnerName, pitchType, pitchCta);
            } else if (activeTab === 'Photo Studio') {
                if (imagePreview) {
                    result = await geminiService.editImage(base64Image!, mimeType, photoDesc || "Analyze this image and suggest 3 high-performing social media edits.");
                } else {
                    const prompt = `Style: ${artStyle}, Ratio: ${aspectRatio}. Topic: ${photoDesc}`;
                    result = await geminiService.generateSuggestedPrompts('Artisan/Product', 'PHOTO', undefined, undefined, [prompt]);
                    result = { text: "No image uploaded. Here are 3 professional prompts you can use in Midjourney or Canva to create this visual:", prompts: result };
                }
            }
            
            if (result && result.error) {
                throw new Error(result.error);
            }

            if (!result || (Object.keys(result).length === 0 && activeTab !== 'Photo Studio')) {
                throw new Error("AI returned an empty response. Please try a more specific topic.");
            }

            // Only charge credits or increment usage on success
            if (deduct) {
                const billingResponse = await billingService.deductCredits(cost, `AI Content Studio - ${activeTab}`);
                onUpdateCredits(billingResponse.credits);
            } else {
                usageLimiter.incrementUsage('content_generator');
            }

            setGeneratedContent(result);
            
            // Save to local creations history catalog
            try {
                const historyItem = {
                    id: Date.now(),
                    tab: activeTab,
                    topic: activeTab === 'Post Writer' ? postTopic : activeTab === 'Video Script' ? videoTopic : activeTab === 'Blog Writer' ? blogTopic : activeTab === 'Partnership Pitch' ? partnerName + " - " + pitchType : photoDesc || 'Visual Prompt',
                    timestamp: new Date().toISOString(),
                    content: result
                };
                const currentHistory = JSON.parse(localStorage.getItem('sb_content_history') || '[]');
                localStorage.setItem('sb_content_history', JSON.stringify([historyItem, ...currentHistory]));
            } catch (historyErr) {
                console.error("Failed to write to content history:", historyErr);
            }

            toast.success('Content crafted successfully!');
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.error || err.message || "Failed to generate content. Please try again.");
        } finally {
            setIsGenerating(false);
            setShowCreditPrompt(false);
        }
    };

    const handleGenerate = async () => {
        const usage = usageLimiter.checkUsage('content_generator', credits);
        if (!usage.allowed) {
            setDeductOnConfirm(null);
            setShowCreditPrompt(true);
            return;
        }

        if (usage.useCredits) {
            setDeductOnConfirm(() => async () => {
                await executeGeneration(true, usage.cost);
            });
            setShowCreditPrompt(true);
        } else {
            await executeGeneration(false, 0);
        }
    };

    const handleGenerateVideo = async () => {
        if (!generatedContent || activeTab !== 'Video Script') return;

        setIsGeneratingVideo(true);
        try {
            const visualStyle = 'Professional Cinematic';
            const response = await geminiService.generateMarketingVideo(generatedContent, visualStyle, (msg) => {
                toast.loading(msg, { id: 'vid-gen' });
            });
            setStoryboard(response.storyboard);
            
            if (response.audio_base64) {
                try {
                    const binary = atob(response.audio_base64);
                    const array = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        array[i] = binary.charCodeAt(i);
                    }
                    const blob = new Blob([array], { type: 'audio/mp3' });
                    const url = URL.createObjectURL(blob);
                    setAudioUrl(url);
                    toast.success('Storyboard & voiceover generated successfully!', { id: 'vid-gen' });
                } catch (audioErr) {
                    console.error("Failed to decode audio:", audioErr);
                    toast.success('Video storyboard drafted!', { id: 'vid-gen' });
                }
            } else {
                toast.success('Video storyboard drafted!', { id: 'vid-gen' });
            }
        } catch (err) {
            toast.error('Failed to generate video layout', { id: 'vid-gen' });
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    const handleUseTrend = (trendTitle: string) => {
        if (!trendTitle) {
            toast.error("No trend topic selected.");
            return;
        }

        if (activeTab === 'Post Writer') {
            setPostTopic(`Incorporate the trend: ${trendTitle}. `);
            toast.success(`Jacked trend into Post Writer! ✍️`);
        } else if (activeTab === 'Video Script') {
            setVideoTopic(`Incorporate the trend: ${trendTitle}. `);
            toast.success(`Jacked trend into Video Script! 🎬`);
        } else if (activeTab === 'Blog Writer') {
            setBlogTopic(`Write about the trend: ${trendTitle}. `);
            toast.success(`Jacked trend into Blog Writer! 📝`);
        } else if (activeTab === 'Photo Studio') {
            setPhotoDesc(`A scene representing: ${trendTitle}. `);
            toast.success(`Jacked trend into Photo Studio! 📸`);
        } else {
            toast.error(`Select Post, Video, Blog, or Photo tab to jack this trend!`);
        }
    };

    const tabs: { id: TabType; icon: string }[] = [
        { id: 'Photo Studio', icon: '📸' },
        { id: 'Post Writer', icon: '✍️' },
        { id: 'Video Script', icon: '🎬' },
        { id: 'Weekly Plan', icon: '📅' },
        { id: 'Blog Writer', icon: '📝' },
        { id: 'Partnership Pitch', icon: '🤝' },
        { id: 'Creations History', icon: '📜' }
    ];

    return (
        <div className="max-w-6xl mx-auto pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <h1 className="text-3xl font-bold font-heading text-slate-800">Content Studio</h1>
                        <span className="text-2xl">🎨</span>
                    </div>
                    <p className="text-sm text-slate-500">Your all-in-one agency creative suite.</p>
                </div>
            </div>

            {/* Tabs Layout */}
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Main Content Area */}
                <div className="flex-1 space-y-6 flex flex-col min-w-0">

                    {/* Tabs header */}
                    <div className="border-b border-slate-200 overflow-x-auto hide-scrollbar">
                        <div className="flex space-x-6 w-max sm:w-full">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setGeneratedContent(null);
                                        setError(null);
                                    }}
                                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.id}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Form Container */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[400px]">

                        {/* POST WRITER */}
                        {activeTab === 'Post Writer' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-slate-700">Topic</label>
                                        <button type="button" disabled={isLoadingMagicPost} className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                                            onClick={fetchMagicIdeasPost}>
                                            <span>✨</span><span>{isLoadingMagicPost ? "Generating..." : "Get Magic Ideas"}</span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                            placeholder="e.g. 50% discount on all wigs this weekend" value={postTopic} onChange={(e) => setPostTopic(e.target.value)}
                                        ></textarea>
                                    </div>
                                    {isLoadingMagicPost && (
                                        <p className="text-xs text-indigo-650 animate-pulse mt-2 flex items-center gap-1 font-medium">
                                            <span>✨</span> Tailoring custom ideas for {brand?.businessName || brand?.niche || "your brand"}...
                                        </p>
                                    )}
                                    {!isLoadingMagicPost && magicIdeasPost.length > 0 && (
                                        <div className="mt-3 space-y-2 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200">
                                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">💡 Click an idea to fill:</p>
                                            <div className="flex flex-col gap-1.5">
                                                {magicIdeasPost.map((idea, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setPostTopic(idea)}
                                                        className="text-left text-xs bg-white hover:bg-indigo-50 hover:text-indigo-700 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all font-medium text-slate-705 shadow-sm"
                                                    >
                                                        {idea}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Platform</label>
                                        <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Instagram">📸 Instagram</option>
                                            <option value="TikTok">🎵 TikTok</option>
                                            <option value="Facebook">👥 Facebook</option>
                                            <option value="Twitter">🐦 Twitter</option>
                                            <option value="LinkedIn">💼 LinkedIn</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Tone</label>
                                        <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Exciting">🤩 Exciting</option><option value="Professional">💼 Professional</option><option value="Funny">😂 Funny</option><option value="Informative">🧠 Informative</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Format</label>
                                        <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Single Post">🖼️ Single Post</option><option value="Carousel">📚 Carousel</option><option value="Story">📱 Story</option><option value="Reel">🎬 Reel</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={handleGenerate} disabled={isGenerating || !postTopic.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Post</span><span>✨</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* BLOG WRITER */}
                        {activeTab === 'Blog Writer' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Blog Topic / Concept</label>
                                    <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                        placeholder="e.g. How to get your Nigerian business ready for compliance audits" 
                                        value={blogTopic} onChange={(e) => setBlogTopic(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Writing Tone</label>
                                        <select value={blogTone} onChange={(e) => setBlogTone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Informative">🧠 Informative & Factual (GEO Strategy)</option>
                                            <option value="Persuasive">🔥 Persuasive & Conversion focused</option>
                                            <option value="Inspirational">🌟 Inspirational Storytelling</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Length Target</label>
                                        <select value={blogLength} onChange={(e) => setBlogLength(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Short (400 words)">Short (400 words)</option>
                                            <option value="Medium (800 words)">Medium (800 words)</option>
                                            <option value="Long Deep-Dive (1500 words)">Long Deep-Dive (1500 words)</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleGenerate} disabled={isGenerating || !blogTopic.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Blog Article</span><span>✍️</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* PARTNERSHIP PITCH */}
                        {activeTab === 'Partnership Pitch' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Target Agency / NGO</label>
                                        <select value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="SMEDAN">SMEDAN (Federal Micro-loans)</option>
                                            <option value="FATE Foundation">FATE Foundation (Accelerator/Alumni)</option>
                                            <option value="LSETF (Lagos Trust Fund)">LSETF (Lagos Trust Fund)</option>
                                            <option value="NITDA">NITDA (Tech Inclusion Workshops)</option>
                                            <option value="MATAN (Market Traders)">MATAN (Market Traders Association)</option>
                                            <option value="General Investor Pitch">General Investor Pitch Deck</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Offer Description</label>
                                        <select value={pitchType} onChange={(e) => setPitchType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Free Digital Literacy Workshops">Free Digital Literacy Workshops</option>
                                            <option value="Subsidized SME Subscriptions">Subsidized SME Subscriptions</option>
                                            <option value="Co-Branded Incubation Program">Co-Branded Incubation Program</option>
                                            <option value="API Escrow integration pilot">API Escrow Integration Pilot</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Call to Action (CTA)</label>
                                        <select value={pitchCta} onChange={(e) => setPitchCta(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Schedule a 10-minute Zoom call">10-Min Discovery Zoom Call</option>
                                            <option value="Schedule a physical office presentation">Physical Office Presentation</option>
                                            <option value="Review our shared Google Drive proposal">Review PDF Proposal Link</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Pitch Proposal</span><span>🤝</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* VIDEO SCRIPT */}
                        {activeTab === 'Video Script' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-slate-700">Video Topic / Concept</label>
                                        <button type="button" disabled={isLoadingMagicVideo} className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                                            onClick={fetchMagicIdeasVideo}>
                                            <span>✨</span><span>{isLoadingMagicVideo ? "Generating..." : "Get Magic Ideas"}</span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                            placeholder="e.g. 3 reasons to digitize your retail inventory list" value={videoTopic} onChange={(e) => setVideoTopic(e.target.value)}
                                        ></textarea>
                                    </div>
                                    {isLoadingMagicVideo && (
                                        <p className="text-xs text-indigo-650 animate-pulse mt-2 flex items-center gap-1 font-medium">
                                            <span>✨</span> Tailoring custom video concepts for {brand?.businessName || brand?.niche || "your brand"}...
                                        </p>
                                    )}
                                    {!isLoadingMagicVideo && magicIdeasVideo.length > 0 && (
                                        <div className="mt-3 space-y-2 bg-slate-55/50 p-3.5 rounded-xl border border-slate-200">
                                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">💡 Click an idea to fill:</p>
                                            <div className="flex flex-col gap-1.5">
                                                {magicIdeasVideo.map((idea, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setVideoTopic(idea)}
                                                        className="text-left text-xs bg-white hover:bg-indigo-50 hover:text-indigo-700 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all font-medium text-slate-705 shadow-sm"
                                                    >
                                                        {idea}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Platform</label>
                                        <select value={videoPlatform} onChange={(e) => setVideoPlatform(e.target.value as VideoPlatform)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="TikTok">🎵 TikTok</option>
                                            <option value="Instagram Reel">📸 Instagram Reel</option>
                                            <option value="YouTube Shorts">🎥 YouTube Shorts</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Tone</label>
                                        <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Exciting">🤩 Exciting</option><option value="Professional">💼 Professional</option><option value="Funny">😂 Funny</option><option value="Informative">🧠 Informative</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Hook Style</label>
                                        <select value={hookStyle} onChange={(e) => setHookStyle(e.target.value as HookStyle)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Educational">🧠 Educational</option><option value="Controversial">🔥 Controversial</option><option value="Storytelling">📚 Storytelling</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={handleGenerate} disabled={isGenerating || !videoTopic.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Video Script</span><span>🎬</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* PHOTO STUDIO */}
                        {activeTab === 'Photo Studio' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-slate-100 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
                                
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />

                                {/* Upload Box always visible first if no image */}
                                {!imagePreview ? (
                                    <div className="space-y-6">
                                        <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-2xl p-12 text-center transition-all cursor-pointer bg-slate-955/40 hover:bg-slate-955/80"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div>
                                                <span className="text-5xl block mb-4">📸</span>
                                                <p className="text-base font-black text-slate-200">Snap & Upload Your Product</p>
                                                <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">We will automatically remove any messy background, enhance the product colors, and format it for social media instantly!</p>
                                                <p className="text-[10px] text-slate-500 mt-4">Supports PNG, JPG, JPEG (Max 5MB)</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Clean Simplified Studio Workspace */
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                        
                                        {/* Left 2 Columns: Large Interactive Preview Canvas */}
                                        <div className="lg:col-span-2 flex flex-col items-center">
                                            <div 
                                                className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl relative select-none flex items-center justify-center aspect-square max-w-[450px]"
                                                ref={flyerRef}
                                                style={
                                                    selectedBackdrop === 'white' ? { backgroundColor: '#ffffff' } :
                                                    selectedBackdrop === 'grey' ? { backgroundColor: '#f3f4f6' } :
                                                    selectedBackdrop === 'gradient-warm' ? { backgroundImage: 'linear-gradient(to bottom right, #ffedd5, #fee2e2)' } :
                                                    selectedBackdrop === 'gradient-cool' ? { backgroundImage: 'linear-gradient(to bottom right, #e0e7ff, #fae8ff)' } :
                                                    selectedBackdrop === 'wood' ? { backgroundImage: 'linear-gradient(to bottom, #7c2d12, #451a03)' } :
                                                    selectedBackdrop === 'marble' ? { backgroundImage: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' } :
                                                    { backgroundColor: '#ffffff' }
                                                }
                                            >
                                                {/* Live Background Process Spinner */}
                                                {isApplyingAiEdit && (
                                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                        <p className="text-[11px] font-black text-white tracking-widest uppercase">AI Magic Processing...</p>
                                                    </div>
                                                )}

                                                {/* Clean Product Overlay Layer */}
                                                {imageHistory[historyIndex] && (
                                                    <div className="absolute inset-0 flex items-center justify-center p-6">
                                                        <img 
                                                            ref={imgRef}
                                                            src={imageHistory[historyIndex]} 
                                                            alt="Product" 
                                                            className="max-w-[85%] max-h-[85%] object-contain select-none shadow-lg rounded-lg" 
                                                        />
                                                    </div>
                                                )}

                                                {/* Promo Discount Tag */}
                                                {flyerPromo && (
                                                    <div className="absolute top-4 right-4 bg-rose-600 px-3 py-1.5 rounded-full font-black text-xs text-white uppercase shadow-lg z-10 tracking-wider">
                                                        💥 {flyerPromo}
                                                    </div>
                                                )}

                                                {/* Price Sticker */}
                                                {flyerPrice && (
                                                    <div className="absolute bottom-4 right-4 bg-indigo-600 px-4 py-2 rounded-xl text-white font-black text-sm shadow-2xl z-10 border border-indigo-550">
                                                        ₦{flyerPrice}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Swap Product Image option */}
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                                            >
                                                🔄 Upload different photo
                                            </button>
                                        </div>

                                        {/* Right Sidebar: Simple Workspace Action Controls */}
                                        <div className="space-y-6 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                                            
                                            {/* Style Selector */}
                                            <div className="space-y-2.5">
                                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">1. SELECT BACKDROP STYLE</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { id: 'marble', label: '🏛️ Luxury Marble' },
                                                        { id: 'grey', label: '🏢 Clean Office' },
                                                        { id: 'wood', label: '🪵 Rustic Wood' },
                                                        { id: 'gradient-warm', label: '🌅 Sunset Warmth' }
                                                    ].map((bg) => (
                                                        <button
                                                            key={bg.id}
                                                            type="button"
                                                            onClick={async () => {
                                                                setSelectedBackdrop(bg.id);
                                                                if (imageHistory[0]) {
                                                                    // Request same background composition on backend
                                                                    await performImageEdit(`[SCENE] ${bg.id === 'grey' ? 'studio' : bg.id}`);
                                                                }
                                                            }}
                                                            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                                                                selectedBackdrop === bg.id
                                                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/10'
                                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                                                            }`}
                                                        >
                                                            {bg.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Price Input */}
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">2. PRICE TAG (₦)</label>
                                                <input 
                                                    type="text" 
                                                    value={flyerPrice} 
                                                    onChange={(e) => setFlyerPrice(e.target.value)}
                                                    placeholder="e.g. 15,000"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                                />
                                            </div>

                                            {/* Discount Input */}
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">3. DISCOUNT LABEL (%)</label>
                                                <input 
                                                    type="text" 
                                                    value={flyerPromo} 
                                                    onChange={(e) => setFlyerPromo(e.target.value)}
                                                    placeholder="e.g. 20% OFF"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                                />
                                            </div>

                                            {/* Main Download Button */}
                                            <div className="pt-4 border-t border-slate-800/80 space-y-2">
                                                <button 
                                                    onClick={handleDownloadFlyer}
                                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
                                                >
                                                    📥 Save & Download Flyer
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setImagePreview(null);
                                                        setImageHistory([]);
                                                        setHistoryIndex(-1);
                                                    }}
                                                    className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-rose-400/80 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all"
                                                >
                                                    Clear Workspace
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}


                        {/* WEEKLY PLAN */}
                        {activeTab === 'Weekly Plan' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Campaign Goal</label>
                                        <select value={planGoal} onChange={(e) => setPlanGoal(e.target.value as PrimaryGoal)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="Sales">💰 Increase Direct Product Sales</option>
                                            <option value="Brand Awareness">📈 Grow Brand Authority & Trust</option>
                                            <option value="Engagement">🤝 Engage Community & Gather Reviews</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Post Frequency</label>
                                        <select value={planFrequency} onChange={(e) => setPlanFrequency(e.target.value as PostFrequency)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                                            <option value="3 times/week">3 times / week (Relaxed)</option>
                                            <option value="5 times/week">5 times / week (Standard)</option>
                                            <option value="Daily">Daily (Aggressive Growth)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center mt-4">
                                    <div className="text-4xl mb-3">📅</div>
                                    <h3 className="font-bold text-slate-800 mb-2">Auto-Generate Calendar</h3>
                                    <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">We will generate topics, captions, and suggested visuals for a full week based on your brand profile and selected goal.</p>
                                </div>

                                <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Weekly Plan</span><span>🚀</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* CREATIONS HISTORY */}
                        {activeTab === 'Creations History' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Creations History</h3>
                                    <p className="text-xs text-slate-500 mb-4">
                                        All your AI-generated posts, scripts, blogs, and pitches are automatically saved to your browser history here.
                                    </p>
                                    
                                    {/* History list */}
                                    {(() => {
                                        const history = JSON.parse(localStorage.getItem('sb_content_history') || '[]');
                                        if (history.length === 0) {
                                            return (
                                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                                                    <span className="text-3xl block mb-2">📭</span>
                                                    <p className="text-sm font-semibold text-slate-600">No creations saved yet</p>
                                                    <p className="text-xs text-slate-400 mt-1">Generate some posts or scripts to start building your history catalog!</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                                {history.map((item: any) => (
                                                    <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-250 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-300 transition-colors">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                                                    {item.tab}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(item.timestamp).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
                                                                {item.topic}
                                                            </h4>
                                                            <p className="text-xs text-slate-550 mt-1 line-clamp-2 bg-white/50 p-2 rounded border border-slate-150">
                                                                {item.content?.text || item.content?.caption || item.content?.body || item.content?.emailBody || item.content?.blogContent || "Generated Content"}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2 w-full md:w-auto">
                                                            <button
                                                                onClick={() => {
                                                                    const text = item.content?.text || item.content?.caption || item.content?.body || item.content?.emailBody || item.content?.blogContent || JSON.stringify(item.content, null, 2);
                                                                    navigator.clipboard.writeText(text);
                                                                    toast.success("Copied to clipboard!");
                                                                }}
                                                                className="flex-1 md:flex-none text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-lg border border-indigo-150 transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                <Copy size={12} /> Copy
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setGeneratedContent(item.content);
                                                                    setActiveTab(item.tab);
                                                                    toast.success("Loaded back into workspace!");
                                                                }}
                                                                className="flex-1 md:flex-none text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg border border-slate-350 transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                <Eye size={12} /> View
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        )}

                        {/* RESULT DISPLAY */}
                        {(generatedContent || error) && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 pt-10 border-t border-slate-100">
                                {error ? (
                                    <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/20 p-6 rounded-3xl text-slate-800 shadow-sm relative overflow-hidden">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center text-xl flex-shrink-0 font-bold">
                                                {error.includes("Traffic") || error.includes("Busy") || error.includes("429") ? "🚀" : "✨"}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-base text-slate-900 mb-1">
                                                    {error.includes("Traffic") || error.includes("Busy") || error.includes("429") 
                                                        ? "AI High Traffic Peak" 
                                                        : "AI Assistant Notice"}
                                                </h4>
                                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                    {error.includes("429") || error.includes("Busy") || error.includes("Traffic") || error.includes("quota")
                                                        ? "Our AI servers are experiencing high request volume. Backup processing keys have been rotated automatically. Tap 'Try Again Now' below to run your request!"
                                                        : error.replace(/\{.*?\}/g, '').replace(/AI Provider Error.*?:/g, '')}
                                                </p>
                                                <div className="mt-4 flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setError(null);
                                                            executeGeneration(false, 0);
                                                        }}
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                                                    >
                                                        🔄 Try Again Now
                                                    </button>
                                                    <button
                                                        onClick={() => setError(null)}
                                                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                            <div>
                                                <h3 className="text-xl font-bold font-heading">AI Generated Result</h3>
                                                <p className="text-[10px] text-indigo-300 mt-1 font-semibold flex items-center gap-1">
                                                    <span>💾</span> Saved to your <span className="underline cursor-pointer" onClick={() => setActiveTab('Creations History')}>Creations History</span> tab
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const text = JSON.stringify(generatedContent, null, 2);
                                                    navigator.clipboard.writeText(text);
                                                    toast.success("Copied to clipboard!");
                                                }}
                                                className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full font-bold transition-all border border-white/10"
                                            >
                                                Copy Content
                                            </button>
                                        </div>

                                        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
                                            {activeTab === 'Post Writer' && (
                                                <div className="space-y-6">
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Main Caption</h4>
                                                        <p className="text-white whitespace-pre-wrap">{generatedContent.caption || generatedContent.post}</p>
                                                        <div className="flex flex-wrap gap-2 pt-2">
                                                            {(generatedContent.hashtags || generatedContent.tags)?.map((tag: string) => (
                                                                <span key={tag} className="text-indigo-300 font-bold">#{tag}</span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                            <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-2">Call to Action</h4>
                                                            <p className="text-white font-medium">{generatedContent.callToAction || generatedContent.cta}</p>
                                                        </div>
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                            <h4 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest mb-2">Image Text Overlay</h4>
                                                            <p className="text-white font-medium italic">"{generatedContent.imageText || generatedContent.overlay || generatedContent.image_text}"</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-3">🤝 Relationship Closer (DM Script)</h4>
                                                        <p className="text-indigo-100 italic">"Use this to reply to comments or DMs:"</p>
                                                        <p className="text-white mt-2 font-medium">{generatedContent.dmReply || generatedContent.dm_reply || generatedContent.reply}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Blog Writer' && (
                                                <div className="space-y-6">
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Blog Post Headline</h4>
                                                        <h3 className="text-lg font-bold text-white font-heading">{generatedContent.title || generatedContent.headline}</h3>
                                                    </div>
                                                    
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Meta Description</h4>
                                                        <p className="text-slate-350 italic">"{generatedContent.metaDescription || generatedContent.meta_description || generatedContent.description}"</p>
                                                    </div>

                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Article Body (GEO Optimized)</h4>
                                                        <div className="text-slate-200 whitespace-pre-wrap leading-relaxed max-w-none text-xs font-medium">
                                                            {generatedContent.blogContent || generatedContent.blog_content || generatedContent.content || generatedContent.body}
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                        <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-2">Target SEO Keywords</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(generatedContent.keywords || generatedContent.key_words)?.map((keyword: string) => (
                                                                <span key={keyword} className="bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold">#{keyword}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Partnership Pitch' && (
                                                <div className="space-y-6">
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Proposal Subject Line</h4>
                                                        <p className="text-white font-bold">{generatedContent.subjectLine || generatedContent.subject_line || generatedContent.subject}</p>
                                                    </div>

                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Email Body Proposal</h4>
                                                        <p className="text-white whitespace-pre-wrap leading-relaxed text-xs">{generatedContent.emailBody || generatedContent.email_body || generatedContent.body}</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                            <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-3">Key Benefits to Partner</h4>
                                                            <ul className="list-disc pl-4 space-y-2 text-slate-350 text-xs">
                                                                {(generatedContent.keyBenefits || generatedContent.key_benefits || generatedContent.benefits)?.map((b: string, i: number) => (
                                                                    <li key={i}>{b}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                            <h4 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest mb-3">Recommended Follow Up</h4>
                                                            <p className="text-white text-xs leading-relaxed">{generatedContent.followUpStrategy || generatedContent.follow_up_strategy || generatedContent.followUp}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Video Script' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-indigo-400 font-extrabold text-2xl font-heading">{generatedContent.title}</h4>
                                                        <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-bold">⏱️ {generatedContent.estimated_duration}s</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 ring-1 ring-white/10">
                                                                <h5 className="text-indigo-300 font-bold text-[10px] uppercase mb-2">🪝 The Hook (First 3s)</h5>
                                                                <p className="text-lg text-white font-heading font-bold italic leading-tight">"{generatedContent.hook}"</p>
                                                            </div>
                                                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                                <h5 className="text-slate-400 font-bold text-[10px] uppercase mb-2">📄 Main Body Script</h5>
                                                                <p className="text-slate-200 leading-relaxed">{generatedContent.body}</p>
                                                            </div>
                                                            <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20">
                                                                <h5 className="text-emerald-300 font-bold text-[10px] uppercase mb-2">📣 Call to Action (CTA)</h5>
                                                                <p className="text-white italic">"{generatedContent.callToAction}"</p>
                                                            </div>
                                                        </div>

                                                        {/* Storyboard Rendering */}
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h5 className="text-indigo-300 font-bold text-xs uppercase">🎬 Scene Storyboard Planner</h5>
                                                                {!storyboard && (
                                                                    <button
                                                                        onClick={handleGenerateVideo}
                                                                        disabled={isGeneratingVideo}
                                                                        className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all"
                                                                    >
                                                                        <span>Generate Visuals</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {storyboard ? (
                                                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                                                    {audioUrl && (
                                                                        <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 mb-3 flex flex-col gap-1">
                                                                            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">🔊 Listen to AI Voiceover (Nigerian Accent)</span>
                                                                            <audio src={audioUrl} controls className="w-full h-8 outline-none" />
                                                                        </div>
                                                                    )}
                                                                    {storyboard.map((scene: any, i: number) => (
                                                                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1.5">
                                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Scene {i + 1}</span>
                                                                            <p className="text-white text-xs font-semibold">{scene.visual}</p>
                                                                            <p className="text-[10px] text-slate-400 italic">Audio: "{scene.audio}"</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white/5 p-8 rounded-2xl border border-white/5 text-center text-xs text-slate-500">
                                                                    Click "Generate Visuals" to draft a step-by-step storyboard for this script.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Weekly Plan' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">7-Day Growth Calendar Grid</h4>
                                                        <span className="text-xs text-slate-500">Plan Generated: {new Date().toLocaleDateString()}</span>
                                                    </div>
                                                    
                                                    {/* Calendar view Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        {generatedContent.days?.map((day: any, idx: number) => (
                                                            <div key={day.day || idx} className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between space-y-3 group hover:border-indigo-500 transition-colors">
                                                                <div>
                                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-indigo-400">
                                                                        <span>{day.day || `Day ${idx + 1}`}</span>
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                                    </div>
                                                                    <h5 className="text-white font-bold text-xs mt-2 line-clamp-1">{day.theme}</h5>
                                                                    <p className="text-[10px] text-slate-400 mt-1.5 leading-normal line-clamp-3">{day.postIdea || day.post_idea || day.idea || day.content}</p>
                                                                </div>
                                                                <button 
                                                                    onClick={() => {
                                                                        toast.success(`${day.day || 'Day'} post drafted and queued!`);
                                                                    }}
                                                                    className="w-full bg-white/5 hover:bg-white/15 text-white font-bold text-[9px] uppercase tracking-wider py-2 rounded-xl transition-all"
                                                                >
                                                                    Schedule Draft
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Photo Studio' && (
                                                <div className="space-y-6">
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-4">AI Analysis & Suggestions</h4>
                                                        <p className="text-white text-lg leading-relaxed">{generatedContent.text || generatedContent.analysis}</p>
                                                    </div>
                                                    {generatedContent.prompts && (
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {generatedContent.prompts.map((p: string, i: number) => (
                                                                <div key={i} className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 flex items-start space-x-3 group">
                                                                    <span className="bg-indigo-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5">P{i + 1}</span>
                                                                    <p className="text-white text-xs leading-relaxed group-hover:text-indigo-200 transition-colors">{p}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-full lg:w-72 flex-shrink-0 space-y-6">

                    {/* Wallet Balance */}
                    <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl font-heading -mr-10 -mt-10 pointer-events-none"></div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-indigo-300">Biz Studio Balance</p>
                        <h3 className="text-3xl font-black font-heading mt-1">{credits} Credits</h3>
                        <button onClick={() => navigate('/dashboard/settings')} className="mt-4 w-full bg-white/10 hover:bg-white/20 py-2.5 rounded-xl font-bold text-xs transition-colors">
                            Top Up Credits
                        </button>
                    </div>

                    {/* Trend Spotting */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center justify-between">
                            <span>Naija Trends Today</span>
                            <span className="text-xs bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-full font-bold">Live</span>
                        </h4>
                        <div className="space-y-4">
                            {trends.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400">Loading trend jack ideas...</div>
                            ) : (
                                trends.map((trend) => (
                                    <div key={trend.id || trend.trendName || trend.title} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-all border border-slate-100 group space-y-2">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[9px] font-black text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{trend.category || "General"}</span>
                                        </div>
                                        <h5 className="font-extrabold text-xs text-slate-850 group-hover:text-indigo-650 transition-colors leading-snug">{trend.trendName || trend.title}</h5>
                                        {trend.description && (
                                            <p className="text-[10px] text-slate-500 leading-normal">{trend.description}</p>
                                        )}
                                        {trend.application && (
                                            <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50/50 px-2 py-1.5 rounded border border-emerald-100/50">💡 {trend.application}</p>
                                        )}
                                        <button onClick={() => handleUseTrend(trend.trendName || trend.title)} className="w-full bg-white group-hover:bg-indigo-650 group-hover:text-white border border-slate-200 group-hover:border-indigo-650 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer">
                                            Jack This Trend <ArrowRight className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Billing limit triggers */}
            <CreditPromptModal
                isOpen={showCreditPrompt}
                onClose={() => setShowCreditPrompt(false)}
                creditCost={activeTab === 'Post Writer' ? 2 : activeTab === 'Blog Writer' ? 5 : activeTab === 'Partnership Pitch' ? 3 : activeTab === 'Video Script' ? 8 : 1}
                featureLabel={activeTab}
                currentCredits={credits}
                onConfirm={deductOnConfirm || (() => {})}
            />
        </div>
    );
};

export default ContentStudio;
