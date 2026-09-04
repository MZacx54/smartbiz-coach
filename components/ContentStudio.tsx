import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, ArrowRight, Eye, Copy, Check, Calendar, Mail, FileText, Plus, HelpCircle, Download, Phone, Truck, ShieldCheck, Award, Trash2 } from 'lucide-react';
import { BrandIdentity } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import * as geminiService from '../services/geminiService';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import { marketingService } from '../services/marketingService';
import CreditPromptModal from './CreditPromptModal';
import { PhotoStudio } from './PhotoStudio';
import { toast } from 'react-hot-toast';
import { toPng } from 'html-to-image';

// Types
type TabType = 'Post Writer' | 'Video Script' | 'Photo Studio' | 'Weekly Plan' | 'Blog Writer' | 'Partnership Pitch' | 'Creations History';
type Platform = 'Instagram' | 'WhatsApp Status' | 'TikTok' | 'Facebook' | 'LinkedIn' | 'Twitter';
type Tone = 'Exciting' | 'Naija Promo' | 'Authentic Pidgin' | 'Professional' | 'Funny' | 'Informative';
type Format = 'Single Post' | 'Carousel' | 'Story' | 'Reel' | 'Broadcast';

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
    const [activeTab, setActiveTab] = useState<TabType>('Post Writer');

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
                if (Array.isArray(data) && data.length > 0) {
                    setTrends(data);
                    return;
                }
            } catch (e) {
                console.error("Failed to load trends:", e);
            }

            setTrends([
                { topic: "Weekend Flash Sales Promo", angle: "Offer a 24-hour discount on fast-moving items with urgent WhatsApp order CTA.", tag: "#NaijaSales #FlashSale" },
                { topic: "Inflation Price Freeze Promise", angle: "Assure customers your prices remain steady despite market inflation.", tag: "#PriceFreeze #SMETrust" },
                { topic: "Customer Unboxing & Review", angle: "Share authentic customer feedback to build trust on social media.", tag: "#CustomerReview #VerifiedMerchant" },
                { topic: "Behind The Scenes (BTS) Hustle", angle: "Show the care and effort that goes into packaging customer orders.", tag: "#NaijaHustle #BehindTheScenes" }
            ]);
        };
        loadTrends();
    }, [brand]);

    // Video Script State
    const [videoTopic, setVideoTopic] = useState('');
    const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('TikTok');
    const [hookStyle, setHookStyle] = useState<HookStyle>('Educational');
    const [videoLength, setVideoLength] = useState<VideoLength>('30s');

    // Teleprompter Camera Recorder States
    const [showTeleprompter, setShowTeleprompter] = useState(false);
    const [isTeleprompterRecording, setIsTeleprompterRecording] = useState(false);
    const [teleprompterSpeed, setTeleprompterSpeed] = useState(2);
    const [teleprompterRecordedBlob, setTeleprompterRecordedBlob] = useState<Blob | null>(null);
    const [teleprompterRecordedUrl, setTeleprompterRecordedUrl] = useState<string | null>(null);
    const teleprompterVideoRef = useRef<HTMLVideoElement>(null);
    const teleprompterTextRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const startTeleprompterCamera = async () => {
        setShowTeleprompter(true);
        setTeleprompterRecordedBlob(null);
        setTeleprompterRecordedUrl(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (teleprompterVideoRef.current) {
                teleprompterVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            toast.error("Could not access camera/microphone. Please allow browser permissions.");
        }
    };

    const stopTeleprompterCamera = () => {
        if (teleprompterVideoRef.current && teleprompterVideoRef.current.srcObject) {
            const stream = teleprompterVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            teleprompterVideoRef.current.srcObject = null;
        }
        setShowTeleprompter(false);
        setIsTeleprompterRecording(false);
    };

    const startRecordingTeleprompter = () => {
        if (!teleprompterVideoRef.current || !teleprompterVideoRef.current.srcObject) {
            toast.error("Camera feed not ready.");
            return;
        }
        const stream = teleprompterVideoRef.current.srcObject as MediaStream;
        recordedChunksRef.current = [];
        try {
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                setTeleprompterRecordedBlob(blob);
                setTeleprompterRecordedUrl(URL.createObjectURL(blob));
                toast.success("Teleprompter video recorded successfully!");
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsTeleprompterRecording(true);
        } catch (e) {
            console.error("MediaRecorder error:", e);
            toast.error("Recording not supported on this browser.");
        }
    };

    const [isPlayingVoice, setIsPlayingVoice] = useState(false);

    const toggleSpeechVoiceover = () => {
        if (!('speechSynthesis' in window)) {
            toast.error("Voice synthesis is not supported on this browser.");
            return;
        }

        if (isPlayingVoice) {
            window.speechSynthesis.cancel();
            setIsPlayingVoice(false);
            toast("Voiceover playback stopped.", { icon: "ℹ️" });
        } else {
            const scriptText = `${generatedContent?.hook || ''}. ${generatedContent?.body || ''}. ${generatedContent?.callToAction || ''}`;
            if (!scriptText.trim()) {
                toast.error("No script text to read.");
                return;
            }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(scriptText);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.onend = () => setIsPlayingVoice(false);
            utterance.onerror = () => setIsPlayingVoice(false);
            window.speechSynthesis.speak(utterance);
            setIsPlayingVoice(true);
            toast.success("Playing AI Voiceover speech!");
        }
    };

    const stopRecordingTeleprompter = () => {
        if (mediaRecorderRef.current && isTeleprompterRecording) {
            mediaRecorderRef.current.stop();
            setIsTeleprompterRecording(false);
        }
    };

    useEffect(() => {
        let interval: any;
        if (isTeleprompterRecording && teleprompterTextRef.current) {
            interval = setInterval(() => {
                if (teleprompterTextRef.current) {
                    teleprompterTextRef.current.scrollTop += teleprompterSpeed;
                }
            }, 50);
        }
        return () => clearInterval(interval);
    }, [isTeleprompterRecording, teleprompterSpeed]);

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
    const [historyKey, setHistoryKey] = useState<number>(0);

    const deleteHistoryItem = (id: number) => {
        try {
            const history = JSON.parse(localStorage.getItem('sb_content_history') || '[]');
            const updated = history.filter((item: any) => item.id !== id);
            localStorage.setItem('sb_content_history', JSON.stringify(updated));
            setHistoryKey(prev => prev + 1);
            toast.success("Item removed from history");
        } catch (e) {
            console.error("Failed to delete history item:", e);
        }
    };

    const clearAllHistory = () => {
        if (window.confirm("Are you sure you want to clear your entire creations history?")) {
            localStorage.removeItem('sb_content_history');
            setHistoryKey(prev => prev + 1);
            toast.success("All creations history cleared!");
        }
    };

    const fetchMagicIdeasPost = async () => {
        setIsLoadingMagicPost(true);
        try {
            const biz = brand?.businessName || brand?.niche || 'Nigerian Merchant';
            const result = await geminiService.generateSuggestedPrompts(brand?.niche || 'Nigerian Commerce', 'POST');
            if (Array.isArray(result) && result.length > 0) {
                setMagicIdeasPost(result);
                toast.success("Loaded 4 AI topic ideas!");
            } else {
                setMagicIdeasPost([
                    `Weekend Flash Sale: 20% discount on fast-moving items with same-day Lagos dispatch & nationwide waybill.`,
                    `Behind-the-scenes unboxing: How we inspect every single order for 100% authenticity before delivery at ${biz}.`,
                    `Customer Transformation: Real WhatsApp feedback from a buyer who switched to ${biz} after bad past experiences.`,
                    `3 critical mistakes Nigerians make when ordering products online and how ${biz} guarantees complete peace of mind.`
                ]);
            }
        } catch (e) {
            console.error("Failed to load magic ideas:", e);
            const biz = brand?.businessName || brand?.niche || 'Our Brand';
            setMagicIdeasPost([
                `Weekend Flash Sale: 20% discount on fast-moving items with same-day Lagos dispatch & nationwide waybill.`,
                `Behind-the-scenes unboxing: How we inspect every single order for 100% authenticity before delivery at ${biz}.`,
                `Customer Transformation: Real WhatsApp feedback from a buyer who switched to ${biz} after bad past experiences.`,
                `3 critical mistakes Nigerians make when ordering products online and how ${biz} guarantees complete peace of mind.`
            ]);
        } finally {
            setIsLoadingMagicPost(false);
        }
    };

    const fetchMagicIdeasVideo = async () => {
        setIsLoadingMagicVideo(true);
        try {
            const result = await geminiService.generateSuggestedPrompts(brand?.niche || 'Nigerian Commerce', 'SCRIPT');
            if (Array.isArray(result) && result.length > 0) {
                setMagicIdeasVideo(result);
                toast.success("Loaded 4 video concept ideas!");
            } else {
                setMagicIdeasVideo([
                    "Stop scrolling! Why buying cheap alternatives costs you 3x more in Nigeria.",
                    "Day in the life packaging 20 waybill orders for nationwide delivery.",
                    "3 reasons smart customers are switching to verified merchants this month.",
                    "What happens when you test durability vs counterfeit alternatives."
                ]);
            }
        } catch (e) {
            console.error("Failed to load magic ideas:", e);
            setMagicIdeasVideo([
                "Stop scrolling! Why buying cheap alternatives costs you 3x more in Nigeria.",
                "Day in the life packaging 20 waybill orders for nationwide delivery.",
                "3 reasons smart customers are switching to verified merchants this month.",
                "What happens when you test durability vs counterfeit alternatives."
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
            reader.onloadend = () => {
                const result = reader.result as string;
                setImagePreview(result);
                setImageHistory([result]);
                setHistoryIndex(0);
                setIsFlyerMode(true);
                setSelectedBackdrop('raw'); // Keep raw photo untouched on upload!
                toast.success("Photo uploaded! Click 'Remove Background' or select an enhancement below.");
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

    const [badgeTheme, setBadgeTheme] = useState<'gold' | 'emerald' | 'ruby' | 'dark'>('gold');
    const [badgePosition, setBadgePosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');

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
    const [flyerPrice, setFlyerPrice] = useState('');
    const [flyerPromo, setFlyerPromo] = useState('');
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
        toast.loading("Exporting your product photo...", { id: "flyer-download" });
        try {
            const isTransparentBg = selectedBackdrop === 'transparent';
            const originalBgImage = flyerRef.current.style.backgroundImage;
            const originalBgColor = flyerRef.current.style.backgroundColor;

            // If transparent mode, temporarily remove checkerboard preview grid during export
            if (isTransparentBg) {
                flyerRef.current.style.backgroundImage = 'none';
                flyerRef.current.style.backgroundColor = 'transparent';
            }

            const dataUrl = await toPng(flyerRef.current, {
                quality: 0.98,
                pixelRatio: 2, // High resolution sharpness
                cacheBust: true,
            });

            // Restore preview styling
            if (isTransparentBg) {
                flyerRef.current.style.backgroundImage = originalBgImage;
                flyerRef.current.style.backgroundColor = originalBgColor;
            }

            const link = document.createElement('a');
            link.download = `smartbiz_product_${selectedBackdrop}_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Photo exported successfully! 🚀", { id: "flyer-download" });
        } catch (err) {
            console.error("Flyer export failed:", err);
            toast.error("Failed to export photo. Please try again.", { id: "flyer-download" });
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
    const [publishingMeta, setPublishingMeta] = useState(false);

    const handlePublishToMeta = async () => {
        if (!generatedContent) return;
        setPublishingMeta(true);
        try {
            const captionText = typeof generatedContent === 'string' 
                ? generatedContent 
                : (generatedContent.caption || generatedContent.post || generatedContent.blogPost || JSON.stringify(generatedContent));
            
            const imageUrl = generatedContent?.image_url || generatedContent?.photoUrl || (typeof generatedContent === 'object' ? generatedContent?.url : '') || '';

            const res = await marketingService.publishToMeta({
                caption: captionText,
                image_url: imageUrl,
                platforms: ['instagram', 'facebook']
            });
            toast.success(res.message || "Published to Meta successfully! 🎉");
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Failed to publish. Check Meta settings in Settings & Wallet.");
        } finally {
            setPublishingMeta(false);
        }
    };

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
                result = await geminiService.generateWeeklyPlan(planGoal, planFrequency);
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
            
            // Save to local creations history catalog with proper metadata & deduplication
            try {
                let topicLabel = 'Generated Content';
                let previewSnippet = 'Generated Content';

                if (activeTab === 'Post Writer') {
                    topicLabel = postTopic || 'High-Converting Social Post';
                    previewSnippet = result?.caption || result?.post || '';
                } else if (activeTab === 'Video Script') {
                    topicLabel = videoTopic || result?.title || 'Viral Video Script';
                    previewSnippet = result?.hook ? `"${result.hook}" - ${result.title || ''}` : (result?.body || '');
                } else if (activeTab === 'Weekly Plan') {
                    topicLabel = `${planGoal} (${planFrequency})`;
                    previewSnippet = `${result?.campaignGoal || planGoal} • ${result?.days?.length || 0} scheduled days (${result?.days?.map((d: any) => d.day).join(', ')})`;
                } else if (activeTab === 'Blog Writer') {
                    topicLabel = blogTopic || result?.title || 'SEO Blog Article';
                    previewSnippet = result?.title ? `${result.title} — ${result.metaDescription || ''}` : (result?.blogContent || '');
                } else if (activeTab === 'Partnership Pitch') {
                    topicLabel = `${partnerName} - ${pitchType}`;
                    previewSnippet = result?.subjectLine ? `Subject: ${result.subjectLine}` : (result?.emailBody || '');
                } else if (activeTab === 'Photo Studio') {
                    topicLabel = photoDesc || 'Product Merchandising Analysis';
                    previewSnippet = result?.enhanced_description || result?.composition_notes || result?.suggestions?.[0] || 'Photo styling and enhancements';
                }

                const historyItem = {
                    id: Date.now(),
                    tab: activeTab,
                    topic: topicLabel,
                    preview: previewSnippet,
                    timestamp: new Date().toISOString(),
                    content: result
                };

                const currentHistory = JSON.parse(localStorage.getItem('sb_content_history') || '[]');
                // Prevent duplicate entries saved within 8 seconds
                const isDuplicate = currentHistory.length > 0 && 
                    currentHistory[0].tab === historyItem.tab && 
                    currentHistory[0].topic === historyItem.topic &&
                    (Date.now() - new Date(currentHistory[0].timestamp).getTime() < 8000);

                if (!isDuplicate) {
                    localStorage.setItem('sb_content_history', JSON.stringify([historyItem, ...currentHistory.slice(0, 49)]));
                }
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
        const videoCost = 3;
        if (credits < videoCost) {
            setDeductOnConfirm(null);
            setShowCreditPrompt(true);
            return;
        }

        setIsGeneratingVideo(true);
        try {
            const visualStyle = 'Professional Cinematic';
            const response = await geminiService.generateMarketingVideo(generatedContent, visualStyle, (msg) => {
                toast.loading(msg, { id: 'vid-gen' });
            });

            const billingResponse = await billingService.deductCredits(videoCost, "AI Video Storyboard & Voiceover");
            onUpdateCredits(billingResponse.credits);

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
        { id: 'Post Writer', icon: '✍️' },
        { id: 'Photo Studio', icon: '📸' },
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

                                    {/* Quick Topic Starter Chips */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1 mb-2">
                                        {[
                                            { label: '⚡ 50% Weekend Flash Sale', prompt: `Weekend Flash Sale: 50% limited discount on our best-selling collection. Highlight verified authenticity, limited units in stock, and fast nationwide waybill dispatch.` },
                                            { label: '📦 New Stock Unboxing Arrival', prompt: `New Stock Unboxing Arrival: Behind-the-scenes look at freshly arrived verified inventory. Showcase top build quality, durability, and WhatsApp direct ordering.` },
                                            { label: '🌟 Customer Testimonial Spotlight', prompt: `Customer Testimonial Spotlight: 5-star review from a satisfied Nigerian customer celebrating our prompt delivery and outstanding quality.` },
                                            { label: '💡 3 Pro Shopping Tips', prompt: `3 Pro Shopping Tips: How smart Nigerian buyers can identify genuine, durable products and avoid wasting money on cheap counterfeits.` },
                                            { label: '🚚 Fast Nationwide Delivery Offer', prompt: `Fast Nationwide Delivery Promo: Same-day Lagos dispatch and rapid, secure waybill shipping to all 36 states with easy tracking.` }
                                        ].map((chip, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setPostTopic(chip.prompt);
                                                    toast.success("Topic prompt inserted!");
                                                }}
                                                className="bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm font-medium"
                                            placeholder="e.g. 50% discount on all wigs this weekend with fast waybill delivery across Nigeria" value={postTopic} onChange={(e) => setPostTopic(e.target.value)}
                                        ></textarea>
                                    </div>
                                    {isLoadingMagicPost && (
                                        <p className="text-xs text-indigo-650 animate-pulse mt-2 flex items-center gap-1 font-medium">
                                            <span>✨</span> Analyzing {brand?.businessName || brand?.niche || "your brand"} to craft high-converting topic angles...
                                        </p>
                                    )}
                                    {!isLoadingMagicPost && magicIdeasPost.length > 0 && (
                                        <div className="mt-3 space-y-2 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/50 p-4 rounded-xl border border-indigo-100">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-1">
                                                    <span>💡</span> AI Magic Ideas for Your Brand (Click to use):
                                                </p>
                                                <button onClick={() => setMagicIdeasPost([])} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold">Dismiss</button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {magicIdeasPost.map((idea, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setPostTopic(idea);
                                                            toast.success("Magic idea inserted!");
                                                        }}
                                                        className="text-left text-xs bg-white hover:bg-indigo-50/80 hover:text-indigo-900 p-3 rounded-xl border border-indigo-100 transition-all font-medium text-slate-700 shadow-xs flex justify-between items-center gap-2 group cursor-pointer"
                                                    >
                                                        <span className="line-clamp-2">{idea}</span>
                                                        <span className="text-[10px] font-bold text-indigo-600 shrink-0 bg-indigo-50 group-hover:bg-indigo-100 px-2 py-1 rounded-md">Use Topic →</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Visual Interactive Selection Controls */}
                                <div className="space-y-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
                                    
                                    {/* 1. Target Platform Pills */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                                            1. Target Platform
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1">
                                            {[
                                                { id: 'Instagram', label: 'Instagram', icon: '📸' },
                                                { id: 'WhatsApp Status', label: 'WhatsApp Status', icon: '💬' },
                                                { id: 'TikTok', label: 'TikTok', icon: '🎵' },
                                                { id: 'Facebook', label: 'Facebook', icon: '👥' },
                                                { id: 'LinkedIn', label: 'LinkedIn', icon: '💼' },
                                                { id: 'Twitter', label: 'X (Twitter)', icon: '🐦' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setPlatform(p.id as Platform)}
                                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                                                        platform === p.id 
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 active:scale-95' 
                                                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    <span>{p.icon}</span>
                                                    <span>{p.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Brand Tone Pills */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                                            2. Sales Tone
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1">
                                            {[
                                                { id: 'Exciting', label: 'Exciting Hype', icon: '🤩' },
                                                { id: 'Naija Promo', label: 'Naija Promo 🔥', icon: '🔥' },
                                                { id: 'Authentic Pidgin', label: 'Authentic Pidgin 🇳🇬', icon: '🇳🇬' },
                                                { id: 'Professional', label: 'Corporate Trust', icon: '💼' },
                                                { id: 'Informative', label: 'Informative 🧠', icon: '🧠' },
                                                { id: 'Funny', label: 'Humorous 😂', icon: '😂' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setTone(t.id as Tone)}
                                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                                                        tone === t.id 
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 active:scale-95' 
                                                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                                                    }`}
                                                >
                                                    <span>{t.icon}</span>
                                                    <span>{t.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Post Format Pills */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                                            3. Post Format
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1">
                                            {[
                                                { id: 'Single Post', label: 'Single Post 🖼️', icon: '🖼️' },
                                                { id: 'Carousel', label: 'Carousel Slides 📚', icon: '📚' },
                                                { id: 'Story', label: 'Story / Status 📱', icon: '📱' },
                                                { id: 'Reel', label: 'Short Video / Reel 🎬', icon: '🎬' },
                                                { id: 'Broadcast', label: 'Broadcast Message 📢', icon: '📢' }
                                            ].map(f => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => setFormat(f.id as Format)}
                                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                                                        format === f.id 
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20 active:scale-95' 
                                                            : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                                                    }`}
                                                >
                                                    <span>{f.icon}</span>
                                                    <span>{f.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                <button onClick={handleGenerate} disabled={isGenerating || !postTopic.trim()} className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 disabled:opacity-50 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 text-base mt-4 cursor-pointer active:scale-98">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Post & Captions</span><span>✨</span></>}
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
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <PhotoStudio
                                    credits={credits}
                                    onUpdateCredits={onUpdateCredits}
                                    businessName={brand?.businessName}
                                />
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
                                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">Creations History</h3>
                                            <p className="text-xs text-slate-500">
                                                All your AI-generated posts, scripts, weekly roadmaps, blogs, and pitches are automatically saved here.
                                            </p>
                                        </div>
                                        {(() => {
                                            const history = JSON.parse(localStorage.getItem('sb_content_history') || '[]');
                                            if (history.length > 0) {
                                                return (
                                                    <button
                                                        onClick={clearAllHistory}
                                                        className="text-xs text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-red-200/60"
                                                    >
                                                        <Trash2 size={12} /> Clear All History
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    
                                    {/* History list */}
                                    {(() => {
                                        const history = JSON.parse(localStorage.getItem('sb_content_history') || '[]');
                                        if (history.length === 0) {
                                            return (
                                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 my-4">
                                                    <span className="text-4xl block mb-2">📭</span>
                                                    <p className="text-sm font-bold text-slate-700">No creations saved yet</p>
                                                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Generate a social post, video script, or weekly plan to automatically build your library!</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 mt-4">
                                                {history.map((item: any) => {
                                                    const previewText = item.preview || 
                                                        item.content?.caption || 
                                                        (item.content?.days ? `${item.content.campaignGoal || 'Weekly Plan'}: ${item.content.days.length} days scheduled` : '') ||
                                                        (item.content?.hook ? `"${item.content.hook}"` : '') ||
                                                        item.content?.title ||
                                                        item.content?.subjectLine ||
                                                        item.content?.blogContent?.slice(0, 140) ||
                                                        item.content?.body ||
                                                        "View to see full generated content";

                                                    return (
                                                        <div key={item.id} className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                    <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                                                        {item.tab}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                                        {new Date(item.timestamp).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
                                                                    {item.topic}
                                                                </h4>
                                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2 bg-white p-2.5 rounded-xl border border-slate-200/80 font-sans">
                                                                    {previewText}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2 w-full md:w-auto shrink-0">
                                                                <button
                                                                    onClick={() => {
                                                                        const text = item.content?.caption || item.content?.body || item.content?.blogContent || item.content?.emailBody || (item.content?.days ? JSON.stringify(item.content, null, 2) : item.preview || '');
                                                                        navigator.clipboard.writeText(text);
                                                                        toast.success("Copied to clipboard!");
                                                                    }}
                                                                    className="flex-1 md:flex-none text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-xl border border-indigo-150 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                                                >
                                                                    <Copy size={12} /> Copy
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setGeneratedContent(item.content);
                                                                        setActiveTab(item.tab);
                                                                        toast.success(`Loaded ${item.tab} into workspace!`);
                                                                    }}
                                                                    className="flex-1 md:flex-none text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                                                >
                                                                    <Eye size={12} /> View
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteHistoryItem(item.id)}
                                                                    title="Delete from history"
                                                                    className="text-xs bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 font-bold p-2 rounded-xl border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={handlePublishToMeta}
                                                    disabled={publishingMeta}
                                                    className="text-xs bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white px-4 py-2 rounded-full font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                                >
                                                    {publishingMeta ? 'Publishing...' : '🚀 Publish to Meta (IG & FB)'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const text = typeof generatedContent === 'string' ? generatedContent : JSON.stringify(generatedContent, null, 2);
                                                        navigator.clipboard.writeText(text);
                                                        toast.success("Copied to clipboard!");
                                                    }}
                                                    className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full font-bold transition-all border border-white/10 cursor-pointer"
                                                >
                                                    Copy Content
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
                                            {activeTab === 'Post Writer' && (
                                                <div className="space-y-6">
                                                    {/* Main Post Caption */}
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
                                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">📝 Primary Post Caption</h4>
                                                                <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full text-[9px] font-bold">Hook-Story-Offer</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {generatedContent.whatsAppStatus && (
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(generatedContent.whatsAppStatus);
                                                                            toast.success("Copied WhatsApp Status version!");
                                                                        }}
                                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-md cursor-pointer flex items-center gap-1 border-0"
                                                                    >
                                                                        <span>💬 Copy WhatsApp Status</span>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        const caption = generatedContent.caption || generatedContent.post || '';
                                                                        const tags = (generatedContent.hashtags || generatedContent.tags || []).map((t: string) => `#${t}`).join(' ');
                                                                        const text = `${caption}\n\n${tags}`;
                                                                        navigator.clipboard.writeText(text);
                                                                        toast.success("Copied full caption with hashtags!");
                                                                    }}
                                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-md cursor-pointer flex items-center gap-1 border-0"
                                                                >
                                                                    <span>📸 Copy Instagram Caption</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <p className="text-white whitespace-pre-wrap leading-relaxed font-sans text-sm">{generatedContent.caption || generatedContent.post}</p>
                                                        
                                                        {generatedContent.hashtags && (
                                                            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                                                                {(generatedContent.hashtags || generatedContent.tags)?.map((tag: string) => (
                                                                    <span key={tag} className="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-lg text-[10px] font-bold">#{tag.replace(/^#/, '')}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Multi-Slide Carousel Viewer (if Carousel format) */}
                                                    {generatedContent.slides && generatedContent.slides.length > 0 && (
                                                        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/40 p-6 rounded-2xl border border-indigo-500/20 space-y-4 shadow-xl">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">📑 Multi-Slide Carousel Breakdown</h4>
                                                                    <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-[9px] font-bold">{generatedContent.slides.length} Slides</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const slideText = generatedContent.slides.map((s: any, i: number) => `SLIDE ${s.slideNumber || i + 1}: ${s.title}\n${s.content}\n[Visual Direction: ${s.visualDirection || 'Product showcase'}]\n`).join('\n---\n\n');
                                                                        navigator.clipboard.writeText(slideText);
                                                                        toast.success("All slides copied to clipboard!");
                                                                    }}
                                                                    className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
                                                                >
                                                                    Copy All Slides
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {generatedContent.slides.map((slide: any, idx: number) => (
                                                                    <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                                                                        <div>
                                                                            <div className="flex justify-between items-center text-[9px] font-bold text-indigo-400 uppercase">
                                                                                <span>Slide {slide.slideNumber || idx + 1}</span>
                                                                                <span className="bg-indigo-500/20 px-1.5 py-0.5 rounded">Canva Ready</span>
                                                                            </div>
                                                                            <h5 className="text-white font-bold text-xs mt-1.5">{slide.title}</h5>
                                                                            <p className="text-slate-300 text-xs mt-1 leading-relaxed">{slide.content}</p>
                                                                        </div>
                                                                        {slide.visualDirection && (
                                                                            <div className="bg-black/30 p-2 rounded-lg text-[9px] text-slate-400 italic mt-2 border border-white/5">
                                                                                🎨 Visual: {slide.visualDirection}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Call to Action & Image Overlay Text */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                                                            <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">📣 Primary Call to Action</h4>
                                                            <p className="text-white font-medium text-sm">{generatedContent.callToAction || generatedContent.cta}</p>
                                                            {generatedContent.callToActionVariations && generatedContent.callToActionVariations.length > 0 && (
                                                                <div className="space-y-1.5 pt-2 border-t border-white/5">
                                                                    <span className="text-[9px] font-bold uppercase text-slate-400">Alternative Options:</span>
                                                                    {generatedContent.callToActionVariations.map((ctaVar: string, i: number) => (
                                                                        <div key={i} className="flex justify-between items-center text-xs text-slate-300 bg-white/5 p-2 rounded-lg">
                                                                            <span className="line-clamp-1">{ctaVar}</span>
                                                                            <button onClick={() => { navigator.clipboard.writeText(ctaVar); toast.success("CTA copied!"); }} className="text-[9px] text-emerald-400 hover:underline cursor-pointer ml-2">Copy</button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2 flex flex-col justify-between">
                                                            <div>
                                                                <h4 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest">🎨 Graphic Overlay Headline</h4>
                                                                <p className="text-white font-bold italic text-base mt-2">"{generatedContent.imageText || generatedContent.overlay || generatedContent.image_text}"</p>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400">Use this bold text on your flyer or video thumbnail.</span>
                                                        </div>
                                                    </div>

                                                    {/* Relationship Closer (DM Sales Script) */}
                                                    <div className="bg-emerald-950/30 p-6 rounded-2xl border border-emerald-500/20 space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">🤝 WhatsApp / DM Sales Closer Script</h4>
                                                                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-bold">Copy & Send</span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const reply = generatedContent.dmReply || generatedContent.dm_reply || generatedContent.reply || '';
                                                                    navigator.clipboard.writeText(reply);
                                                                    toast.success("DM Closer script copied!");
                                                                }}
                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
                                                            >
                                                                Copy Script
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-emerald-200 italic">"Use this to reply when customers comment or send a DM asking for price / availability:"</p>
                                                        <p className="text-white font-medium text-sm bg-black/30 p-4 rounded-xl border border-white/5 leading-relaxed">{generatedContent.dmReply || generatedContent.dm_reply || generatedContent.reply}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Blog Writer' && (
                                                <div className="space-y-6">
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">SEO Article Headline</h4>
                                                            <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">⏱️ {generatedContent.readTimeMinutes || 5} Min Read</span>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-white font-heading">{generatedContent.title || generatedContent.headline}</h3>
                                                    </div>

                                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Meta Description (Search Snippet)</h4>
                                                        <p className="text-slate-300 italic text-xs">"{generatedContent.metaDescription || generatedContent.meta_description || generatedContent.description}"</p>
                                                    </div>

                                                    {generatedContent.keyTakeaways && generatedContent.keyTakeaways.length > 0 && (
                                                        <div className="bg-indigo-950/30 p-5 rounded-2xl border border-indigo-500/20 space-y-2">
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">💡 Executive Key Takeaways</h4>
                                                            <ul className="list-disc pl-5 space-y-1 text-xs text-indigo-200">
                                                                {generatedContent.keyTakeaways.map((takeaway: string, idx: number) => (
                                                                    <li key={idx}>{takeaway}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Article Body (GEO & SEO Optimized)</h4>
                                                            <button
                                                                onClick={() => {
                                                                    const body = generatedContent.blogContent || generatedContent.blog_content || generatedContent.content || generatedContent.body;
                                                                    navigator.clipboard.writeText(body);
                                                                    toast.success("Full blog article copied!");
                                                                }}
                                                                className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
                                                            >
                                                                Copy Full Markdown
                                                            </button>
                                                        </div>
                                                        <div className="text-slate-200 whitespace-pre-wrap leading-relaxed max-w-none text-xs font-medium space-y-3">
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
                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2 flex justify-between items-center">
                                                        <div>
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Proposal Subject Line</h4>
                                                            <p className="text-white font-bold text-sm mt-1">{generatedContent.subjectLine || generatedContent.subject_line || generatedContent.subject}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(generatedContent.subjectLine || generatedContent.subject);
                                                                toast.success("Subject copied!");
                                                            }}
                                                            className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>

                                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Executive Proposal Email Body</h4>
                                                            <button
                                                                onClick={() => {
                                                                    const body = generatedContent.emailBody || generatedContent.email_body || generatedContent.body;
                                                                    navigator.clipboard.writeText(body);
                                                                    toast.success("Proposal email copied!");
                                                                }}
                                                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-3 py-1.5 rounded-xl font-bold cursor-pointer"
                                                            >
                                                                Copy Full Email
                                                            </button>
                                                        </div>
                                                        <p className="text-white whitespace-pre-wrap leading-relaxed text-xs font-sans bg-black/20 p-4 rounded-xl border border-white/5">{generatedContent.emailBody || generatedContent.email_body || generatedContent.body}</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                            <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-3">Key Strategic Benefits to Partner</h4>
                                                            <ul className="list-disc pl-4 space-y-2 text-slate-300 text-xs">
                                                                {(generatedContent.keyBenefits || generatedContent.key_benefits || generatedContent.benefits)?.map((b: string, i: number) => (
                                                                    <li key={i}>{b}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                            <h4 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest mb-3">Recommended Follow Up Roadmap</h4>
                                                            <p className="text-white text-xs leading-relaxed">{generatedContent.followUpStrategy || generatedContent.follow_up_strategy || generatedContent.followUp}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Video Script' && (
                                                <div className="space-y-6">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-red-600/20 via-pink-600/20 to-purple-600/20 p-5 rounded-2xl border border-pink-500/30">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-white font-extrabold text-xl font-heading">{generatedContent.title}</h4>
                                                                <span className="bg-pink-500/20 text-pink-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">⏱️ {generatedContent.estimated_duration || 30}s</span>
                                                            </div>
                                                            <p className="text-xs text-slate-300">Record yourself live reading this script with our scrolling camera teleprompter.</p>
                                                        </div>
                                                        <button
                                                            onClick={startTeleprompterCamera}
                                                            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                                                        >
                                                            <span>🎥 Launch Teleprompter Recorder</span>
                                                        </button>
                                                    </div>

                                                    {/* Second-by-Second Video Breakdown */}
                                                    {generatedContent.script_breakdown && generatedContent.script_breakdown.length > 0 && (
                                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">🎬 Second-by-Second Video Storyboard</h4>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {generatedContent.script_breakdown.map((scene: any, idx: number) => (
                                                                    <div key={idx} className="bg-black/30 border border-white/10 p-4 rounded-xl space-y-2">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded text-[9px] font-bold">{scene.timeframe}</span>
                                                                            <span className="text-white text-xs font-bold">{scene.section}</span>
                                                                        </div>
                                                                        <div className="bg-white/5 p-2 rounded-lg text-xs text-slate-300 italic">
                                                                            👁️ <strong>Visual:</strong> {scene.visual}
                                                                        </div>
                                                                        <div className="text-xs text-white">
                                                                            🎙️ <strong>Spoken:</strong> "{scene.spoken_words}"
                                                                        </div>
                                                                        {scene.audio_sfx && (
                                                                            <div className="text-[10px] text-indigo-300">
                                                                                🎵 <strong>SFX/Music:</strong> {scene.audio_sfx}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 ring-1 ring-white/10">
                                                                <h5 className="text-indigo-300 font-bold text-[10px] uppercase mb-2">🪝 The Hook (First 3s)</h5>
                                                                <p className="text-lg text-white font-heading font-bold italic leading-tight">"{generatedContent.hook}"</p>
                                                            </div>
                                                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                                                <h5 className="text-slate-400 font-bold text-[10px] uppercase mb-2">📄 Teleprompter Narration Script</h5>
                                                                <p className="text-slate-200 leading-relaxed text-xs">{generatedContent.teleprompter_script || generatedContent.body}</p>
                                                            </div>
                                                            <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20">
                                                                <h5 className="text-emerald-300 font-bold text-[10px] uppercase mb-2">📣 Call to Action (CTA)</h5>
                                                                <p className="text-white italic">"{generatedContent.callToAction}"</p>
                                                            </div>
                                                        </div>

                                                        {/* Storyboard Rendering */}
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h5 className="text-indigo-300 font-bold text-xs uppercase">🎬 AI Audio Voiceover & Narration</h5>
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
                                                                    Click "Generate Visuals" to draft a step-by-step storyboard and Nigerian AI voiceover for this script.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'Weekly Plan' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">📅 7-Day Turnkey Growth Strategy</h4>
                                                            <p className="text-xs text-slate-400">Complete ready-to-post captions and visual staging for all 7 days.</p>
                                                        </div>
                                                        <span className="text-xs text-slate-500">Plan Generated: {new Date().toLocaleDateString()}</span>
                                                    </div>

                                                    {/* Calendar view Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {generatedContent.days?.map((day: any, idx: number) => (
                                                            <div key={day.day || idx} className="bg-slate-800/90 border border-slate-700/60 p-5 rounded-2xl flex flex-col justify-between space-y-3 group hover:border-indigo-500 transition-all shadow-lg">
                                                                <div>
                                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-indigo-400">
                                                                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">{day.day || `Day ${idx + 1}`}</span>
                                                                        <span className="text-[9px] text-slate-400">{day.format || 'Post'}</span>
                                                                    </div>
                                                                    <div className="text-[9px] font-bold text-emerald-400 uppercase mt-2 tracking-wider">{day.pillar || day.theme}</div>
                                                                    <h5 className="text-white font-bold text-xs mt-1 line-clamp-1">{day.headline || day.theme}</h5>
                                                                    <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap line-clamp-4">{day.postIdea || day.post_idea || day.idea || day.content}</p>
                                                                    {day.visualDirection && (
                                                                        <div className="bg-black/30 p-2 rounded-lg text-[9px] text-slate-400 italic mt-2 border border-white/5">
                                                                            🎨 {day.visualDirection}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const copyText = `${day.day} - ${day.pillar || day.theme}\n\n${day.postIdea || day.content}\n\n[Visual Direction: ${day.visualDirection || 'Staging'}]`;
                                                                        navigator.clipboard.writeText(copyText);
                                                                        toast.success(`${day.day || 'Day'} caption copied!`);
                                                                    }}
                                                                    className="w-full bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all cursor-pointer"
                                                                >
                                                                    Copy {day.day} Post
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
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
            {/* Teleprompter Camera Recorder Modal Overlay */}
            {showTeleprompter && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                        {/* Header */}
                        <div className="p-4 sm:p-6 bg-slate-800/80 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎥</span>
                                <div>
                                    <h3 className="text-white font-extrabold text-lg">In-App Camera Teleprompter</h3>
                                    <p className="text-slate-400 text-xs">Look directly into your camera while reading the scrolling script.</p>
                                </div>
                            </div>
                            <button
                                onClick={stopTeleprompterCamera}
                                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full text-xs font-bold transition-all cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Main Studio View (Camera + Teleprompter Split) */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 bg-slate-950 overflow-hidden">
                            {/* Left: Camera Feed */}
                            <div className="relative bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 shadow-inner min-h-[250px]">
                                <video
                                    ref={teleprompterVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform -scale-x-100"
                                />

                                {/* Recording Status Overlay */}
                                {isTeleprompterRecording && (
                                    <div className="absolute top-4 left-4 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 animate-pulse shadow-lg z-10">
                                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                                        <span>RECORDING LIVE</span>
                                    </div>
                                )}
                            </div>

                            {/* Right: Scrolling Teleprompter Box */}
                            <div className="flex flex-col bg-slate-900/90 rounded-2xl border border-white/10 p-5 overflow-hidden relative min-h-[250px]">
                                <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3 gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">📜 Teleprompter Script</span>
                                        <button
                                            type="button"
                                            onClick={toggleSpeechVoiceover}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                                isPlayingVoice ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600/40 text-indigo-200 hover:bg-indigo-600/60'
                                            }`}
                                        >
                                            <span>{isPlayingVoice ? '⏹️ Stop Voice' : '🔊 Listen Voiceover'}</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400">Scroll Speed:</span>
                                        {[1, 2, 3, 4, 5].map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => setTeleprompterSpeed(speed)}
                                                className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                    teleprompterSpeed === speed ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                }`}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scrolling Script Text Container */}
                                <div
                                    ref={teleprompterTextRef}
                                    className="flex-1 overflow-y-auto pr-2 space-y-6 scroll-smooth text-white text-base sm:text-lg font-medium leading-relaxed"
                                >
                                    {generatedContent?.hook && (
                                        <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 space-y-1">
                                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">🪝 The Hook</span>
                                            <p className="font-bold text-indigo-100 italic">"{generatedContent.hook}"</p>
                                        </div>
                                    )}

                                    {generatedContent?.body && (
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">📄 Script Body</span>
                                            <p className="whitespace-pre-wrap text-slate-200">{generatedContent.body}</p>
                                        </div>
                                    )}

                                    {generatedContent?.callToAction && (
                                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-1">
                                            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">📣 Call to Action</span>
                                            <p className="font-bold text-emerald-100">"{generatedContent.callToAction}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Controls Bar */}
                        <div className="p-4 sm:p-6 bg-slate-900 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {!isTeleprompterRecording ? (
                                    <button
                                        onClick={startRecordingTeleprompter}
                                        className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                                    >
                                        <span className="w-3 h-3 rounded-full bg-white"></span>
                                        <span>Start Recording</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopRecordingTeleprompter}
                                        className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer animate-bounce"
                                    >
                                        <span className="w-3 h-3 rounded-sm bg-white"></span>
                                        <span>Stop Recording</span>
                                    </button>
                                )}
                            </div>

                            {/* Playback & Download Recorded Clip */}
                            {teleprompterRecordedUrl && (
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <a
                                        href={teleprompterRecordedUrl}
                                        download={`SmartBiz_Product_Reel_${Date.now()}.webm`}
                                        className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                                    >
                                        <span>⬇️ Download Recorded Video</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentStudio;
