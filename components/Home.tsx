import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppView, User, UserStats, Debtor } from '../types';
import api from '../services/api';
import { securityLockService } from '../services/authService';
import { Card, Button, StatTile, Skeleton, PageHeader } from './ui';

interface HomeProps {
  user: User;
  userStats: UserStats;
  onNavigate: (view: AppView, params?: string) => void;
}

interface Summary {
  total_sales_revenue: number;
  sales_count: number;
  net_cash_in_till: number;
  low_stock_products: { id: number; name: string; stock_count: number }[];
}
interface Trends {
  series: { date: string; revenue: number }[];
  total_revenue: number;
}
interface Suggestion {
  id: string;
  icon: string;
  title: string;
  detail: string;
  cta: string;
  tone: 'rose' | 'amber' | 'emerald' | 'blue';
  go: () => void;
}

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ngn = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');
const readCache = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const Home: React.FC<HomeProps> = ({ user, userStats, onNavigate }) => {
  const navigate = useNavigate();
  const today = localDate();
  const [isStaff, setIsStaff] = useState(() => securityLockService.isApprenticeModeActive());
  const [summary, setSummary] = useState<Summary | null>(() => readCache<Summary>(`sb_home_summary_${today}`));
  const [trends, setTrends] = useState<Trends | null>(() => readCache<Trends>('sb_home_trends'));
  const [loading, setLoading] = useState(!summary);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [checklistHidden, setChecklistHidden] = useState(() => localStorage.getItem('sb_checklist_dismissed') === 'true');
  const [storeShared, setStoreShared] = useState(() => localStorage.getItem('sb_store_shared') === 'true');

  useEffect(() => {
    const onMode = (e: any) => setIsStaff(Boolean(e?.detail?.isApprenticeMode ?? securityLockService.isApprenticeModeActive()));
    window.addEventListener('sb-apprentice-mode-changed', onMode);
    return () => window.removeEventListener('sb-apprentice-mode-changed', onMode);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [s, t, p] = await Promise.allSettled([
        api.get(`/api/marketplace/daily-summary/?date=${today}`, { timeout: 8000 }),
        api.get('/api/marketplace/daily-trends/?days=7', { timeout: 8000 }),
        api.get('/api/marketplace/products/', { timeout: 8000 }),
      ]);
      if (cancelled) return;
      if (s.status === 'fulfilled' && s.value?.data) {
        setSummary(s.value.data);
        try { localStorage.setItem(`sb_home_summary_${today}`, JSON.stringify(s.value.data)); } catch { /* ignore */ }
      }
      if (t.status === 'fulfilled' && t.value?.data) {
        setTrends(t.value.data);
        try { localStorage.setItem('sb_home_trends', JSON.stringify(t.value.data)); } catch { /* ignore */ }
      }
      if (p.status === 'fulfilled') {
        const d = p.value?.data;
        setProductCount(Array.isArray(d) ? d.length : Array.isArray(d?.results) ? d.results.length : 0);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [today]);

  const debtors = useMemo<Debtor[]>(() => readCache<Debtor[]>('sb_debtors') || [], []);
  const unpaid = debtors.filter((d) => d.status !== 'PAID');
  const totalOwed = unpaid.reduce((a, d) => a + (Number(d.amount) || 0), 0);
  const overdue = unpaid
    .filter((d) => d.dueDate && new Date(d.dueDate) < new Date(today))
    .sort((a, b) => b.amount - a.amount);
  const lowStock = summary?.low_stock_products || [];
  const salesToday = summary?.sales_count ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name || user.businessName || 'there').split(' ')[0];
  const businessName = user.businessName || user.business_name || 'your business';
  const dateLabel = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });

  /* ---- "Do this next": simple rules on your own data (no guesswork) ---- */
  const suggestions: Suggestion[] = [];
  if (overdue.length > 0 && !isStaff) {
    const top = overdue[0];
    suggestions.push({
      id: 'overdue', icon: '📒', tone: 'rose',
      title: `${top.name} owes you ${ngn(top.amount)}`,
      detail: overdue.length > 1 ? `Plus ${overdue.length - 1} more overdue. Send a polite reminder today.` : 'This payment is overdue. Send a polite reminder.',
      cta: 'Remind', go: () => onNavigate(AppView.DEBTOR_BOOK),
    });
  }
  if (lowStock.length > 0) {
    const item = lowStock[0];
    suggestions.push({
      id: 'stock', icon: '📦', tone: 'amber',
      title: `Restock ${item.name}`,
      detail: `Only ${item.stock_count} left${lowStock.length > 1 ? ` (and ${lowStock.length - 1} other items are low)` : ''}.`,
      cta: 'Open stock', go: () => onNavigate(AppView.PRODUCT_MANAGER),
    });
  }
  if (!loading && salesToday === 0 && hour >= 10) {
    suggestions.push({
      id: 'nosale', icon: '⚡', tone: 'emerald',
      title: 'No sales recorded yet today',
      detail: 'Record each sale as it happens so your till and profit stay accurate.',
      cta: 'Record sale', go: () => onNavigate(AppView.DAILY_CASHBOOK, 'action=sale'),
    });
  }
  const score = readCache<any>('sb_ml_overview_cache')?.credit?.credit_score;
  if (score && !isStaff) {
    suggestions.push({
      id: 'score', icon: '💰', tone: 'blue',
      title: `Your SmartScore is ${score}`,
      detail: 'See grants and loans you may qualify for.',
      cta: 'Find funding', go: () => onNavigate(AppView.GRANT_MATCHER),
    });
  }
  const shownSuggestions = suggestions.slice(0, 3);

  /* ---- First-run checklist ---- */
  const hasPasscode = localStorage.getItem('sb_has_owner_passcode') === 'true';
  const hasSold = (trends?.total_revenue || 0) > 0 || salesToday > 0;
  const checklist = [
    { id: 'product', label: 'Add your first product', done: (productCount ?? 0) > 0, go: () => onNavigate(AppView.PRODUCT_MANAGER) },
    { id: 'sale', label: 'Record your first sale', done: hasSold, go: () => onNavigate(AppView.DAILY_CASHBOOK, 'action=sale') },
    { id: 'pass', label: 'Set your Owner password', done: hasPasscode, go: () => onNavigate(AppView.SETTINGS, 'tab=preferences') },
    {
      id: 'store', label: 'Share your online store link', done: storeShared,
      go: () => { localStorage.setItem('sb_store_shared', 'true'); setStoreShared(true); onNavigate(AppView.STOREFRONT); },
    },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const showChecklist = !isStaff && !checklistHidden && doneCount < checklist.length && productCount !== null;

  const series = trends?.series || [];
  const maxRev = Math.max(1, ...series.map((d) => d.revenue));
  const dayLabel = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-NG', { weekday: 'short' }).slice(0, 2);

  const toneClasses = {
    rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <PageHeader title={`${greeting}, ${firstName} 👋`} subtitle={`${businessName} · ${dateLabel}`} />

      {/* 1. One primary action */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 border-0 text-white">
        <p className="text-sm font-semibold text-emerald-100">Made a sale?</p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onNavigate(AppView.DAILY_CASHBOOK, 'action=sale')}
            className="flex-1 min-h-[56px] rounded-2xl bg-white text-emerald-700 font-black text-base shadow-lg active:scale-[0.98] cursor-pointer"
          >
            ⚡ Record a sale
          </button>
          <div className="flex gap-2">
            {!isStaff && (
              <button
                onClick={() => onNavigate(AppView.DAILY_CASHBOOK, 'action=expense')}
                className="flex-1 sm:flex-none min-h-[56px] px-4 rounded-2xl bg-emerald-800/50 hover:bg-emerald-800/70 text-white font-bold text-sm cursor-pointer"
              >
                💸 Expense
              </button>
            )}
            <button
              onClick={() => onNavigate(AppView.PRODUCT_MANAGER)}
              className="flex-1 sm:flex-none min-h-[56px] px-4 rounded-2xl bg-emerald-800/50 hover:bg-emerald-800/70 text-white font-bold text-sm cursor-pointer"
            >
              📦 Add stock
            </button>
            <button
              onClick={() => onNavigate(AppView.INVOICE_GENERATOR)}
              className="flex-1 sm:flex-none min-h-[56px] px-4 rounded-2xl bg-emerald-800/50 hover:bg-emerald-800/70 text-white font-bold text-sm cursor-pointer"
            >
              🧾 Invoice
            </button>
          </div>
        </div>
      </Card>

      {/* 2. Today strip */}
      <div className={`grid gap-3 ${isStaff ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <StatTile
          label="Sales today" icon="🛒" tone="emerald" loading={loading && !summary}
          value={summary ? ngn(summary.total_sales_revenue) : undefined}
          hint={summary ? `${summary.sales_count} sale${summary.sales_count === 1 ? '' : 's'}` : undefined}
          onClick={() => onNavigate(AppView.DAILY_CASHBOOK)}
        />
        {!isStaff && (
          <StatTile
            label="Cash in till" icon="💵" tone="blue" loading={loading && !summary}
            value={summary ? ngn(summary.net_cash_in_till) : undefined}
            hint="Expected in your drawer"
            onClick={() => onNavigate(AppView.DAILY_CASHBOOK)}
          />
        )}
        {!isStaff && (
          <StatTile
            label="Owed to you" icon="📒" tone="rose"
            value={ngn(totalOwed)}
            hint={`${unpaid.length} debtor${unpaid.length === 1 ? '' : 's'}${overdue.length ? ` · ${overdue.length} overdue` : ''}`}
            onClick={() => onNavigate(AppView.DEBTOR_BOOK)}
          />
        )}
        <StatTile
          label="Low stock" icon="⚠️" tone="amber" loading={loading && !summary}
          value={summary ? String(lowStock.length) : undefined}
          hint={lowStock.length ? lowStock.slice(0, 2).map((p) => p.name).join(', ') : 'All good'}
          onClick={() => onNavigate(AppView.PRODUCT_MANAGER)}
        />
      </div>

      {/* 3. Do this next */}
      <Card>
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">✨ Do this next</h2>
        {loading && !summary ? (
          <div className="mt-3 space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : shownSuggestions.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">You're all caught up. 🎉 Nothing needs your attention right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {shownSuggestions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl ${toneClasses[s.tone]}`}>{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.detail}</p>
                </div>
                <Button variant="secondary" onClick={s.go}>{s.cta}</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* First-run checklist */}
      {showChecklist && (
        <Card className="border border-emerald-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">🚀 Get set up ({doneCount}/{checklist.length})</h2>
            <button onClick={() => { localStorage.setItem('sb_checklist_dismissed', 'true'); setChecklistHidden(true); }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 min-h-[44px] px-2 cursor-pointer">Hide</button>
          </div>
          <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <div className="mt-3 space-y-1">
            {checklist.map((c) => (
              <button key={c.id} onClick={c.go} disabled={c.done}
                className="w-full flex items-center gap-3 min-h-[48px] px-2 rounded-xl text-left hover:bg-slate-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${c.done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 text-transparent'}`}>✓</span>
                <span className={`text-sm font-semibold ${c.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{c.label}</span>
                {!c.done && <span className="ml-auto text-slate-300">›</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Weekly trend */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">Last 7 days</h2>
          {trends && <span className="text-sm font-bold text-slate-500">{ngn(trends.total_revenue)} sold</span>}
        </div>
        {series.length === 0 ? (
          loading ? <Skeleton className="h-24 mt-3" /> :
          <p className="text-sm text-slate-500 mt-2">Your weekly sales chart will appear after your first sale.</p>
        ) : (
          <div className="flex items-end gap-2 h-28 mt-4">
            {series.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${d.date}: ${ngn(d.revenue)}`}>
                <div
                  className={`w-full rounded-t-lg ${d.date === today ? 'bg-emerald-600' : 'bg-emerald-200'}`}
                  style={{ height: `${Math.max(4, (d.revenue / maxRev) * 100)}%` }}
                />
                <span className={`text-xs font-bold ${d.date === today ? 'text-emerald-700' : 'text-slate-400'}`}>{dayLabel(d.date)}</span>
              </div>
            ))}
          </div>
        )}
        {!isStaff && (
          <button
            onClick={() => navigate('/dashboard/insights')}
            className="mt-3 w-full min-h-[44px] rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
          >
            Show more insights ›
          </button>
        )}
      </Card>
    </div>
  );
};

export default Home;
