
import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, TrendingUp, Calendar, AlertCircle, CheckCircle, Package, Receipt, Users, BrainCircuit, Activity, Wand2, Store, MessageCircle, Globe, Award, ShieldAlert, CheckSquare, RefreshCw, BarChart2 } from 'lucide-react';
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
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-20 h-20">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-sm font-bold font-heading`} style={{ color }}>{percentage}%</span>
      </div>
    </div>
  );
};

const ActionCardItem: React.FC<{ action: ActionCard; onClick: () => void }> = ({ action, onClick }) => {
  const getStyles = (type: string) => {
    switch (type) {
      case 'URGENT': return 'border-l-4 border-l-red-500 hover:bg-red-50/50';
      case 'GROWTH': return 'border-l-4 border-l-green-500 hover:bg-green-50/50';
      case 'INFO': return 'border-l-4 border-l-blue-500 hover:bg-blue-50/50';
      case 'COMPLETED': return 'border-l-4 border-l-gray-300 bg-gray-50 opacity-60 grayscale';
      default: return 'bg-white';
    }
  };

  return (
    <div
      className={`bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-3 transition-all cursor-pointer group hover:shadow-md ${getStyles(action.type)}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {action.type === 'URGENT' && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Urgent</span>}
            <h4 className={`font-bold text-sm text-gray-900 group-hover:text-gray-900 font-heading`}>
              {action.title}
            </h4>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-1">{action.description}</p>
        </div>

        <div className="ml-4 flex flex-col items-end gap-2">
          {action.points && !action.isCompleted && (
            <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
              +{action.points} PTS
            </span>
          )}
          {action.isCompleted ? (
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">✓</div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-gray-200 group-hover:border-indigo-500 transition-colors flex items-center justify-center">
              <span className="text-gray-400 text-[10px] group-hover:text-indigo-500">➜</span>
            </div>
          )}
        </div>
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
        
        // Populate mock health score if not already customized with valid score
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
        // Ecosystem Analytics
        try {
          const response = await api.get('/api/marketplace/analytics/');
          setEcosystemStats(response.data);
        } catch (e) {
          console.error("Failed to load ecosystem analytics", e);
        }

        // Compliance
        try {
          const compResponse = await api.get('/api/users/compliance/');
          setComplianceStatus(compResponse.data);
        } catch (e) {
          console.error("Failed to load compliance status", e);
        }

        // Business Data (From LocalStorage for Dashboard View)
        try {
          const savedDebtors: Debtor[] = JSON.parse(localStorage.getItem('sb_debtors') || '[]');
          const unpaid = savedDebtors.filter(d => d.status !== 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
          setTotalDebt(unpaid);

          const savedInventory: InventoryItem[] = JSON.parse(localStorage.getItem('sb_inventory') || '[]');
          const stockVal = savedInventory.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
          setStockValue(stockVal);

          const savedTx: Transaction[] = JSON.parse(localStorage.getItem('sb_transactions') || '[]');
          setRecentTransactions(savedTx.slice(0, 3)); // Get last 3
        } catch (e) {
          console.error("Error loading dashboard data", e);
        }
      }

      // Load AI daily motivation, seasonal tips, and trends dynamically in both modes
      try {
        const m = await generateDailyMotivation("Entrepreneur");
        setMotivation(m);
      } catch (e) {
        console.error("Failed to load motivation", e);
      }

      try {
        const s = await generateSeasonalTips();
        setSeasonalAlert(s);
      } catch (e) {
        console.error("Failed to load seasonal tips", e);
      }

      try {
        const trends = await getTrendingTopics();
        if (trends && trends.length > 0) {
            setTrendingTopics(trends);
        } else {
            throw new Error("Empty trends array");
        }
      } catch (e) {
        console.error("Failed to load trends, using fallbacks", e);
        setTrendingTopics([
            { id: "t1", title: "Fuel Prices & transport hacks", category: "Economy", volume: "140K Posts" },
            { id: "t2", title: "New Nollywood blockbusters", category: "Entertainment", volume: "95K TikToks" },
            { id: "t3", title: "Naira Exchange Adjustments", category: "Finance", volume: "85K Posts" }
        ]);
      }

      // Daily task checklist loader
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
      const billingResponse = await billingService.deductCredits(5, 'AI Business Health Score');
      onUpdateCredits(billingResponse.credits);

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

  const activeActions = actions.filter(a => !a.isCompleted);

  // Quick Actions Config (Modernized AI Aesthetic)
  const quickActions = [
    { label: 'AI Content', icon: <Sparkles className="w-5 h-5" />, view: AppView.CONTENT_GENERATOR, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { label: 'Product Magic', icon: <Wand2 className="w-5 h-5" />, view: AppView.PRODUCT_MAGIC, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    { label: 'Market Square', icon: <Globe className="w-5 h-5" />, view: AppView.MARKETPLACE, color: 'bg-teal-500/10 text-teal-650 border-teal-500/20' },
    { label: 'Sales Closer', icon: <MessageCircle className="w-5 h-5" />, view: AppView.SALES_ASSISTANT, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { label: 'Debt Tracker', icon: <AlertCircle className="w-5 h-5" />, view: AppView.DEBTOR_BOOK, color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
    { label: 'Unified Catalog', icon: <Package className="w-5 h-5" />, view: AppView.PRODUCT_MANAGER, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back! Here is your business at a glance.</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md border border-gray-200/50 px-4 py-2 rounded-full shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
            <span className="text-xs font-bold text-gray-700 bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">AI Active</span>
          </div>
          <div className="w-[1px] h-4 bg-gray-200"></div>
          <span className="text-xs font-bold text-gray-700">{userStats.bizCredits} Credits</span>
          <button onClick={() => onNavigate(AppView.SETTINGS)} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded transition-colors font-bold">Top Up</button>
        </div>
        <button 
          onClick={() => onNavigate(AppView.STOREFRONT)}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-500 transition-all active:scale-95"
        >
          <Globe className="w-3.5 h-3.5" /> My Store Link
        </button>
      </div>

      {/* Hero / Motivation Section */}
      {motivation && (
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-25"></div>
          <div className="absolute -bottom-8 left-0 w-64 h-64 bg-teal-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-25"></div>

          <div className="relative z-10 grid md:grid-cols-5 gap-6">
            <div className="md:col-span-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎯</span>
                  <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest font-heading">Daily Focus Plan</p>
                </div>
                <h2 className="text-base md:text-lg font-bold font-heading leading-relaxed mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                  "{motivation.quote?.trim() || "No food for lazy man. Go get that bag today!"}"
                </h2>
              </div>
              <div className="flex justify-between items-end border-t border-slate-800/80 pt-3 mt-3">
                <p className="text-xs text-slate-400 font-medium">— {motivation.author || 'SmartBiz Coach'}</p>
                {seasonalAlert && (
                  <div className="bg-orange-500/20 border border-orange-500/50 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-orange-300 animate-pulse">
                     {seasonalAlert.season}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Actions Checklist */}
            <div className="md:col-span-2 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 p-4 rounded-xl">
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Today's Actions</span>
              </h3>
              <div className="space-y-3">
                {(motivation.actions || [
                  "Share one product today on WhatsApp status",
                  "Review stock levels of popular items",
                  "Send reminder for any outstanding debt"
                ]).map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <input
                      type="checkbox"
                      checked={!!completedTasks[i]}
                      onChange={() => toggleTask(i)}
                      className="mt-0.5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 cursor-pointer"
                    />
                    <span className={`leading-relaxed cursor-pointer select-none transition-all ${completedTasks[i] ? 'text-emerald-400 line-through font-medium' : 'text-slate-200'}`} onClick={() => toggleTask(i)}>
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900">AI Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(action.view)}
              className="flex flex-col items-center justify-center gap-2.5 bg-white border border-gray-100/50 p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all active:scale-95 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                {action.icon}
              </div>
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight group-hover:text-emerald-600 transition-colors">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Business Health Score Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg font-heading">AI Business Health Diagnostic</h3>
              <p className="text-slate-500 text-xs mt-0.5">Scored based on inventory, outstanding debts, invoices & compliance.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {healthScore && (
              <button
                onClick={() => setShowHealthModal(true)}
                className="w-1/2 sm:w-auto px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
              >
                <span>📜 View Report</span>
              </button>
            )}
            <button
              onClick={handleAnalyzeHealth}
              disabled={isCalculatingHealth}
              className="w-1/2 sm:w-auto px-5 py-2.5 bg-emerald-600 disabled:bg-slate-200 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15"
            >
              {isCalculatingHealth ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
              ) : (
                <><span>🔍 {healthScore ? 'Re-Analyze' : 'Analyze Business'}</span></>
              )}
            </button>
          </div>
        </div>

        {healthScore ? (
          <div className="grid md:grid-cols-4 gap-6 items-center">
            {/* Score circle */}
            <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-0 md:pr-6">
              <CircularProgress percentage={healthScore.score} color={healthScore.score >= 70 ? '#10b981' : healthScore.score >= 50 ? '#f59e0b' : '#ef4444'} />
              <p className="text-xs font-bold text-slate-600 mt-2 uppercase tracking-wider">Health Score</p>
            </div>

            {/* Metrics */}
            <div className="md:col-span-3 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(healthScore.metrics || {}).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{key}</p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-base font-bold text-slate-850 leading-none">{val as number}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action recommendations summary */}
              {healthScore.recommendations && healthScore.recommendations.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-xl flex items-start gap-3">
                  <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg mt-0.5 text-xs">💡</div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase">Top Recommendation:</h4>
                    <p className="text-xs text-amber-850 mt-1">
                      <strong className="font-semibold">{healthScore.recommendations[0].title}</strong> — {healthScore.recommendations[0].impact} (Use {healthScore.recommendations[0].tool})
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-xs text-slate-500">Run a diagnostic to calculate your business health, identify cash flow risks, and get a compliance score.</p>
          </div>
        )}
      </div>

      {/* Business Snapshot (Financials) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Debt Owed (Risk) */}
        <div
          onClick={() => onNavigate(AppView.DEBTOR_BOOK)}
          className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-red-200 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Unpaid Debts</p>
            <div className="bg-red-50 p-2 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-gray-900 font-heading">₦{totalDebt.toLocaleString()}</h3>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><BrainCircuit className="w-3 h-3 text-emerald-500" /> AI Reminder available</p>
          </div>
        </div>

        {/* Inventory Value (Asset) */}
        <div
          onClick={() => onNavigate(AppView.PRODUCT_MANAGER)}
          className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Ecosystem Value</p>
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-gray-900 font-heading">₦{(ecosystemStats?.ecosystem_value || stockValue).toLocaleString()}</h3>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-400" /> {ecosystemStats?.service_count || 0} services active</p>
          </div>
        </div>

        {/* Lead Analytics (Growth) */}
        <div
          onClick={() => onNavigate(AppView.LEAD_MANAGER)}
          className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">Lead Conversion</p>
            <h3 className="text-2xl font-bold text-gray-900">{ecosystemStats?.conversion_rate || 0}%</h3>
            <p className="text-[10px] text-emerald-650 font-bold mt-1">{ecosystemStats?.won_leads || 0} deals won today →</p>
          </div>
          <CircularProgress percentage={ecosystemStats?.conversion_rate || 0} color="#10b981" />
        </div>
      </div>

      {/* Trending Today Widget (Trend Jacking) */}
      {trendingTopics.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-2xl p-6 shadow-xl relative overflow-hidden group border border-emerald-900/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full mix-blend-overlay filter blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-700"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/15 rounded-full mix-blend-overlay filter blur-2xl"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest font-heading">Trending in Nigeria Today</h3>
              </div>
              <p className="text-xs text-emerald-200">Our AI caught these. Click one to generate viral content instantly.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map(trend => (
                <button 
                  key={trend.id}
                  onClick={() => {
                    localStorage.setItem('sb_active_trend', trend.title);
                    onNavigate(AppView.CONTENT_GENERATOR);
                  }}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1 group"
                >
                  <span className="text-emerald-300">#</span>
                  {trend.title}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">🚀</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Action List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-heading text-gray-900">To-Do List</h3>
            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-600">{activeActions.length} Pending</span>
          </div>

          <div className="space-y-1">
            {activeActions.length === 0 && (
              <div className="p-6 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-bold text-gray-900 text-sm">All caught up!</p>
              </div>
            )}
            {activeActions.slice(0, 3).map(action => (
              <ActionCardItem
                key={action.id}
                action={action}
                onClick={() => action.actionLink && onNavigate(action.actionLink)}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-heading text-gray-900">Recent Inquiries & Orders</h3>
            <button onClick={() => onNavigate(AppView.LEAD_MANAGER)} className="text-xs text-emerald-600 font-bold">View Inbox</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {!ecosystemStats || ecosystemStats.total_leads === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs italic">
                No recent inquiries. Share your store link to get started!
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* We assume ecosystemStats contains some recent leads or we fetch them separately */}
                <div className="p-4 bg-emerald-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs">📬</div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">New Potential Deals</p>
                            <p className="text-[10px] text-slate-500">{ecosystemStats.total_leads} Total Inquiries</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onNavigate(AppView.LEAD_MANAGER)}
                        className="bg-white px-3 py-1.5 rounded-lg border border-emerald-100 text-[10px] font-black text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                    >
                        Review Now
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Traction & Partnerships Section (Traction Mode Only) */}
      {isTractionMode && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-6 mt-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 font-heading text-base flex items-center gap-2">
                <span className="text-emerald-500">📈</span> Verified Traction & Pilot Reports (IDICE Growth Lab)
              </h3>
              <p className="text-xs text-slate-500">Simulated dashboard for assessing active pilots and monthly sales traction.</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full animate-pulse">
              IDICE Selectable MVP
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Growth Chart */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Monthly Transaction Value (2026)</h4>
              <div className="h-48 flex items-end gap-3 pt-6 border-b border-l border-slate-100 px-2">
                {[
                  { month: 'Jan', val: '₦3.2M', height: '25%' },
                  { month: 'Feb', val: '₦4.8M', height: '38%' },
                  { month: 'Mar', val: '₦6.1M', height: '48%' },
                  { month: 'Apr', val: '₦7.5M', height: '60%' },
                  { month: 'May', val: '₦9.8M', height: '78%' },
                  { month: 'Jun', val: '₦12.4M', height: '98%' },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                    <span className="text-[10px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{item.val}</span>
                    <div 
                      style={{ height: item.height }} 
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-lg group-hover:from-emerald-500 group-hover:to-teal-400 transition-all duration-500 shadow-sm"
                    ></div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active User Stats */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Active User Base Growth</h4>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">SMEs & Merchants</span>
                  <span className="text-sm font-bold text-slate-800">5,842</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Target: 6,000</span>
                  <span className="text-emerald-600 font-bold">85% Year Growth</span>
                </div>
                
                <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Avg Retention Rate</span>
                    <span className="font-bold text-slate-800">92.4%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Monthly Active Rate</span>
                    <span className="font-bold text-slate-800">88.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pilot Partnerships */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Active Pilot Partnerships & Cohorts</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Lagos Innovates', role: 'SME Digitization Pilot', logo: '🏛️' },
                { name: 'CcHUB Nigeria', role: 'Cohort 4 Incubator', logo: '💡' },
                { name: 'Fate Foundation', role: 'Accelerator Program', logo: '🤝' },
                { name: 'NIRSAL MFB Escrow', role: 'Direct Microfinance Pilot', logo: '💰' },
              ].map((partner, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                  <span className="text-2xl">{partner.logo}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-850 leading-none">{partner.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{partner.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Business Health Score Detailed Report Modal */}
      {showHealthModal && healthScore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-slate-900 font-heading text-xl">AI Diagnostic Report</h3>
                <p className="text-xs text-slate-500">Comprehensive health breakdown & strategic roadmap</p>
              </div>
              <button onClick={() => setShowHealthModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="space-y-6">
              {/* Score breakdown */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-6 shadow-lg">
                <CircularProgress percentage={healthScore.score} color="#10b981" />
                <div>
                  <h4 className="text-lg font-bold font-heading">Your Business is {healthScore.score >= 70 ? 'Healthy! 🚀' : healthScore.score >= 50 ? 'Stable ⚖️' : 'At Risk ⚠️'}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Based on analyzing debts, stock value, and invoices, your operations are performing at a {healthScore.score}% rating.
                  </p>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                  <h4 className="text-emerald-900 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {(healthScore.strengths || []).map((s: string, idx: number) => (
                      <li key={idx} className="text-xs text-emerald-800 flex items-start gap-1.5 leading-relaxed">
                        <span className="font-bold text-emerald-500">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
                  <h4 className="text-rose-900 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" /> Risks / Weaknesses
                  </h4>
                  <ul className="space-y-2">
                    {(healthScore.weaknesses || []).map((w: string, idx: number) => (
                      <li key={idx} className="text-xs text-rose-800 flex items-start gap-1.5 leading-relaxed">
                        <span className="font-bold text-rose-400">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Detailed Recommendations List */}
              <div>
                <h4 className="text-slate-800 font-bold text-sm mb-3">🛠️ Recommended Action Items</h4>
                <div className="space-y-3">
                  {(healthScore.recommendations || []).map((rec: any, idx: number) => (
                    <div key={idx} className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors flex justify-between items-center gap-4 flex-wrap sm:flex-nowrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            rec.priority === 'HIGH' ? 'bg-red-100 text-red-700' : rec.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.priority} Priority
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">Impact: {rec.impact}</span>
                        </div>
                        <h5 className="font-bold text-xs text-slate-800 mt-1.5">{rec.title}</h5>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide whitespace-nowrap">
                        Use {rec.tool}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHealthModal(false)}
              className="mt-6 w-full py-3 bg-slate-905 hover:bg-slate-900 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-98"
            >
              Dismiss Report
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
