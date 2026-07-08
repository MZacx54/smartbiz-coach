import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppView, User, CartItem, UserStats, ActionCard } from '../types';
import GlobalSearch from './GlobalSearch';
import { toast } from 'react-hot-toast';

interface DashboardLayoutProps {
    user: User;
    userStats: UserStats;
    actions: ActionCard[];
    cartItems: CartItem[];
    currentView: AppView;
    onNavigate: (view: AppView) => void;
    onUpdateUser?: (user: User) => void;
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
    children
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const [tractionMode, setTractionMode] = useState(() => localStorage.getItem('sb_idice_traction_mode') === 'true');

    const [showClaimModal, setShowClaimModal] = useState(false);
    const [claimEmail, setClaimEmail] = useState('');
    const [claimPhone, setClaimPhone] = useState('');
    const [claimPassword, setClaimPassword] = useState('');
    const [claimBusinessName, setClaimBusinessName] = useState(user.businessName || '');
    const [isClaiming, setIsClaiming] = useState(false);

    const handleClaimAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!claimEmail || !claimPassword || !claimPhone || !claimBusinessName) {
            toast.error("Please fill in all fields to secure your workspace!");
            return;
        }
        setIsClaiming(true);
        try {
            const { authService } = await import('../services/authService');
            await authService.updateProfile({
                email: claimEmail,
                username: claimEmail,
                password: claimPassword,
                phone: claimPhone,
                business_name: claimBusinessName
            });
            const updatedUser: User = {
                ...user,
                email: claimEmail,
                phone: claimPhone,
                businessName: claimBusinessName,
                business_name: claimBusinessName
            };
            localStorage.setItem('sb_user', JSON.stringify(updatedUser));
            if (onUpdateUser) {
                onUpdateUser(updatedUser);
            }
            toast.success("Workspace secured successfully! Welcome to SmartBiz Coach.");
            setShowClaimModal(false);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to secure workspace. Please try again.");
        } finally {
            setIsClaiming(false);
        }
    };

    const toggleTraction = () => {
        const newVal = !tractionMode;
        setTractionMode(newVal);
        localStorage.setItem('sb_idice_traction_mode', String(newVal));
        window.location.reload();
    };

    const handleNavigate = (view: AppView) => {
        onNavigate(view);
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
            className={`flex items-center space-x-3 w-full p-2.5 rounded-xl transition-all duration-200 ${currentView === view
                ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/5 border-l-4 border-emerald-500 text-green-400 font-bold"
                : "text-slate-400 hover:bg-slate-900 hover:text-green-400"
                }`}
        >
            <span className="text-base">{icon}</span>
            <span className="text-sm">{label}</span>
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
                    <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-md">S</div>
                    <span className="font-extrabold text-base text-white font-heading">SmartBiz Coach</span>
                </div>
                <div className="flex items-center gap-4">
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
                        className="text-slate-300 focus:outline-none text-xl"
                    >
                        {isMenuOpen ? "✕" : "☰"}
                    </button>
                </div>
            </div>

            {/* Sidebar Navigation */}
            <div
                className={`
          fixed inset-y-0 left-0 transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
          w-64 bg-slate-950 border-r border-emerald-950/20 z-30 flex flex-col h-screen text-slate-100
        `}
            >
                <div
                    className="p-6 border-b border-emerald-950/60 hidden md:flex items-center gap-2 cursor-pointer"
                    onClick={() => handleNavigate(AppView.DASHBOARD)}
                >
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-extrabold shadow-md">S</div>
                    <span className="font-extrabold text-lg text-white font-heading">SmartBiz Coach</span>
                </div>

                {/* User Mini Profile */}
                <div className="px-6 pt-6 pb-2">
                    <p className="text-[10px] font-black text-emerald-550 uppercase tracking-widest">
                        Business
                    </p>
                    <p className="font-bold text-white truncate mt-1 text-sm">
                        {user.businessName}
                    </p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavItem view={AppView.DASHBOARD} label="Dashboard" icon="📊" />
                    <NavItem view={AppView.BRAND_BUILDER} label="Brand Builder" icon="✨" />
                    <NavItem view={AppView.CONTENT_GENERATOR} label="Content Gen" icon="✍️" />
                    <NavItem view={AppView.INVOICE_GENERATOR} label="Invoices" icon="🧾" />
                    <NavItem view={AppView.ORDER_GENERATOR} label="Order Gen" icon="📄" />
                    <NavItem view={AppView.PRODUCT_MANAGER} label="Inventory" icon="📦" />
                    <NavItem view={AppView.DEBTOR_BOOK} label="Gbege Book" icon="📒" />

                    <div className="pt-4 pb-1 px-3">
                        <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">
                            Marketplace Ecosystem
                        </p>
                    </div>
                    <NavItem view={AppView.MARKETPLACE} label="Market Square" icon="🏛️" />
                    <NavItem view={AppView.HUB} label="SmartBiz Hub" icon="🤝" />
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
                        >
                            <div className="flex items-center gap-3">
                                <span>🛍️</span>
                                <span className="text-sm">Cart</span>
                            </div>
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {cartItems.length}
                            </span>
                        </button>
                    )}

                    <NavItem view={AppView.BUSINESS_PLAN} label="Business Plan" icon="📈" />
                    <NavItem view={AppView.GRANT_MATCHER} label="Find Funding" icon="💰" />
                    <NavItem view={AppView.DIGITAL_ROADMAP} label="Growth Roadmap" icon="🗺️" />
                    <NavItem view={AppView.LEARNING_HUB} label="Learning Hub" icon="🎓" />

                    <div className="pt-4 pb-1 px-3">
                        <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">
                            Help
                        </p>
                    </div>
                    <NavItem view={AppView.COMPLIANCE} label="Compliance" icon="⚖️" />
                    <NavItem view={AppView.WHATSAPP_SUPPORT} label="Live Support" icon="🎧" />
                    <NavItem view={AppView.SETTINGS} label="Settings" icon="⚙️" />
                </nav>

                <div className="p-4 border-t border-emerald-950/60">
                    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-4 rounded-2xl text-white text-center shadow-lg relative overflow-hidden border border-emerald-900/40">
                        <div className="absolute -right-4 -top-4 text-4xl opacity-10">⚡</div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                            Available Credits
                        </p>
                        <p className="text-3xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                            {userStats.bizCredits}
                        </p>
                        <button
                            onClick={() => handleNavigate(AppView.SETTINGS)}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                        >
                            ⚡ Top Up Balance
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-slate-50/30">
                <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0">
                    {/* Header with Search */}
                    <header className="hidden md:flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 sticky top-0 z-20 shadow-sm">
                        <GlobalSearch onResultClick={(item) => onNavigate(AppView.PRODUCT_MANAGER)} />
                        
                        <div className="flex items-center gap-4">
                            {user?.email === 'meshachzax@gmail.com' && (
                                <button
                                    onClick={toggleTraction}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                                        tractionMode
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-sm shadow-emerald-100'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200 hover:text-slate-700'
                                    }`}
                                >
                                    <span>📈</span>
                                    <span>Traction Mode: {tractionMode ? 'ON' : 'OFF'}</span>
                                </button>
                            )}
                            <div
                              onClick={() => handleNavigate(AppView.SETTINGS)}
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

                    {user?.email?.startsWith('guest_') && (
                        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-pulse">
                            <div>
                                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">⚡ Guest Workspace Session</h4>
                                <p className="text-xs text-slate-650 mt-1 font-semibold">Your business plan, inventory, and generated posts are saved locally. Save them to a permanent account now.</p>
                            </div>
                            <button
                                onClick={() => setShowClaimModal(true)}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 whitespace-nowrap"
                            >
                                💾 Save & Claim Account
                            </button>
                        </div>
                    )}

                    {children}
                </div>
            </main>

            {/* Claim Account Modal */}
            {showClaimModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-extrabold text-slate-900 font-heading text-lg">💾 Save Guest Workspace</h3>
                                <p className="text-xs text-slate-500 mt-1">Convert your temporary session into a permanent account.</p>
                            </div>
                            <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
                        </div>

                        <form onSubmit={handleClaimAccount} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Business Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-550 focus:border-transparent outline-none transition-all text-sm"
                                    value={claimBusinessName}
                                    onChange={(e) => setClaimBusinessName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="e.g. name@example.com"
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-550 focus:border-transparent outline-none transition-all text-sm"
                                    value={claimEmail}
                                    onChange={(e) => setClaimEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="e.g. 09064556107"
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-550 focus:border-transparent outline-none transition-all text-sm"
                                    value={claimPhone}
                                    onChange={(e) => setClaimPhone(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Create Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-550 focus:border-transparent outline-none transition-all text-sm"
                                    value={claimPassword}
                                    onChange={(e) => setClaimPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isClaiming}
                                className="w-full py-3.5 bg-green-600 text-white font-extrabold rounded-xl hover:bg-green-550 transition-all shadow-lg shadow-green-550/20 flex justify-center items-center text-sm tracking-wide mt-2"
                            >
                                {isClaiming ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Secure Workspace & Save Progress'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Overlay for mobile menu */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default DashboardLayout;
