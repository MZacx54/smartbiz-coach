
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedContent, VideoScript, WeeklyPlan, TrendIdea, BrandIdentity } from '../types';
import {
    generateSocialContent,
    generateVideoScript,
    generateWeeklyPlan,
    generateTrendIdeas,
    editProductImage,
    generateSuggestedPrompts,
    generateMarketingVideo
} from '../services/geminiService';
import VoiceInput from './VoiceInput';
import ShareActions from './ShareActions';

interface ContentGeneratorProps {
    history: GeneratedContent[];
    onAddToHistory: (content: GeneratedContent) => void;
    brand?: BrandIdentity | null;
    userCredits?: number; // New Prop
    onConsumeCredits?: (amount: number) => boolean; // New Handler
}

interface SavedProject {
    id: string;
    data: string;
    timestamp: number;
}

// Teleprompter Modal Component
const TeleprompterModal: React.FC<{
    script: VideoScript;
    onClose: () => void
}> = ({ script, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(2); // 1-10
    const [fontSize, setFontSize] = useState(32);
    const textRef = useRef<HTMLDivElement>(null);
    const scrollInterval = useRef<number | null>(null);

    // Combine script text without visual cues for reading
    const fullText = `${script.hook}\n\n${script.body}\n\n${script.cta}`;
    // Remove visual cues in brackets/parentheses for cleaner reading
    const cleanText = fullText.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');

    useEffect(() => {
        if (isPlaying) {
            scrollInterval.current = window.setInterval(() => {
                if (textRef.current) {
                    textRef.current.scrollTop += speed;
                }
            }, 30);
        } else {
            if (scrollInterval.current) clearInterval(scrollInterval.current);
        }
        return () => { if (scrollInterval.current) clearInterval(scrollInterval.current); };
    }, [isPlaying, speed]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in">
            {/* Controls Header */}
            <div className="bg-gray-900 p-4 flex items-center justify-between text-white shrink-0">
                <button onClick={onClose} className="text-gray-400 font-bold hover:text-white">✕ Exit</button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-gray-500">Speed</span>
                        <input
                            type="range" min="1" max="10"
                            value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                            className="w-24 accent-green-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold text-gray-500">Size</span>
                        <button onClick={() => setFontSize(Math.max(16, fontSize - 4))} className="text-lg font-bold px-2 bg-gray-800 rounded">-</button>
                        <button onClick={() => setFontSize(Math.min(72, fontSize + 4))} className="text-lg font-bold px-2 bg-gray-800 rounded">+</button>
                    </div>
                </div>
            </div>

            {/* Scrolling Text Area */}
            <div
                ref={textRef}
                className="flex-1 overflow-y-auto p-8 text-center scroll-smooth no-scrollbar"
                style={{ scrollBehavior: 'auto' }} // Disable smooth scrolling for JS manipulation
            >
                {/* Padding to allow text to start from middle */}
                <div style={{ height: '40vh' }}></div>
                <p
                    className="text-white font-bold leading-relaxed whitespace-pre-wrap max-w-3xl mx-auto"
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {cleanText}
                </p>
                {/* Padding to allow text to scroll off screen */}
                <div style={{ height: '80vh' }}></div>
            </div>

            {/* Floating Play Button */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-2xl border-4 ${isPlaying ? 'bg-red-600 border-red-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>
            </div>
        </div>
    );
};

const VIRTUAL_SCENES = [
    { id: 'studio', label: '🤍 Clean Studio', prompt: 'Place this product on a clean white professional photography studio background with soft lighting and natural shadow.' },
    { id: 'marble', label: '🏛️ Luxury Marble', prompt: 'Place this product on a white marble countertop with a blurred luxury interior background. High end product photography.' },
    { id: 'wood', label: '🪵 Rustic Wood', prompt: 'Place this product on a rustic wooden table with nice texture. Warm lighting, lifestyle photography.' },
    { id: 'nature', label: '🌿 Nature Vibe', prompt: 'Place this product on a stone podium surrounded by green leaves and nature. Fresh, organic look.' },
    { id: 'city', label: '🏙️ Urban Street', prompt: 'Place this product in a blurred urban street setting. Fashionable, trendy, streetwear vibe.' },
    { id: 'neon', label: '🟣 Neon Cyber', prompt: 'Place this product in a dark room with purple and blue neon lighting. Cyberpunk, modern tech vibe.' },
];

const ContentGenerator: React.FC<ContentGeneratorProps> = ({ history, onAddToHistory, brand, userCredits = 0, onConsumeCredits }) => {
    const [activeTab, setActiveTab] = useState<'POST' | 'SCRIPT' | 'PHOTO' | 'PLAN'>('POST');
    const [showHistory, setShowHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Suggestions State
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // Post State
    const [postForm, setPostForm] = useState({
        topic: '',
        platform: 'Instagram',
        tone: 'Exciting',
        format: 'SINGLE' as 'SINGLE' | 'CAROUSEL'
    });
    const [postResult, setPostResult] = useState<GeneratedContent | null>(null);

    // Script State
    const [scriptForm, setScriptForm] = useState({
        topic: '',
        platform: 'TikTok/Reels',
        tone: 'Engaging',
        style: 'Tutorial'
    });
    const [scriptResult, setScriptResult] = useState<VideoScript | null>(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [isVideoGenerating, setIsVideoGenerating] = useState(false);
    const [videoProgress, setVideoProgress] = useState('');
    const [showTeleprompter, setShowTeleprompter] = useState(false);
    const [videoVisualStyle, setVideoVisualStyle] = useState<'REALISTIC' | 'ANIMATION' | 'CARTOON'>('REALISTIC');

    // Photo State
    const [imageHistory, setImageHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [photoPrompt, setPhotoPrompt] = useState('');
    const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
        const saved = localStorage.getItem('sb_saved_projects');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Backward compatibility check
                if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                    return parsed.map((s: string) => ({
                        id: Math.random().toString(36).substr(2, 9),
                        data: s,
                        timestamp: Date.now()
                    }));
                }
                return parsed;
            } catch (e) {
                return [];
            }
        }
        return [];
    });

    // Specific Edit States
    const [showTextPrompt, setShowTextPrompt] = useState(false);
    const [showMagicEdit, setShowMagicEdit] = useState(false);
    const [showProjectHistory, setShowProjectHistory] = useState(false);
    const [textToAdd, setTextToAdd] = useState('');

    // Plan State
    const [planNiche, setPlanNiche] = useState(brand?.niche || '');
    const [planResult, setPlanResult] = useState<WeeklyPlan | null>(null);

    // Trends
    const [trends, setTrends] = useState<TrendIdea[]>([]);

    useEffect(() => {
        // Load trends on mount
        const loadTrends = async () => {
            try {
                const niche = brand?.niche || "General Business";
                const data = await generateTrendIdeas(niche);
                setTrends(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Trend loading error:", e);
                setTrends([]); // Ensure it's an array
            }
        };
        loadTrends();
    }, [brand]);

    // Persist Saved Projects
    useEffect(() => {
        localStorage.setItem('sb_saved_projects', JSON.stringify(savedProjects));
    }, [savedProjects]);

    // Clear suggestions when switching tabs
    useEffect(() => {
        setSuggestions([]);
    }, [activeTab]);

    // --- Handlers ---

    const getCurrentPhoto = () => {
        if (historyIndex >= 0 && historyIndex < imageHistory.length) {
            return imageHistory[historyIndex];
        }
        return '';
    };

    const handleGetSuggestions = async () => {
        setIsSuggesting(true);
        const niche = brand?.niche || "Small Business";
        const trendNames = trends.map(t => t.trendName);

        // For photo mode, extract base64 and mime type
        let imageBase64: string | undefined;
        let imageMimeType: string = 'image/jpeg';

        const currentPhoto = getCurrentPhoto();

        if (activeTab === 'PHOTO' && currentPhoto) {
            const match = currentPhoto.match(/^data:(.*);base64,(.*)$/);
            if (match) {
                imageMimeType = match[1];
                imageBase64 = match[2];
            }
        }

        const ideas = await generateSuggestedPrompts(niche, activeTab, imageBase64, imageMimeType, trendNames);
        setSuggestions(Array.isArray(ideas) ? ideas : []);
    } catch (e) {
        console.error(e);
        setSuggestions([]);
    } finally {
        setIsSuggesting(false);
    }
};

const applySuggestion = (text: string) => {
    if (activeTab === 'POST') setPostForm(prev => ({ ...prev, topic: text }));
    if (activeTab === 'SCRIPT') setScriptForm(prev => ({ ...prev, topic: text }));
    if (activeTab === 'PHOTO') setPhotoPrompt(text);
};

const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.topic) return;
    setIsLoading(true);
    setError('');
    try {
        const data = await generateSocialContent(postForm.topic, postForm.platform, postForm.tone, postForm.format);
        const contentWithMeta: GeneratedContent = {
            ...data,
            type: 'POST',
            topic: postForm.topic,
            createdAt: Date.now()
        };
        setPostResult(contentWithMeta);
        onAddToHistory(contentWithMeta);
    } catch (err) {
        setError("Failed to generate content.");
    } finally {
        setIsLoading(false);
    }
};

const handleScriptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptForm.topic) return;
    setIsLoading(true);
    setError('');
    try {
        const data = await generateVideoScript(scriptForm.topic, scriptForm.platform, scriptForm.tone, scriptForm.style);
        setScriptResult(data);
        setVideoUrl(''); // Reset video if new script

        // Save to history
        const historyItem: GeneratedContent = {
            type: 'SCRIPT',
            topic: scriptForm.topic,
            createdAt: Date.now(),
            script: data
        };
        onAddToHistory(historyItem);
    } catch (err) {
        setError("Failed to generate script.");
    } finally {
        setIsLoading(false);
    }
};

const handleGenerateVideo = async () => {
    if (!scriptResult) return;

    // Cost Check
    const VIDEO_COST = 50;
    if (onConsumeCredits) {
        const success = onConsumeCredits(VIDEO_COST);
        if (!success) return; // Stop if not enough credits
    }

    setIsVideoGenerating(true);
    setVideoProgress("Initializing video engine...");
    setError('');
    try {
        const url = await generateMarketingVideo(scriptResult, videoVisualStyle, (msg) => setVideoProgress(msg));
        setVideoUrl(url);
    } catch (err: any) {
        setError(err.message || "Video generation failed.");
        // Note: Real implementation might refund credits on failure
    } finally {
        setIsVideoGenerating(false);
        setVideoProgress('');
    }
};

const handlePlanSubmit = async () => {
    if (!planNiche) {
        setError("Please enter a business niche");
        return;
    }
    setIsLoading(true);
    setError('');
    try {
        const data = await generateWeeklyPlan(planNiche);
        setPlanResult(data);

        // Save to History
        const historyItem: GeneratedContent = {
            type: 'PLAN',
            topic: `Weekly Plan for ${planNiche}`,
            createdAt: Date.now(),
            plan: data,
            niche: planNiche
        };
        onAddToHistory(historyItem);
    } catch (err) {
        setError("Failed to generate plan.");
    } finally {
        setIsLoading(false);
    }
};

const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Reset history on new upload
            setImageHistory([result]);
            setHistoryIndex(0);
            setSuggestions([]);
            setPhotoPrompt('');
            // NOTE: We do NOT auto-save to projects anymore
        };
        reader.readAsDataURL(file);
    }
};

const addToImageHistory = (newImage: string) => {
    const newHistory = imageHistory.slice(0, historyIndex + 1);
    newHistory.push(newImage);
    setImageHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // NOTE: We do NOT auto-save to projects anymore
};

const handleSaveCurrentProject = () => {
    const current = getCurrentPhoto();
    if (!current) return;
    const newProject: SavedProject = {
        id: Date.now().toString(),
        data: current,
        timestamp: Date.now()
    };
    setSavedProjects(prev => [newProject, ...prev]);
    alert("Project Saved!");
};

const handleDeleteProject = (id: string) => {
    setSavedProjects(prev => prev.filter(p => p.id !== id));
};

const performImageEdit = async (prompt: string) => {
    const currentPhoto = getCurrentPhoto();
    if (!currentPhoto || !prompt) return;

    setIsLoading(true);
    setError('');
    try {
        const match = currentPhoto.match(/^data:(.*);base64,(.*)$/);
        if (!match) throw new Error("Invalid image format");
        const mimeType = match[1];
        const base64Data = match[2];

        const resultBase64 = await editProductImage(base64Data, mimeType, prompt);
        const newImageUrl = `data:${mimeType};base64,${resultBase64}`;
        addToImageHistory(newImageUrl);
        setPhotoPrompt(''); // Clear prompt on success
        setShowTextPrompt(false);
        setShowMagicEdit(false);
    } catch (err: any) {
        setError(err.message || "Failed to edit image.");
    } finally {
        setIsLoading(false);
    }
};

const handleManualEdit = () => {
    performImageEdit(photoPrompt);
};

const handleRemoveBackground = () => {
    performImageEdit("Remove the background and place the object on a solid white background.");
};

const handleAutoEnhance = () => {
    performImageEdit("Enhance this image to look like high-quality 4k product photography. Improve lighting, sharpness, and color balance without changing the product shape.");
};

const handleSceneClick = (prompt: string) => {
    performImageEdit(prompt);
};

const handleAddTextTrigger = () => {
    setShowTextPrompt(true);
    setShowMagicEdit(false);
};

const handleMagicEditTrigger = () => {
    setShowMagicEdit(true);
    setShowTextPrompt(false);
};

const confirmAddText = () => {
    if (textToAdd) {
        performImageEdit(`Add the text '${textToAdd}' to the image in a professional, readable font that contrasts well. Do not distort the text.`);
        setTextToAdd('');
    }
};

const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
};

const handleRedo = () => {
    if (historyIndex < imageHistory.length - 1) setHistoryIndex(historyIndex + 1);
};

const loadSavedProject = (img: string) => {
    setImageHistory([img]);
    setHistoryIndex(0);
    setShowProjectHistory(false);
};

// --- Render Helpers ---

// Helper to highlight visual cues in scripts
const renderScriptText = (text: string) => {
    const parts = text.split(/(\[.*?\])/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    return <span key={i} className="block text-indigo-600 font-bold text-xs uppercase my-1">{part.slice(1, -1)}</span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const renderTabs = () => (
    <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar mb-6">
        {[
            { id: 'POST', label: '✍️ Post Writer' },
            { id: 'SCRIPT', label: '🎬 Video Script' },
            { id: 'PHOTO', label: '📸 Photo Studio' },
            { id: 'PLAN', label: '📅 Weekly Plan' }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
            >
                {tab.label}
            </button>
        ))}
    </div>
);

const renderSuggestions = () => (
    <div className="mb-4">
        <button
            type="button"
            onClick={handleGetSuggestions}
            disabled={isSuggesting || (activeTab === 'PHOTO' && !getCurrentPhoto())}
            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors disabled:opacity-50"
        >
            <span>✨</span>
            {isSuggesting ? 'Thinking...' : 'Get Magic Ideas'}
        </button>

        {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in">
                {(suggestions || []).map((idea, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => applySuggestion(idea)}
                        className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-left"
                    >
                        {idea}
                    </button>
                ))}
            </div>
        )}
    </div>
);

const renderHistory = () => (
    <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Generation History</h2>
            <button onClick={() => setShowHistory(false)} className="text-sm text-indigo-600">Back to Studio</button>
        </div>
        <div className="space-y-4">
            {history.map((item, idx) => {
                // Post History Item
                if (!item.type || item.type === 'POST') {
                    return (
                        <div key={item.id || idx} className="bg-white border p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">SOCIAL POST</span>
                                <span className="text-xs text-gray-400">{new Date(item.createdAt || 0).toLocaleDateString()}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-gray-800 line-clamp-3">{item.caption}</p>
                            {item.slides && item.slides.length > 0 && (
                                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                                    {item.slides.map((s, i) => (
                                        <div key={i} className="min-w-[100px] bg-gray-100 p-2 rounded text-[10px] border border-gray-200">
                                            <p className="font-bold truncate">{s.title}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-2 text-indigo-600 text-xs">{item.hashtags?.join(' ')}</div>
                            <div className="mt-3">
                                <ShareActions text={`${item.caption}\n\n${item.hashtags?.join(' ')}`} />
                            </div>
                        </div>
                    );
                }

                // Script History Item
                if (item.type === 'SCRIPT' && item.script) {
                    return (
                        <div key={item.id || idx} className="bg-white border p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold bg-pink-50 text-pink-600 px-2 py-0.5 rounded">VIDEO SCRIPT</span>
                                <span className="text-xs text-gray-400">{new Date(item.createdAt || 0).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-gray-900">{item.script.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">Hook: {item.script.hook}</p>
                            <div className="mt-3">
                                <ShareActions
                                    text={`Check out this video script: ${item.script.title}\n\nHook: ${item.script.hook}\nBody: ${item.script.body}\nCTA: ${item.script.cta}`}
                                    title="Video Script"
                                />
                            </div>
                        </div>
                    );
                }

                // Plan History Item
                if (item.type === 'PLAN' && item.plan) {
                    return (
                        <div key={item.id || idx} className="bg-white border p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded">WEEKLY PLAN</span>
                                <span className="text-xs text-gray-400">{new Date(item.createdAt || 0).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Content Plan for {item.niche}</h4>
                            <div className="space-y-1 mb-3">
                                {item.plan.days.slice(0, 3).map((d, i) => (
                                    <div key={i} className="text-xs text-gray-600 truncate">• {d.day}: {d.theme}</div>
                                ))}
                                <div className="text-xs text-gray-400 italic">+ {item.plan.days.length - 3} more days</div>
                            </div>
                            <div className="mt-2">
                                <ShareActions
                                    text={`My 7-Day Content Plan:\n\n${item.plan.days.map(d => `${d.day}: ${d.postIdea}`).join('\n')}`}
                                    title="Weekly Content Plan"
                                />
                            </div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    </div>
);

const renderProjectHistoryModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">Project History</h3>
                <button onClick={() => setShowProjectHistory(false)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {savedProjects.length === 0 && <p className="col-span-full text-center text-gray-500 mt-10">No projects saved yet.</p>}
                {savedProjects.map((proj) => (
                    <div key={proj.id} className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square group bg-gray-50">
                        <img src={proj.data} className="w-full h-full object-cover" alt="Project" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            <button onClick={() => loadSavedProject(proj.data)} className="text-white text-xs font-bold border border-white px-3 py-1.5 rounded hover:bg-white/20 w-full">Edit</button>
                            <button onClick={() => handleDeleteProject(proj.id)} className="text-white text-xs font-bold bg-red-600 px-3 py-1.5 rounded hover:bg-red-700 w-full">Delete</button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate">
                            {new Date(proj.timestamp).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

if (showHistory) return <div className="max-w-4xl mx-auto">{renderHistory()}</div>;

return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {showProjectHistory && renderProjectHistoryModal()}
        {showTeleprompter && scriptResult && (
            <TeleprompterModal script={scriptResult} onClose={() => setShowTeleprompter(false)} />
        )}

        {/* Main Content Area */}
        <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Content Studio 🎨</h2>
                    <p className="text-gray-600 text-sm">Your all-in-one agency creative suite.</p>
                </div>
                <button onClick={() => setShowHistory(true)} className="text-sm text-indigo-600 font-bold hover:underline">
                    View History
                </button>
            </div>

            {renderTabs()}

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">

                {/* POST WRITER */}
                {activeTab === 'POST' && (
                    <div className="space-y-6">
                        {!postResult ? (
                            <form onSubmit={handlePostSubmit} className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Topic</label>
                                    </div>

                                    {renderSuggestions()}

                                    <div className="relative">
                                        <textarea
                                            required rows={3}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. 50% discount on all wigs this weekend"
                                            value={postForm.topic}
                                            onChange={e => setPostForm({ ...postForm, topic: e.target.value })}
                                        />
                                        <div className="absolute right-2 bottom-2">
                                            <VoiceInput onTranscript={(text) => setPostForm(prev => ({ ...prev, topic: text }))} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                                        <select className="w-full px-3 py-2 border rounded-lg" value={postForm.platform} onChange={e => setPostForm({ ...postForm, platform: e.target.value })}>
                                            <option value="Instagram">Instagram</option>
                                            <option value="WhatsApp Status">WhatsApp Status</option>
                                            <option value="Twitter/X">Twitter / X</option>
                                            <option value="LinkedIn">LinkedIn</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                                        <select className="w-full px-3 py-2 border rounded-lg" value={postForm.tone} onChange={e => setPostForm({ ...postForm, tone: e.target.value })}>
                                            <option value="Exciting">🤩 Exciting</option>
                                            <option value="Professional">👔 Professional</option>
                                            <option value="Funny">😂 Funny</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg"
                                            value={postForm.format}
                                            onChange={e => setPostForm({ ...postForm, format: e.target.value as any })}
                                        >
                                            <option value="SINGLE">🖼️ Single Post</option>
                                            <option value="CAROUSEL">🎠 Carousel</option>
                                        </select>
                                    </div>
                                </div>
                                <button disabled={isLoading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">
                                    {isLoading ? 'Generating Content...' : `Generate ${postForm.format === 'CAROUSEL' ? 'Carousel Slides' : 'Post'} ✨`}
                                </button>
                            </form>
                        ) : (
                            <div className="animate-in fade-in space-y-6">
                                {/* Carousel Visualization */}
                                {postResult.slides && postResult.slides.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <span>🎠</span> Carousel Preview ({postResult.slides.length} Slides)
                                        </h3>
                                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                                            {postResult.slides.map((slide, i) => (
                                                <div key={i} className="min-w-[250px] bg-white border border-gray-200 rounded-lg shadow-sm p-4 snap-center flex flex-col aspect-[4/5] relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">
                                                        {i + 1}/{postResult.slides!.length}
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center text-center">
                                                        <h4 className="font-bold text-lg mb-2 text-indigo-900">{slide.title}</h4>
                                                        <p className="text-sm text-gray-600">{slide.content}</p>
                                                    </div>
                                                    <div className="text-center mt-4">
                                                        <span className="text-xs text-gray-400">Swipe ➡️</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">Caption</h3>
                                    <div className="whitespace-pre-wrap text-gray-800 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">{postResult.caption}</div>
                                </div>

                                {/* Text on Image Suggestion */}
                                {postResult.imageText && (
                                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg">
                                        <h3 className="font-bold text-purple-900 text-xs uppercase mb-1 flex items-center gap-2">
                                            <span>🎨</span> Designer's Corner
                                        </h3>
                                        <p className="text-sm text-gray-700">
                                            <strong>Text to put on Image/Flyer:</strong> "{postResult.imageText}"
                                        </p>
                                    </div>
                                )}

                                {/* DM Sales Closer */}
                                {postResult.dmReply && (
                                    <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                                        <h3 className="font-bold text-green-900 text-xs uppercase mb-2 flex items-center gap-2">
                                            <span>💬</span> Sales Closer Script (DM Reply)
                                        </h3>
                                        <div className="bg-white p-3 rounded border border-green-100 text-sm text-gray-700 italic relative group">
                                            "{postResult.dmReply}"
                                            <button
                                                onClick={() => navigator.clipboard.writeText(postResult.dmReply || '')}
                                                className="absolute top-2 right-2 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4 font-bold text-indigo-900 text-sm bg-indigo-50 p-2 rounded inline-block">
                                    CTA: {postResult.callToAction}
                                </div>
                                <div className="mb-6 text-blue-600 text-sm italic">{postResult.hashtags?.join(' ')}</div>

                                <div className="flex gap-2">
                                    <button onClick={() => setPostResult(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Back</button>
                                    <div className="flex-1">
                                        <ShareActions text={`${postResult.caption}\n${postResult.callToAction}\n${postResult.hashtags?.join(' ')}`} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* VIDEO SCRIPT */}
                {activeTab === 'SCRIPT' && (
                    <div className="space-y-6">
                        {!scriptResult ? (
                            <form onSubmit={handleScriptSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Video Topic</label>
                                    {renderSuggestions()}
                                    <div className="relative">
                                        <input
                                            type="text" required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none"
                                            placeholder="e.g. How to tie a gele in 30 seconds"
                                            value={scriptForm.topic}
                                            onChange={e => setScriptForm({ ...scriptForm, topic: e.target.value })}
                                        />
                                        <div className="absolute right-2 top-2">
                                            <VoiceInput onTranscript={(text) => setScriptForm(prev => ({ ...prev, topic: text }))} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg bg-white"
                                            value={scriptForm.tone}
                                            onChange={e => setScriptForm({ ...scriptForm, tone: e.target.value })}
                                        >
                                            <option value="Engaging">🤩 Engaging</option>
                                            <option value="Humorous">😂 Humorous</option>
                                            <option value="Serious">😐 Serious/Formal</option>
                                            <option value="Hype">🔥 Hype/Energetic</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg bg-white"
                                            value={scriptForm.style}
                                            onChange={e => setScriptForm({ ...scriptForm, style: e.target.value })}
                                        >
                                            <option value="Tutorial">📚 Tutorial / How-to</option>
                                            <option value="Storytime">📖 Storytime</option>
                                            <option value="Skit">🎭 Skit / POV</option>
                                            <option value="Showcase">🛍️ Product Showcase</option>
                                        </select>
                                    </div>
                                </div>

                                <button disabled={isLoading} className="w-full bg-pink-600 text-white py-3 rounded-lg font-bold hover:bg-pink-700 transition-colors shadow-lg">
                                    {isLoading ? 'Writing Script...' : 'Generate Reels Script 🎬'}
                                </button>
                            </form>
                        ) : (
                            <div className="animate-in fade-in space-y-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-xl text-gray-900">{scriptResult.title} <span className="text-sm font-normal text-gray-500">({scriptResult.duration})</span></h3>
                                    <ShareActions
                                        text={`Video Script: ${scriptResult.title}\n\nHook: ${scriptResult.hook}\nBody: ${scriptResult.body}\nCTA: ${scriptResult.cta}`}
                                        title="Video Script"
                                    />
                                </div>

                                {/* Teleprompter Button */}
                                <div className="bg-black text-white p-4 rounded-xl flex items-center justify-between shadow-lg">
                                    <div>
                                        <h4 className="font-bold text-sm">Ready to record?</h4>
                                        <p className="text-xs text-gray-400">Read your script while you film.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowTeleprompter(true)}
                                        className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        <span>📱</span> Open Teleprompter
                                    </button>
                                </div>

                                <div className="bg-pink-50 border border-pink-100 p-4 rounded-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                                    <span className="text-xs font-bold text-pink-600 uppercase">0:00 - 0:03 (Hook)</span>
                                    <p className="text-gray-900 mt-2 whitespace-pre-wrap leading-relaxed">{renderScriptText(scriptResult.hook)}</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-400"></div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Body</span>
                                    <p className="text-gray-800 mt-2 whitespace-pre-wrap leading-relaxed">{renderScriptText(scriptResult.body)}</p>
                                </div>
                                <div className="bg-green-50 border border-green-100 p-4 rounded-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                    <span className="text-xs font-bold text-green-600 uppercase">Call to Action</span>
                                    <p className="font-bold text-gray-900 mt-2 leading-relaxed">{renderScriptText(scriptResult.cta)}</p>
                                </div>

                                {/* Video Generation Section */}
                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <h4 className="font-bold text-gray-900 mb-3">AI Video Production (Veo)</h4>

                                    {!videoUrl && (
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Visual Style</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'REALISTIC', label: '🎥 Realistic', icon: '' },
                                                    { id: 'ANIMATION', label: '🦄 3D Animation', icon: '' },
                                                    { id: 'CARTOON', label: '✏️ Cartoon', icon: '' }
                                                ].map(style => (
                                                    <button
                                                        key={style.id}
                                                        onClick={() => setVideoVisualStyle(style.id as any)}
                                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${videoVisualStyle === style.id
                                                            ? 'bg-black text-white border-black'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {style.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 italic">
                                                Note: Animated videos are great for storytelling without filming yourself.
                                            </p>
                                        </div>
                                    )}

                                    {!videoUrl ? (
                                        <div className="bg-black/5 rounded-xl p-4 text-center relative overflow-hidden">
                                            <p className="text-sm text-gray-600 mb-3">Turn this script into a longer video instantly (approx 30-50s).</p>

                                            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-yellow-200">
                                                <span>💎</span> Cost: 50 Credits
                                            </div>

                                            <button
                                                onClick={handleGenerateVideo}
                                                disabled={isVideoGenerating}
                                                className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto w-full md:w-auto"
                                            >
                                                {isVideoGenerating ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        {videoProgress || 'Initializing...'}
                                                    </>
                                                ) : (
                                                    <>🎥 Generate Full Video</>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in">
                                            <video src={videoUrl} controls className="w-full rounded-xl shadow-lg mb-4 aspect-[9/16] bg-black max-h-[500px]" />
                                            <div className="flex gap-2">
                                                <a href={videoUrl} download="smartbiz-reel.mp4" className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-center block">Download Video</a>
                                                <div className="flex-1">
                                                    <ShareActions text={`Watch this! ${scriptResult.title}`} url={videoUrl} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button onClick={() => { setScriptResult(null); setVideoUrl(''); }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold">Write Another</button>
                            </div>
                        )}
                    </div>
                )}

                {/* PHOTO STUDIO */}
                {activeTab === 'PHOTO' && (
                    <div className="space-y-6">
                        {!getCurrentPhoto() ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                                <label htmlFor="photo-upload" className="cursor-pointer block">
                                    <div className="py-8">
                                        <span className="text-5xl block mb-4">📸</span>
                                        <span className="text-lg text-gray-700 font-bold block">Upload Product Photo</span>
                                        <span className="text-sm text-gray-500">Tap to browse gallery</span>
                                    </div>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Editor Toolbar */}
                                <div className="flex flex-wrap gap-2 justify-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <button
                                        onClick={handleUndo}
                                        disabled={historyIndex <= 0 || isLoading}
                                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-sm font-bold"
                                        title="Undo"
                                    >
                                        ↩
                                    </button>
                                    <button
                                        onClick={handleRedo}
                                        disabled={historyIndex >= imageHistory.length - 1 || isLoading}
                                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-sm font-bold"
                                        title="Redo"
                                    >
                                        ↪
                                    </button>
                                    <div className="w-px bg-gray-300 mx-1"></div>
                                    <button
                                        onClick={handleRemoveBackground}
                                        disabled={isLoading}
                                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-indigo-50 text-indigo-700 text-sm font-bold"
                                    >
                                        ✂️ No BG
                                    </button>
                                    <button
                                        onClick={handleAutoEnhance}
                                        disabled={isLoading}
                                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-indigo-50 text-indigo-700 text-sm font-bold"
                                    >
                                        ✨ HD Enhance
                                    </button>
                                    <button
                                        onClick={handleAddTextTrigger}
                                        disabled={isLoading}
                                        className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-indigo-50 text-indigo-700 text-sm font-bold"
                                    >
                                        T+ Text
                                    </button>
                                    <button
                                        onClick={handleMagicEditTrigger}
                                        disabled={isLoading}
                                        className={`px-3 py-2 border rounded text-sm font-bold flex items-center gap-1 ${showMagicEdit ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-gray-300 text-indigo-700 hover:bg-purple-50'}`}
                                    >
                                        🧞 AI Edit
                                    </button>
                                </div>

                                {showTextPrompt && (
                                    <div className="flex gap-2 animate-in slide-in-from-top-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <input
                                            type="text"
                                            autoFocus
                                            className="flex-1 px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Enter text to add..."
                                            value={textToAdd}
                                            onChange={e => setTextToAdd(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && confirmAddText()}
                                        />
                                        <button onClick={confirmAddText} className="bg-indigo-600 text-white px-4 rounded-lg font-bold">Add</button>
                                        <button onClick={() => setShowTextPrompt(false)} className="bg-gray-200 text-gray-600 px-3 rounded-lg">✕</button>
                                    </div>
                                )}

                                {showMagicEdit && (
                                    <div className="animate-in slide-in-from-top-2 bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <label className="block text-xs font-bold text-purple-800 mb-2 uppercase">Custom AI Edit</label>
                                        {renderSuggestions()}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full pl-4 pr-16 py-3 rounded-lg border border-purple-300 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                                                placeholder="e.g. Place on a wooden table, Add soft cinematic lighting..."
                                                value={photoPrompt}
                                                onChange={e => setPhotoPrompt(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleManualEdit()}
                                            />
                                            <button
                                                onClick={handleManualEdit}
                                                disabled={isLoading || !photoPrompt}
                                                className="absolute right-2 top-2 bottom-2 bg-purple-600 text-white px-3 rounded-md font-bold text-xs hover:bg-purple-700 disabled:opacity-50"
                                            >
                                                GO
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* VIRTUAL STUDIO SCENES */}
                                {!showMagicEdit && !showTextPrompt && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Virtual Studio</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {VIRTUAL_SCENES.map(scene => (
                                                <button
                                                    key={scene.id}
                                                    onClick={() => handleSceneClick(scene.prompt)}
                                                    disabled={isLoading}
                                                    className="p-2 bg-white border border-gray-300 rounded hover:border-indigo-500 hover:bg-indigo-50 text-xs font-medium text-center transition-colors disabled:opacity-50"
                                                >
                                                    {scene.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="relative rounded-lg overflow-hidden border border-gray-200 shadow-lg bg-gray-100">
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
                                            <div className="bg-white p-4 rounded-xl flex flex-col items-center">
                                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <span className="font-bold text-gray-800">Processing...</span>
                                            </div>
                                        </div>
                                    )}
                                    <img src={getCurrentPhoto()} alt="Preview" className="w-full max-h-[500px] object-contain mx-auto" />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSaveCurrentProject}
                                        className="flex-1 bg-black text-white py-3 rounded-lg font-bold text-center block hover:bg-gray-800 transition-colors flex justify-center items-center gap-2"
                                    >
                                        💾 Save Project
                                    </button>
                                    <a
                                        href={getCurrentPhoto()}
                                        download="smartbiz-edit.png"
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-center block hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
                                    >
                                        <span>⬇</span> Download
                                    </a>
                                    <button
                                        onClick={() => { setImageHistory([]); setHistoryIndex(-1); }}
                                        className="px-4 py-3 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* My Projects Gallery (Saved Projects) */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900">My Projects</h3>
                                {savedProjects.length > 5 && (
                                    <button
                                        onClick={() => setShowProjectHistory(true)}
                                        className="text-sm text-indigo-600 font-bold hover:underline"
                                    >
                                        View All ({savedProjects.length})
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                {/* New Project Placeholder */}
                                <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center aspect-square bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                    <span className="text-2xl mb-2">➕</span>
                                    <span className="text-xs font-bold text-gray-600">New Project</span>
                                </label>

                                {savedProjects.slice(0, 5).map((proj) => (
                                    <div key={proj.id} className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square group bg-white shadow-sm">
                                        <img src={proj.data} className="w-full h-full object-cover" alt="Project" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                            <button
                                                onClick={() => loadSavedProject(proj.data)}
                                                className="text-white text-xs font-bold border border-white px-3 py-1.5 rounded hover:bg-white/20 w-full"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProject(proj.id)}
                                                className="text-white text-xs font-bold bg-red-600 px-3 py-1.5 rounded hover:bg-red-700 w-full"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {savedProjects.length === 0 && (
                                <p className="text-sm text-gray-400 text-center italic mt-2">Saved projects will appear here.</p>
                            )}
                        </div>

                    </div>
                )}

                {/* WEEKLY PLAN */}
                {activeTab === 'PLAN' && (
                    <div className="space-y-6">
                        {!planResult ? (
                            <div className="text-center py-10">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Generate a 7-Day Content Plan</h3>
                                <p className="text-gray-500 mb-6">Stop guessing what to post. Get a full week's strategy.</p>
                                <div className="max-w-xs mx-auto mb-4">
                                    <input
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 text-center"
                                        placeholder="Enter your Business Niche"
                                        value={planNiche}
                                        onChange={e => setPlanNiche(e.target.value)}
                                    />
                                </div>
                                <button onClick={handlePlanSubmit} disabled={isLoading} className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800">
                                    {isLoading ? 'Planning...' : 'Generate Plan 📅'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-xl">Weekly Plan</h3>
                                    <button onClick={() => setPlanResult(null)} className="text-sm text-red-500 font-bold">Clear</button>
                                </div>
                                <div className="mb-2">
                                    <ShareActions
                                        text={`My 7-Day Content Plan:\n\n${planResult.days.map(d => `${d.day}: ${d.postIdea}`).join('\n')}`}
                                        title="Weekly Content Plan"
                                    />
                                </div>
                                <div className="grid gap-3">
                                    {planResult.days.map((day, idx) => (
                                        <div key={idx} className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex flex-col md:flex-row gap-4">
                                            <div className="md:w-24 font-bold text-indigo-900 bg-indigo-100 rounded flex items-center justify-center py-2 md:py-0">
                                                {day.day}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-gray-500 uppercase">{day.theme}</p>
                                                <p className="text-gray-800 font-medium">{day.postIdea}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setActiveTab('POST');
                                                    setPostForm(prev => ({ ...prev, topic: day.postIdea }));
                                                }}
                                                className="bg-white border border-gray-300 text-xs font-bold px-3 py-1 rounded hover:bg-gray-100"
                                            >
                                                Create
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>

        {/* Sidebar: Trends */}
        <div className="lg:col-span-1">
            {/* Credit Status (New) */}
            <div className="bg-indigo-900 text-white rounded-xl p-4 mb-6 shadow-md">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase opacity-80">Wallet Balance</span>
                    <span className="text-lg">💎</span>
                </div>
                <div className="text-2xl font-bold">{userCredits} Credits</div>
                <p className="text-[10px] opacity-70 mt-1">Generating videos costs 50 credits.</p>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-6 sticky top-6">
                <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
                    <span>🔥</span> Trending Now
                </h3>
                {trends.length === 0 ? (
                    <div className="text-sm text-orange-800 opacity-60 italic">Loading trends...</div>
                ) : (
                    <div className="space-y-4">
                        {(trends || []).map((trend, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-orange-100">
                                <p className="font-bold text-gray-900 text-sm mb-1">{trend.trendName}</p>
                                <p className="text-xs text-gray-600 mb-2 leading-tight">{trend.description}</p>
                                <div className="bg-orange-100 p-2 rounded text-[10px] text-orange-800 font-medium">
                                    Tip: {trend.application}
                                </div>
                                <button
                                    onClick={() => {
                                        setActiveTab('POST');
                                        setPostForm(prev => ({ ...prev, topic: `Post using trend: ${trend.trendName}` }));
                                    }}
                                    className="w-full mt-2 text-center text-xs text-indigo-600 font-bold hover:underline"
                                >
                                    Use this Trend
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-4 pt-4 border-t border-orange-200 text-center">
                    <p className="text-xs text-orange-800">Updated from Naija Socials</p>
                </div>
            </div>
        </div>

    </div>
);
};

export default ContentGenerator;
