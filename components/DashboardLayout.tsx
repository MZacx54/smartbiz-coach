import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppView, User, CartItem, UserStats, ActionCard } from '../types';
import GlobalSearch from './GlobalSearch';
import { toast } from 'react-hot-toast';
import LiveSupportWidget from './LiveSupportWidget';
import { PWAInstallButton } from './PWAInstallPrompt';
import { OWNER_ONLY_VIEWS, QUICK_ADD, matchNav, sectionsForRole, NavRole, isAdminOrPartnerUser } from '../config/navigation';
import { useOwnerLock } from '../hooks/useOwnerLock';
import { useLanguage } from './ui';

interface DashboardLayoutProps {
    user: User;
    userStats: UserStats;
    actions: ActionCard[];
    cartItems: CartItem[];
    currentView: AppView;
    onNavigate: (view: AppView, params?: string) => void;
    onUpdateUser?: (user: User) => void;
    onUpdateCredits?: (credits: number) => void;
    onLogout?: () => void;
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    user,
    userStats,
    cartItems,
    currentView,
    onNavigate,
    onUpdateCredits,
    onLogout,
    children
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [tractionMode] = useState(() => localStorage.getItem('sb_idice_traction_mode') === 'true');
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Unified, cloud-synced Apprentice / Cashier Mode via shared hook
    const {
        isStaffMode: isCashierMode,
        isVerifying: isVerifyingPin,
        unlockError: pinError,
        setUnlockError: setPinError,
        lockToStaff: lockStaffMode,
        unlockOwner,
    } = useOwnerLock();
    const { lang, toggleLang, t } = useLanguage();

    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [enteredPin, setEnteredPin] = useState('');
    const [showPasswordText, setShowPasswordText] = useState(false);

    const role: NavRole = isCashierMode ? 'ATTENDANT' : 'OWNER';
    const sections = sectionsForRole(role);
    const { section: activeSection } = matchNav(location.pathname);
    const activeSectionId = activeSection?.id || 'home';
    const activeSectionData = sections.find((s) => s.id === activeSectionId);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success(t('Back online. Cloud sync active.', 'Network don come back. Cloud sync active.'), { icon: '☁️' });
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast(t('📶 You are offline. Your sales are saved on this phone.', '📶 Network no dey. Your sales dey save inside this phone.'), { duration: 5000 });
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [t]);

    useEffect(() => {
        const handleCreditsUpdated = (e: any) => {
            const newBal = e.detail;
            if (typeof newBal === 'number' && onUpdateCredits) onUpdateCredits(newBal);
        };
        window.addEventListener('smartbiz_credits_updated', handleCreditsUpdated);
        return () => window.removeEventListener('smartbiz_credits_updated', handleCreditsUpdated);
    }, [onUpdateCredits]);

    // Close profile menu on outside click
    useEffect(() => {
        if (!showProfile) return;
        const onDown = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [showProfile]);

    // Route guard: apprentices opening an owner-only page by URL get the password prompt
    useEffect(() => {
        if (isCashierMode && OWNER_ONLY_VIEWS.includes(currentView)) {
            navigate('/dashboard', { replace: true });
            setShowUnlockModal(true);
        }
    }, [isCashierMode, currentView, navigate]);

    const handleUnlockOwnerMode = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await unlockOwner(enteredPin);
        if (ok) {
            setShowUnlockModal(false);
            setEnteredPin('');
        }
    };

    const toggleTraction = () => {
        localStorage.setItem('sb_idice_traction_mode', String(!tractionMode));
        window.location.reload();
    };

    const go = (view: AppView, params?: string) => {
        if (isCashierMode && OWNER_ONLY_VIEWS.includes(view)) {
            setShowUnlockModal(true);
            return;
        }
        onNavigate(view, params);
        setShowQuickAdd(false);
        setShowProfile(false);
        window.scrollTo(0, 0);
    };

    const lockToStaff = async () => {
        await lockStaffMode();
        setShowProfile(false);
    };

    const businessName = user.businessName || user.business_name || 'My Business';
    const initial = businessName.charAt(0).toUpperCase();
    const quickItems = QUICK_ADD.filter((q) => role === 'OWNER' || q.attendant);
    const isAdmin = isAdminOrPartnerUser(user);

    /* ---------------- Desktop sidebar ---------------- */
    const Sidebar = (
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-slate-950 text-slate-300 h-screen sticky top-0">
            <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800/80">
                <img src="/favicon.png" alt="SmartBiz Coach" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-extrabold text-white text-base font-heading">SmartBiz Coach</span>
            </div>

            <div className="px-5 pt-4 pb-2">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    {isCashierMode ? t('Staff session', 'Apprentice / Staff') : t('Your business', 'Your shop')}
                </p>
                <p className="text-sm font-bold text-white truncate">{businessName}</p>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {sections.map((s) => {
                    const open = s.id === activeSectionId;
                    const single = s.children.length === 1;
                    const sLabel = lang === 'pcm' ? s.labelPcm || s.label : s.label;
                    return (
                        <div key={s.id}>
                            <button
                                onClick={() => go(s.children[0].view)}
                                className={`w-full flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer ${
                                    open ? 'bg-emerald-600/15 text-emerald-300' : 'hover:bg-slate-900 text-slate-300'
                                }`}
                            >
                                <span className="text-lg">{s.icon}</span>
                                <span>{sLabel}</span>
                            </button>
                            {open && !single && (
                                <div className="ml-5 pl-3 border-l border-slate-800 my-1 space-y-0.5">
                                    {s.children.map((c) => {
                                        const isActive = matchNav(location.pathname).leaf?.route === c.route;
                                        const cLabel = lang === 'pcm' ? c.labelPcm || c.label : c.label;
                                        return (
                                            <button
                                                key={c.route}
                                                onClick={() => go(c.view)}
                                                className={`w-full text-left flex items-center gap-2 px-3 min-h-[38px] rounded-lg text-[13px] transition-all cursor-pointer ${
                                                    isActive ? 'text-white font-bold bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                                }`}
                                            >
                                                <span>{c.icon}</span>
                                                <span className="truncate">{cLabel}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                {cartItems.length > 0 && !isCashierMode && (
                    <button
                        onClick={() => go(AppView.CART)}
                        className="w-full flex items-center justify-between px-3 min-h-[44px] rounded-xl text-sm font-bold hover:bg-slate-900 cursor-pointer"
                    >
                        <span className="flex items-center gap-3"><span className="text-lg">🛍️</span>Cart</span>
                        <span className="bg-rose-500 text-white text-[11px] px-2 py-0.5 rounded-full">{cartItems.length}</span>
                    </button>
                )}
            </nav>

            <div className="p-3 border-t border-slate-800/80">
                {isCashierMode ? (
                    <button
                        onClick={() => setShowUnlockModal(true)}
                        className="w-full min-h-[44px] rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-bold cursor-pointer"
                    >
                        🔒 {t('Staff Mode · Unlock', 'Staff Mode · Open am')}
                    </button>
                ) : (
                    <button
                        onClick={lockToStaff}
                        className="w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-bold cursor-pointer"
                    >
                        👤 {t('Hand over to staff', 'Give phone to apprentice')}
                    </button>
                )}
            </div>
        </aside>
    );

    /* ---------------- Profile menu ---------------- */
    const profileItems: { label: string; icon: string; onClick: () => void; hide?: boolean }[] = [
        { label: t('Settings & Security', 'Settings & Password'), icon: '⚙️', onClick: () => go(AppView.SETTINGS) },
        { label: t('Credits & Billing', 'Buy AI Credits'), icon: '⚡', onClick: () => go(AppView.SETTINGS, 'tab=billing'), hide: isCashierMode },
        { label: t('Help & Support', 'Help & Support'), icon: '🎧', onClick: () => go(AppView.WHATSAPP_SUPPORT) },
        { label: t('More insights', 'Full AI Insights'), icon: '📊', onClick: () => { setShowProfile(false); navigate('/dashboard/insights'); }, hide: isCashierMode },
        { label: 'Partner & Admin Terminal', icon: '🏛️', onClick: () => go(AppView.PARTNER_PORTAL), hide: isCashierMode || !isAdmin },
        { label: `Traction demo: ${tractionMode ? 'ON' : 'OFF'}`, icon: '📈', onClick: toggleTraction, hide: !isAdmin },
        { label: t('Log out', 'Comot (Log out)'), icon: '🚪', onClick: () => { setShowProfile(false); onLogout?.(); }, hide: !onLogout },
    ];

    const TopBar = (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
            <div className="flex items-center justify-between gap-3 px-3 sm:px-5 h-14 md:h-16">
                <div className="flex items-center gap-2 md:hidden">
                    <img src="/favicon.png" alt="" className="w-7 h-7 rounded-lg object-cover" />
                    <span className="font-extrabold text-slate-900 text-sm font-heading truncate max-w-[130px]">{businessName}</span>
                </div>
                <div className="hidden md:block flex-1 max-w-md">
                    <GlobalSearch onResultClick={() => onNavigate(AppView.PRODUCT_MANAGER)} />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {!isOnline && (
                        <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Offline</span>
                    )}
                    {isCashierMode && (
                        <button
                            onClick={() => setShowUnlockModal(true)}
                            className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 min-h-[32px] rounded-full cursor-pointer"
                        >
                            🔒 {t('Staff mode', 'Staff')}
                        </button>
                    )}
                    {/* 1-tap Market Square Shortcut */}
                    <button
                        onClick={() => go(AppView.MARKETPLACE)}
                        className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 min-h-[36px] rounded-full text-xs font-extrabold text-emerald-800 cursor-pointer"
                        title="Open National Market Square"
                    >
                        <span>🏪</span>
                        <span className="hidden sm:inline">{t('Market', 'Market')}</span>
                    </button>
                    {/* 1-tap English / Naija Pidgin Toggle */}
                    <button
                        onClick={toggleLang}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 min-h-[36px] rounded-full text-xs font-extrabold text-slate-700 cursor-pointer"
                        title="Switch between English and Naija Pidgin"
                    >
                        <span>🇳🇬</span>
                        <span>{lang === 'pcm' ? 'Pidgin' : 'EN'}</span>
                    </button>
                    <div className="hidden lg:block"><PWAInstallButton variant="nav" label="📲 Install" /></div>
                    {!isCashierMode && (
                        <button
                            onClick={() => go(AppView.SETTINGS, 'tab=billing')}
                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 sm:px-3 min-h-[36px] rounded-full text-xs sm:text-sm font-bold text-slate-700 cursor-pointer"
                            title="Your AI credits"
                        >
                            ⚡ {userStats.bizCredits}
                        </button>
                    )}
                    <button
                        onClick={() => setShowQuickAdd(true)}
                        className="hidden md:inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 min-h-[40px] rounded-full text-sm font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                        + {t('Quick add', 'Quick add')}
                    </button>
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setShowProfile((v) => !v)}
                            className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm cursor-pointer"
                            aria-label="Account menu"
                        >
                            {initial}
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50">
                                <div className="px-4 py-2 border-b border-slate-100">
                                    <p className="text-sm font-extrabold text-slate-900 truncate">{businessName}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                </div>
                                <button
                                    onClick={toggleLang}
                                    className="w-full text-left flex items-center justify-between px-4 min-h-[44px] text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    <span className="flex items-center gap-3"><span>🇳🇬</span>{t('Language', 'Language')}</span>
                                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                        {lang === 'pcm' ? 'Naija Pidgin' : 'English'}
                                    </span>
                                </button>
                                {profileItems.filter((i) => !i.hide).map((i) => (
                                    <button
                                        key={i.label}
                                        onClick={i.onClick}
                                        className="w-full text-left flex items-center gap-3 px-4 min-h-[44px] text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                        <span>{i.icon}</span>{i.label}
                                    </button>
                                ))}
                                {!isCashierMode && (
                                    <button
                                        onClick={lockToStaff}
                                        className="md:hidden w-full text-left flex items-center gap-3 px-4 min-h-[44px] text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                        <span>👤</span>{t('Hand over to staff', 'Give phone to apprentice')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section chips: how mobile users reach every page in the current section */}
            {activeSectionData && activeSectionData.children.length > 1 && (
                <div className="md:hidden flex gap-2 overflow-x-auto px-3 pb-2 no-scrollbar">
                    {activeSectionData.children.map((c) => {
                        const isActive = matchNav(location.pathname).leaf?.route === c.route;
                        const cLabel = lang === 'pcm' ? c.labelPcm || c.label : c.label;
                        return (
                            <button
                                key={c.route}
                                onClick={() => go(c.view)}
                                className={`shrink-0 px-3.5 min-h-[36px] rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                                    isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {c.icon} {cLabel}
                            </button>
                        );
                    })}
                </div>
            )}
        </header>
    );

    /* ---------------- Mobile bottom bar (4 tabs + centre quick-add + Grow) ---------------- */
    const Tab = ({ id }: { id: string }) => {
        const s = sections.find((x) => x.id === id);
        if (!s) return <div className="flex-1" />;
        const active = activeSectionId === id;
        const sLabel = lang === 'pcm' ? s.labelPcm || s.label : s.label;
        return (
            <button
                onClick={() => go(s.children[0].view)}
                className={`flex-1 flex flex-col items-center justify-center min-h-[56px] rounded-xl cursor-pointer ${
                    active ? 'text-emerald-400' : 'text-slate-400'
                }`}
            >
                <span className="text-xl leading-none">{s.icon}</span>
                <span className={`text-[11px] mt-1 ${active ? 'font-black' : 'font-semibold'}`}>{sLabel}</span>
            </button>
        );
    };

    const BottomBar = (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 px-1 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center">
                <Tab id="home" />
                <Tab id="sell" />
                <div className="flex-1 flex justify-center">
                    <button
                        onClick={() => setShowQuickAdd(true)}
                        aria-label="Quick add"
                        className="-mt-6 w-14 h-14 rounded-full bg-emerald-500 text-white text-3xl font-light shadow-xl shadow-emerald-500/30 border-4 border-slate-950 flex items-center justify-center cursor-pointer active:scale-95"
                    >
                        +
                    </button>
                </div>
                <Tab id="money" />
                <Tab id="stock" />
                {!isCashierMode && <Tab id="grow" />}
            </div>
        </nav>
    );

    /* ---------------- Quick-add sheet ---------------- */
    const QuickAddSheet = showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowQuickAdd(false)}>
            <div
                className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5 pb-8 md:pb-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-extrabold text-slate-900">
                        {t('What do you want to do?', 'Wetin you wan do now?')}
                    </h3>
                    <button onClick={() => setShowQuickAdd(false)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 cursor-pointer" aria-label="Close">✕</button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {quickItems.map((q) => (
                        <button
                            key={q.id}
                            onClick={() => go(q.view, q.params)}
                            className="flex items-center gap-3 px-4 min-h-[56px] rounded-2xl bg-slate-50 hover:bg-emerald-50 text-left text-sm font-bold text-slate-800 cursor-pointer"
                        >
                            <span className="text-2xl">{q.icon}</span>
                            {lang === 'pcm' ? q.labelPcm || q.label : q.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    /* ---------------- Unlock modal ---------------- */
    const UnlockModal = showUnlockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[60] no-print">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-2">🔐</div>
                    <h3 className="font-extrabold text-slate-900 text-base font-heading">
                        {t('Owner Security Verification', 'Oga / Madam Password Check')}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        {t(
                            'Enter your Owner Security Password or your SmartBiz login password to leave Staff Mode on all devices.',
                            'Put your Owner Security Password or your SmartBiz login password make you comot for Staff Mode.'
                        )}
                    </p>
                </div>
                <form onSubmit={handleUnlockOwnerMode} className="space-y-3">
                    <div className="relative">
                        <input
                            type={showPasswordText ? 'text' : 'password'}
                            autoFocus
                            placeholder={t('Owner password', 'Oga password')}
                            value={enteredPin}
                            onChange={(e) => { setEnteredPin(e.target.value); setPinError(''); }}
                            className="w-full text-center text-base font-bold py-3.5 px-10 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-amber-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswordText(!showPasswordText)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 cursor-pointer"
                            aria-label="Show or hide password"
                        >
                            {showPasswordText ? '🙈' : '👁️'}
                        </button>
                    </div>
                    {pinError && <p className="text-xs text-rose-600 font-bold text-center leading-relaxed">{pinError}</p>}
                    <button
                        type="submit"
                        disabled={isVerifyingPin}
                        className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-black text-sm rounded-xl cursor-pointer"
                    >
                        {isVerifyingPin ? t('Checking…', 'Dey check am…') : t('Unlock full access', 'Open Oga Mode')}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowUnlockModal(false); setEnteredPin(''); setPinError(''); }}
                        className="w-full min-h-[44px] text-slate-500 hover:text-slate-700 text-sm font-bold cursor-pointer"
                    >
                        {t('Stay in Staff Mode', 'Leave am for Staff Mode')}
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-slate-50">
            {Sidebar}
            <div className="flex-1 min-w-0 flex flex-col">
                {TopBar}
                <main className="flex-1 p-3 sm:p-5 md:p-8">
                    <div className="max-w-5xl mx-auto pb-28 md:pb-8">{children}</div>
                </main>
            </div>
            {BottomBar}
            {QuickAddSheet}
            <LiveSupportWidget credits={userStats.bizCredits} onUpdateCredits={onUpdateCredits} />
            {UnlockModal}
        </div>
    );
};

export default DashboardLayout;
