import React, { useState, useEffect } from 'react';
import { AppView, BrandIdentity } from '../types';
import { 
  Sparkles, CheckCircle2, ChevronRight, Globe, MessageCircle, 
  FileText, Package, LayoutGrid, Zap, ShieldCheck, 
  Calculator, TrendingUp, Store, RefreshCw, Award, Lock, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

export type RoadmapCategory = 'ALL' | 'FOUNDATION' | 'COMMERCE' | 'DAILY_OPS' | 'SCALE';

export interface GrowthMilestone {
  id: string;
  category: 'FOUNDATION' | 'COMMERCE' | 'DAILY_OPS' | 'SCALE';
  title: string;
  tagline: string;
  description: string;
  toolName: string;
  targetView: AppView;
  isCompleted: boolean;
  platform: 'CAC & Legal' | 'Branding' | 'Catalog' | 'Cashflow' | 'Finance' | 'Growth';
  points: number;
  estMinutes: string;
  autoDetectKey?: 'hasCac' | 'hasBrand' | 'hasProducts' | 'hasSales' | 'hasContent';
}

interface DigitalRoadmapProps {
  onNavigate: (view: AppView) => void;
}

const CATEGORY_TABS: { id: RoadmapCategory; label: string; icon: string }[] = [
  { id: 'ALL', label: 'All Milestones', icon: '🗺️' },
  { id: 'FOUNDATION', label: 'Legal & Branding', icon: '🏛️' },
  { id: 'COMMERCE', label: 'Storefront & Sales', icon: '🛍️' },
  { id: 'DAILY_OPS', label: 'Daily Till & Cashbook', icon: '📊' },
  { id: 'SCALE', label: 'Funding & Expansion', icon: '🚀' },
];

const INITIAL_MILESTONES: GrowthMilestone[] = [
  { 
    id: 'cac_tin', 
    category: 'FOUNDATION',
    title: 'CAC Registration & FIRS Tax ID (TIN)', 
    tagline: 'Formalize entity & unlock corporate credibility',
    description: 'Verify your CAC BN/RC registration number live or submit an assisted fast-track application to qualify for corporate bank accounts and bank pre-underwriting.', 
    toolName: 'Compliance Hub', 
    targetView: AppView.COMPLIANCE,
    platform: 'CAC & Legal',
    points: 50,
    estMinutes: '7 mins',
    autoDetectKey: 'hasCac',
    isCompleted: false 
  },
  { 
    id: 'brand_identity', 
    category: 'FOUNDATION',
    title: 'AI Brand Identity & Synchronized Logo', 
    tagline: 'Uniform branding across catalog and invoices',
    description: 'Generate high-definition brand assets, define your brand color palette, and set an avatar that auto-syncs across your storefront, receipts, and order slips.', 
    toolName: 'Brand Builder', 
    targetView: AppView.BRAND_BUILDER,
    platform: 'Branding',
    points: 30,
    estMinutes: '5 mins',
    autoDetectKey: 'hasBrand',
    isCompleted: false 
  },
  { 
    id: 'paystack_payouts', 
    category: 'COMMERCE',
    title: 'Automated Paystack Bank Payouts', 
    tagline: 'Zero-fee direct bank settlements',
    description: 'Resolve and link your Nigerian commercial/microfinance NUBAN account in Settings & Wallet to receive direct customer payments with zero platform deduction.', 
    toolName: 'Settings & Wallet', 
    targetView: AppView.SETTINGS,
    platform: 'Finance',
    points: 40,
    estMinutes: '4 mins',
    isCompleted: false 
  },
  { 
    id: 'product_catalog', 
    category: 'COMMERCE',
    title: 'Commercial Web Storefront & Inventory', 
    tagline: '24/7 online shop with WhatsApp checkout',
    description: 'List your products with verified prices and specifications. Publish your public link (smartbizcoach.com.ng/store/:slug) so customers can order directly.', 
    toolName: 'Inventory & Store', 
    targetView: AppView.PRODUCT_MANAGER,
    platform: 'Catalog',
    points: 45,
    estMinutes: '6 mins',
    autoDetectKey: 'hasProducts',
    isCompleted: false 
  },
  { 
    id: 'daily_cashbook', 
    category: 'DAILY_OPS',
    title: '5-Second Day-Book & Till Audit Seal', 
    tagline: 'Reconcile morning float against evening cash',
    description: 'Track cash-in-till vs bank transfers, log fuel/petty cash expenses, calculate operations audit scores, and formally sign off today\'s books to eliminate discrepancies.', 
    toolName: 'Daily Cashbook', 
    targetView: AppView.DAILY_CASHBOOK,
    platform: 'Cashflow',
    points: 35,
    estMinutes: '5 mins',
    autoDetectKey: 'hasSales',
    isCompleted: false 
  },
  { 
    id: 'invoice_debtor', 
    category: 'DAILY_OPS',
    title: 'Audit-Ready Invoicing & Debtor Tracking', 
    tagline: 'Recover money faster with 1-tap reminders',
    description: 'Generate branded PDF receipts, record outstanding balances in Gbege Book, and send polite automated WhatsApp reminders with payment details.', 
    toolName: 'Invoice Generator', 
    targetView: AppView.INVOICE_GENERATOR,
    platform: 'Cashflow',
    points: 30,
    estMinutes: '5 mins',
    isCompleted: false 
  },
  { 
    id: 'marketing_copy', 
    category: 'SCALE',
    title: 'AI Viral Reel Scripts & Social Studio', 
    tagline: 'High-converting social campaigns',
    description: 'Generate high-converting copy and video scripts tailored for WhatsApp Status, TikTok, and Instagram using Nigerian buyer psychology hooks.', 
    toolName: 'Content Studio', 
    targetView: AppView.CONTENT_GENERATOR,
    platform: 'Growth',
    points: 25,
    estMinutes: '5 mins',
    autoDetectKey: 'hasContent',
    isCompleted: false 
  },
  { 
    id: 'business_plan_grants', 
    category: 'SCALE',
    title: 'Bankable Business Plan & TEF/BoI Matcher', 
    tagline: '3-year financials for investor and grant panels',
    description: 'Draft bankable 3-year P&L, balance sheets, and SWOT models to match active grant programs (TEF, BoI, iDICE, LSETF) with a pre-underwriting audit check.', 
    toolName: 'Business Plan Gen', 
    targetView: AppView.BUSINESS_PLAN,
    platform: 'Finance',
    points: 50,
    estMinutes: '8 mins',
    isCompleted: false 
  }
];

const DigitalRoadmap: React.FC<DigitalRoadmapProps> = ({ onNavigate }) => {
  const [milestones, setMilestones] = useState<GrowthMilestone[]>(INITIAL_MILESTONES);
  const [selectedCategory, setSelectedCategory] = useState<RoadmapCategory>('ALL');
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [platformStats, setPlatformStats] = useState<{
    grantReadinessScore?: number;
    bizCredits?: number;
    hasCac?: boolean;
    hasBrand?: boolean;
    hasProducts?: boolean;
    hasSales?: boolean;
    hasContent?: boolean;
  } | null>(null);

  const fetchLiveProgress = async () => {
    try {
      const [brandRes, statsRes] = await Promise.allSettled([
        api.get('/api/brand/current/'),
        api.get('/api/users/stats/')
      ]);

      if (brandRes.status === 'fulfilled') {
        setBrand(brandRes.value.data);
      }
      
      let liveStats = null;
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        liveStats = statsRes.value.data;
        setPlatformStats(liveStats);
      }

      // Check saved manual overrides from local storage
      const saved = localStorage.getItem('sb_onboarding_roadmap_v2');
      let currentList = INITIAL_MILESTONES;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentList = INITIAL_MILESTONES.map(item => {
              const found = parsed.find((p: any) => p.id === item.id);
              return found ? { ...item, isCompleted: found.isCompleted } : item;
            });
          }
        } catch (e) {
          console.warn("Could not parse saved roadmap", e);
        }
      }

      // If backend reports live verified states, auto-sync
      if (liveStats) {
        currentList = currentList.map(item => {
          if (item.autoDetectKey && liveStats[item.autoDetectKey]) {
            return { ...item, isCompleted: true };
          }
          return item;
        });
      }

      setMilestones(currentList);
    } catch (err) {
      console.warn("Roadmap data load fallback:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveProgress();
  }, []);

  useEffect(() => {
    if (milestones.length > 0) {
      localStorage.setItem('sb_onboarding_roadmap_v2', JSON.stringify(milestones));
    }
  }, [milestones]);

  const toggleMilestone = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMilestones(prev => 
      prev.map(m => m.id === id ? { ...m, isCompleted: !m.isCompleted } : m)
    );
    toast.success('Milestone progress updated!');
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    await fetchLiveProgress();
    toast.success('Live milestones synced with platform data!');
  };

  const completedCount = milestones.filter(m => m.isCompleted).length;
  const totalCount = milestones.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const earnedPoints = milestones.filter(m => m.isCompleted).reduce((sum, m) => sum + m.points, 0);
  const totalPoints = milestones.reduce((sum, m) => sum + m.points, 0);

  const filteredMilestones = milestones.filter(m => {
    if (selectedCategory === 'ALL') return true;
    return m.category === selectedCategory;
  });

  const getPlatformBadge = (platform: GrowthMilestone['platform']) => {
    switch (platform) {
      case 'CAC & Legal': 
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> };
      case 'Branding': 
        return { bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" /> };
      case 'Catalog': 
        return { bg: 'bg-teal-50 text-teal-800 border-teal-200', icon: <Store className="w-3.5 h-3.5 text-teal-600" /> };
      case 'Cashflow': 
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: <Calculator className="w-3.5 h-3.5 text-amber-600" /> };
      case 'Finance': 
        return { bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: <FileText className="w-3.5 h-3.5 text-blue-600" /> };
      case 'Growth': 
        return { bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: <TrendingUp className="w-3.5 h-3.5 text-rose-600" /> };
      default: 
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: <LayoutGrid className="w-3.5 h-3.5 text-slate-500" /> };
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-16 text-center">
        <Sparkles className="w-12 h-12 text-emerald-600 animate-pulse mx-auto mb-4" />
        <p className="text-slate-600 font-bold text-sm">Evaluating verified platform milestones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in pb-20 space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Growth Roadmap & Execution
            </h2>
            <span className="text-2xl">🗺️</span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Systematic step-by-step pathway to legally formalize your enterprise, establish automated revenue channels, and satisfy commercial grant pre-underwriting standards.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Sync with live database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>

          <button 
            onClick={() => {
              if (confirm('Reset milestones to default? Your platform database will not be affected.')) {
                setMilestones(INITIAL_MILESTONES);
                localStorage.removeItem('sb_onboarding_roadmap_v2');
                toast.success('Milestones reset!');
              }
            }}
            className="px-3 py-2.5 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-xl bg-white hover:bg-rose-50 transition-colors text-xs font-bold cursor-pointer"
            title="Reset Milestones"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Hero Progress Metrics Deck */}
      <div className="bg-slate-950 rounded-[32px] p-6 sm:p-8 text-white relative overflow-hidden border border-emerald-950/40 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/20 rounded-full mix-blend-screen filter blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-1">
              <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block">
                Formalization & Growth Readiness
              </span>
              <h3 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white mt-2">
                {progressPercent}%
              </h3>
              <p className="text-slate-400 text-xs font-medium">
                {completedCount} of {totalCount} Essential Enterprise Milestones Mastered
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Growth Score</span>
                <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">{earnedPoints}/{totalPoints}</span>
                <span className="text-[9px] text-slate-500 font-medium">Points</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Grant Ready</span>
                <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
                  {platformStats?.grantReadinessScore ? `${platformStats.grantReadinessScore}%` : `${Math.min(20 + progressPercent * 0.8, 100).toFixed(0)}%`}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">Underwriting</span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center flex sm:flex-col items-center justify-between sm:justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Status Tier</span>
                <span className="text-xs font-black text-white px-2 py-0.5 rounded-full bg-emerald-600/30 border border-emerald-500/30 mt-0.5">
                  {progressPercent === 100 ? '👑 Bankable' : progressPercent >= 50 ? '⚡ Operational' : '🌱 Initializing'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Track */}
          <div className="space-y-2">
            <div className="w-full bg-slate-900 rounded-full h-3.5 border border-white/10 overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span>Stage 1: Registration</span>
              <span>Stage 2: Storefront & Till</span>
              <span>Stage 3: Grant & Scale</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex border-b border-slate-200/80 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1 flex-nowrap shrink-0">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap cursor-pointer border-0 bg-transparent flex items-center gap-1.5 shrink-0 ${
              selectedCategory === tab.id 
                ? 'border-b-2 border-emerald-600 text-emerald-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Milestones List Deck */}
      <div className="space-y-4">
        {filteredMilestones.map((milestone, index) => {
          const badge = getPlatformBadge(milestone.platform);
          return (
            <motion.div 
              key={milestone.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onNavigate(milestone.targetView)}
              className={`
                relative p-5 sm:p-6 rounded-[28px] border-2 transition-all cursor-pointer group bg-white shadow-sm
                ${milestone.isCompleted 
                  ? 'border-emerald-200/80 bg-emerald-50/20' 
                  : 'border-slate-200/90 hover:border-emerald-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-start gap-4 sm:gap-6">
                
                {/* Complete checkbox button */}
                <div 
                  onClick={(e) => toggleMilestone(milestone.id, e)}
                  className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-all cursor-pointer border
                    ${milestone.isCompleted 
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-emerald-100 hover:text-emerald-700'
                    }
                  `}
                  title={milestone.isCompleted ? "Mark as in-progress" : "Mark as completed"}
                >
                  {milestone.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : (index + 1)}
                </div>
                
                {/* Milestone Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 ${badge.bg}`}>
                        {badge.icon}
                        <span>{milestone.platform}</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        ⏱️ {milestone.estMinutes}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        +{milestone.points} pts
                      </span>
                    </div>
                  </div>

                  <h4 className={`text-base sm:text-lg font-black leading-snug ${milestone.isCompleted ? 'text-emerald-950 opacity-70 line-through decoration-emerald-500/60' : 'text-slate-900 group-hover:text-emerald-600 transition-colors'}`}>
                    {milestone.title}
                  </h4>
                  <p className="text-xs font-bold text-emerald-700/80 mt-0.5">
                    {milestone.tagline}
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                    {milestone.description}
                  </p>

                  {/* Launch Bar */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-black group-hover:text-emerald-700">
                      <span>Launch {milestone.toolName}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>

                    {milestone.isCompleted && (
                      <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed Milestone</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion Congratulatory Card */}
      <AnimatePresence>
        {progressPercent === 100 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 sm:p-10 bg-slate-950 border border-emerald-900/50 rounded-[36px] text-center text-white shadow-2xl relative overflow-hidden space-y-4"
          >
            <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-emerald-500 to-teal-500 pointer-events-none" />
            <div className="text-6xl mb-2">👑</div>
            <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              Enterprise Roadmap 100% Unlocked!
            </h3>
            <p className="text-slate-300 font-medium text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Your business foundation is complete. You have established verifiable legal records, a 24/7 web storefront, an audited daily cash till, and structured investor materials.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <button 
                onClick={() => onNavigate(AppView.STOREFRONT)}
                className="bg-emerald-600 text-white hover:bg-emerald-500 px-6 py-3.5 rounded-2xl font-black text-xs transition-all shadow-xl shadow-emerald-600/20 inline-flex items-center gap-2 cursor-pointer border-0"
              >
                <Store className="w-4 h-4" />
                <span>Inspect Public Storefront</span>
              </button>
              <button 
                onClick={() => onNavigate(AppView.GRANT_MATCHER)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3.5 rounded-2xl font-black text-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Explore TEF & BoI Grants</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mentorship Support Footer */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-[28px] border border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 pointer-events-none">🗺️</div>
        <div className="space-y-1 relative z-10 text-center sm:text-left">
          <h3 className="font-extrabold text-base flex items-center justify-center sm:justify-start gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span>Need personalized roadmap advice or CAC filing guidance?</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-xl">
            Get in touch with platform creator & accredited agent Meshach Zachariah for tailored business roadmap strategy and grant review.
          </p>
        </div>
        <button 
          onClick={() => window.open('https://wa.me/234906456107?text=Hello%20Meshach,%20I%20am%20reviewing%20my%20Growth%20Roadmap%20on%20SmartBiz%20Coach%20and%20need%20advisory%20guidance.', '_blank')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 whitespace-nowrap active:scale-95 border-0 cursor-pointer relative z-10 shrink-0"
        >
          <span>Consult via WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};

export default DigitalRoadmap;