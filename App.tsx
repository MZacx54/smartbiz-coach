import React, { useState, useEffect, lazy, Suspense } from "react";
import { Toaster, toast } from "react-hot-toast";
import { HelmetProvider } from 'react-helmet-async';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import SEO from "./components/SEO";

// Layout & Core
import DashboardLayout from "./components/DashboardLayout";
import LandingPage from "./components/LandingPage";

// Eagerly loaded components (small, frequently used)
import Dashboard from "./components/Dashboard";
import Auth from "./components/Auth";
import Settings from "./components/Settings";

// Lazy loaded components (large, less frequently used)
const BrandBuilder = lazy(() => import("./components/BrandBuilder"));
const ContentStudio = lazy(() => import("./components/ContentStudio"));
const Compliance = lazy(() => import("./components/Compliance"));
const BusinessPlanGenerator = lazy(() => import("./components/BusinessPlanGenerator"));
const GrantMatcher = lazy(() => import("./components/GrantMatcher"));
const LearningHub = lazy(() => import("./components/LearningHub"));
const DigitalRoadmap = lazy(() => import("./components/DigitalRoadmap"));
const WhatsAppSupport = lazy(() => import("./components/WhatsAppSupport"));
const InvoiceGenerator = lazy(() => import("./components/InvoiceGenerator"));
const Marketplace = lazy(() => import("./components/Marketplace"));
const Cart = lazy(() => import("./components/Cart"));
const DebtorBook = lazy(() => import("./components/DebtorBook"));
const OnboardingWizard = lazy(() => import("./components/OnboardingWizard"));
const SmartBizHub = lazy(() => import("./components/SmartBizHub"));
const ProductMagic = lazy(() => import("./components/ProductMagic"));
const SalesAssistant = lazy(() => import("./components/SalesAssistant"));
const OrderGenerator = lazy(() => import("./components/OrderGenerator"));
const PublicStorefront = lazy(() => import("./components/PublicStorefront"));
const ProductManager = lazy(() => import("./components/ProductManager"));
const LeadManager = lazy(() => import("./components/LeadManager"));
const PricingAssistant = lazy(() => import("./components/PricingAssistant"));
const PublicAuditReport = lazy(() => import("./components/PublicAuditReport"));
const StaticPage = lazy(() => import("./components/StaticPage"));

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
  UnifiedItem,
} from "./types";
import api from "./services/api";
import { authService } from "./services/authService";
import { brandService } from "./services/brandService";
import { billingService } from "./services/billingService";

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Navigation State -> Converted to Sync with React Router
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  // Sync router location to currentView
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/dashboard/brand')) setCurrentView(AppView.BRAND_BUILDER);
    else if (path.includes('/dashboard/content')) setCurrentView(AppView.CONTENT_GENERATOR);
    else if (path.includes('/dashboard/invoices')) setCurrentView(AppView.INVOICE_GENERATOR);
    else if (path.includes('/dashboard/inventory')) setCurrentView(AppView.INVENTORY);
    else if (path.includes('/dashboard/debtor')) setCurrentView(AppView.DEBTOR_BOOK);
    else if (path.includes('/dashboard/marketplace')) setCurrentView(AppView.MARKETPLACE);
    else if (path.includes('/dashboard/smarthome')) setCurrentView(AppView.SMARTHOME_FINDER);
    else if (path.includes('/dashboard/cart')) setCurrentView(AppView.CART);
    else if (path.includes('/dashboard/business-plan')) setCurrentView(AppView.BUSINESS_PLAN);
    else if (path.includes('/dashboard/grants')) setCurrentView(AppView.GRANT_MATCHER);
    else if (path.includes('/dashboard/roadmap')) setCurrentView(AppView.DIGITAL_ROADMAP);
    else if (path.includes('/dashboard/leads')) setCurrentView(AppView.LEAD_MANAGER);
    else if (path.includes('/dashboard/learning')) setCurrentView(AppView.LEARNING_HUB);
    else if (path.includes('/dashboard/compliance')) setCurrentView(AppView.COMPLIANCE);
    else if (path.includes('/dashboard/support')) setCurrentView(AppView.WHATSAPP_SUPPORT);
    else if (path.includes('/dashboard/sales-assistant')) setCurrentView(AppView.SALES_ASSISTANT);
    else if (path.includes('/dashboard/order-gen')) setCurrentView(AppView.ORDER_GENERATOR);
    else if (path.includes('/dashboard/store-preview')) setCurrentView(AppView.STOREFRONT);
    else if (path.includes('/dashboard/inventory')) setCurrentView(AppView.PRODUCT_MANAGER);
    else if (path.includes('/dashboard/settings')) setCurrentView(AppView.SETTINGS);
    else if (path.includes('/dashboard/hub')) setCurrentView(AppView.HUB);
    else if (path.includes('/dashboard/product-magic')) setCurrentView(AppView.PRODUCT_MAGIC);
    else setCurrentView(AppView.DASHBOARD);
  }, [location]);

  // Dynamic SEO Helpers (Updated to use location)
  const getPageTitle = (path: string) => {
    if (path === '/') return 'SmartBiz Coach | Operating System for Nigerian SMEs';
    if (path.includes('/login') || path.includes('/register')) return 'Login & Register';

    switch (currentView) {
      case AppView.DASHBOARD: return 'Dashboard';
      case AppView.BRAND_BUILDER: return 'AI Brand Builder';
      case AppView.CONTENT_GENERATOR: return 'Content Studio';
      case AppView.BUSINESS_PLAN: return 'Business Plan';
      case AppView.GRANT_MATCHER: return 'Find Funding & Grants';
      case AppView.MARKETPLACE: return 'Market Square';
      case AppView.SETTINGS: return 'Settings';
      case AppView.LEARNING_HUB: return 'Learning Hub';
      case AppView.INVENTORY: return 'Inventory Tracker';
      case AppView.INVOICE_GENERATOR: return 'Invoice Generator';
      case AppView.DEBTOR_BOOK: return 'Debtor Book (Gbege Book)';
      case AppView.SMARTHOME_FINDER: return 'SmartHome Finder';
      case AppView.CART: return 'Shopping Cart';
      case AppView.COMPLIANCE: return 'Business Compliance Context';
      case AppView.DIGITAL_ROADMAP: return 'Digital Marketing Roadmap';
      case AppView.WHATSAPP_SUPPORT: return 'WhatsApp Live Support';
      case AppView.SALES_ASSISTANT: return 'AI Sales Assistant';
      case AppView.HUB: return 'SmartBiz Hub';
      case AppView.PRODUCT_MAGIC: return 'Product Magic - AI Photo Enhancement';
      case AppView.LEAD_MANAGER: return 'Lead Manager';
      default: return 'SmartBiz Coach';
    }
  };

  const getPageDescription = (path: string) => {
    if (path === '/') return 'The ultimate operating system for Nigerian businesses. Generate premium business plans, social media content, invoices, and find grants instantly.';
    if (path.includes('/login') || path.includes('/register')) return 'Join SmartBiz Coach to access an all-in-one AI platform for Nigerian SMEs. Generate plans, content, and funding.';

    switch (currentView) {
      case AppView.DASHBOARD: return 'Manage your business growth with AI-powered insights.';
      case AppView.BRAND_BUILDER: return 'Create a stunning brand identity for your business in seconds.';
      case AppView.CONTENT_GENERATOR: return 'Your all-in-one agency creative suite.';
      case AppView.BUSINESS_PLAN: return 'Generate professional business plans to secure funding.';
      case AppView.GRANT_MATCHER: return 'Discover customized grants, loans, and equity funding matching your profile.';
      case AppView.MARKETPLACE: return 'Shop wholesale products and hire tailored freelancer services.';
      case AppView.LEARNING_HUB: return 'Access expert courses on managing and growing Nigerian businesses.';
      case AppView.INVENTORY: return 'Keep track of an unlimited number of products directly connected to sales.';
      case AppView.INVOICE_GENERATOR: return 'Easily create professional invoices for clients out of the box.';
      case AppView.DEBTOR_BOOK: return 'Document and track outstanding debts, and automate reminders.';
      case AppView.SMARTHOME_FINDER: return 'Explore affordable homes and agent property listings mapped for Nigerians.';
      case AppView.COMPLIANCE: return 'Learn precisely what business registrations, taxes, and documents are required.';
      case AppView.DIGITAL_ROADMAP: return 'Gain an actionable, step-by-step digital roadmap for marketing.';
      case AppView.SALES_ASSISTANT: return 'Leverage AI to close more deals and manage customer relationships.';
      case AppView.HUB: return 'Access the exclusive SmartBiz business network and community.';
      case AppView.PRODUCT_MAGIC: return 'Transform phone photos into professional product shots with AI analysis.';
      default: return 'The all-in-one AI platform for Nigerian SMEs.';
    }
  };

  // Backend Data Fetching
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const token = localStorage.getItem("sb_auth_token");
      if (token) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);

          const [brand, txs, stats, userActions] = await Promise.allSettled([
            brandService.getBrand(),
            billingService.getTransactions(),
            authService.getStats(),
            authService.getActions(),
          ]);

          if (brand.status === "fulfilled" && brand.value)
            setSavedBrand(brand.value);
          if (txs.status === "fulfilled") {
            const mappedTxs: Transaction[] = txs.value.map((t: any) => ({
              id: String(t.id),
              date: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
              amount: parseFloat(t.amount) || 0,
              description: t.description || '',
              status: t.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
              provider: t.provider || 'PAYSTACK',
              type: t.type || 'PURCHASE'
            }));
            setTransactions(mappedTxs);
          }
          if (stats.status === "fulfilled") setUserStats(stats.value);
          if (userActions.status === "fulfilled") setActions(userActions.value);
        } catch (error) {
          console.error("Session expired or invalid", error);
          if (currentView !== AppView.DASHBOARD || true) {
            handleLogout();
          }
        }
      } else {
        setUser(null);
      }
    };
    checkAuthAndFetchData();
  }, []);

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

  // --- Handlers ---

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    switch (view) {
      case AppView.DASHBOARD: navigate('/dashboard'); break;
      case AppView.BRAND_BUILDER: navigate('/dashboard/brand'); break;
      case AppView.CONTENT_GENERATOR: navigate('/dashboard/content'); break;
      case AppView.INVOICE_GENERATOR: navigate('/dashboard/invoices'); break;
      case AppView.INVENTORY: navigate('/dashboard/inventory'); break;
      case AppView.DEBTOR_BOOK: navigate('/dashboard/debtor'); break;
      case AppView.MARKETPLACE: navigate('/dashboard/marketplace'); break;
      case AppView.SMARTHOME_FINDER: navigate('/dashboard/smarthome'); break;
      case AppView.CART: navigate('/dashboard/cart'); break;
      case AppView.BUSINESS_PLAN: navigate('/dashboard/business-plan'); break;
      case AppView.GRANT_MATCHER: navigate('/dashboard/grants'); break;
      case AppView.DIGITAL_ROADMAP: navigate('/dashboard/roadmap'); break;
      case AppView.LEARNING_HUB: navigate('/dashboard/learning'); break;
      case AppView.COMPLIANCE: navigate('/dashboard/compliance'); break;
      case AppView.WHATSAPP_SUPPORT: navigate('/dashboard/support'); break;
      case AppView.SALES_ASSISTANT: navigate('/dashboard/sales-assistant'); break;
      case AppView.ORDER_GENERATOR: navigate('/dashboard/order-gen'); break;
      case AppView.STOREFRONT: navigate('/dashboard/store-preview'); break;
      case AppView.PRODUCT_MANAGER: navigate('/dashboard/inventory'); break;
      case AppView.SETTINGS: navigate('/dashboard/settings'); break;
      case AppView.HUB: navigate('/dashboard/hub'); break;
      case AppView.PRODUCT_MAGIC: navigate('/dashboard/product-magic'); break;
      case AppView.PRICING_ASSISTANT: navigate('/dashboard/pricing-assistant'); break;
      default: navigate('/dashboard');
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setSavedBrand(null);
    setContentHistory([]);
    setCartItems([]);
    setTransactions([]);
    localStorage.clear();
    navigate('/');
  };

  const handleSaveBrand = async (brand: BrandIdentity) => {
    try {
      if (brand && brand.id) {
        const updated = await brandService.updateBrand(Number(brand.id), brand);
        setSavedBrand(updated);
      } else {
        // Query backend brand list first to prevent OneToOne 400 validation violations
        let existingBrand = null;
        try {
          existingBrand = await brandService.getBrand();
        } catch (e) {}

        if (existingBrand && existingBrand.id) {
          const updated = await brandService.updateBrand(Number(existingBrand.id), brand);
          setSavedBrand(updated);
        } else {
          const saved = await brandService.createBrand(brand);
          setSavedBrand(saved);
        }
      }
      toast.success("Brand identity synchronized with database!");
    } catch (error) {
      console.error("Failed to sync brand with backend:", error);
      // Ensure local state is updated even if network synchronization fails
      setSavedBrand(brand);
      toast.error("Saved locally (Offline mode)");
    }
  };

  const handleAddToCart = (product: UnifiedItem) => {
    setCartItems((prev: CartItem[]) => {
      const existing = prev.find((item) => item.productId === String(product.id));
      if (existing) {
        return prev.map((item) =>
          item.productId === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: Date.now().toString(),
          productId: String(product.id),
          title: product.name,
          price: parseFloat(product.price),
          image: product.image_url,
          quantity: 1,
          vendorId: String(product.id), // Fallback
        },
      ];
    });
    toast.success("Item added to cart!");
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems((prev: CartItem[]) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => setCartItems([]);

  const handleCheckout = async (
    provider: "PAYSTACK" | "SQUAD",
    amount: number,
    reference: string
  ) => {
    try {
      toast.loading(`Verifying ${provider} payment...`);

      const result = await billingService.verifyPayment(reference, amount);

      // If there are items in the cart, this is a product order
      if (cartItems.length > 0) {
        await api.post('/api/marketplace/orders/create/', {
          items: cartItems,
          reference: reference,
          total_amount: amount
        });
        toast.success("Order placed successfully!");
        setCartItems([]);
      } else {
        // This is a credit top-up
        if (result.credits !== undefined) {
          setUserStats((prev) => ({ ...prev, bizCredits: result.credits }));
        }
        
        const newTx: Transaction = {
          id: reference,
          date: Date.now(),
          amount: amount,
          description: `Direct Credit Purchase (${provider})`,
          status: "SUCCESS",
          provider: provider,
          type: "CREDIT_TOPUP",
        };
        setTransactions((prev: Transaction[]) => [newTx, ...prev]);
        toast.success(`Credits added via ${provider}!`);
      }

      toast.dismiss();
      navigate('/dashboard');
    } catch (error: any) {
      toast.dismiss();
      toast.error(
        error.response?.data?.error || `${provider} payment verification failed.`
      );
    }
  };

  const handleUpdateCredits = (newCredits: number) => {
    setUserStats((prev) => ({ ...prev, bizCredits: newCredits }));
  };

  return (
    <HelmetProvider>
      <SEO
        title={getPageTitle(location.pathname)}
        description={getPageDescription(location.pathname)}
      />

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
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Static Pages Routes */}
        <Route path="/about" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <StaticPage pageType="about" />
          </Suspense>
        } />
        <Route path="/contact" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <StaticPage pageType="contact" />
          </Suspense>
        } />
        <Route path="/privacy" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <StaticPage pageType="privacy" />
          </Suspense>
        } />
        <Route path="/terms" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <StaticPage pageType="terms" />
          </Suspense>
        } />
        <Route path="/help" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <StaticPage pageType="help" />
          </Suspense>
        } />
        <Route path="/grants-guide" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <StaticPage pageType="grants" />
          </Suspense>
        } />
        <Route path="/cac-checklist" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <StaticPage pageType="cac" />
          </Suspense>
        } />

        <Route path="/u/:slug" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin" /></div>}>
            <PublicStorefront />
          </Suspense>
        } />
        
        <Route path="/u/:slug/audit" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin" /></div>}>
            <PublicAuditReport />
          </Suspense>
        } />

        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : <Auth onLogin={handleLogin} />
        } />

        <Route path="/register" element={
          user ? <Navigate to="/dashboard" replace /> : <Auth onLogin={handleLogin} />
        } />

        <Route path="/dashboard/*" element={
          !user ? <Navigate to="/login" replace /> : (
            <>
              {(!user.has_onboarded && !user.hasOnboarded) && (
                <Suspense fallback={null}>
                  <OnboardingWizard
                    user={user}
                    onComplete={async (updatedUser) => {
                      try {
                        const res = await authService.updateProfile({
                          has_onboarded: true,
                          location: updatedUser.location,
                          phone: updatedUser.phone,
                          business_name: updatedUser.businessName
                        });
                        setUser({
                          ...user,
                          has_onboarded: true,
                          hasOnboarded: true,
                          location: res.location || updatedUser.location,
                          phone: res.phone || updatedUser.phone,
                          businessName: res.business_name || updatedUser.businessName,
                          business_name: res.business_name || updatedUser.businessName
                        });
                        toast.success("Profile initialized!");
                      } catch (e) {
                        setUser({ ...user, has_onboarded: true, hasOnboarded: true });
                      }
                    }}
                  />
                </Suspense>
              )}
              <DashboardLayout
                user={user}
                userStats={userStats}
                actions={actions}
                cartItems={cartItems}
                currentView={currentView}
                onNavigate={handleNavigate}
                onUpdateUser={setUser}
              >
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 animate-pulse font-medium">Crunching data...</p>
                  </div>
                }
              >
                <Routes>
                  <Route path="" element={<Dashboard userStats={userStats} actions={actions} onNavigate={handleNavigate} credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="brand" element={<BrandBuilder savedBrand={savedBrand} onSave={handleSaveBrand} credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="content" element={<ContentStudio brand={savedBrand} credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="business-plan" element={<BusinessPlanGenerator brand={savedBrand} businessName={user.businessName} credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="grants" element={<GrantMatcher businessName={user.businessName} credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="learning" element={<LearningHub onNavigate={handleNavigate} />} />
                  <Route path="inventory" element={<ProductManager />} />
                  <Route path="debtor" element={<DebtorBook credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="invoices" element={<InvoiceGenerator />} />
                  <Route path="marketplace" element={<Marketplace onAddToCart={handleAddToCart} initialType="PHYSICAL" />} />
                  <Route path="smarthome" element={<Marketplace onAddToCart={handleAddToCart} initialType="PROPERTY" />} />
                  <Route path="hub" element={<Marketplace onAddToCart={handleAddToCart} initialType="B2B" />} />
                  <Route path="cart" element={<Cart items={cartItems} onRemove={handleRemoveFromCart} onClear={handleClearCart} onCheckout={handleCheckout} onBack={() => handleNavigate(AppView.MARKETPLACE)} />} />
                  <Route path="compliance" element={<Compliance brand={savedBrand} user={user} credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="roadmap" element={<DigitalRoadmap onNavigate={handleNavigate} />} />
                  <Route path="support" element={<WhatsAppSupport credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="sales-assistant" element={<SalesAssistant credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="settings" element={<Settings user={user} userStats={userStats} onLogout={handleLogout} onTopUpSuccess={handleUpdateCredits} />} />
                  <Route path="product-magic" element={<ProductMagic />} />
                  <Route path="order-gen" element={<OrderGenerator />} />
                  <Route path="leads" element={<LeadManager />} />
                  <Route path="store-preview" element={<PublicStorefront />} />
                  <Route path="pricing-assistant" element={<PricingAssistant credits={userStats.bizCredits} onUpdateCredits={handleUpdateCredits} />} />
                  <Route path="audit" element={<PublicAuditReport />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </DashboardLayout>
          </>
        )
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HelmetProvider>
  );
};

export default App;
