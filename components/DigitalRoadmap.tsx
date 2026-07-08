import React, { useState, useEffect } from 'react';
import { AppView, BrandIdentity } from '../types';
import { Sparkles, CheckCircle2, ChevronRight, Globe, MessageCircle, FileText, Package, LayoutGrid, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  tool: string;
  targetView: AppView;
  isCompleted: boolean;
  platform: string;
}

interface DigitalRoadmapProps {
  onNavigate: (view: AppView) => void;
}

const DigitalRoadmap: React.FC<DigitalRoadmapProps> = ({ onNavigate }) => {
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getInitialSteps = (): RoadmapStep[] => {
    return [
      { 
        id: '1', 
        title: 'Define Your Brand Voice', 
        description: 'Use the Brand Builder to establish your target niche, generate taglines, and set custom colors.', 
        tool: 'Brand Builder', 
        targetView: AppView.BRAND_BUILDER,
        platform: 'Branding',
        isCompleted: false 
      },
      { 
        id: '2', 
        title: 'Add Products to Inventory', 
        description: 'Upload your items with pricing and details to automatically build your web catalog.', 
        tool: 'Inventory Manager', 
        targetView: AppView.PRODUCT_MANAGER,
        platform: 'Inventory',
        isCompleted: false 
      },
      { 
        id: '3', 
        title: 'Generate Marketing Copy', 
        description: 'Use AI Content Studio to draft high-converting WhatsApp status updates or Instagram copy.', 
        tool: 'Content Studio', 
        targetView: AppView.CONTENT_GENERATOR,
        platform: 'Marketing',
        isCompleted: false 
      },
      { 
        id: '4', 
        title: 'Draft Pitch & Business Plan', 
        description: 'Prepare for grants, loans, and partnership opportunities with a structured business plan.', 
        tool: 'Business Plan Gen', 
        targetView: AppView.BUSINESS_PLAN,
        platform: 'Finance',
        isCompleted: false 
      },
      { 
        id: '5', 
        title: 'Preview & Share Web Storefront', 
        description: 'Check out your customer-facing digital storefront link and share it on social media.', 
        tool: 'Public Store', 
        targetView: AppView.STOREFRONT,
        platform: 'Web Catalog',
        isCompleted: false 
      },
    ];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const brandRes = await api.get('/api/brand/current/');
        setBrand(brandRes.data);
      } catch (err) {
        // Fallback silently if not setup
      }

      const saved = localStorage.getItem('sb_onboarding_roadmap');
      if (saved) {
        setSteps(JSON.parse(saved));
      } else {
        setSteps(getInitialSteps());
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (steps.length > 0) {
      localStorage.setItem('sb_onboarding_roadmap', JSON.stringify(steps));
    }
  }, [steps]);

  const toggleStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop navigation when checking off step
    setSteps(steps.map(step => 
      step.id === id ? { ...step, isCompleted: !step.isCompleted } : step
    ));
    toast.success('Progress updated!');
  };

  const progress = Math.round((steps.filter(s => s.isCompleted).length / steps.length) * 100);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Branding': return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'Inventory': return <Package className="w-4 h-4 text-teal-500" />;
      case 'Marketing': return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'Finance': return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'Web Catalog': return <Globe className="w-4 h-4 text-emerald-700" />;
      default: return <LayoutGrid className="w-4 h-4 text-slate-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <Sparkles className="w-12 h-12 text-green-600 animate-pulse mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Personalizing your roadmap...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-20">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Onboarding & Growth Roadmap</h2>
          <p className="text-slate-500 text-sm mt-1">
            Complete these 5 platform milestones to launch your store and apply for growth programs.
          </p>
        </div>
        <button 
          onClick={() => {
            if (confirm('Reset milestones to default?')) {
              setSteps(getInitialSteps());
              toast.success('Roadmap reset!');
            }
          }}
          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
          title="Reset Roadmap"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white mb-10 shadow-2xl relative overflow-hidden group border border-emerald-950/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-emerald-300 font-bold text-[10px] uppercase tracking-widest mb-1">Your Milestones</p>
              <h3 className="text-5xl font-black">{progress}%</h3>
            </div>
            <div className="text-5xl">🏆</div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-emerald-500 h-3 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            ></motion.div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <motion.div 
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNavigate(step.targetView)}
            className={`
              relative p-6 rounded-[28px] border-2 transition-all cursor-pointer group
              ${step.isCompleted 
                ? 'bg-emerald-50/30 border-emerald-100/60 shadow-none' 
                : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-550/5'
              }
            `}
          >
            <div className="flex items-start gap-6">
              <div 
                onClick={(e) => toggleStep(step.id, e)}
                className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 transition-all cursor-pointer
                  ${step.isCompleted 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                    : 'bg-slate-50 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                  }
                `}
                title="Mark as completed"
              >
                {step.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : index + 1}
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`text-lg font-bold ${step.isCompleted ? 'text-emerald-900 opacity-60' : 'text-slate-800'}`}>
                    {step.title}
                  </h4>
                  <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    {getPlatformIcon(step.platform)}
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                       {step.platform}
                    </span>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed ${step.isCompleted ? 'text-emerald-750 opacity-60' : 'text-slate-500 font-medium'}`}>
                  {step.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Launch Tool</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 self-center transition-transform ${step.isCompleted ? 'text-emerald-300' : 'text-slate-350 group-hover:translate-x-1 group-hover:text-emerald-600'}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {progress === 100 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 p-10 bg-slate-950 border border-emerald-900/30 rounded-[40px] text-center text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-emerald-500 to-teal-500 pointer-events-none"></div>
            <div className="text-6xl mb-6">👑</div>
            <h3 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Milestones Unlocked!</h3>
            <p className="text-slate-300 font-medium opacity-80 text-sm max-w-md mx-auto">
              Your business is now fully initialized on the platform. Share your catalog link and start receiving WhatsApp order notifications.
            </p>
            <button 
                onClick={() => onNavigate(AppView.STOREFRONT)}
                className="mt-8 bg-green-600 text-white hover:bg-green-500 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-green-600/10 inline-flex items-center gap-2"
            >
                <Zap className="w-4 h-4" />
                <span>Visit My Store</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DigitalRoadmap;