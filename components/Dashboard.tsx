import React, { useEffect, useState } from 'react';
import { 
  Sparkles, Zap, TrendingUp, AlertCircle, Package, Receipt, 
  BrainCircuit, Activity, Wand2, MessageCircle, Globe, Award, 
  ShieldAlert, CheckSquare, RefreshCw, BarChart2, ChevronRight,
  BookOpen, PlusCircle
} from 'lucide-react';
import { AppView, ActionCard, UserStats, DailyMotivation, SeasonalAlert, Transaction, Debtor, InventoryItem } from '../types';
import { generateDailyMotivation, generateSeasonalTips, getTrendingTopics, getBusinessHealthScore } from '../services/geminiService';
import api from '../services/api';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

interface DashboardProps {
  userStats: UserStats;
  actions: ActionCard[];
  onNavigate: (view: AppView) => void;
  credits: number;
  onUpdateCredits: (credits: number) => void;
}

const CircularProgress = ({ percentage, color }: { percentage: number; color: string }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-14 h-14">
        <circle
          cx="28"
          cy="28"
          r={radius}
          stroke="#E2E8F0"
          strokeWidth="4"
          fill="transparent"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[10px] font-black" style={{ color }}>{percentage}%</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ userStats, actions, onNavigate, credits, onUpdateCredits }) => {
  const isTractionMode = localStorage.getItem('sb_idice_traction_mode') === 'true';
  const [motivation, setMotivation] = useState<DailyMotivation | null>(null);
  const [seasonalAlert, setSeasonalAlert] = useState<SeasonalAlert | null>(null);

  // Real-time Data States
  const [totalDebt, setTotalDebt] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [ecosystemStats, setEcosystemStats] = useState<any>(null);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);

  const [savedBrand, setSavedBrand] = useState<any>(() => {
    const saved = localStorage.getItem('sb_brand');
    return saved ? JSON.parse(saved) : null;
  });

  // Daily action plan checklist state
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  // Business Health Score States
  const [healthScore, setHealthScore] = useState<any>(() => {
    const saved = localStorage.getItem('sb_health_score_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.score === 'number') {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [isCalculatingHealth, setIsCalculatingHealth] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const isTractionMode = localStorage.getItem('sb_idice_traction_mode') === 'true';
      if (isTractionMode) {
        setEcosystemStats({
          ecosystem_value: 8450000,
          total_leads: 342,
          won_leads: 268,
          conversion_rate: 78,
          service_count: 12
        });
        setComplianceStatus({
          cac_status: 'REGISTERED',
          cac_number: 'RC-1849204',
          tin_number: 'TIN-9284102-001',
          has_corporate_account: true,
          has_tin: true,
          tax_compliance: 'COMPLIANT'
        });
        setTotalDebt(45200);
        setStockValue(8450000);
        setRecentTransactions([
          { id: 'tx-1', amount: 350000, description: 'Direct Store Order (Paid via Paystack)', status: 'SUCCESS', provider: 'PAYSTACK', type: 'PURCHASE', created_at: new Date(Date.now() - 3600000 * 4).toISOString() } as any,
          { id: 'tx-2', amount: 120000, description: 'Wholesale Invoice INV-4920', status: 'SUCCESS', provider: 'PAYSTACK', type: 'PURCHASE', created_at: new Date(Date.now() - 3600000 * 24).toISOString() } as any,
          { id: 'tx-3', amount: 450000, description: 'Logistics Partnership Escrow Deposit', status: 'SUCCESS', provider: 'PAYSTACK', type: 'PURCHASE', created_at: new Date(Date.now() - 3600000 * 48).toISOString() } as any,
        ]);
        
        const saved = localStorage.getItem('sb_health_score_data');
        let hasValidSaved = false;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.score === 'number') {
              hasValidSaved = true;
            }
          } catch(e) {}
        }
        if (!hasValidSaved) {
          const mockScore = {
            score: 88,
            metrics: { financials: 92, brand: 85, compliance: 90, operations: 85 },
            recommendations: [
              { title: "Consolidate debt list", impact: "Improves cash liquidity by 15%", tool: "Gbege Book Reminders", priority: "HIGH" }
            ],
            strengths: ["Highly active customer invoice flow", "Compliant with CAC regulations", "Solid gross profit margins"],
            weaknesses: ["Shortage of low stock alert items", "3 outstanding unresolved customer invoices"]
          };
          setHealthScore(mockScore);
          localStorage.setItem('sb_health_score_data', JSON.stringify(mockScore));
        }
      } else {
        try {
          const savedDebtors: Debtor[] = JSON.parse(localStorage.getItem('sb_debtors') || '[]');
          const unpaid = savedDebtors.filter(d => d.status !== 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
          setTotalDebt(unpaid);

          const savedInventory: InventoryItem[] = JSON.parse(localStorage.getItem('sb_inventory') || '[]');
          const stockVal = savedInventory.reduce((acc, curr) => acc + (Number(curr.price || 0) * (curr.quantity || 0)), 0);
          setStockValue(stockVal);

          const savedTx: Transaction[] = JSON.parse(localStorage.getItem('sb_transactions') || '[]');
          setRecentTransactions(savedTx.slice(0, 3));
        } catch (e) {
          console.error("Error loading dashboard data", e);
        }
      }

      const promises: Promise<any>[] = [
        generateDailyMotivation("Entrepreneur")
          .then(m => setMotivation(m))
          .catch(e => console.error("Failed to load motivation", e)),

        generateSeasonalTips()
          .then(s => setSeasonalAlert(s))
          .catch(e => console.error("Failed to load seasonal tips", e)),

        getTrendingTopics()
          .then(trends => {
            if (trends && trends.length > 0) {
              setTrendingTopics(trends);
            } else {
              throw new Error("Empty trends array");
            }
          })
          .catch(e => {
            console.error("Failed to load trends, using fallbacks", e);
            setTrendingTopics([
              { id: "t1", title: "Fuel Prices & transport hacks", category: "Economy", volume: "140K Posts" },
              { id: "t2", title: "New Nollywood blockbusters", category: "Entertainment", volume: "95K TikToks" },
              { id: "t3", title: "Naira Exchange Adjustments", category: "Finance", volume: "85K Posts" }
            ]);
          })
      ];

      if (!isTractionMode) {
        promises.push(
          api.get('/api/marketplace/analytics/')
            .then(r => setEcosystemStats(r.data))
            .catch(e => console.error("Failed to load ecosystem analytics", e))
        );
        promises.push(
          api.get('/api/users/compliance/')
            .then(r => setComplianceStatus(r.data))
            .catch(e => console.error("Failed to load compliance status", e))
        );
      }

      await Promise.allSettled(promises);

      const savedTasks = localStorage.getItem('sb_completed_daily_tasks_data');
      if (savedTasks) {
        try {
          const parsed = JSON.parse(savedTasks);
          const today = new Date().toISOString().split('T')[0];
          if (parsed.date === today) {
            setCompletedTasks(parsed.tasks || {});
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadData();
  }, []);

  const toggleTask = (index: number) => {
    const updated = { ...completedTasks, [index]: !completedTasks[index] };
    setCompletedTasks(updated);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('sb_completed_daily_tasks_data', JSON.stringify({
      date: today,
      tasks: updated
    }));
  };

  const executeAnalyzeHealth = async () => {
    setIsCalculatingHealth(true);
    setShowCreditPrompt(false);
    try {
      const savedDebtors = JSON.parse(localStorage.getItem('sb_debtors') || '[]');
      const savedInventory = JSON.parse(localStorage.getItem('sb_inventory') || '[]');
      const savedInvoices = JSON.parse(localStorage.getItem('sb_invoices') || '[]');
      const savedBrand = JSON.parse(localStorage.getItem('sb_brand') || 'null');
      const savedUser = JSON.parse(localStorage.getItem('sb_user') || 'null');

      const result = await getBusinessHealthScore({
        businessProfile: savedBrand || { businessName: savedUser?.businessName || 'My Business', niche: 'General' },
        debts: savedDebtors,
        stock: savedInventory,
        invoices: savedInvoices,
        compliance: complianceStatus || {}
      });

      // Only deduct credits on success
      const billingResponse = await billingService.deductCredits(5, 'AI Business Health Score');
      onUpdateCredits(billingResponse.credits);

      setHealthScore(result);
      localStorage.setItem('sb_health_score_data', JSON.stringify(result));
      setShowHealthModal(true);
    } catch (e: any) {
      console.error("Health analysis failed", e);
    } finally {
      setIsCalculatingHealth(false);
    }
  };

  const handleAnalyzeHealth = async () => {
    const usage = usageLimiter.checkUsage('health_score', credits);
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }
    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeAnalyzeHealth(); });
      setShowCreditPrompt(true);
      return;
    }
    await executeAnalyzeHealth();
  };

  // Mobile-friendly Touch Shortcuts
  const quickShortcuts = [
    { label: 'Write Invoice', desc: 'Bill customers instantly', icon: '🧾', view: AppView.INVOICE_GENERATOR, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Gbege Book', desc: 'Track & remind debtors', icon: '📒', view: AppView.DEBTOR_BOOK, color: 'bg-rose-50 text-rose-700 border-rose-100' },
    { label: 'Manage Stock', desc: 'Inventory catalog', icon: '📦', view: AppView.PRODUCT_MANAGER, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Broadcast HQ', desc: 'Launch marketing campaigns', icon: '📣', view: AppView.MARKETING_AGENT, color: 'bg-pink-50 text-pink-700 border-pink-100' },
    { label: 'AI Content', desc: 'Generate social copies', icon: '✍️', view: AppView.CONTENT_GENERATOR, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'Photo Studio', desc: 'AI background remover', icon: '🎨', view: AppView.CONTENT_GENERATOR, color: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Find Funding', desc: 'Grants & loans matching', icon: '💰', view: AppView.GRANT_MATCHER, color: 'bg-teal-50 text-teal-700 border-teal-100' },
    { label: 'Sales Closer', desc: 'AI chats assistant', icon: '💬', view: AppView.SALES_ASSISTANT, color: 'bg-blue-50 text-blue-700 border-blue-100' },
  ];

  return (
    <div className="space-y-5 pb-16 px-1 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Mobile-centric Header */}
      <div className="flex flex-col gap-3.5 bg-slate-900 text-white rounded-[28px] p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-2xl"></div>
        
        <div className="flex justify-between items-start z-10">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Business Cockpit</p>
            <h1 className="text-xl font-black mt-0.5 tracking-tight font-heading">
              {savedBrand?.businessName || 'SmartBiz Dashboard'}
            </h1>
          </div>
          <button 
            onClick={() => onNavigate(AppView.STOREFRONT)}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <span>🔗</span> Store Link
          </button>
        </div>

        {/* Credits & Status Bar */}
        <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-3 mt-1 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-200">AI Engine Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-300">{credits} Credits</span>
            <button 
              onClick={() => onNavigate(AppView.SETTINGS)} 
              className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2 py-0.5 rounded-lg border-0 cursor-pointer"
            >
              Top Up
            </button>
          </div>
        </div>
      </div>

      {/* SME Operations Core Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Outstanding Debts */}
        <div 
          onClick={() => onNavigate(AppView.DEBTOR_BOOK)}
          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-red-200 hover:shadow transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Owing Customers</span>
              <span className="text-xs">📒</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-2 font-heading">₦{totalDebt.toLocaleString()}</h3>
          </div>
          <p className="text-[9px] text-red-500 font-bold mt-2">Tap to prompt →</p>
        </div>

        {/* Stock Value */}
        <div 
          onClick={() => onNavigate(AppView.PRODUCT_MANAGER)}
          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-amber-200 hover:shadow transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Catalog Valuation</span>
              <span className="text-xs">📦</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-2 font-heading">₦{(ecosystemStats?.ecosystem_value || stockValue).toLocaleString()}</h3>
          </div>
          <p className="text-[9px] text-amber-500 font-bold mt-2">Manage stock →</p>
        </div>

        {/* Conversion Rate */}
        <div 
          onClick={() => onNavigate(AppView.LEAD_MANAGER)}
          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-emerald-200 hover:shadow transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Lead Conversion</span>
              <span className="text-xs">📈</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-2 font-heading">{ecosystemStats?.conversion_rate || 78}%</h3>
          </div>
          <p className="text-[9px] text-emerald-600 font-bold mt-2">{ecosystemStats?.won_leads || 0} deals won today →</p>
        </div>

        {/* Active Support */}
        <div 
          onClick={() => onNavigate(AppView.WHATSAPP_SUPPORT)}
          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-indigo-200 hover:shadow transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">AI Support</span>
              <span className="text-xs">🎧</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-2 font-heading">24/7 Active</h3>
          </div>
          <p className="text-[9px] text-indigo-600 font-bold mt-2">Get fast help →</p>
        </div>
      </div>

      {/* SME Touch Quick Shortcuts Grid */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-sm">
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-sm">⚡</span>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">SME Quick-Actions Desk</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickShortcuts.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(action.view)}
              className={`text-left p-3.5 rounded-2xl border transition-all active:scale-95 group flex flex-col justify-between min-h-[90px] cursor-pointer ${action.color}`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-all text-xs">➜</span>
              </div>
              <div>
                <p className="text-xs font-black leading-tight mt-2">{action.label}</p>
                <p className="text-[9px] opacity-75 mt-0.5 leading-tight truncate">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic & Motivation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Daily Motivation & Actions */}
        {motivation && (
          <div className="bg-slate-900 text-white rounded-[28px] p-5 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full filter blur-2xl"></div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span>🎯</span>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Daily Focus Plan</p>
              </div>
              <p className="text-xs font-bold leading-relaxed italic text-slate-200">
                "{motivation.quote?.trim() || "No food for lazy man. Go get that bag today!"}"
              </p>
              <p className="text-[10px] text-slate-400 mt-2">— {motivation.author || 'SmartBiz Coach'}</p>
            </div>

            <div className="border-t border-slate-800 pt-4 mt-4 space-y-2.5">
              <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Today's Checklists</h4>
              {(motivation.actions || [
                "Share one product today on WhatsApp status",
                "Review stock levels of popular items",
                "Send reminder for any outstanding debt"
              ]).map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!completedTasks[i]}
                    onChange={() => toggleTask(i)}
                    className="mt-0.5 rounded border-slate-650 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span 
                    className={`leading-relaxed cursor-pointer select-none ${completedTasks[i] ? 'text-emerald-400 line-through' : 'text-slate-250'}`}
                    onClick={() => toggleTask(i)}
                  >
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Business Health Diagnostic */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <div>
                  <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest leading-none">Business Diagnostic</h3>
                  <p className="text-[9px] text-slate-400 mt-1">Based on invoices, debts, & compliance</p>
                </div>
              </div>
              {healthScore && (
                <div className="flex-shrink-0">
                  <CircularProgress percentage={healthScore.score} color={healthScore.score >= 70 ? '#10b981' : healthScore.score >= 50 ? '#f59e0b' : '#ef4444'} />
                </div>
              )}
            </div>

            {healthScore ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(healthScore.metrics || {}).map(([key, val]) => (
                    <div key={key} className="bg-slate-55 p-2 rounded-xl border border-slate-100/50">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{key}</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">{val as number}%</p>
                    </div>
                  ))}
                </div>
                {healthScore.recommendations && healthScore.recommendations.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-100/30 p-3 rounded-xl">
                    <p className="text-[8px] font-black text-amber-800 uppercase">Top Suggestion</p>
                    <p className="text-[10px] text-slate-700 font-bold mt-0.5 leading-tight">{healthScore.recommendations[0].title}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-4">
                <p className="text-[10px] text-slate-400">Run diagnostic to calculate business health & identify liquidity risks.</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
            {healthScore && (
              <button
                onClick={() => setShowHealthModal(true)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
              >
                Report Details
              </button>
            )}
            <button
              onClick={handleAnalyzeHealth}
              disabled={isCalculatingHealth}
              className="flex-1 py-2.5 bg-slate-900 disabled:bg-slate-200 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer"
            >
              {isCalculatingHealth ? 'Analyzing...' : healthScore ? 'Re-diagnose' : 'Run Diagnostic'}
            </button>
          </div>
        </div>

      </div>

      {/* Trending Today Widget (Trend Jacking) */}
      {trendingTopics.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-[28px] p-5 shadow-lg relative overflow-hidden group border border-emerald-900/30">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full filter blur-3xl"></div>
          <div className="relative z-10 space-y-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 text-sm">🔥</span>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Naija Trends Today</h3>
              </div>
              <p className="text-[10px] text-emerald-300 mt-0.5">Click to generate viral marketing copy instantly.</p>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {trendingTopics.map(trend => (
                <button 
                  key={trend.id}
                  onClick={() => {
                    localStorage.setItem('sb_active_trend', trend.title);
                    onNavigate(AppView.CONTENT_GENERATOR);
                  }}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <span className="text-emerald-300">#</span>
                  {trend.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Business Health Score Detailed Report Modal */}
      {showHealthModal && healthScore && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-black text-slate-800 text-base font-heading">Diagnostic Report</h3>
                <p className="text-[10px] text-slate-400">Comprehensive health breakdown</p>
              </div>
              <button onClick={() => setShowHealthModal(false)} className="text-slate-400 hover:text-slate-655 text-sm bg-transparent border-0 cursor-pointer">✕</button>
            </div>

            <div className="space-y-5">
              {/* Score card */}
              <div className="bg-slate-900 rounded-2xl p-5 text-white flex items-center gap-4">
                <CircularProgress percentage={healthScore.score} color="#10b981" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Health Score: {healthScore.score}%</h4>
                  <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                    Performance rating computed from catalog valuation, active invoices, outstanding debts, and compliance checklists.
                  </p>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <h4 className="text-emerald-900 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>🏆</span> Strengths
                  </h4>
                  <ul className="space-y-1 ml-2">
                    {(healthScore.strengths || []).map((s: string, idx: number) => (
                      <li key={idx} className="text-[10px] text-emerald-800 list-disc list-inside leading-relaxed">{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                  <h4 className="text-rose-900 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>⚠️</span> Risks / Weaknesses
                  </h4>
                  <ul className="space-y-1 ml-2">
                    {(healthScore.weaknesses || []).map((w: string, idx: number) => (
                      <li key={idx} className="text-[10px] text-rose-800 list-disc list-inside leading-relaxed">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-slate-800 font-bold text-xs mb-2">🛠️ Recommended Next Steps</h4>
                <div className="space-y-2">
                  {(healthScore.recommendations || []).map((rec: any, idx: number) => (
                    <div key={idx} className="border border-slate-100 p-3 rounded-xl bg-slate-50 flex justify-between items-center gap-3">
                      <div>
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">{rec.priority} Priority</span>
                        <h5 className="font-bold text-[10px] text-slate-800 mt-0.5">{rec.title}</h5>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded text-[9px] font-black tracking-wide whitespace-nowrap">
                        {rec.tool}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHealthModal(false)}
              className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer border-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Business Health Score"
        creditCost={5}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default Dashboard;
