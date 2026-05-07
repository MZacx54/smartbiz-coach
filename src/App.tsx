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
const InventoryTracker = lazy(() => import("./components/InventoryTracker"));
const DigitalRoadmap = lazy(() => import("./components/DigitalRoadmap"));
const WhatsAppSupport = lazy(() => import("./components/WhatsAppSupport"));
const InvoiceGenerator = lazy(() => import("./components/InvoiceGenerator"));
const Marketplace = lazy(() => import("./components/Marketplace"));
const SmartHomeFinder = lazy(() => import("./components/SmartHomeFinder"));
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
import { authService } from "./services/authService";
import { brandService } from "./services/brandService";
import { billingService } from "./services/billingService";
import api from "./services/api";

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

  // Track current view
  const getCurrentViewFromPath = () => {
    const path = location.pathname;
    if (path.includes('brand')) return AppView.BRAND_BUILDER;
    if (path.includes('content')) return AppView.CONTENT_GENERATOR;
    if (path.includes('business-plan')) return AppView.BUSINESS_PLAN;
    if (path.includes('grants')) return AppView.GRANT_MATCHER;
    if (path.includes('learning')) return AppView.LEARNING_HUB;
    if (path.includes('inventory')) return AppView.PRODUCT_MANAGER;
    if (path.includes('marketplace')) return AppView.MARKETPLACE;
    if (path.includes('smarthome')) return AppView.SMARTHOME_FINDER;
    if (path.includes('cart')) return AppView.CART;
    if (path.includes('roadmap')) return AppView.DIGITAL_ROADMAP;
    if (path.includes('compliance')) return AppView.COMPLIANCE;
    if (path.includes('support')) return AppView.WHATSAPP_SUPPORT;
    if (path.includes('sales-assistant')) return AppView.SALES_ASSISTANT;
    if (path.includes('product-magic')) return AppView.PRODUCT_MAGIC;
    if (path.includes('hub')) return AppView.HUB;
    return AppView.DASHBOARD;
  };

  const [currentView, setCurrentView] = useState(getCurrentViewFromPath());

  useEffect(() => {
    setCurrentView(getCurrentViewFromPath());
  }, [location.pathname]);

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
      case AppView.PRODUCT_MANAGER: return 'Keep track of an unlimited number of products directly connected to sales.';
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
          if (txs.status === "fulfilled") setTransactions(txs.value);
          if (stats.status === "fulfilled") setUserStats(stats.value);
          if (userActions.status === "fulfilled") setActions(userActions.value);
        } catch (error) {
          console.error("Session expired or invalid", error);
          handleLogout();
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

  const navigateToView = (view: AppView) => {
    switch (view) {
      case AppView.DASHBOARD: navigate('/dashboard'); break;
      case AppView.BRAND_BUILDER: navigate('/dashboard/brand'); break;
      case AppView.CONTENT_GENERATOR: navigate('/dashboard/content'); break;
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

  const handleSaveBrand = (brand: BrandIdentity) => {
    setSavedBrand(brand);
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
          price: product.price,
          image: product.image_url,
          quantity: 1,
          vendorId: String(product.id),
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

      const result = provider === 'PAYSTACK'
        ? await billingService.verifyPayment(reference, amount)
        : await billingService.verifySquadPayment(reference, amount);

      if (cartItems.length > 0) {
        await api.post('/api/marketplace/orders/create/', {
          items: cartItems,
          reference: reference,
          total_amount: amount
        });
        toast.success("Order placed successfully!");
        setCartItems([]);
      } else {
        toast.success("Credit top-up successful!");
      }
    } catch (err) {
      toast.error("Payment verification failed");
    }
  };

  return (
    <HelmetProvider>
      <Toaster position="top-right" />
      <SEO title={`SmartBiz Coach | ${getPageDescription(location.pathname)}`} description={getPageDescription(location.pathname)} />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth onLogin={handleLogin} />} />
        <Route path="/register" element={<Auth isRegister onLogin={handleLogin} />} />

        <Route
          path="/dashboard/*"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout} currentView={currentView} onNavigate={navigateToView}>
                <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                  <Routes>
                    <Route index element={<Dashboard user={user} />} />
                    <Route path="brand" element={<BrandBuilder onSave={handleSaveBrand} initialData={savedBrand || undefined} />} />
                    <Route path="content" element={<ContentStudio brand={savedBrand} history={contentHistory} />} />
                    <Route path="business-plan" element={<BusinessPlanGenerator brand={savedBrand} />} />
                    <Route path="grants" element={<GrantMatcher brand={savedBrand} />} />
                    <Route path="learning" element={<LearningHub />} />
                    <Route path="inventory" element={<ProductManager />} />
                    <Route path="marketplace" element={<Marketplace onAddToCart={handleAddToCart} />} />
                    <Route path="smarthome" element={<SmartHomeFinder />} />
                    <Route path="cart" element={<Cart items={cartItems} onRemove={handleRemoveFromCart} onClear={handleClearCart} onCheckout={handleCheckout} />} />
                    <Route path="roadmap" element={<DigitalRoadmap />} />
                    <Route path="compliance" element={<Compliance brand={savedBrand} />} />
                    <Route path="support" element={<WhatsAppSupport />} />
                    <Route path="sales-assistant" element={<SalesAssistant />} />
                    <Route path="product-magic" element={<ProductMagic />} />
                    <Route path="hub" element={<SmartBizHub />} />
                    <Route path="settings" element={<Settings user={user} />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </HelmetProvider>
  );
};

export default App;
