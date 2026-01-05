
import React, { useState, useEffect } from 'react';
import BrandBuilder from './components/BrandBuilder';
import ContentGenerator from './components/ContentGenerator';
import Dashboard from './components/Dashboard';
import Compliance from './components/Compliance';
import Settings from './components/Settings';
import Auth from './components/Auth';
import BusinessPlanGenerator from './components/BusinessPlanGenerator';
import GrantMatcher from './components/GrantMatcher';
import LearningHub from './components/LearningHub';
import InventoryTracker from './components/InventoryTracker';
import DigitalRoadmap from './components/DigitalRoadmap';
import WhatsAppSupport from './components/WhatsAppSupport';
import InvoiceGenerator from './components/InvoiceGenerator';
import Marketplace from './components/Marketplace';
import SmartHomeFinder from './components/SmartHomeFinder';
import Cart from './components/Cart';
import DebtorBook from './components/DebtorBook';
import OnboardingWizard from './components/OnboardingWizard';
import Toast from './components/Toast';
import { AppView, ActionCard, UserStats, User, BrandIdentity, GeneratedContent, CartItem, ProductListing, Transaction } from './types';

const App: React.FC = () => {
  // --- State Management ---

  // Auth State (Persisted)
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sb_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Data Persistence (Lifted State)
  const [savedBrand, setSavedBrand] = useState<BrandIdentity | null>(() => {
    const saved = localStorage.getItem('sb_brand');
    return saved ? JSON.parse(saved) : null;
  });

  const [contentHistory, setContentHistory] = useState<GeneratedContent[]>(() => {
    const saved = localStorage.getItem('sb_content_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Cart & Transactions
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('sb_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('sb_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' | 'INFO' } | null>(null);

  const showToast = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'SUCCESS') => {
    setToast({ message, type });
  };

  // Mock Data - Phase 2 this comes from Backend
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('sb_user_stats');
    return saved ? JSON.parse(saved) : {
      grantReadinessScore: 35,
      bizCredits: 150, // Default starter credits
      completedTasks: 2,
      totalTasks: 6
    };
  });

  const [actions, setActions] = useState<ActionCard[]>([
    {
      id: '1',
      title: 'Register CAC Business Name',
      description: 'Official registration unlocks corporate bank accounts.',
      type: 'URGENT',
      isCompleted: false,
      points: 50,
      actionLink: AppView.COMPLIANCE
    },
    {
      id: '2',
      title: 'Create Brand Identity',
      description: 'Generate professional logos and colors for your business.',
      type: 'GROWTH',
      isCompleted: !!savedBrand, // Mark complete if brand exists
      points: 20,
      actionLink: AppView.BRAND_BUILDER
    },
    {
      id: '3',
      title: 'Post on Instagram',
      description: 'Keep your audience engaged with a new post.',
      type: 'GROWTH',
      isCompleted: contentHistory.length > 0, // Mark complete if history exists
      points: 10,
      actionLink: AppView.CONTENT_GENERATOR
    },
    {
      id: '4',
      title: 'Create Business Plan',
      description: 'Draft a strategy to secure grants and loans.',
      type: 'GROWTH',
      isCompleted: false,
      points: 100,
      actionLink: AppView.BUSINESS_PLAN
    },
    {
      id: '5',
      title: 'Find Funding',
      description: 'Match with grants from TEF, BoI, and LSETF.',
      type: 'INFO',
      isCompleted: false,
      points: 50,
      actionLink: AppView.GRANT_MATCHER
    },
    {
      id: '6',
      title: 'Digital Marketing Setup',
      description: 'Complete the roadmap for Facebook & WhatsApp.',
      type: 'GROWTH',
      isCompleted: false,
      points: 30,
      actionLink: AppView.DIGITAL_ROADMAP
    }
  ]);

  // --- Effects for Persistence ---

  useEffect(() => {
    if (user) {
      localStorage.setItem('sb_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sb_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('sb_user_stats', JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    if (savedBrand) {
      localStorage.setItem('sb_brand', JSON.stringify(savedBrand));
      // Update action state
      setActions(prev => prev.map(a => a.id === '2' ? { ...a, isCompleted: true } : a));
    } else {
      localStorage.removeItem('sb_brand');
    }
  }, [savedBrand]);

  useEffect(() => {
    localStorage.setItem('sb_content_history', JSON.stringify(contentHistory));
    if (contentHistory.length > 0) {
       setActions(prev => prev.map(a => a.id === '3' ? { ...a, isCompleted: true } : a));
    }
  }, [contentHistory]);

  useEffect(() => {
    localStorage.setItem('sb_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('sb_transactions', JSON.stringify(transactions));
  }, [transactions]);


  // --- Handlers ---

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    showToast(`Welcome back, ${userData.name}!`);
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
    showToast("Brand Identity Saved!");
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    showToast("Profile updated successfully!");
  };

  const handleAddContent = (content: GeneratedContent) => {
    const newContent = {
      ...content,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    setContentHistory(prev => [newContent, ...prev]);
    showToast("Content saved to History");
  };

  // Credit System Logic
  const handleCreditTopUp = (credits: number, amountPaid: number, provider: 'PAYSTACK' | 'SQUAD') => {
    // 1. Update Balance
    setUserStats((prev: UserStats) => ({
      ...prev,
      bizCredits: prev.bizCredits + credits
    }));

    // 2. Record Transaction
    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      date: Date.now(),
      amount: amountPaid,
      description: `Top Up: ${credits} Credits`,
      status: 'SUCCESS',
      provider: provider,
      type: 'PURCHASE'
    };
    setTransactions(prev => [newTx, ...prev]);
    
    showToast(`Success! ${credits} Credits added to wallet.`, 'SUCCESS');
  };

  const handleConsumeCredits = (amount: number): boolean => {
    if (userStats.bizCredits >= amount) {
      setUserStats(prev => ({
        ...prev,
        bizCredits: prev.bizCredits - amount
      }));
      return true;
    } else {
      showToast("Insufficient Credits! Please Top Up.", "ERROR");
      // Optionally navigate to settings or open top-up modal
      return false;
    }
  };

  // Cart Handlers
  const handleAddToCart = (product: ProductListing) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: Date.now().toString(),
        productId: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        quantity: 1,
        vendorId: product.vendorId
      }];
    });
    showToast("Item added to cart!", "SUCCESS");
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => setCartItems([]);

  const handleCheckoutSuccess = (provider: 'PAYSTACK' | 'SQUAD', total: number) => {
    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      date: Date.now(),
      amount: total,
      description: `Purchase of ${cartItems.length} items`,
      status: 'SUCCESS',
      provider: provider,
      type: 'PURCHASE'
    };
    setTransactions(prev => [newTx, ...prev]);
    setCartItems([]);
    showToast(`Payment Successful!`, "SUCCESS");
    setCurrentView(AppView.MARKETPLACE);
  };

  // If not authenticated, show Auth screen
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // New Onboarding Logic
  if (!user.hasOnboarded) {
    return (
      <OnboardingWizard 
        user={user} 
        onComplete={(updatedUser) => setUser(updatedUser)} 
      />
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard userStats={userStats} actions={actions} onNavigate={handleNavigate} />;
      case AppView.BRAND_BUILDER:
        return <BrandBuilder savedBrand={savedBrand} onSave={handleSaveBrand} />;
      case AppView.CONTENT_GENERATOR:
        return <ContentGenerator 
                  history={contentHistory} 
                  onAddToHistory={handleAddContent} 
                  brand={savedBrand} 
                  userCredits={userStats.bizCredits}
                  onConsumeCredits={handleConsumeCredits}
               />;
      case AppView.BUSINESS_PLAN:
        return <BusinessPlanGenerator brand={savedBrand} businessName={user.businessName} />;
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
        return <Marketplace onAddToCart={handleAddToCart} currentUser={user} />;
      case AppView.SMARTHOME_FINDER:
        return <SmartHomeFinder userEmail={user.email} />;
      case AppView.CART:
        return (
          <Cart 
            items={cartItems} 
            userEmail={user.email}
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
        return <Settings 
                  user={user} 
                  userStats={userStats} 
                  transactions={transactions} 
                  onLogout={handleLogout} 
                  onUpdateUser={handleUpdateUser} 
                  onTopUp={handleCreditTopUp}
               />;
      default:
        return <div className="p-10 text-center text-gray-500">Page Not Found</div>;
    }
  };

  const NavItem = ({ view, label, icon }: { view: AppView, label: string, icon: string }) => (
    <button
      onClick={() => handleNavigate(view)}
      className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-all font-heading ${
        currentView === view 
          ? 'bg-green-50 text-green-700 font-bold shadow-sm' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Mobile Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-2" onClick={() => handleNavigate(AppView.DASHBOARD)}>
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">S</div>
          <span className="font-heading font-bold text-gray-900 text-lg">SmartBiz</span>
        </div>
        <div className="flex items-center gap-4">
           {cartItems.length > 0 && (
             <button onClick={() => handleNavigate(AppView.CART)} className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200">
               🛒
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                 {cartItems.length}
               </span>
             </button>
           )}
           <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-800 focus:outline-none p-1">
             <div className="space-y-1.5">
                 <div className={`w-6 h-0.5 bg-gray-800 transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                 <div className={`w-6 h-0.5 bg-gray-800 transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                 <div className={`w-6 h-0.5 bg-gray-800 transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
             </div>
           </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-72 bg-white border-r border-gray-100 z-30 flex flex-col h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)]
      `}>
        {/* Logo Area */}
        <div className="p-6 pb-4 hidden md:flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigate(AppView.DASHBOARD)}>
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-green-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
              <span className="font-heading font-bold text-xl text-gray-900 tracking-tight block">SmartBiz</span>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Coach AI</span>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="px-6 py-4">
           <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                   {user.logo ? <img src={user.logo} className="w-full h-full object-cover"/> : user.name.charAt(0)}
               </div>
               <div className="overflow-hidden">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business</p>
                   <p className="font-heading font-bold text-gray-800 text-sm truncate">{user.businessName}</p>
               </div>
           </div>
        </div>

        <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavItem view={AppView.DASHBOARD} label="Dashboard" icon="📊" />
          
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Core Tools</p>
          </div>
          <NavItem view={AppView.BRAND_BUILDER} label="Brand Builder" icon="✨" />
          <NavItem view={AppView.CONTENT_GENERATOR} label="Content Studio" icon="✍️" />
          <NavItem view={AppView.DIGITAL_ROADMAP} label="Marketing Roadmap" icon="🗺️" />
          
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Business Ops</p>
          </div>
          <NavItem view={AppView.MARKETPLACE} label="Market Square" icon="🛒" />
          <NavItem view={AppView.INVOICE_GENERATOR} label="Invoices" icon="🧾" />
          <NavItem view={AppView.INVENTORY} label="Inventory & Profit" icon="📦" />
          <NavItem view={AppView.DEBTOR_BOOK} label="Gbege Book" icon="📒" />
          <NavItem view={AppView.SMARTHOME_FINDER} label="SmartHome" icon="🏠" />
          
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Growth</p>
          </div>
          <NavItem view={AppView.BUSINESS_PLAN} label="Business Plan" icon="📈" />
          <NavItem view={AppView.GRANT_MATCHER} label="Find Funding" icon="💰" />
          <NavItem view={AppView.LEARNING_HUB} label="Learning Hub" icon="🎓" />
          <NavItem view={AppView.COMPLIANCE} label="Compliance" icon="⚖️" />
          
          <div className="h-4"></div>
          <NavItem view={AppView.WHATSAPP_SUPPORT} label="Live Support" icon="🎧" />
          <NavItem view={AppView.SETTINGS} label="Settings" icon="⚙️" />
        </nav>

        {/* Upgrade Card */}
        <div className="p-4 border-t border-gray-100 bg-white">
           <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-2xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden group cursor-pointer" onClick={() => handleNavigate(AppView.SETTINGS)}>
             <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-500"></div>
             
             <div className="flex justify-between items-start mb-2 relative z-10">
                 <p className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">PRO PLAN</p>
                 <span className="text-xl">🚀</span>
             </div>
             
             <p className="text-sm font-bold opacity-95 relative z-10">Upgrade to Smart Access</p>
             <p className="text-[10px] opacity-75 mb-3 leading-relaxed relative z-10">Unlimited AI, Priority Support & Grant Alerts.</p>
             <div className="w-full bg-white text-indigo-900 text-xs font-bold py-2 rounded-lg text-center hover:bg-indigo-50 transition-colors shadow-sm relative z-10">
               View Plans
             </div>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-gray-50 scroll-smooth">
        <div className="max-w-5xl mx-auto pb-20 md:pb-0">
          {renderContent()}
        </div>
      </main>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default App;
