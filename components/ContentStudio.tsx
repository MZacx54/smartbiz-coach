import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Types
type TabType = 'Post Writer' | 'Video Script' | 'Photo Studio' | 'Weekly Plan';
type Platform = 'Instagram' | 'Facebook' | 'Twitter' | 'LinkedIn';
type Tone = 'Exciting' | 'Professional' | 'Funny' | 'Informative';
type Format = 'Single Post' | 'Carousel' | 'Story' | 'Reel';

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
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState<Platform>('Instagram');
    const [tone, setTone] = useState<Tone>('Exciting');
    const [format, setFormat] = useState<Format>('Single Post');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        // Mock API call
        setTimeout(() => {
            setIsGenerating(false);
            alert('Content generated successfully! (Mock)');
        }, 2000);
    };

    const handleUseTrend = (trendTitle: string) => {
        setTopic(`Incorporate the trend: ${trendTitle}. `);
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
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        {activeTab === 'Post Writer' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >

                                {/* Topic Input */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-slate-700">Topic</label>
                                        <button
                                            type="button"
                                            className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                                            onClick={() => setTopic("Write a compelling story about how my product solves a common Nigerian problem.")}
                                        >
                                            <span>✨</span>
                                            <span>Get Magic Ideas</span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            rows={4}
                                            className="w-full rounded-xl border border-slate-300 p-4 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-white text-sm"
                                            placeholder="e.g. 50% discount on all wigs this weekend"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                        ></textarea>
                                        <div className="absolute bottom-3 right-3 text-xl opacity-50">
                                            🎙️
                                        </div>
                                    </div>
                                </div>

                                {/* Grid Selectors */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Platform */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Platform</label>
                                        <select
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value as Platform)}
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none"
                                        >
                                            <option value="Instagram">Instagram</option>
                                            <option value="Facebook">Facebook</option>
                                            <option value="Twitter">Twitter</option>
                                            <option value="LinkedIn">LinkedIn</option>
                                        </select>
                                    </div>

                                    {/* Tone */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Tone</label>
                                        <select
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value as Tone)}
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none"
                                        >
                                            <option value="Exciting">🤩 Exciting</option>
                                            <option value="Professional">💼 Professional</option>
                                            <option value="Funny">😂 Funny</option>
                                            <option value="Informative">🧠 Informative</option>
                                        </select>
                                    </div>

                                    {/* Format */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Format</label>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value as Format)}
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none"
                                        >
                                            <option value="Single Post">🖼️ Single Post</option>
                                            <option value="Carousel">📚 Carousel</option>
                                            <option value="Story">📱 Story</option>
                                            <option value="Reel">🎬 Reel</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !topic.trim()}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2 text-base mt-4"
                                >
                                    {isGenerating ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>Generate Post</span>
                                            <span>✨</span>
                                        </>
                                    )}
                                </button>

                            </motion.div>
                        )}

                        {activeTab !== 'Post Writer' && (
                            <div className="py-20 text-center text-slate-500">
                                <div className="text-4xl mb-4">🚧</div>
                                <h3 className="text-lg font-bold text-slate-700 mb-2">{activeTab}</h3>
                                <p className="text-sm">This module is currently in development.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-full lg:w-72 flex-shrink-0 space-y-6">

                    {/* Wallet Balance */}
                    <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        {/* Decorative background circle */}
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
