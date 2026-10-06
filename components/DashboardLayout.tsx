import React, { useState } from 'react';
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



    const toggleTraction = () => {
        const newVal = !tractionMode;
        setTractionMode(newVal);
        localStorage.setItem('sb_idice_traction_mode', String(newVal));
        window.location.reload();
    };

    const handleNavigate = (view: AppView, params?: string) => {
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
                    {/* Mobile Credits Quick Badge */}
                    <button
                        onClick={() => handleNavigate(AppView.SETTINGS, 'tab=billing')}
                        className="flex items-center gap-1 bg-emerald-950/90 border border-emerald-500/40 hover:border-emerald-400 px-2.5 py-1 rounded-xl text-emerald-300 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Available Credits. Tap to top up."
                    >
                        <span className="text-emerald-400">⚡</span>
                        <span>{userStats.bizCredits}</span>
                    </button>
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
                </nav>

                <div className="p-3 pb-24 md:pb-3 border-t border-emerald-950/60 bg-slate-950 shrink-0">
                    {!isCollapsed ? (
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
                            <div
                              onClick={() => handleNavigate(AppView.SETTINGS, 'tab=billing')}
                              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 cursor-pointer px-3 py-1.5 rounded-full transition-colors border border-slate-200"
                            >
                                <span className="text-sm">⚡</span>
                                <span className="text-sm font-bold text-slate-700">{userStats.bizCredits}</span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Credits</span>
                            </div>
                            <div className="text-right ml-2 hidden sm:block">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged in as</p>
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
        </div>
    );
};

export default DashboardLayout;
