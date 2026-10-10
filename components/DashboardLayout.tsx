import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppView, User, CartItem, UserStats, ActionCard } from '../types';
import GlobalSearch from './GlobalSearch';
import { toast } from 'react-hot-toast';
import LiveSupportWidget from './LiveSupportWidget';
import { PWAInstallButton } from './PWAInstallPrompt';

interface DashboardLayoutProps {
    user: User;
    userStats: UserStats;
    actions: ActionCard[];
    cartItems: CartItem[];
    currentView: AppView;
    onNavigate: (view: AppView, params?: string) => void;
    onUpdateUser?: (user: User) => void;
    onUpdateCredits?: (credits: number) => void;
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    user,
    userStats,
    actions,
    cartItems,
    currentView,
    onNavigate,
    onUpdateUser,
    onUpdateCredits,
    children
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();
    const [tractionMode, setTractionMode] = useState(() => localStorage.getItem('sb_idice_traction_mode') === 'true');

    // Recommendation 3: Offline-First PWA Mode state
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

    // Recommendation 4: Cashier vs Owner Mode state
    const [isCashierMode, setIsCashierMode] = useState(() => localStorage.getItem('sb_cashier_mode') === 'true');
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [enteredPin, setEnteredPin] = useState('');
    const [pinError, setPinError] = useState('');

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Internet connection restored! Cloud synchronization active.', { icon: '☁️' });
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast('📶 Network dropped. Open Market Offline Mode active.', { duration: 5000 });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const handleCreditsUpdated = (e: any) => {
            const newBal = e.detail;
            if (typeof newBal === 'number' && onUpdateCredits) {
                onUpdateCredits(newBal);
            }
        };
        window.addEventListener('smartbiz_credits_updated', handleCreditsUpdated);
        return () => window.removeEventListener('smartbiz_credits_updated', handleCreditsUpdated);
    }, [onUpdateCredits]);

    const handleUnlockOwnerMode = (e: React.FormEvent) => {
        e.preventDefault();
        const actualPin = localStorage.getItem('sb_owner_pin') || '1234';
        if (enteredPin === actualPin) {
            localStorage.setItem('sb_cashier_mode', 'false');
            setIsCashierMode(false);
            setShowUnlockModal(false);
            setEnteredPin('');
            setPinError('');
            toast.success('Owner Mode Unlocked! Full privileges restored.', { icon: '👑' });
        } else {
            setPinError('Incorrect Owner PIN. (Default PIN: 1234)');
        }
    };

    const toggleTraction = () => {
        const newVal = !tractionMode;
        setTractionMode(newVal);
        localStorage.setItem('sb_idice_traction_mode', String(newVal));
        window.location.reload();
    };

    const handleNavigate = (view: AppView, params?: string) => {
        const ownerOnlyViews = [
            AppView.SETTINGS,
            AppView.PRICING_ASSISTANT,
            AppView.BUSINESS_PLAN,
            AppView.GRANT_MATCHER,
            AppView.COMPLIANCE,
            AppView.DIGITAL_ROADMAP
        ];

        if (isCashierMode && ownerOnlyViews.includes(view)) {
            setShowUnlockModal(true);
            return;
        }

        onNavigate(view, params);
        setIsMenuOpen(false);
        window.scrollTo(0, 0);
    };

    const NavItem = ({
        view,
        label,
        icon,
    }: {
        view: AppView;
        label: string;
        icon: string;
    }) => (
        <button
            onClick={() => handleNavigate(view)}
            className={`flex items-center w-full p-2.5 rounded-xl transition-all duration-200 ${
                isCollapsed ? "justify-center space-x-0" : "space-x-3"
            } ${currentView === view
                ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/5 border-l-4 border-emerald-500 text-green-400 font-bold"
                : "text-slate-400 hover:bg-slate-900 hover:text-green-400"
                }`}
            title={isCollapsed ? label : undefined}
        >
            <span className="text-base">{icon}</span>
            {!isCollapsed && <span className="text-sm">{label}</span>}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans selection:bg-green-200">

            {/* Recommendation 3: Open Market Offline Mode Banner */}
            {!isOnline && (
                <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-50 sticky top-0">
                    <div className="flex items-center gap-2">
                        <span className="text-base animate-pulse">📶</span>
                        <span>
                            <strong>Open Market Offline Mode Active (Alaba/Balogun):</strong> Internet disconnected. Day-book sales, debtor records, and stock changes are saved safely on this device and will auto-sync to cloud when online.
                        </span>
                    </div>
                    <span className="bg-amber-900/60 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider hidden sm:inline-block">
                        Offline Safe
                    </span>
                </div>
            )}

            {/* Mobile Header */}
            <div className="md:hidden bg-slate-950 border-b border-emerald-950/45 p-4 flex justify-between items-center sticky top-0 z-20 text-white">
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleNavigate(AppView.DASHBOARD)}
                >
                    <img src="/favicon.png" alt="SmartBiz Coach" className="w-8 h-8 rounded-lg object-cover shadow-sm flex-shrink-0" />
                    <span className="font-extrabold text-base text-white font-heading">SmartBiz Coach</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Recommendation 4: Cashier Badge / Credits on Mobile */}
                    {isCashierMode ? (
                        <button
                            onClick={() => setShowUnlockModal(true)}
                            className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-1 rounded-xl text-xs font-bold transition-all active:scale-95"
                            title="Cashier Mode active. Tap to enter Owner PIN."
                        >
                            <span>👤</span>
                            <span>Cashier</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleNavigate(AppView.SETTINGS, 'tab=billing')}
                            className="flex items-center gap-1 bg-emerald-950/90 border border-emerald-500/40 hover:border-emerald-400 px-2.5 py-1 rounded-xl text-emerald-300 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Available Credits. Tap to top up."
                        >
                            <span className="text-emerald-400">⚡</span>
                            <span>{userStats.bizCredits}</span>
                        </button>
                    )}
                    <PWAInstallButton variant="nav" label="Install" />
                    {user?.email === 'meshachzax@gmail.com' && (
                        <button
                            onClick={toggleTraction}
                            className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
                                tractionMode
                                    ? 'bg-emerald-500 text-white border-emerald-450'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                        >
                            📈 {tractionMode ? 'ON' : 'OFF'}
                        </button>
                    )}
                    {cartItems.length > 0 && (
                        <button
                            onClick={() => handleNavigate(AppView.CART)}
                            className="relative text-lg"
                        >
                            🛒
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {cartItems.length}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-slate-300 focus:outline-none text-xl p-1 cursor-pointer"
                        title="Toggle Navigation Menu"
                    >
                        {isMenuOpen ? "✕" : "☰"}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer Backdrop Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <div
                className={`
          fixed inset-y-0 left-0 transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 transition-all duration-300 ease-in-out
          ${isCollapsed ? "md:w-20" : "md:w-64"} w-72 sm:w-64 bg-slate-950 border-r border-emerald-950/20 z-50 md:z-30 flex flex-col h-screen text-slate-100 shadow-2xl md:shadow-none
        `}
            >
                {/* Mobile Drawer Header */}
                <div className="p-4 border-b border-emerald-950/60 flex md:hidden items-center justify-between gap-2 bg-slate-950">
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => { handleNavigate(AppView.DASHBOARD); setIsMenuOpen(false); }}
                    >
                        <img src="/favicon.png" alt="SmartBiz Coach" className="w-7 h-7 rounded-lg object-cover" />
                        <span className="font-extrabold text-base text-white font-heading">SmartBiz Coach</span>
                    </div>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold cursor-pointer"
                        title="Close Menu"
                    >
                        ✕
                    </button>
                </div>

                {/* Desktop Header */}
                <div
                    className="p-5 border-b border-emerald-950/60 hidden md:flex items-center justify-between gap-2"
                >
                    <div
                        className="flex items-center gap-2 cursor-pointer min-w-0"
                        onClick={() => handleNavigate(AppView.DASHBOARD)}
                    >
                        <img src="/favicon.png" alt="SmartBiz Coach" className="w-8 h-8 rounded-lg object-cover shadow-sm flex-shrink-0" />
                        {!isCollapsed && (
                            <span className="font-extrabold text-lg text-white font-heading truncate">SmartBiz Coach</span>
                        )}
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-all hidden md:block flex-shrink-0"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? "▶" : "◀"}
                    </button>
                </div>

                {/* User Mini Profile */}
                {!isCollapsed && (
                    <div className="px-6 pt-6 pb-2">
                        <p className="text-[10px] font-black text-emerald-550 uppercase tracking-widest">
                            Business
                        </p>
                        <p className="font-bold text-white truncate mt-1 text-sm">
                            {user.businessName}
                        </p>
                    </div>
                )}

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {isCashierMode ? (
                        <>
                            <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mb-3 text-center">
                                <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">👤 Staff / Cashier Mode</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Sales & Stock tools only</p>
                            </div>
                            <NavItem view={AppView.DASHBOARD} label="Dashboard" icon="📊" />
                            <NavItem view={AppView.DAILY_CASHBOOK} label="Daily Day-Book" icon="⚡" />
                            <NavItem view={AppView.PRODUCT_MANAGER} label="Inventory & Stock" icon="📦" />
                            <NavItem view={AppView.DEBTOR_BOOK} label="Gbege (Debtors)" icon="📒" />
                            <NavItem view={AppView.INVOICE_GENERATOR} label="Invoices & Receipts" icon="🧾" />
                            <NavItem view={AppView.STOREFRONT} label="Public Store" icon="🔗" />
                        </>
                    ) : (
                        <>
                            <NavItem view={AppView.DASHBOARD} label="Dashboard" icon="📊" />
                            <NavItem view={AppView.DAILY_CASHBOOK} label="Daily Day-Book" icon="⚡" />
                            <NavItem view={AppView.PRODUCT_MANAGER} label="Inventory" icon="📦" />
                            <NavItem view={AppView.DEBTOR_BOOK} label="Gbege Book" icon="📒" />
                            <NavItem view={AppView.INVOICE_GENERATOR} label="Invoices & Receipts" icon="🧾" />
                            <NavItem view={AppView.BRAND_BUILDER} label="Brand Builder" icon="✨" />
                            <NavItem view={AppView.CONTENT_GENERATOR} label="Content Gen" icon="✍️" />

                            {!isCollapsed ? (
                                <div className="pt-4 pb-1 px-3">
                                    <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">
                                        Marketplace Ecosystem
                                    </p>
                                </div>
                            ) : (
                                <div className="border-t border-slate-800/40 my-3" />
                            )}
                            
                            <NavItem view={AppView.MARKETPLACE} label="Market Square" icon="🏛️" />
                            <NavItem view={AppView.MARKETING_AGENT} label="Broadcast HQ" icon="📣" />
                            <NavItem view={AppView.LEAD_MANAGER} label="Lead Inbox" icon="📬" />
                            <NavItem view={AppView.STOREFRONT} label="Public Store" icon="🔗" />
                            <NavItem view={AppView.SALES_ASSISTANT} label="Sales Closer" icon="💬" />

                            {cartItems.length > 0 && (
                                <button
                                    onClick={() => handleNavigate(AppView.CART)}
                                    className={`flex items-center justify-between w-full p-2.5 rounded-xl transition-all ${currentView === AppView.CART
                                        ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/5 border-l-4 border-emerald-500 text-green-400 font-bold"
                                        : "text-slate-400 hover:bg-slate-900 hover:text-green-400"
                                        }`}
                                    title={isCollapsed ? "Cart" : undefined}
                                >
                                    <div className="flex items-center gap-3">
                                        <span>🛍️</span>
                                        {!isCollapsed && <span className="text-sm">Cart</span>}
                                    </div>
                                    {!isCollapsed && (
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            {cartItems.length}
                                        </span>
                                    )}
                                </button>
                            )}

                            <NavItem view={AppView.BUSINESS_PLAN} label="Business Plan" icon="📈" />
                            <NavItem view={AppView.DATA_SCIENCE_HUB} label="ML Intelligence" icon="⚡" />
                            <NavItem view={AppView.GRANT_MATCHER} label="Find Funding" icon="💰" />
                            <NavItem view={AppView.DIGITAL_ROADMAP} label="Growth Roadmap" icon="🗺️" />
                            <NavItem view={AppView.LEARNING_HUB} label="Learning Hub" icon="🎓" />

                            {!isCollapsed ? (
                                <div className="pt-4 pb-1 px-3">
                                    <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">
                                        Help
                                    </p>
                                </div>
                            ) : (
                                <div className="border-t border-slate-800/40 my-3" />
                            )}
                            <NavItem view={AppView.COMPLIANCE} label="Compliance" icon="⚖️" />
                            <NavItem view={AppView.WHATSAPP_SUPPORT} label="Live Support" icon="🎧" />
                            <NavItem view={AppView.SETTINGS} label="Settings" icon="⚙️" />
                        </>
                    )}
                </nav>

                <div className="p-3 pb-24 md:pb-3 border-t border-emerald-950/60 bg-slate-950 shrink-0">
                    {isCashierMode ? (
                        !isCollapsed ? (
                            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-center space-y-2">
                                <span className="text-xl">🔒</span>
                                <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Owner Access Locked</p>
                                <p className="text-[10px] text-slate-400 leading-tight">Financial payouts & billing hidden</p>
                                <button
                                    onClick={() => setShowUnlockModal(true)}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs py-2 rounded-xl transition-all border border-amber-500/20 cursor-pointer"
                                >
                                    Unlock with PIN
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowUnlockModal(true)}
                                className="w-full bg-slate-900 p-2 rounded-xl text-center border border-slate-800 text-amber-400 text-xs font-bold"
                                title="Unlock Owner Mode"
                            >
                                🔒
                            </button>
                        )
                    ) : (
                        !isCollapsed ? (
                            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-4 rounded-2xl text-white text-center shadow-lg relative overflow-hidden border border-emerald-900/40">
                                <div className="absolute -right-4 -top-4 text-4xl opacity-10">⚡</div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                                    Available Credits
                                </p>
                                <p className="text-3xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                                    {userStats.bizCredits}
                                </p>
                                <button
                                    onClick={() => handleNavigate(AppView.SETTINGS, 'tab=billing')}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                                >
                                    ⚡ Top Up Balance
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleNavigate(AppView.SETTINGS, 'tab=billing')}
                                className="w-full bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-2 rounded-xl text-center shadow-md border border-emerald-900/40 flex flex-col items-center justify-center gap-1 hover:border-emerald-500/60 transition-all"
                                title="Available Credits. Click to Top Up."
                            >
                                <span className="text-[9px] font-bold text-emerald-450">⚡</span>
                                <span className="text-xs font-black text-green-400">{userStats.bizCredits}</span>
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-slate-50/30">
                <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-28 md:pb-8">
                    {/* Header with Search */}
                    <header className="hidden md:flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 sticky top-0 z-20 shadow-sm">
                        <GlobalSearch onResultClick={(item) => onNavigate(AppView.PRODUCT_MANAGER)} />
                        
                        <div className="flex items-center gap-3">
                            {isCashierMode ? (
                                <button
                                    onClick={() => setShowUnlockModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-700 font-bold text-xs hover:bg-amber-500/25 transition-all cursor-pointer"
                                    title="Click to enter Owner PIN and return to Owner Mode"
                                >
                                    <span>👤 Cashier Mode</span>
                                    <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">Unlock</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        localStorage.setItem('sb_cashier_mode', 'true');
                                        setIsCashierMode(true);
                                        toast('👤 Cashier Mode Activated. Handing device to staff.', { duration: 4000 });
                                    }}
                                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                                    title="Lock sensitive financial and payout settings before handing device to sales attendants"
                                >
                                    <span>🔒 Staff Mode</span>
                                </button>
                            )}

                            <PWAInstallButton variant="nav" label="📲 Install App" />
                            {user?.email === 'meshachzax@gmail.com' && (
                                <button
                                    onClick={toggleTraction}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                                        tractionMode
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-450 shadow-sm shadow-emerald-100'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200 hover:text-slate-700'
                                    }`}
                                >
                                    <span>📈</span>
                                    <span>Traction Mode: {tractionMode ? 'ON' : 'OFF'}</span>
                                </button>
                            )}
                            
                            {!isCashierMode ? (
                                <div
                                  onClick={() => handleNavigate(AppView.SETTINGS, 'tab=billing')}
                                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 cursor-pointer px-3 py-1.5 rounded-full transition-colors border border-slate-200"
                                >
                                    <span className="text-sm">⚡</span>
                                    <span className="text-sm font-bold text-slate-700">{userStats.bizCredits}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Credits</span>
                                </div>
                            ) : (
                                <div
                                  onClick={() => setShowUnlockModal(true)}
                                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 cursor-pointer px-3 py-1.5 rounded-full transition-colors border border-slate-200"
                                  title="Credits hidden in Cashier Mode. Tap to unlock."
                                >
                                    <span className="text-sm">⚡</span>
                                    <span className="text-sm font-bold text-slate-700">••••</span>
                                </div>
                            )}

                            <div className="text-right ml-2 hidden sm:block">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {isCashierMode ? 'Attendant Session' : 'Logged in as'}
                                </p>
                                <p className="text-xs font-bold text-slate-800">{user.businessName}</p>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-emerald-100">
                                {user.businessName?.charAt(0) || 'B'}
                            </div>
                        </div>
                    </header>

                    {children}
                </div>
            </main>



            {/* Mobile Bottom Navigation Dock (Sticky for 1-thumb quick action) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-lg border-t border-emerald-900/40 px-2 py-1.5 flex justify-around items-center shadow-2xl">
                <button
                    onClick={() => handleNavigate(AppView.DASHBOARD)}
                    className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                        currentView === AppView.DASHBOARD
                            ? 'text-emerald-400 bg-emerald-950/60 font-black'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <span className="text-lg leading-none">📊</span>
                    <span className="text-[10px] mt-1 font-bold">Home</span>
                </button>

                <button
                    onClick={() => handleNavigate(AppView.DAILY_CASHBOOK)}
                    className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                        currentView === AppView.DAILY_CASHBOOK
                            ? 'text-emerald-400 bg-emerald-950/60 font-black'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <span className="text-lg leading-none">⚡</span>
                    <span className="text-[10px] mt-1 font-bold">Day-Book</span>
                </button>

                <button
                    onClick={() => handleNavigate(AppView.PRODUCT_MANAGER)}
                    className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                        currentView === AppView.PRODUCT_MANAGER
                            ? 'text-emerald-400 bg-emerald-950/60 font-black'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <span className="text-lg leading-none">📦</span>
                    <span className="text-[10px] mt-1 font-bold">Stock</span>
                </button>

                <button
                    onClick={() => handleNavigate(AppView.DEBTOR_BOOK)}
                    className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                        currentView === AppView.DEBTOR_BOOK
                            ? 'text-emerald-400 bg-emerald-950/60 font-black'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <span className="text-lg leading-none">📒</span>
                    <span className="text-[10px] mt-1 font-bold">Gbege</span>
                </button>

                <button
                    onClick={() => handleNavigate(AppView.INVOICE_GENERATOR)}
                    className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                        currentView === AppView.INVOICE_GENERATOR
                            ? 'text-emerald-400 bg-emerald-950/60 font-black'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <span className="text-lg leading-none">🧾</span>
                    <span className="text-[10px] mt-1 font-bold">Invoices</span>
                </button>
            </nav>

            {/* Global Floating Live Support Widget */}
            <LiveSupportWidget credits={userStats.bizCredits} onUpdateCredits={onUpdateCredits} />

            {/* Cashier / Staff Mode PIN Unlock Modal */}
            {showUnlockModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-2">
                                🔐
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-base font-heading">
                                Enter Owner PIN
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Enter your 4-digit security PIN to unlock full administrative features.
                            </p>
                        </div>

                        <form onSubmit={handleUnlockOwnerMode} className="space-y-3">
                            <div>
                                <input
                                    type="password"
                                    maxLength={8}
                                    autoFocus
                                    placeholder="••••"
                                    value={enteredPin}
                                    onChange={(e) => {
                                        setEnteredPin(e.target.value);
                                        setPinError('');
                                    }}
                                    className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-amber-500 focus:bg-white transition-all"
                                />
                                {pinError && (
                                    <p className="text-[11px] text-rose-500 font-bold mt-1 text-center">{pinError}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                            >
                                Unlock Full Access
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUnlockModal(false);
                                    setEnteredPin('');
                                    setPinError('');
                                }}
                                className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                            >
                                Keep in Cashier Mode
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
