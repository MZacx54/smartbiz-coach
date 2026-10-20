import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppView, User, UserStats, Debtor } from '../types';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { storeShareUrl } from '../services/commerceService';
import { useOwnerLock } from '../hooks/useOwnerLock';
import { Card, Button, StatTile, Skeleton, PageHeader, useLanguage } from './ui';

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

const Home: React.FC<HomeProps> = ({ user, onNavigate }) => {
  const navigate = useNavigate();
  const today = localDate();
  const { isStaffMode: isStaff } = useOwnerLock();
  const { t } = useLanguage();

  const [summary, setSummary] = useState<Summary | null>(() => readCache<Summary>(`sb_home_summary_${today}`));
  const [trends, setTrends] = useState<Trends | null>(() => readCache<Trends>('sb_home_trends'));
  const [loading, setLoading] = useState(!summary);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [featuredMarket, setFeaturedMarket] = useState<any[]>([]);
  const [checklistHidden, setChecklistHidden] = useState(() => localStorage.getItem('sb_checklist_dismissed') === 'true');
  const [storeShared, setStoreShared] = useState(() => localStorage.getItem('sb_store_shared') === 'true');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [s, tRes, p, mkt] = await Promise.allSettled([
        api.get(`/api/marketplace/daily-summary/?date=${today}`, { timeout: 8000 }),
        api.get('/api/marketplace/daily-trends/?days=7', { timeout: 8000 }),
        api.get('/api/marketplace/products/', { timeout: 8000 }),
        api.get('/api/marketplace/global/?sort_by=boosted', { timeout: 8000 }),
      ]);
      if (cancelled) return;
      if (s.status === 'fulfilled' && s.value?.data) {
        setSummary(s.value.data);
        try { localStorage.setItem(`sb_home_summary_${today}`, JSON.stringify(s.value.data)); } catch { /* ignore */ }
      }
      if (tRes.status === 'fulfilled' && tRes.value?.data) {
        setTrends(tRes.value.data);
        try { localStorage.setItem('sb_home_trends', JSON.stringify(tRes.value.data)); } catch { /* ignore */ }
      }
      if (p.status === 'fulfilled') {
        const d = p.value?.data;
        setProductCount(Array.isArray(d) ? d.length : Array.isArray(d?.results) ? d.results.length : 0);
      }
      if (mkt.status === 'fulfilled' && Array.isArray(mkt.value?.data)) {
        setFeaturedMarket(mkt.value.data.slice(0, 6));
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
  const greetingEn = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingPcm = hour < 12 ? 'How market this morning' : hour < 17 ? 'How market today' : 'Well done today';
  const firstName = (user.name || user.businessName || 'there').split(' ')[0];
  const businessName = user.businessName || user.business_name || 'your business';
  const dateLabel = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });

  /* ---- "Do this next": simple rules on your own data (no guesswork) ---- */
  const suggestions: Suggestion[] = [];
  if (overdue.length > 0 && !isStaff) {
    const top = overdue[0];
    suggestions.push({
      id: 'overdue', icon: '📒', tone: 'rose',
      title: t(`${top.name} owes you ${ngn(top.amount)}`, `${top.name} dey owe you ${ngn(top.amount)}`),
      detail: overdue.length > 1
        ? t(`Plus ${overdue.length - 1} more overdue. Send a polite reminder today.`, `Plus ${overdue.length - 1} other person. Send WhatsApp reminder sharp-sharp.`)
        : t('This payment is overdue. Send a polite reminder.', 'Time don pass for this money. Send WhatsApp reminder now.'),
      cta: t('Remind', 'Remind am'),
      go: () => onNavigate(AppView.DEBTOR_BOOK),
    });
  }
  if (lowStock.length > 0) {
    const item = lowStock[0];
    suggestions.push({
      id: 'stock', icon: '📦', tone: 'amber',
      title: t(`Restock ${item.name}`, `${item.name} wan finish for shop`),
      detail: t(
        `Only ${item.stock_count} left${lowStock.length > 1 ? ` (and ${lowStock.length - 1} other items are low)` : ''}.`,
        `Na only ${item.stock_count} remain${lowStock.length > 1 ? ` (plus ${lowStock.length - 1} other market)` : ''}.`
      ),
      cta: t('Open stock', 'Check stock'),
      go: () => onNavigate(AppView.PRODUCT_MANAGER),
    });
  }
  if (!loading && salesToday === 0 && hour >= 10) {
    suggestions.push({
      id: 'nosale', icon: '⚡', tone: 'emerald',
      title: t('No sales recorded yet today', 'You never record any sale today'),
      detail: t(
        'Record each sale as it happens so your till and profit stay accurate.',
        'Anytime you sell market, press Record Sale make your money & profit intact.'
      ),
      cta: t('Record sale', 'Record sale'),
      go: () => onNavigate(AppView.DAILY_CASHBOOK, 'action=sale'),
    });
  }
  const score = readCache<any>('sb_ml_overview_cache')?.credit?.credit_score;
  if (score && !isStaff) {
    suggestions.push({
      id: 'score', icon: '💰', tone: 'blue',
      title: t(`Your SmartScore is ${score}`, `Your SmartScore na ${score}`),
      detail: t('See grants and loans you may qualify for.', 'Check grants & business money wey fit your shop.'),
      cta: t('Find funding', 'Check grant'),
      go: () => onNavigate(AppView.GRANT_MATCHER),
    });
  }
  const shownSuggestions = suggestions.slice(0, 3);

  /* ---- First-run checklist ---- */
  const hasPasscode = localStorage.getItem('sb_has_owner_passcode') === 'true';
  const hasSold = (trends?.total_revenue || 0) > 0 || salesToday > 0;
  const checklist = [
    {
      id: 'product',
      label: t('Add your first product', 'Add your first market/product'),
      done: (productCount ?? 0) > 0,
      go: () => onNavigate(AppView.PRODUCT_MANAGER, 'action=new'),
    },
    {
      id: 'sale',
      label: t('Record your first sale', 'Record your first sale'),
      done: hasSold,
      go: () => onNavigate(AppView.DAILY_CASHBOOK, 'action=sale'),
    },
    {
      id: 'pass',
      label: t('Set your Owner password', 'Set your Oga/Owner password'),
      done: hasPasscode,
      go: () => onNavigate(AppView.SETTINGS, 'tab=preferences'),
    },
    {
      id: 'store',
      label: t('Share your online store link', 'Share your online shop link for WhatsApp'),
      done: storeShared,
      go: () => {
        localStorage.setItem('sb_store_shared', 'true');
        setStoreShared(true);
        onNavigate(AppView.STOREFRONT);
      },
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
      <PageHeader
        title={`${t(greetingEn, greetingPcm)}, ${firstName} 👋`}
        subtitle={`${businessName} · ${dateLabel}`}
      />

      {/* 1. One primary action */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 border-0 text-white">
        <p className="text-sm font-semibold text-emerald-100">
          {t('Made a sale?', 'You just sell something?')}
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onNavigate(AppView.DAILY_CASHBOOK, 'action=sale')}
            className="flex-1 min-h-[56px] rounded-2xl bg-white text-emerald-700 font-black text-base shadow-lg active:scale-[0.98] cursor-pointer"
          >
            ⚡ {t('Record a sale', 'Record Sale Now')}
          </button>
          <div className="flex gap-2">
            {!isStaff && (
              <button
                onClick={() => onNavigate(AppView.DAILY_CASHBOOK, 'action=expense')}
                className="flex-1 sm:flex-none min-h-[56px] px-4 rounded-2xl bg-emerald-800/50 hover:bg-emerald-800/70 text-white font-bold text-sm cursor-pointer"
              >
                💸 {t('Expense', 'Expense')}
              </button>
            )}
            <button
              onClick={() => onNavigate(AppView.PRODUCT_MANAGER, 'action=new')}
              className="flex-1 sm:flex-none min-h-[56px] px-4 rounded-2xl bg-emerald-800/50 hover:bg-emerald-800/70 text-white font-bold text-sm cursor-pointer"
            >
              📦 {t('Add stock', 'Add stock')}
            </button>
            <button
              onClick={() => onNavigate(AppView.INVOICE_GENERATOR)}
              className="flex-1 sm:flex-none min-h-[56px] px-4 rounded-2xl bg-emerald-800/50 hover:bg-emerald-800/70 text-white font-bold text-sm cursor-pointer"
            >
              🧾 {t('Invoice', 'Receipt')}
            </button>
          </div>
        </div>
      </Card>

      {/* 2. Today strip */}
      <div className={`grid gap-3 ${isStaff ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <StatTile
          label={t('Sales today', 'Market today')}
          icon="🛒" tone="emerald" loading={loading && !summary}
          value={summary ? ngn(summary.total_sales_revenue) : undefined}
          hint={summary ? `${summary.sales_count} ${t(summary.sales_count === 1 ? 'sale' : 'sales', 'sales')}` : undefined}
          onClick={() => onNavigate(AppView.DAILY_CASHBOOK)}
        />
        {!isStaff && (
          <StatTile
            label={t('Cash in till', 'Cash for drawer')}
            icon="💵" tone="blue" loading={loading && !summary}
            value={summary ? ngn(summary.net_cash_in_till) : undefined}
            hint={t('Expected in your drawer', 'Money wey suppose dey hand')}
            onClick={() => onNavigate(AppView.DAILY_CASHBOOK)}
          />
        )}
        {!isStaff && (
          <StatTile
            label={t('Owed to you', 'Gbege (Debtors)')}
            icon="📒" tone="rose"
            value={ngn(totalOwed)}
            hint={`${unpaid.length} ${t(unpaid.length === 1 ? 'debtor' : 'debtors', 'people')}${overdue.length ? ` · ${overdue.length} overdue` : ''}`}
            onClick={() => onNavigate(AppView.DEBTOR_BOOK)}
          />
        )}
        <StatTile
          label={t('Low stock', 'Market wey low')}
          icon="⚠️" tone="amber" loading={loading && !summary}
          value={summary ? String(lowStock.length) : undefined}
          hint={lowStock.length ? lowStock.slice(0, 2).map((p) => p.name).join(', ') : t('All good', 'Stock full')}
          onClick={() => onNavigate(AppView.PRODUCT_MANAGER)}
        />
      </div>

      {/* 3. Do this next */}
      <Card>
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          ✨ {t('Do this next', 'Wetin to do next')}
        </h2>
        {loading && !summary ? (
          <div className="mt-3 space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : shownSuggestions.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">
            {t("You're all caught up. 🎉 Nothing needs your attention right now.", "Everything set! 🎉 Nothing dey hold your shop right now.")}
          </p>
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
            <h2 className="text-base font-extrabold text-slate-900">
              🚀 {t(`Get set up (${doneCount}/${checklist.length})`, `Set up your shop (${doneCount}/${checklist.length})`)}
            </h2>
            <button onClick={() => { localStorage.setItem('sb_checklist_dismissed', 'true'); setChecklistHidden(true); }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 min-h-[44px] px-2 cursor-pointer">
              {t('Hide', 'Comot am')}
            </button>
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
          <h2 className="text-base font-extrabold text-slate-900">{t('Last 7 days', 'Last 7 days market')}</h2>
          {trends && <span className="text-sm font-bold text-slate-500">{ngn(trends.total_revenue)} {t('sold', 'sold')}</span>}
        </div>
        {series.length === 0 ? (
          loading ? <Skeleton className="h-24 mt-3" /> :
          <p className="text-sm text-slate-500 mt-2">
            {t('Your weekly sales chart will appear after your first sale.', 'Your 7-day sales chart go show once you record your first sale.')}
          </p>
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
            {t('Show more insights ›', 'See full AI business insights ›')}
          </button>
        )}
      </Card>

      {/* 5. National Market Square & Public Storefront Spotlight */}
      <Card className="space-y-4 border border-emerald-100/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              🇳🇬 {t('National Market Square & Your Store', 'Market Square & Your Public Shop')}
            </h2>
            <p className="text-xs text-slate-500">
              {t(
                'Share your public storefront link with customers or explore verified products across Nigeria.',
                'Share your shop link for WhatsApp Status or check wetin other people dey sell for Market Square.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const rawSlug = (user as any)?.brand_slug || businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const url = storeShareUrl(rawSlug || 'my-store');
                navigator.clipboard?.writeText(url);
                localStorage.setItem('sb_store_shared', 'true');
                setStoreShared(true);
                toast.success('Public store link copied! Ready to paste on WhatsApp.');
              }}
              className="px-3.5 min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold cursor-pointer"
            >
              🔗 {t('Copy Store Link', 'Copy Shop Link')}
            </button>
            <button
              onClick={() => onNavigate(AppView.ORDER_INBOX)}
              className="px-3.5 min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold cursor-pointer"
            >
              📦 {t('Online Orders', 'Online Orders')}
            </button>
            <button
              onClick={() => onNavigate(AppView.MARKETPLACE)}
              className="px-4 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm cursor-pointer"
            >
              🏪 {t('Open Market Square →', 'Enter Market Square →')}
            </button>
          </div>
        </div>

        {featuredMarket.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            {featuredMarket.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(item.brand_slug ? `/u/${item.brand_slug}/p/${item.id}` : `/market/p/${item.id}`)}
                className="group bg-slate-50 hover:bg-white rounded-2xl border border-slate-200/70 hover:border-emerald-400 p-2.5 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square rounded-xl bg-slate-200/60 overflow-hidden mb-2 relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                    )}
                    {item.is_promoted && (
                      <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                        ⚡ Boosted
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-extrabold text-slate-800 line-clamp-1">{item.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{item.brand_name || 'Verified MSME'}</p>
                </div>
                <p className="text-xs font-black text-emerald-700 mt-1.5">
                  ₦{Number(item.price || 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Home;
