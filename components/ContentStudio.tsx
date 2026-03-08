import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Types
type TabType = 'Post Writer' | 'Video Script' | 'Photo Studio' | 'Weekly Plan';
type Platform = 'Instagram' | 'Facebook' | 'Twitter' | 'LinkedIn';
type Tone = 'Exciting' | 'Professional' | 'Funny' | 'Informative';
type Format = 'Single Post' | 'Carousel' | 'Story' | 'Reel';

type VideoPlatform = 'TikTok' | 'Instagram Reel' | 'YouTube Shorts';
type HookStyle = 'Educational' | 'Controversial' | 'Storytelling';
type VideoLength = '15s' | '30s' | '60s';

type ArtStyle = 'Realistic' | '3D Render' | 'Minimalist' | 'Cartoon';
type AspectRatio = 'Square (1:1)' | 'Portrait (4:5)' | 'Landscape (16:9)';

type PrimaryGoal = 'Sales' | 'Brand Awareness' | 'Engagement';
type PostFrequency = 'Daily' | '5 times/week' | '3 times/week';

interface Trend {
    id: string;
    title: string;
    description: string;
    tip: string;
}

const TRENDS: Trend[] = [
    {
        id: '1',
        title: 'No Gree For Anybody',
        description: 'Resilience theme.',
        tip: 'Show persistence.'
    },
    {
        id: '2',
        title: 'Detty December',
        description: 'Holiday enjoyment.',
        tip: 'Party ready products.'
    }
];

const ContentStudio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('Post Writer');

    // Post Writer State
    const [postTopic, setPostTopic] = useState('');
    const [platform, setPlatform] = useState<Platform>('Instagram');
    const [tone, setTone] = useState<Tone>('Exciting');
    const [format, setFormat] = useState<Format>('Single Post');

    // Video Script State
    const [videoTopic, setVideoTopic] = useState('');
    const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('TikTok');
    const [hookStyle, setHookStyle] = useState<HookStyle>('Educational');
    const [videoLength, setVideoLength] = useState<VideoLength>('30s');

    // Photo Studio State
    const [photoDesc, setPhotoDesc] = useState('');
    const [artStyle, setArtStyle] = useState<ArtStyle>('Realistic');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Square (1:1)');

    // Weekly Plan State
    const [planGoal, setPlanGoal] = useState<PrimaryGoal>('Brand Awareness');
    const [planFrequency, setPlanFrequency] = useState<PostFrequency>('5 times/week');

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        // Mock API call
        setTimeout(() => {
            setIsGenerating(false);
            alert(`${activeTab} generated successfully! (Mock)`);
        }, 2000);
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
                                            <option value="Instagram">Instagram</option><option value="Facebook">Facebook</option><option value="Twitter">Twitter</option><option value="LinkedIn">LinkedIn</option>
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
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-slate-700">Image Description</label>
                                    </div>
                                    <div className="relative">
                                        <textarea rows={4} className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                            placeholder="e.g. A high quality product shot of a leather bag on a wooden table with sunlight" value={photoDesc} onChange={(e) => setPhotoDesc(e.target.value)}
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
                            {TRENDS.map(trend => (
                                <div key={trend.id} className="bg-white rounded-xl p-4 border border-orange-100/50 shadow-sm">
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{trend.title}</h4>
                                    <p className="text-xs text-slate-500 mb-3">{trend.description}</p>
                                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 mb-3">
                                        <p className="text-[10px] text-orange-800 font-medium">Tip: {trend.tip}</p>
                                    </div>
                                    <button
                                        onClick={() => handleUseTrend(trend.title)}
                                        className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Use this Trend
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ContentStudio;
