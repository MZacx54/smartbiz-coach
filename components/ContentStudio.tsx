import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, ArrowRight } from 'lucide-react';
import { BrandIdentity } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import * as geminiService from '../services/geminiService';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

// Types
type TabType = 'Post Writer' | 'Video Script' | 'Photo Studio' | 'Weekly Plan';
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

// Trends are now fetched from backend

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

    // Weekly Plan State
    const [planGoal, setPlanGoal] = useState<PrimaryGoal>('Brand Awareness');
    const [planFrequency, setPlanFrequency] = useState<PostFrequency>('5 times/week');

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [storyboard, setStoryboard] = useState<any>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [spokenText, setSpokenText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Multimodal State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
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
            if (deduct) {
                const billingResponse = await billingService.deductCredits(cost, `AI Content Studio - ${activeTab}`);
                onUpdateCredits(billingResponse.credits);
            }

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

            if (!deduct) {
                usageLimiter.incrementUsage('content_generator');
            }

            setGeneratedContent(result);
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
            return;
        }

        await executeGeneration(false, 0);
    };

    const handleGenerateVideo = async () => {
        if (!generatedContent || activeTab !== 'Video Script') return;

        setIsGeneratingVideo(true);
        setError(null);
        try {
            const result = await geminiService.generateMarketingVideo(generatedContent, 'REALISTIC');
            if (result.storyboard) setStoryboard(result.storyboard);
            if (result.audio_base64) {
                // Convert base64 to Blob URL for playback
                const audioBlob = new Blob([Uint8Array.from(atob(result.audio_base64), c => c.charCodeAt(0))], { type: 'audio/mp3' });
                setAudioUrl(URL.createObjectURL(audioBlob));
                setSpokenText(result.spoken_text);
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate storyboard.");
        } finally {
            setIsGeneratingVideo(false);
        }
    };

    const handleUseTrend = (trendTitle: string) => {
        if (activeTab === 'Post Writer') setPostTopic(`Incorporate the trend: ${trendTitle}. `);
        if (activeTab === 'Video Script') setVideoTopic(`Incorporate the trend: ${trendTitle}. `);
        if (activeTab === 'Photo Studio') setPhotoDesc(`A scene representing: ${trendTitle}. `);
    };

    const tabs: { id: TabType; icon: string }[] = [
        { id: 'Post Writer', icon: '✍️' },
        { id: 'Video Script', icon: '🎬' },
        { id: 'Photo Studio', icon: '📸' },
        { id: 'Weekly Plan', icon: '📅' }
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
                <button className="text-indigo-600 font-bold text-sm hover:underline">
                    View History
                </button>
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
                                    onClick={() => setActiveTab(tab.id)}
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
                                        <button type="button" className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                                            onClick={() => setPostTopic("Write a compelling story about how my product solves a common Nigerian problem.")}>
                                            <span>✨</span><span>Get Magic Ideas</span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                            placeholder="e.g. 50% discount on all wigs this weekend" value={postTopic} onChange={(e) => setPostTopic(e.target.value)}
                                        ></textarea>
                                        <div className="absolute bottom-3 right-3 text-xl opacity-50">🎙️</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Platform</label>
                                        <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="Instagram">📸 Instagram</option>
                                            <option value="TikTok">🎵 TikTok</option>
                                            <option value="Facebook">👥 Facebook</option>
                                            <option value="Twitter">🐦 Twitter</option>
                                            <option value="LinkedIn">💼 LinkedIn</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Tone</label>
                                        <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="Exciting">🤩 Exciting</option><option value="Professional">💼 Professional</option><option value="Funny">😂 Funny</option><option value="Informative">🧠 Informative</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Format</label>
                                        <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="Single Post">🖼️ Single Post</option><option value="Carousel">📚 Carousel</option><option value="Story">📱 Story</option><option value="Reel">🎬 Reel</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={handleGenerate} disabled={isGenerating || !postTopic.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Post</span><span>✨</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* VIDEO SCRIPT */}
                        {activeTab === 'Video Script' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-slate-700">Video Topic / Concept</label>
                                        <button type="button" className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                                            onClick={() => setVideoTopic("A funny sketch about customers who promise to pay 'tomorrow' but never do.")}>
                                            <span>✨</span><span>Get Magic Ideas</span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                            placeholder="e.g. 3 reasons to buy our organic soap" value={videoTopic} onChange={(e) => setVideoTopic(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Platform</label>
                                        <select value={videoPlatform} onChange={(e) => setVideoPlatform(e.target.value as VideoPlatform)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="TikTok">TikTok</option><option value="Instagram Reel">Instagram Reel</option><option value="YouTube Shorts">YouTube Shorts</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Hook Style</label>
                                        <select value={hookStyle} onChange={(e) => setHookStyle(e.target.value as HookStyle)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="Educational">🎓 Educational</option><option value="Controversial">🌶️ Controversial</option><option value="Storytelling">📖 Storytelling</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Length</label>
                                        <select value={videoLength} onChange={(e) => setVideoLength(e.target.value as VideoLength)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="15s">⏱️ 15 Seconds</option><option value="30s">⏱️ 30 Seconds</option><option value="60s">⏱️ 60 Seconds</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start space-x-3">
                                    <span className="text-xl">ℹ️</span>
                                    <p className="text-sm text-blue-800 leading-relaxed font-medium">Video scripts will include visual cues, text overlays, and audio suggestions to make your recording process seamless.</p>
                                </div>

                                <button onClick={handleGenerate} disabled={isGenerating || !videoTopic.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Script</span><span>✨</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* PHOTO STUDIO */}
                        {activeTab === 'Photo Studio' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Upload Reference or Product Image (Optional)</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-slate-50 group"
                                    >
                                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                                        {imagePreview ? (
                                            <div className="relative inline-block">
                                                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl shadow-md mx-auto" />
                                                <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setSelectedImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors">
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="text-4xl group-hover:scale-110 transition-transform">📸</div>
                                                <p className="text-sm font-bold text-slate-600">Click or drag image to analyze</p>
                                                <p className="text-xs text-slate-400">Gemini Vision will help you perfect your visuals</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-slate-700">Instructions / Image Goal</label>
                                    </div>
                                    <div className="relative">
                                        <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                            placeholder="e.g. Suggest edits to make this look more professional for a luxury brand" value={photoDesc} onChange={(e) => setPhotoDesc(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Art Style</label>
                                        <select value={artStyle} onChange={(e) => setArtStyle(e.target.value as ArtStyle)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="Realistic">📸 Realistic photo</option><option value="3D Render">🧊 3D Render</option><option value="Minimalist">⚪ Minimalist</option><option value="Cartoon">🎨 Cartoon / Illustration</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Aspect Ratio</label>
                                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="Square (1:1)">🟦 Square (1:1) - Instagram</option><option value="Portrait (4:5)">🟨 Portrait (4:5) - Feed</option><option value="Landscape (16:9)">🟩 Landscape (16:9) - YouTube</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start space-x-3">
                                    <span className="text-xl">⚠️</span>
                                    <p className="text-sm text-amber-800 leading-relaxed font-medium">Generating images consumes more credits. Please ensure your prompt is detailed to get the best results first time.</p>
                                </div>

                                <div 
                                    onClick={() => navigate('/dashboard/product-magic')}
                                    className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between cursor-pointer group hover:shadow-md transition-all mt-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                                            <Wand2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-indigo-900 text-sm">Have a real product photo?</h4>
                                            <p className="text-[11px] text-indigo-600 font-medium">Use Product Magic to enhance your actual products with AI analysis.</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                </div>

                                <button onClick={handleGenerate} disabled={isGenerating || !photoDesc.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4">
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Image</span><span>📸</span></>}
                                </button>
                            </motion.div>
                        )}

                        {/* WEEKLY PLAN */}
                        {activeTab === 'Weekly Plan' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Primary Goal</label>
                                        <select value={planGoal} onChange={(e) => setPlanGoal(e.target.value as PrimaryGoal)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
                                            <option value="Brand Awareness">📢 Brand Awareness (Grow Audience)</option>
                                            <option value="Sales">💰 Drive Sales (Promos/Offers)</option>
                                            <option value="Engagement">💬 Maximize Engagement (Comments/Shares)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Post Frequency</label>
                                        <select value={planFrequency} onChange={(e) => setPlanFrequency(e.target.value as PostFrequency)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none">
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

                        {/* RESULT DISPLAY */}
                        {(generatedContent || error) && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 pt-10 border-t border-slate-100">
                                {error ? (
                                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 text-sm font-medium">
                                        ⚠️ {error}
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold font-heading">AI Generated Result</h3>
                                            <button
                                                onClick={() => {
                                                    const text = JSON.stringify(generatedContent, null, 2);
                                                    navigator.clipboard.writeText(text);
                                                    alert("Copied to clipboard!");
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
                                                        <p className="text-white whitespace-pre-wrap">{generatedContent.caption}</p>
                                                        <div className="flex flex-wrap gap-2 pt-2">
                                                            {generatedContent.hashtags?.map((tag: string) => (
                                                                <span key={tag} className="text-indigo-300 font-bold">#{tag}</span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                            <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-2">Call to Action</h4>
                                                            <p className="text-white font-medium">{generatedContent.callToAction}</p>
                                                        </div>
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                            <h4 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest mb-2">Image Text Overlay</h4>
                                                            <p className="text-white font-medium italic">"{generatedContent.imageText}"</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-3">🤝 Relationship Closer (DM Script)</h4>
                                                        <p className="text-indigo-100 italic">"Use this to reply to comments or DMs:"</p>
                                                        <p className="text-white mt-2 font-medium">{generatedContent.dmReply}</p>
                                                    </div>

                                                    {generatedContent.slides && (
                                                        <div className="space-y-3">
                                                            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">📚 Carousel Guide</h4>
                                                            <div className="flex space-x-4 overflow-x-auto pb-4 hide-scrollbar">
                                                                {generatedContent.slides.map((slide: any, i: number) => (
                                                                    <div key={i} className="min-w-[200px] bg-white/5 p-4 rounded-xl border border-white/5 flex-shrink-0">
                                                                        <span className="text-[10px] font-bold text-slate-500">SLIDE {i + 1}</span>
                                                                        <h5 className="text-white font-bold my-1">{slide.title}</h5>
                                                                        <p className="text-[11px] text-slate-400">{slide.content}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
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
                                                                <h5 className="text-emerald-400 font-bold text-[10px] uppercase mb-2">🏁 Strong CTA</h5>
                                                                <p className="text-white font-bold">{generatedContent.cta}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/10 h-full">
                                                                <h5 className="text-indigo-300 font-bold text-[10px] uppercase mb-4">🎬 Production Cues</h5>
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-500 mb-2">VISUALS</p>
                                                                        <ul className="space-y-2">
                                                                            {generatedContent.visual_cues?.map((cue: string, i: number) => (
                                                                                <li key={i} className="text-[11px] text-slate-300 flex items-start space-x-2">
                                                                                    <span className="text-indigo-500">•</span>
                                                                                    <span>{cue}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                    <div className="pt-2 border-t border-white/5">
                                                                        <p className="text-xs font-bold text-slate-500 mb-2">AUDIO / SFX</p>
                                                                        <p className="text-[11px] text-slate-300 bg-white/5 p-3 rounded-lg">{generatedContent.audio_suggestions}</p>
                                                                    </div>
                                                                </div>

                                                                {!storyboard && (
                                                                    <button
                                                                        onClick={handleGenerateVideo}
                                                                        disabled={isGeneratingVideo}
                                                                        className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2"
                                                                    >
                                                                        {isGeneratingVideo ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><span>Generate Visual Storyboard</span><span>🎥</span></>}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {storyboard && (
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-6 border-t border-white/10 space-y-6">
                                                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                                    <div>
                                                                        <h4 className="text-amber-400 font-bold uppercase text-[10px] tracking-widest">📽️ Director's Storyboard</h4>
                                                                        <span className="text-[10px] text-slate-500 italic">Production-Ready View</span>
                                                                    </div>
                                                                    {audioUrl && (
                                                                        <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                                                            <span className="text-[10px] text-indigo-400 font-bold uppercase whitespace-nowrap">🎙️ Voiceover Generated</span>
                                                                            <audio controls src={audioUrl} className="h-8 w-48 scale-90 origin-left" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {spokenText && (
                                                                    <div className="bg-indigo-900/30 border border-indigo-500/20 p-4 rounded-xl">
                                                                        <h4 className="text-[10px] text-indigo-400 font-bold uppercase mb-2">Generated Script:</h4>
                                                                        <p className="text-sm text-slate-300 italic">"{spokenText}"</p>
                                                                    </div>
                                                                )}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    {storyboard.map((scene: any, i: number) => (
                                                                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
                                                                            <div className="aspect-video bg-slate-800 flex items-center justify-center p-4 relative group-hover:bg-slate-700 transition-colors">
                                                                                <span className="absolute top-2 left-2 bg-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded">SCENE {i + 1}</span>
                                                                                <p className="text-[10px] text-slate-300 text-center italic">{scene.visual}</p>
                                                                            </div>
                                                                            <div className="p-3 space-y-2">
                                                                                <div className="bg-black/20 p-2 rounded text-[9px] border border-white/5">
                                                                                    <span className="text-amber-400 font-bold">OVERLAY: </span>
                                                                                    <span className="text-white">"{scene.overlay}"</span>
                                                                                </div>
                                                                                <div className="text-[9px] text-slate-400">
                                                                                    <span className="font-bold text-indigo-400">AUDIO: </span>
                                                                                    {scene.audio}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}

                                            {activeTab === 'Weekly Plan' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">7-Day Growth Roadmap</h4>
                                                        <span className="text-xs text-slate-500">Plan Generated: {new Date().toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {generatedContent.days?.map((day: any) => (
                                                            <div key={day.day} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-colors group">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <span className="text-indigo-400 font-extrabold text-sm uppercase">{day.day}</span>
                                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 group-hover:animate-pulse"></span>
                                                                </div>
                                                                <h5 className="text-white font-bold mb-2 text-sm">{day.theme}</h5>
                                                                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{day.postIdea}</p>
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

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-indigo-200 tracking-wider uppercase">Wallet Balance</span>
                                <span className="text-emerald-400 text-xl">💎</span>
                            </div>
                            <div className="text-4xl font-extrabold mb-3">0 Credits</div>
                            <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                                Generating videos costs 50 credits.
                            </p>
                        </div>
                    </div>

                    {/* Trending Now */}
                    <div className="bg-[#fff9f0] border border-orange-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center space-x-2 mb-6">
                            <span className="text-xl">🔥</span>
                            <h3 className="font-bold text-orange-900 text-lg">Trending Now</h3>
                        </div>

                        <div className="space-y-4">
                            {trends.map((trend, i) => (
                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                            {trend.trendName || trend.title}
                                        </h4>
                                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Hot</span>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-2">{trend.description}</p>
                                    {trend.application && (
                                        <div className="mt-2 text-[10px] text-indigo-500 font-medium">
                                            💡 {trend.application}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleUseTrend(trend.trendName || trend.title)}
                                        className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-lg transition-colors mt-3"
                                    >
                                        Use this Trend
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            
            <CreditPromptModal
                isOpen={showCreditPrompt}
                featureLabel="AI Content Generator"
                creditCost={2}
                currentCredits={credits}
                onConfirm={deductOnConfirm || (() => {})}
                onClose={() => setShowCreditPrompt(false)}
            />
        </div>
    );
};

export default ContentStudio;
