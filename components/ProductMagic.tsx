import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Wand2, Sparkles, Camera, ImagePlus, Download, RefreshCw, Layers, Eye, Palette, Zap } from 'lucide-react';
import api from '../services/api';

type EnhancementMode = 'ANALYZE' | 'BG_REMOVE' | 'SOCIAL_READY';

interface AnalysisResult {
    suggestions: string[];
    quality_score: number;
    social_media_tips: string[];
    color_palette: string[];
    composition_notes: string;
    enhanced_description: string;
}

const ProductMagic: React.FC = () => {
    // Upload state
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<EnhancementMode>('ANALYZE');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Before/After slider state
    const [sliderPosition, setSliderPosition] = useState(50);
    const sliderRef = useRef<HTMLDivElement>(null);
    const isDraggingSlider = useRef(false);

    // ─── Drag & Drop Handlers ───
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files[0]) processFile(files[0]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPEG, PNG, WebP).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Image too large. Maximum size is 10MB.');
            return;
        }
        setOriginalFile(file);
        setAnalysis(null);
        setError(null);
        const reader = new FileReader();
        reader.onloadend = () => setOriginalImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    // ─── AI Analysis ───
    const handleAnalyze = async () => {
        if (!originalImage || !originalFile) return;
        setIsProcessing(true);
        setError(null);
        setAnalysis(null);

        try {
            const base64 = originalImage.split(',')[1];
            const response = await api.post('content/analyze-product/', {
                image_base64: base64,
                mime_type: originalFile.type,
                mode: mode,
            });
            setAnalysis(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to analyze image.');
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── Before/After Slider Logic ───
    const handleSliderMouseDown = () => { isDraggingSlider.current = true; };
    const handleSliderMouseUp = () => { isDraggingSlider.current = false; };
    const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDraggingSlider.current || !sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    };

    const handleSliderTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    };

    const handleReset = () => {
        setOriginalImage(null);
        setOriginalFile(null);
        setAnalysis(null);
        setError(null);
        setSliderPosition(50);
    };

    // ─── Enhancement modes config ───
    const modes = [
        { id: 'ANALYZE' as EnhancementMode, label: 'AI Analyze', icon: <Eye className="w-4 h-4" />, description: 'Get AI suggestions to make your product photo sell better' },
        { id: 'BG_REMOVE' as EnhancementMode, label: 'Background Tips', icon: <Layers className="w-4 h-4" />, description: 'Get recommendations for clean, professional backgrounds' },
        { id: 'SOCIAL_READY' as EnhancementMode, label: 'Social Ready', icon: <Zap className="w-4 h-4" />, description: 'Get optimized captions, hashtags & posting tips for your product' },
    ];

    return (
        <div className="max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <h1 className="text-3xl font-bold font-heading text-slate-800">Product Magic</h1>
                        <Wand2 className="w-7 h-7 text-indigo-500" />
                    </div>
                    <p className="text-sm text-slate-500">Transform your phone photos into scroll-stopping product shots.</p>
                </div>
                {originalImage && (
                    <button onClick={handleReset} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-colors">
                        <RefreshCw className="w-4 h-4" /> Start Over
                    </button>
                )}
            </div>

            {/* Upload Zone */}
            {!originalImage ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                >
                    <div
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-3xl p-12 md:p-16 text-center cursor-pointer transition-all duration-300 group
                            ${isDragging
                                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01] shadow-xl shadow-indigo-500/10'
                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50'
                            }`}
                    >
                        {/* Animated Background Orbs */}
                        <div className="absolute top-4 right-4 w-32 h-32 bg-indigo-100 rounded-full mix-blend-multiply filter blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
                        <div className="absolute bottom-4 left-4 w-24 h-24 bg-purple-100 rounded-full mix-blend-multiply filter blur-2xl opacity-20 group-hover:opacity-50 transition-opacity duration-500" />

                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                                ${isDragging ? 'bg-indigo-500 text-white scale-110 shadow-lg' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 group-hover:scale-105'}`}
                            >
                                {isDragging ? <Sparkles className="w-8 h-8 animate-pulse" /> : <ImagePlus className="w-8 h-8" />}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-800 mb-1">
                                    {isDragging ? 'Drop your product photo here!' : 'Upload Your Product Photo'}
                                </p>
                                <p className="text-sm text-slate-400">
                                    Drag & drop or click to browse. JPEG, PNG, WebP up to 10MB.
                                </p>
                            </div>
                            <div className="flex items-center gap-6 mt-2">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Camera className="w-3.5 h-3.5" /> Phone shots welcome
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Wand2 className="w-3.5 h-3.5" /> AI does the magic
                                </div>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Mode Selector */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Choose Enhancement Mode</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {modes.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all group ${mode === m.id
                                        ? 'border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-500/5'
                                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className={`p-1.5 rounded-lg ${mode === m.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'} transition-colors`}>
                                            {m.icon}
                                        </div>
                                        <span className={`text-sm font-bold ${mode === m.id ? 'text-indigo-700' : 'text-slate-700'}`}>{m.label}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{m.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image Preview + Before/After */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Original Image */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Your Product Photo</span>
                                </div>
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{originalFile?.name}</span>
                            </div>
                            <div className="aspect-square relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3QgZmlsbD0iI2Y5ZjlmOSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgZmlsbD0iI2YwZjBmMCIgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IGZpbGw9IiNmMGYwZjAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')]">
                                <img src={originalImage} alt="Product" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        {/* Analysis Result / CTA */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">AI Enhancement</span>
                            </div>

                            {!analysis && !isProcessing ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-200 flex items-center justify-center">
                                        <Wand2 className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-700 mb-1">Ready to enhance your product</p>
                                        <p className="text-xs text-slate-400">Our AI will analyze your photo and give you actionable tips</p>
                                    </div>
                                    <button
                                        onClick={handleAnalyze}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Analyze with AI
                                    </button>
                                </div>
                            ) : isProcessing ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full border-4 border-indigo-100 flex items-center justify-center">
                                            <Wand2 className="w-8 h-8 text-indigo-500 animate-pulse" />
                                        </div>
                                        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-700 mb-1">AI is analyzing your product...</p>
                                        <p className="text-xs text-slate-400">Checking lighting, composition, background & more</p>
                                    </div>
                                </div>
                            ) : analysis ? (
                                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                    {/* Quality Score */}
                                    <div className="flex items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-900 p-4 rounded-xl text-white">
                                        <div className="relative">
                                            <svg className="w-16 h-16 transform -rotate-90">
                                                <circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.1)" strokeWidth="5" fill="transparent" />
                                                <circle cx="32" cy="32" r="24" stroke="#818cf8" strokeWidth="5" fill="transparent"
                                                    strokeDasharray={2 * Math.PI * 24}
                                                    strokeDashoffset={2 * Math.PI * 24 * (1 - (analysis.quality_score || 70) / 100)}
                                                    strokeLinecap="round" className="transition-all duration-1000"
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{analysis.quality_score || 70}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Photo Quality Score</p>
                                            <p className="text-sm font-bold">{(analysis.quality_score || 70) >= 80 ? 'Excellent! Ready for social.' : (analysis.quality_score || 70) >= 60 ? 'Good. Some tweaks recommended.' : 'Needs improvement. See tips below.'}</p>
                                        </div>
                                    </div>

                                    {/* AI Suggestions */}
                                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Wand2 className="w-3 h-3" /> Enhancement Tips</p>
                                            <div className="space-y-2">
                                                {analysis.suggestions.map((tip, i) => (
                                                    <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                                        <p className="text-xs text-slate-700 leading-relaxed">{tip}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Social Media Tips */}
                                    {analysis.social_media_tips && analysis.social_media_tips.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Zap className="w-3 h-3" /> Social Media Tips</p>
                                            <div className="space-y-2">
                                                {analysis.social_media_tips.map((tip, i) => (
                                                    <div key={i} className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                                                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-slate-700 leading-relaxed">{tip}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Color Palette */}
                                    {analysis.color_palette && analysis.color_palette.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Palette className="w-3 h-3" /> Detected Color Palette</p>
                                            <div className="flex gap-2">
                                                {analysis.color_palette.map((color, i) => (
                                                    <div key={i} className="flex flex-col items-center gap-1">
                                                        <div className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: color }} />
                                                        <span className="text-[9px] text-slate-400 font-mono">{color}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Enhanced Description */}
                                    {analysis.enhanced_description && (
                                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">📝 AI-Generated Product Description</p>
                                            <p className="text-sm text-slate-700 italic leading-relaxed">"{analysis.enhanced_description}"</p>
                                            <button 
                                                onClick={() => navigator.clipboard.writeText(analysis.enhanced_description)}
                                                className="mt-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
                                            >
                                                📋 Copy to clipboard
                                            </button>
                                        </div>
                                    )}

                                    {/* Composition Notes */}
                                    {analysis.composition_notes && (
                                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Composition Notes</p>
                                            <p className="text-xs text-slate-600 leading-relaxed">{analysis.composition_notes}</p>
                                        </div>
                                    )}

                                    {/* Re-analyze Button */}
                                    <button
                                        onClick={handleAnalyze}
                                        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Re-analyze with different mode
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Error Display */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium"
                            >
                                ⚠️ {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Feature Cards */}
            {!originalImage && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    {[
                        { icon: <Eye className="w-6 h-6" />, title: 'AI Photo Analysis', desc: 'Get a quality score and pro tips to improve your product shots', color: 'from-indigo-500 to-blue-500' },
                        { icon: <Palette className="w-6 h-6" />, title: 'Color & Composition', desc: 'Detect brand colors and get composition advice for your photos', color: 'from-purple-500 to-pink-500' },
                        { icon: <Sparkles className="w-6 h-6" />, title: 'Social-Ready Captions', desc: 'Auto-generate product descriptions, captions & hashtags', color: 'from-emerald-500 to-teal-500' },
                    ].map((feature, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                {feature.icon}
                            </div>
                            <h3 className="font-bold text-slate-800 mb-1">{feature.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductMagic;
