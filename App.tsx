import React, { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
// Eagerly loaded components (small, frequently used)
import Dashboard from "./components/Dashboard";
import Auth from "./components/Auth";
import Settings from "./components/Settings";

// Lazy loaded components (large, less frequently used)
const BrandBuilder = lazy(() => import("./components/BrandBuilder"));
const ContentGenerator = lazy(() => import("./components/ContentGenerator"));
const Compliance = lazy(() => import("./components/Compliance"));
const BusinessPlanGenerator = lazy(
  () => import("./components/BusinessPlanGenerator")
);
const GrantMatcher = lazy(() => import("./components/GrantMatcher"));
const LearningHub = lazy(() => import("./components/LearningHub"));
const InventoryTracker = lazy(() => import("./components/InventoryTracker"));
const DigitalRoadmap = lazy(() => import("./components/DigitalRoadmap"));
const WhatsAppSupport = lazy(() => import("./components/WhatsAppSupport"));
const InvoiceGenerator = lazy(() => import("./components/InvoiceGenerator"));
const Marketplace = lazy(() => import("./components/Marketplace"));
const SmartHomeFinder = lazy(() => import("./components/SmartHomeFinder"));
const Cart = lazy(() => import("./components/Cart"));
const DebtorBook = lazy(() => import("./components/DebtorBook"));
const OnboardingWizard = lazy(() => import("./components/OnboardingWizard"));
import {
  AppView,
  ActionCard,
  UserStats,
  User,
  BrandIdentity,
  GeneratedContent,
  CartItem,
  ProductListing,
  Transaction,
} from "./types";
import { authService } from "./services/authService";
import { brandService } from "./services/brandService";
import { billingService } from "./services/billingService";

const App: React.FC = () => {
  // --- State Management ---

  // Auth State (Persisted)
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("sb_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Data Persistence (Lifted State)
  const [savedBrand, setSavedBrand] = useState<BrandIdentity | null>(null);

  const [contentHistory, setContentHistory] = useState<GeneratedContent[]>(
    () => {
      const saved = localStorage.getItem("sb_content_history");
      return saved ? JSON.parse(saved) : [];
    }
  );

  // Cart & Transactions
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("sb_cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Backend Data Fetching
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const token = localStorage.getItem("sb_auth_token");
      if (token) {
        try {
          // 1. Verify Token & Get Profile
          // If this fails, the token is invalid
          const profile = await authService.getProfile();
          setUser(profile);

          // Parallelize independent fetches for speed
          const [brand, txs, stats, userActions] = await Promise.allSettled([
            brandService.getBrand(),
            billingService.getTransactions(),
            authService.getStats(),
            authService.getActions(),
          ]);

          if (brand.status === "fulfilled" && brand.value)
            setSavedBrand(brand.value);
          if (txs.status === "fulfilled") setTransactions(txs.value);
          if (stats.status === "fulfilled") setUserStats(stats.value);
          if (userActions.status === "fulfilled") setActions(userActions.value);
        } catch (error) {
          console.error("Session expired or invalid", error);
          if (currentView !== AppView.DASHBOARD || true) {
            // Force logout to prevent zombie session
            handleLogout();
          }
        }
      } else {
        // No token, ensure no user
        setUser(null);
      }
    };
    checkAuthAndFetchData();
  }, []);

  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Mock Data - Phase 2 this comes from Backend -> ENABLED
  const [userStats, setUserStats] = useState<UserStats>({
    grantReadinessScore: 0,
    bizCredits: 0,
    completedTasks: 0,
    totalTasks: 6,
  });

  const [actions, setActions] = useState<ActionCard[]>([]);

  // --- Effects for Persistence ---

  useEffect(() => {
    if (user) {
      localStorage.setItem("sb_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("sb_user");
    }
  }, [user]);

  useEffect(() => {
    if (savedBrand) {
      localStorage.setItem("sb_brand", JSON.stringify(savedBrand));
      // Update action state
      setActions((prev: ActionCard[]) =>
        prev.map((a) => (a.id === "2" ? { ...a, isCompleted: true } : a))
      );
    } else {
      localStorage.removeItem("sb_brand");
    }
  }, [savedBrand]);

  useEffect(() => {
    localStorage.setItem("sb_content_history", JSON.stringify(contentHistory));
    if (contentHistory.length > 0) {
      setActions((prev: ActionCard[]) =>
        prev.map((a) => (a.id === "3" ? { ...a, isCompleted: true } : a))
      );
    }
  }, [contentHistory]);

  useEffect(() => {
    localStorage.setItem("sb_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("sb_transactions", JSON.stringify(transactions));
  }, [transactions]);

  const setActionsWithType = (updater: (prev: ActionCard[]) => ActionCard[]) =>
    setActions(updater);

  // --- Handlers ---

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setSavedBrand(null);
    setContentHistory([]);
    setCartItems([]);
    setTransactions([]);
    localStorage.clear();
    setCurrentView(AppView.DASHBOARD);
  };

  const handleSaveBrand = (brand: BrandIdentity) => {
    setSavedBrand(brand);
  };

  const handleAddContent = (content: GeneratedContent) => {
    const newContent = {
      ...content,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setContentHistory((prev: GeneratedContent[]) => [newContent, ...prev]);
  };

  // Cart Handlers
  const handleAddToCart = (product: ProductListing) => {
    setCartItems((prev: CartItem[]) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: Date.now().toString(),
          productId: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          quantity: 1,
          vendorId: product.vendorId,
        },
      ];
    });
    alert("Item added to cart!");
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems((prev: CartItem[]) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => setCartItems([]);

  const handleCheckoutSuccess = (
    provider: "PAYSTACK" | "SQUAD",
    total: number
  ) => {
    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      date: Date.now(),
      amount: total,
      description: `Purchase of ${cartItems.length} items`,
      status: "SUCCESS",
      provider: provider,
      type: "PURCHASE",
    };
    setTransactions((prev: Transaction[]) => [newTx, ...prev]);
    setCartItems([]);
    alert(`Payment Successful via ${provider}! Your order has been placed.`);
    setCurrentView(AppView.MARKETPLACE);
  };

  // If not authenticated, show Auth screen
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return (
          <Dashboard
            userStats={userStats}
            actions={actions}
            onNavigate={handleNavigate}
          />
        );
      case AppView.BRAND_BUILDER:
        return (
          <BrandBuilder savedBrand={savedBrand} onSave={handleSaveBrand} />
        );
      case AppView.CONTENT_GENERATOR:
        return (
          <ContentGenerator
            history={contentHistory}
            onAddToHistory={handleAddContent}
            brand={savedBrand}
          />
        );
      case AppView.BUSINESS_PLAN:
        return (
          <BusinessPlanGenerator
            brand={savedBrand}
            businessName={user.businessName}
          />
        );
      case AppView.GRANT_MATCHER:
        return <GrantMatcher businessName={user.businessName} />;
      case AppView.LEARNING_HUB:
        return <LearningHub />;
      case AppView.INVENTORY:
        return <InventoryTracker />;
      case AppView.DEBTOR_BOOK:
        return <DebtorBook />;
      case AppView.INVOICE_GENERATOR:
        return <InvoiceGenerator />;
      case AppView.MARKETPLACE:
        return <Marketplace onAddToCart={handleAddToCart} />;
      case AppView.SMARTHOME_FINDER:
        return <SmartHomeFinder />;
      case AppView.CART:
        return (
          <Cart
            items={cartItems}
            onRemove={handleRemoveFromCart}
            onClear={handleClearCart}
            onCheckout={handleCheckoutSuccess}
            onBack={() => handleNavigate(AppView.MARKETPLACE)}
          />
        );
      case AppView.COMPLIANCE:
        return <Compliance />;
      case AppView.DIGITAL_ROADMAP:
        return <DigitalRoadmap />;
      case AppView.WHATSAPP_SUPPORT:
        return <WhatsAppSupport />;
      case AppView.SETTINGS:
        return (
          <Settings user={user} userStats={userStats} onLogout={handleLogout} />
        );
      default:
        return (
          <div className="p-10 text-center text-gray-500">Page Not Found</div>
        );
    }
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
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        currentView === view
          ? "bg-green-50 text-green-700 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1f2937",
            color: "#fff",
            borderRadius: "0.75rem",
            padding: "16px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <div
          className="flex items-center space-x-2"
          onClick={() => handleNavigate(AppView.DASHBOARD)}
        >
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-bold text-gray-900">SmartBiz</span>
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
        fixed inset-y-0 left-0 transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-white border-r border-gray-200 z-30 flex flex-col h-screen
      `}
      >
        <div
          className="p-6 border-b border-gray-100 hidden md:flex items-center space-x-2 cursor-pointer"
          onClick={() => handleNavigate(AppView.DASHBOARD)}
        >
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-bold text-xl text-gray-900">SmartBiz</span>
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
          <NavItem
            view={AppView.BRAND_BUILDER}
            label="Brand Builder"
            icon="✨"
          />
          <NavItem
            view={AppView.CONTENT_GENERATOR}
            label="Content Gen"
            icon="✍️"
          />
          <NavItem
            view={AppView.INVOICE_GENERATOR}
            label="Invoices"
            icon="🧾"
          />
          <NavItem view={AppView.INVENTORY} label="Inventory" icon="📦" />
          <NavItem view={AppView.DEBTOR_BOOK} label="Gbege Book" icon="📒" />

          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase">
              Growth
            </p>
          </div>
          <NavItem view={AppView.MARKETPLACE} label="Market Square" icon="🛒" />
          <NavItem
            view={AppView.SMARTHOME_FINDER}
            label="SmartHome"
            icon="🏠"
          />

          {cartItems.length > 0 && (
            <button
              onClick={() => handleNavigate(AppView.CART)}
              className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                currentView === AppView.CART
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

          <NavItem
            view={AppView.BUSINESS_PLAN}
            label="Business Plan"
            icon="📈"
          />
          <NavItem
            view={AppView.GRANT_MATCHER}
            label="Find Funding"
            icon="💰"
          />
          <NavItem
            view={AppView.DIGITAL_ROADMAP}
            label="Marketing Roadmap"
            icon="🗺️"
          />
          <NavItem view={AppView.LEARNING_HUB} label="Learning Hub" icon="🎓" />

          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase">
              Help
            </p>
          </div>
          <NavItem view={AppView.COMPLIANCE} label="Compliance" icon="⚖️" />
          <NavItem
            view={AppView.WHATSAPP_SUPPORT}
            label="Live Support"
            icon="🎧"
          />
          <NavItem view={AppView.SETTINGS} label="Settings" icon="⚙️" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-lg text-white text-center">
            <p className="text-xs font-medium opacity-90 mb-2">
              Upgrade to Smart Access
            </p>
            <p className="text-xs opacity-75 mb-3">
              Get unlimited AI & Pro guides
            </p>
            <button
              onClick={() => handleNavigate(AppView.SETTINGS)}
              className="w-full bg-white/20 hover:bg-white/30 text-xs py-2 rounded transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-3xl mx-auto pb-20 md:pb-0">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 animate-pulse font-medium">
                  Crunching data...
                </p>
              </div>
            }
          >
            {renderContent()}
          </Suspense>
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

export default App;
