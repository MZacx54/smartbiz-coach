
import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, TrendingUp, Calendar, AlertCircle, CheckCircle, Package, Receipt, Users, BrainCircuit, Activity, Wand2, Store, MessageCircle, Globe } from 'lucide-react';
import { AppView, ActionCard, UserStats, DailyMotivation, SeasonalAlert, Transaction, Debtor, InventoryItem, User } from '../types';
import { generateDailyMotivation, generateSeasonalTips, getTrendingTopics } from '../services/geminiService';
import api from '../services/api';

interface DashboardProps {
  user: User;
  userStats?: UserStats;
  actions?: ActionCard[];
  onNavigate?: (view: AppView) => void;
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
          <p className="text-xs text-gray-600">{action.description}</p>
        </div>
        {!action.isCompleted && <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />}
        {action.isCompleted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, userStats, actions, onNavigate }) => {
  const [motivation, setMotivation] = useState<DailyMotivation | null>(null);
  const [seasonalAlert, setSeasonalAlert] = useState<SeasonalAlert | null>(null);
  const [trends, setTrends] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setMotivation(generateDailyMotivation());
        setSeasonalAlert(generateSeasonalTips());
        setTrends(getTrendingTopics());
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const defaultStats: UserStats = {
    grantReadinessScore: 0,
    bizCredits: 0,
    completedTasks: 0,
    totalTasks: 6,
  };

  const stats = userStats || defaultStats;
  const cardActions = actions || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin">
          <Sparkles className="w-8 h-8 text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-2xl text-white shadow-lg">
        <h1 className="text-4xl font-black font-heading mb-2">Welcome back, {user.name}! 👋</h1>
        <p className="text-indigo-100 text-lg">{user.businessName} • {motivation?.quote}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600">Grant Readiness</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <CircularProgress percentage={stats.grantReadinessScore} color="#10b981" />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600">BizCredits</span>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-black text-yellow-600">{stats.bizCredits}</p>
          <p className="text-xs text-slate-500 mt-2">Available for tools</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600">Completed Tasks</span>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-600">{stats.completedTasks}</p>
          <p className="text-xs text-slate-500 mt-2">of {stats.totalTasks}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600">Plan Status</span>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-600 capitalize">{user.plan}</p>
          <p className="text-xs text-slate-500 mt-2">Current subscription</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Action Items */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Action Items
            </h2>
            <div className="space-y-3">
              {cardActions.length > 0 ? (
                cardActions.map(action => (
                  <ActionCardItem 
                    key={action.id} 
                    action={action} 
                    onClick={() => onNavigate?.(action.actionLink || AppView.DASHBOARD)}
                  />
                ))
              ) : (
                <p className="text-slate-500 text-sm">No action items right now. Keep up the great work!</p>
              )}
            </div>
          </div>

          {/* Trends */}
          {trends.length > 0 && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Trending This Week
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {trends.map((trend, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <p className="text-sm font-semibold text-slate-900">{trend}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Daily Motivation */}
          {motivation && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border-2 border-emerald-200">
              <div className="flex items-start gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" />
                <h3 className="font-bold text-slate-900">Daily Motivation</h3>
              </div>
              <p className="text-sm italic text-slate-700 mb-3">"{motivation.quote}"</p>
              <p className="text-xs font-semibold text-emerald-700">— {motivation.author}</p>
            </div>
          )}

          {/* Seasonal Alert */}
          {seasonalAlert && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 border-amber-200">
              <div className="flex items-start gap-3 mb-3">
                <Calendar className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                <h3 className="font-bold text-slate-900">{seasonalAlert.season}</h3>
              </div>
              <p className="text-sm text-slate-700 mb-3">{seasonalAlert.description}</p>
              <p className="text-xs font-semibold text-amber-700">💡 {seasonalAlert.actionItem}</p>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Access</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate?.(AppView.BRAND_BUILDER)}
                className="w-full text-left text-sm p-2 hover:bg-indigo-50 rounded text-indigo-600 font-medium flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Brand Builder
              </button>
              <button 
                onClick={() => onNavigate?.(AppView.MARKETPLACE)}
                className="w-full text-left text-sm p-2 hover:bg-blue-50 rounded text-blue-600 font-medium flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                Marketplace
              </button>
              <button 
                onClick={() => onNavigate?.(AppView.DIGITAL_ROADMAP)}
                className="w-full text-left text-sm p-2 hover:bg-purple-50 rounded text-purple-600 font-medium flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Digital Roadmap
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
