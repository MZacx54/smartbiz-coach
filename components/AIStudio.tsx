import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandIdentity, User } from '../types';
import { useLanguage } from './ui';

const BrandBuilder = lazy(() => import('./BrandBuilder'));
const ContentStudio = lazy(() => import('./ContentStudio'));
const MarketingAgent = lazy(() => import('./MarketingAgent'));
const SalesAssistant = lazy(() => import('./SalesAssistant'));

export type AIStudioTab = 'brand' | 'content' | 'marketing' | 'sales';

interface AIStudioProps {
  initialTab?: AIStudioTab;
  savedBrand: BrandIdentity | null;
  onSaveBrand: (brand: BrandIdentity) => void;
  credits: number;
  onUpdateCredits: (credits: number) => void;
  user: User;
}

const TABS: {
  id: AIStudioTab;
  route: string;
  icon: string;
  labelEn: string;
  labelPcm: string;
  descEn: string;
  descPcm: string;
}[] = [
  {
    id: 'brand',
    route: '/dashboard/brand',
    icon: '✨',
    labelEn: 'Brand Kit',
    labelPcm: 'Brand Kit',
    descEn: 'Logo, colors, taglines & WhatsApp business kit',
    descPcm: 'Logo, color & business profile',
  },
  {
    id: 'content',
    route: '/dashboard/content',
    icon: '✍️',
    labelEn: 'Social & Ad Copy',
    labelPcm: 'Social & Flyers',
    descEn: 'Instagram captions, flyers, video scripts & posters',
    descPcm: 'Write post, flyer & advert sharp-sharp',
  },
  {
    id: 'marketing',
    route: '/dashboard/marketing',
    icon: '📣',
    labelEn: 'Broadcast HQ',
    labelPcm: 'Broadcast HQ',
    descEn: 'Send bulk WhatsApp & SMS campaigns to customers',
    descPcm: 'Send message give all your customers',
  },
  {
    id: 'sales',
    route: '/dashboard/sales-assistant',
    icon: '💬',
    labelEn: 'Sales Closer',
    labelPcm: 'Close Market',
    descEn: 'AI replies to handle price objections & close buyers',
    descPcm: 'Sweet mouth reply to convince customer buy',
  },
];

const AIStudio: React.FC<AIStudioProps> = ({
  initialTab = 'brand',
  savedBrand,
  onSaveBrand,
  credits,
  onUpdateCredits,
  user,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const resolveTabFromLocation = (): AIStudioTab => {
    const qTab = new URLSearchParams(location.search).get('tab') as AIStudioTab | null;
    if (qTab && ['brand', 'content', 'marketing', 'sales'].includes(qTab)) return qTab;
    const p = location.pathname;
    if (p.includes('/content')) return 'content';
    if (p.includes('/marketing')) return 'marketing';
    if (p.includes('/sales-assistant')) return 'sales';
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState<AIStudioTab>(resolveTabFromLocation);

  useEffect(() => {
    setActiveTab(resolveTabFromLocation());
  }, [location.pathname, location.search, initialTab]);

  const handleSelectTab = (tab: typeof TABS[number]) => {
    setActiveTab(tab.id);
    navigate(tab.route);
  };

  const currentTabMeta = TABS.find((item) => item.id === activeTab) || TABS[0];

  return (
    <div className="space-y-4">
      {/* Unified AI Studio Switcher Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 font-heading flex items-center gap-2">
              <span>🤖</span>
              <span>{t('AI Marketing & Sales Studio', 'AI Marketing & Sales Studio')}</span>
            </h1>
            <p className="text-xs text-slate-500">
              {t(currentTabMeta.descEn, currentTabMeta.descPcm)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full self-start sm:self-auto">
            ⚡ {credits} {t('AI credits available', 'AI credits dey')}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab)}
                className={`flex items-center gap-2.5 px-3.5 min-h-[48px] rounded-2xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-lg shrink-0">{tab.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold truncate">
                    {t(tab.labelEn, tab.labelPcm)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Studio Tool */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[320px] space-y-3 bg-white rounded-3xl border border-slate-100 p-8">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">
              {t('Loading AI tool...', 'Dey open AI tool...')}
            </p>
          </div>
        }
      >
        {activeTab === 'brand' && (
          <BrandBuilder
            savedBrand={savedBrand}
            onSave={onSaveBrand}
            credits={credits}
            onUpdateCredits={onUpdateCredits}
            user={user}
          />
        )}
        {activeTab === 'content' && (
          <ContentStudio
            brand={savedBrand}
            credits={credits}
            onUpdateCredits={onUpdateCredits}
          />
        )}
        {activeTab === 'marketing' && (
          <MarketingAgent
            user={user}
            credits={credits}
            onUpdateCredits={onUpdateCredits}
          />
        )}
        {activeTab === 'sales' && (
          <SalesAssistant
            credits={credits}
            onUpdateCredits={onUpdateCredits}
          />
        )}
      </Suspense>
    </div>
  );
};

export default AIStudio;
