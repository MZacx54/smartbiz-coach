import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppView, User, CartItem, UserStats, ActionCard } from '../types';
import GlobalSearch from './GlobalSearch';

interface DashboardLayoutProps {
    user: User;
    userStats: UserStats;
    actions: ActionCard[];
    cartItems: CartItem[];
    currentView: AppView;
    onNavigate: (view: AppView) => void;
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    user,
    userStats,
    actions,
    cartItems,
    currentView,
    onNavigate,
    children
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

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
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${currentView === view
                ? "bg-green-50 text-green-700 font-medium"
                : "text-gray-600 hover:bg-gray-50"
                }`}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans selection:bg-green-200">

            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-20">
                <div
                    className="flex items-center cursor-pointer"
                    onClick={() => handleNavigate(AppView.DASHBOARD)}
                >
                    <img src="/logo-horizontal.png" alt="SmartBiz Coach" className="h-8 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-4">
                    {cartItems.length > 0 && (
                        <button
                            onClick={() => handleNavigate(AppView.CART)}
                            className="relative text-xl"
                        >
                            🛒
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {cartItems.length}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-gray-600 focus:outline-none text-2xl"
                    >
                        {isMenuOpen ? "✕" : "☰"}
                    </button>
                </div>
            </div>

            {/* Sidebar Navigation */}
            <div
                className={`
          fixed inset-y-0 left-0 transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }
          md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
          w-64 bg-white border-r border-gray-200 z-30 flex flex-col h-screen
        `}
            >
                <div
                    className="p-6 border-b border-gray-100 hidden md:flex items-center cursor-pointer"
                    onClick={() => handleNavigate(AppView.DASHBOARD)}
                >
                    <img src="/logo-horizontal.png" alt="SmartBiz Coach" className="h-8 w-auto object-contain" />
                </div>

                {/* User Mini Profile */}
                <div className="px-6 pt-6 pb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase">
                        Business
                    </p>
                    <p className="font-bold text-gray-800 truncate">
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

                    <div className="pt-4 pb-2">
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase">
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
                            className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${currentView === AppView.CART
                                ? "bg-green-50 text-green-700 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span>🛍️</span>
                                <span>Cart</span>
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

                    <div className="pt-4 pb-2">
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase">
                            Help
                        </p>
                    </div>
                    <NavItem view={AppView.COMPLIANCE} label="Compliance" icon="⚖️" />
                    <NavItem view={AppView.WHATSAPP_SUPPORT} label="Live Support" icon="🎧" />
                    <NavItem view={AppView.SETTINGS} label="Settings" icon="⚙️" />
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-lg text-white text-center shadow-lg relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-4xl opacity-10">⚡</div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            Available Credits
                        </p>
                        <p className="text-3xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                            {userStats.bizCredits}
                        </p>
                        <button
                            onClick={() => handleNavigate(AppView.SETTINGS)}
                            className="w-full bg-green-500 hover:bg-green-400 text-slate-900 font-bold text-xs py-2 rounded transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
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
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-100">
                                {user.businessName?.charAt(0) || 'B'}
                            </div>
                        </div>
                    </header>

                    {children}
                </div>
            </main>

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
