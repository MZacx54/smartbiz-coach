
import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, TrendingUp, Calendar, AlertCircle, CheckCircle, Package, Receipt, Users, BrainCircuit, Activity, Wand2, Store, MessageCircle, Globe } from 'lucide-react';
import { AppView, ActionCard, UserStats, DailyMotivation, SeasonalAlert, Transaction, Debtor, InventoryItem } from '../types';
import { generateDailyMotivation, generateSeasonalTips, getTrendingTopics } from '../services/geminiService';

interface DashboardProps {
  userStats: UserStats;
  actions: ActionCard[];
  onNavigate: (view: AppView) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ userStats, actions, onNavigate }) => {
  const [motivation, setMotivation] = useState<DailyMotivation | null>(null);
  const [seasonalAlert, setSeasonalAlert] = useState<SeasonalAlert | null>(null);

  // Real-time Data States
  const [totalDebt, setTotalDebt] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // AI Data
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
            { id: "t1", title: "Detty December Strategy", category: "Seasonal", volume: "150K Posts" },
            { id: "t2", title: "Naira Exchange Adjustments", category: "Economy", volume: "80K Posts" },
            { id: "t3", title: "AI For Small Business", category: "Tech", volume: "45K Posts" }
        ]);
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
    };
    loadData();
  }, []);

  const activeActions = actions.filter(a => !a.isCompleted);

  // Quick Actions Config (Modernized AI Aesthetic)
  const quickActions = [
    { label: 'AI Content', icon: <Sparkles className="w-5 h-5" />, view: AppView.CONTENT_GENERATOR, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    { label: 'Product Magic', icon: <Wand2 className="w-5 h-5" />, view: AppView.PRODUCT_MAGIC, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    { label: 'SmartBiz Hub', icon: <Store className="w-5 h-5" />, view: AppView.HUB, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { label: 'Sales Closer', icon: <MessageCircle className="w-5 h-5" />, view: AppView.SALES_ASSISTANT, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { label: 'Debt Tracker', icon: <AlertCircle className="w-5 h-5" />, view: AppView.DEBTOR_BOOK, color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
    { label: 'Inventory AI', icon: <Package className="w-5 h-5" />, view: AppView.INVENTORY, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
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
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"></div>
            <span className="text-xs font-bold text-gray-700 bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">AI Active</span>
          </div>
          <div className="w-[1px] h-4 bg-gray-200"></div>
          <span className="text-xs font-bold text-gray-700">{userStats.bizCredits} Credits</span>
          <button onClick={() => onNavigate(AppView.SETTINGS)} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded transition-colors font-bold">Top Up</button>
        </div>
        <button 
          onClick={() => onNavigate(AppView.STOREFRONT)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Globe className="w-3.5 h-3.5" /> My Store Link
        </button>
      </div>

      {/* Hero / Motivation Section */}
      {motivation && (
        <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden group">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-8 left-0 w-64 h-64 bg-green-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💡</span>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Daily Wisdom</p>
            </div>
            <h2 className="text-lg md:text-xl font-bold font-heading leading-relaxed mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
              "{motivation.quote?.trim() || (motivation as any).error || "No food for lazy man. Go get that bag today!"}"
            </h2>
            <div className="flex justify-between items-end">
              <p className="text-xs text-gray-400 font-medium">— {motivation.author}</p>
              {seasonalAlert && (
                <div className="bg-orange-500/20 border border-orange-500/50 px-3 py-1 rounded-full text-[10px] font-bold text-orange-200 animate-pulse">
                  📢 {seasonalAlert.season} is coming!
                </div>
              )}
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
              <span className="text-[11px] font-bold text-gray-700 text-center leading-tight group-hover:text-indigo-600 transition-colors">{action.label}</span>
            </button>
          ))}
        </div>
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
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><BrainCircuit className="w-3 h-3 text-indigo-400" /> AI Reminder available</p>
          </div>
        </div>

        {/* Inventory Value (Asset) */}
        <div
          onClick={() => onNavigate(AppView.INVENTORY)}
          className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Stock Value</p>
            <div className="bg-blue-50 p-2 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-gray-900 font-heading">₦{stockValue.toLocaleString()}</h3>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-400" /> Tracking smoothly</p>
          </div>
        </div>

        {/* Grant Score (Growth) */}
        <div
          onClick={() => onNavigate(AppView.COMPLIANCE)}
          className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">Funding Readines</p>
            <h3 className="text-2xl font-bold text-gray-900">{userStats.grantReadinessScore}/100</h3>
            <p className="text-[10px] text-green-600 font-bold mt-1">Get Funding Ready →</p>
          </div>
          <CircularProgress percentage={userStats.grantReadinessScore} color={userStats.grantReadinessScore > 70 ? '#16a34a' : '#f59e0b'} />
        </div>
      </div>

      {/* Trending Today Widget (Trend Jacking) */}
      {trendingTopics.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full mix-blend-overlay filter blur-3xl group-hover:bg-indigo-500/30 transition-colors duration-700"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full mix-blend-overlay filter blur-2xl"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Trending in Nigeria Today</h3>
              </div>
              <p className="text-xs text-indigo-200">Our AI caught these. Click one to generate viral content instantly.</p>
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
                  <span className="text-blue-300">#</span>
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
            <h3 className="text-sm font-bold font-heading text-gray-900">Recent Transactions</h3>
            <button onClick={() => onNavigate(AppView.SETTINGS)} className="text-xs text-indigo-600 font-bold">View All</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs italic">
                No recent activity recorded.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tx.type === 'PURCHASE' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        {tx.type === 'PURCHASE' ? '🛒' : '💰'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{tx.description}</p>
                        <p className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-900">
                      {tx.type === 'PURCHASE' ? '-' : '+'} ₦{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
