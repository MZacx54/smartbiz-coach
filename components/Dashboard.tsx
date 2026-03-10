
import React, { useEffect, useState } from 'react';
import { AppView, ActionCard, UserStats, DailyMotivation, SeasonalAlert, Transaction, Debtor, InventoryItem } from '../types';
import { generateDailyMotivation, generateSeasonalTips } from '../services/geminiService';

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

  // Quick Actions Config
  const quickActions = [
    { label: 'New Invoice', icon: '🧾', view: AppView.INVOICE_GENERATOR, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Record Debt', icon: '📒', view: AppView.DEBTOR_BOOK, color: 'bg-red-50 text-red-700' },
    { label: 'Add Stock', icon: '📦', view: AppView.INVENTORY, color: 'bg-blue-50 text-blue-700' },
    { label: 'Create Post', icon: '✨', view: AppView.CONTENT_GENERATOR, color: 'bg-pink-50 text-pink-700' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back! Here is your business at a glance.</p>
        </div>
        <div className="bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-bold text-gray-700">{userStats.bizCredits} Credits</span>
          <button onClick={() => onNavigate(AppView.SETTINGS)} className="text-xs text-indigo-600 font-bold ml-2 hover:underline">Top Up</button>
        </div>
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
        <h3 className="text-sm font-bold text-gray-900 mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(action.view)}
              className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${action.color}`}>
                {action.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Business Snapshot (Financials) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Debt Owed (Risk) */}
        <div
          onClick={() => onNavigate(AppView.DEBTOR_BOOK)}
          className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between cursor-pointer hover:bg-red-50/30 transition-colors"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase">Debts Owed You</p>
            <span className="text-red-500 bg-red-100 p-1 rounded text-xs">💸</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₦{totalDebt.toLocaleString()}</h3>
          <p className="text-[10px] text-gray-500 mt-1">Collect this money!</p>
        </div>

        {/* Inventory Value (Asset) */}
        <div
          onClick={() => onNavigate(AppView.INVENTORY)}
          className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500 flex flex-col justify-between cursor-pointer hover:bg-blue-50/30 transition-colors"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase">Stock Value</p>
            <span className="text-blue-500 bg-blue-100 p-1 rounded text-xs">📦</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₦{stockValue.toLocaleString()}</h3>
          <p className="text-[10px] text-gray-500 mt-1">Total goods in shop</p>
        </div>

        {/* Grant Score (Growth) */}
        <div
          onClick={() => onNavigate(AppView.COMPLIANCE)}
          className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 flex items-center justify-between cursor-pointer hover:bg-green-50/30 transition-colors"
        >
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Grant Score</p>
            <h3 className="text-2xl font-bold text-gray-900">{userStats.grantReadinessScore}/100</h3>
            <p className="text-[10px] text-green-600 font-bold mt-1">Get Funding Ready →</p>
          </div>
          <CircularProgress percentage={userStats.grantReadinessScore} color={userStats.grantReadinessScore > 70 ? '#16a34a' : '#f59e0b'} />
        </div>
      </div>

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
