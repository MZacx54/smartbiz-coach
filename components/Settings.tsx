import React, { useState, useEffect } from 'react';
import { User, UserStats } from '../types';
import PaymentModal from './PaymentModal';
import { billingService, TransactionData, CreditLedgerData, AdminDashboardData } from '../services/billingService';
import { marketingService } from '../services/marketingService';
import { toast } from 'react-hot-toast';

interface SettingsProps {
  user: User;
  userStats: UserStats;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
  onTopUpSuccess?: (newCredits: number) => void;
}

const CREDIT_PACKS = [
  { credits: 50, price: 300, label: 'Starter Pack', desc: 'Perfect for quick tasks' },
  { credits: 250, price: 1000, label: 'Grower Pack', desc: 'For general business setup', popular: true },
  { credits: 1000, price: 3000, label: 'Enterprise Pack', desc: 'Agency level power usage' },
];

type SettingsTab = 'profile' | 'billing' | 'social' | 'preferences' | 'data' | 'admin';

const Settings: React.FC<SettingsProps> = ({ user, userStats, onLogout, onUpdateUser, onTopUpSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name || '',
    businessName: user.businessName || '',
    email: user.email || '',
    phone: user.phone || ''
  });

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Billing states
  const [showTopUp, setShowTopUp] = useState(false);
  const [selectedPack, setSelectedPack] = useState<typeof CREDIT_PACKS[0] | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Preferences states
  const [tractionMode, setTractionMode] = useState(() => localStorage.getItem('sb_idice_traction_mode') === 'true');
  const [defaultReminderTone, setDefaultReminderTone] = useState(() => localStorage.getItem('sb_default_reminder_tone') || 'POLITE');
  const [autoDeductStock, setAutoDeductStock] = useState(() => localStorage.getItem('sb_auto_deduct_stock') !== 'false');
  const [defaultPlatform, setDefaultPlatform] = useState(() => localStorage.getItem('sb_default_platform') || 'Instagram');
  const [defaultTone, setDefaultTone] = useState(() => localStorage.getItem('sb_default_tone') || 'Exciting');
  const [invoiceCurrency, setInvoiceCurrency] = useState(() => localStorage.getItem('sb_invoice_currency') || 'NGN');
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState(() => localStorage.getItem('sb_invoice_payment_terms') || 'DUE_ON_RECEIPT');

  // Data Management states
  const [dataStats, setDataStats] = useState({
    debtors: 0,
    invoices: 0,
    products: 0,
    transactionLogs: 0,
    brandProfile: false,
    contentHistory: 0
  });

  // Social Connect states
  const [socialConnect, setSocialConnect] = useState({
    meta_access_token: '',
    instagram_account_id: '',
    facebook_page_id: '',
    is_connected: false
  });
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    if (activeTab === 'social') {
      const fetchSocial = async () => {
        setLoadingSocial(true);
        try {
          const res = await marketingService.getSocialConnect();
          setSocialConnect({
            meta_access_token: res.meta_access_token || '',
            instagram_account_id: res.instagram_account_id || '',
            facebook_page_id: res.facebook_page_id || '',
            is_connected: res.is_connected || false
          });
        } catch (err) {
          console.error("Failed to load social connection:", err);
        } finally {
          setLoadingSocial(false);
        }
      };
      fetchSocial();
    }
  }, [activeTab]);

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocial(true);
    try {
      const res = await marketingService.saveSocialConnect(socialConnect);
      toast.success(res.message || "Social media accounts connected!");
      setSocialConnect(prev => ({ ...prev, is_connected: res.is_connected }));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save social connection");
    } finally {
      setSavingSocial(false);
    }
  };

  // Admin console states
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Sync edit form when user changes
  useEffect(() => {
    setEditForm({
      name: user.name || '',
      businessName: user.businessName || '',
      email: user.email || '',
      phone: user.phone || ''
    });
  }, [user]);

  // Load admin transactions data
  useEffect(() => {
    if (activeTab === 'admin') {
      const fetchAdminData = async () => {
        setLoadingAdmin(true);
        try {
          const res = await billingService.getAdminTransactions();
          setAdminData(res);
        } catch (err) {
          toast.error("Failed to load admin transactions ledger");
          console.error(err);
        } finally {
          setLoadingAdmin(false);
        }
      };
      fetchAdminData();
    }
  }, [activeTab]);

  // Load billing history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const [txs, ledgers] = await Promise.all([
          billingService.getTransactions(),
          billingService.getCreditLedger(),
        ]);
        setTransactions(txs);
        setLedger(ledgers);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  // Load data stats
  useEffect(() => {
    const debtors = JSON.parse(localStorage.getItem('sb_debtors') || '[]');
    const invoices = JSON.parse(localStorage.getItem('sb_invoices_detailed') || '[]');
    const products = JSON.parse(localStorage.getItem('sb_idice_products') || '[]');
    const txLogs = JSON.parse(localStorage.getItem('sb_idice_transaction_logs') || '[]');
    const brand = localStorage.getItem('sb_brand');
    const contentHistory = JSON.parse(localStorage.getItem('sb_content_history') || '[]');

    setDataStats({
      debtors: debtors.length,
      invoices: invoices.length,
      products: products.length,
      transactionLogs: txLogs.length,
      brandProfile: !!brand,
      contentHistory: contentHistory.length,
    });
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        name: editForm.name,
        businessName: editForm.businessName,
        email: editForm.email,
        phone: editForm.phone
      });
      toast.success("Profile updated successfully!");
    }
    setIsEditing(false);
  };

  const handlePackSelect = (pack: typeof CREDIT_PACKS[0]) => {
    setSelectedPack(pack);
    setShowTopUp(true);
  };

  const handlePaymentSuccess = async (reference: string) => {
    if (!selectedPack) return;
    setShowTopUp(false);
    setVerifyingPayment(true);
    try {
      const response = await billingService.verifyPayment(reference, selectedPack.price);
      toast.success(`Success! Added ${selectedPack.credits} credits to your account.`);
      if (onTopUpSuccess) {
        onTopUpSuccess(response.credits);
      }
      // Refresh ledger & transactions
      const [txs, ledgers] = await Promise.all([
        billingService.getTransactions(),
        billingService.getCreditLedger(),
      ]);
      setTransactions(txs);
      setLedger(ledgers);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Payment verification failed. Please contact support.");
    } finally {
      setVerifyingPayment(false);
      setSelectedPack(null);
    }
  };

  // Save preferences handler
  const handleSavePreferences = () => {
    localStorage.setItem('sb_idice_traction_mode', String(tractionMode));
    localStorage.setItem('sb_default_reminder_tone', defaultReminderTone);
    localStorage.setItem('sb_auto_deduct_stock', String(autoDeductStock));
    localStorage.setItem('sb_default_platform', defaultPlatform);
    localStorage.setItem('sb_default_tone', defaultTone);
    localStorage.setItem('sb_invoice_currency', invoiceCurrency);
    localStorage.setItem('sb_invoice_payment_terms', invoicePaymentTerms);
    toast.success("Preferences saved successfully!");
  };

  // Data export/clear handlers
  const handleExportAllData = () => {
    const allData = {
      debtors: JSON.parse(localStorage.getItem('sb_debtors') || '[]'),
      invoices: JSON.parse(localStorage.getItem('sb_invoices_detailed') || '[]'),
      products: JSON.parse(localStorage.getItem('sb_idice_products') || '[]'),
      transactionLogs: JSON.parse(localStorage.getItem('sb_idice_transaction_logs') || '[]'),
      brand: JSON.parse(localStorage.getItem('sb_brand') || 'null'),
      contentHistory: JSON.parse(localStorage.getItem('sb_content_history') || '[]'),
      user: JSON.parse(localStorage.getItem('sb_user') || '{}'),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartbiz_full_backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Full business data backup exported!");
  };

  const handleClearSpecificData = (key: string, label: string) => {
    if (confirm(`Are you sure you want to clear all ${label} data? This action cannot be undone.`)) {
      localStorage.removeItem(key);
      toast.success(`${label} data cleared.`);
      // Refresh data stats
      setDataStats(prev => ({
        ...prev,
        [key === 'sb_debtors' ? 'debtors' : 
         key === 'sb_invoices_detailed' ? 'invoices' : 
         key === 'sb_idice_products' ? 'products' : 
         key === 'sb_idice_transaction_logs' ? 'transactionLogs' : 
         key === 'sb_content_history' ? 'contentHistory' : 'brandProfile']: 
         key === 'sb_brand' ? false : 0
      }));
    }
  };

  const settingsTabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: '👤' },
    { id: 'billing' as SettingsTab, label: 'Credit Wallet', icon: '💳' },
    { id: 'social' as SettingsTab, label: 'Social & Meta', icon: '📸' },
    { id: 'preferences' as SettingsTab, label: 'Preferences', icon: '🎛️' },
    { id: 'data' as SettingsTab, label: 'Data & Backup', icon: '🗄️' },
  ];

  if (user.email === 'meshachzax@gmail.com') {
    settingsTabs.push({ id: 'admin' as SettingsTab, label: 'Admin Ledger', icon: '⚙️' });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* Verification Loader Overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-xs">
            <svg className="animate-spin w-10 h-10 text-green-600 mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <h4 className="font-extrabold text-slate-900 text-lg">Verifying Payment</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Connecting with Paystack to credit your wallet. Please hold on...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 font-heading flex items-center gap-2">
            <span>⚙️</span> Settings & Wallet
          </h2>
          <p className="text-slate-500 text-xs mt-1">Manage your profile, billing, platform preferences, and data backups.</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 hover:bg-red-100/70 px-5 py-3 rounded-2xl border border-red-100 transition-all active:scale-95 cursor-pointer"
        >
          🚪 Sign Out
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {settingsTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3.5 px-5 font-bold text-xs border-b-2 transition-all whitespace-nowrap cursor-pointer border-0 bg-transparent ${
              activeTab === tab.id 
                ? 'border-b-2 border-indigo-600 text-indigo-650' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ============ PROFILE TAB ============ */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">My Profile</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-indigo-650 font-bold hover:underline bg-transparent border-0 cursor-pointer"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                <input
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editForm.businessName}
                  onChange={e => setEditForm({ ...editForm, businessName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Phone</label>
                  <input
                    type="tel"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/10 border-0 cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="p-6 sm:p-8 flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-2xl font-extrabold shadow-inner overflow-hidden uppercase flex-shrink-0">
                {user.logo ? <img src={user.logo} className="w-full h-full object-cover" /> : (user.name ? user.name.charAt(0) : 'U')}
              </div>
              <div className="min-w-0">
                <h4 className="text-lg font-extrabold text-slate-800">{user.name || 'User'}</h4>
                <p className="text-slate-500 text-xs">{user.email}</p>
                {user.businessName && (
                  <p className="text-[10px] text-indigo-650 font-bold mt-1.5 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100 inline-block">
                    🏢 {user.businessName}
                  </p>
                )}
                {user.phone && <p className="text-[10px] text-slate-400 mt-1">📞 {user.phone}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ BILLING TAB ============ */}
      {activeTab === 'billing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Wallet */}
          <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-[32px] shadow-xl text-white p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-8 -translate-y-8" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full transform -translate-x-12 translate-y-16" />
            
            <div className="relative z-10">
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">BizCredits Balance</p>
              <h3 className="text-4xl font-black mt-1 mb-2">
                {userStats.bizCredits} <span className="text-lg font-medium text-indigo-300">Credits</span>
              </h3>
              <p className="text-xs text-indigo-300 max-w-sm leading-relaxed mb-6">
                Use credits for advanced tasks: Business Plans (15), Photo Studio (2), AI Reminders (1), and more.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CREDIT_PACKS.map(pack => (
                  <button
                    key={pack.credits}
                    onClick={() => handlePackSelect(pack)}
                    className={`relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group active:scale-95 cursor-pointer
                      ${pack.popular 
                        ? 'bg-indigo-600 border-indigo-400 shadow-lg hover:bg-indigo-700' 
                        : 'bg-white/10 hover:bg-white/20 border-white/20'}`}
                  >
                    {pack.popular && (
                      <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-950 text-[9px] font-extrabold px-2 py-0.5 rounded-bl-xl">
                        BEST VALUE
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold opacity-80">{pack.label}</p>
                      <h4 className="text-2xl font-extrabold mt-1">{pack.credits} <span className="text-xs font-medium opacity-70">credits</span></h4>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-end">
                      <span className="text-[10px] opacity-75">{pack.desc}</span>
                      <span className="text-lg font-bold text-green-300">₦{pack.price.toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger History & Transactions */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Credit Ledger */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Credit Ledger</h3>
                <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Usage History</span>
              </div>
              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[350px] flex-1">
                {isLoadingHistory ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading ledger...</div>
                ) : ledger.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">No credit activities recorded.</div>
                ) : (
                  ledger.map(item => (
                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.activity}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className={`text-xs font-black whitespace-nowrap shrink-0 ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.amount < 0 ? '' : '+'}{item.amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Paystack Transactions */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Payments History</h3>
                <span className="text-[9px] font-black bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Paystack</span>
              </div>
              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[350px] flex-1">
                {isLoadingHistory ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">No payments processed yet.</div>
                ) : (
                  transactions.map(tx => (
                    <div key={tx.id} className="p-4 flex justify-between items-start hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-bold text-slate-800 truncate">{tx.description}</p>
                        <p className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">Ref: {tx.reference}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">₦{Number(tx.amount).toLocaleString()}</p>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider
                          ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============ SOCIAL & META TAB ============ */}
      {activeTab === 'social' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <span>📸</span> Meta & Instagram Auto-Publishing Integration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your Meta Developer Access Token to auto-publish AI posts directly to Instagram and Facebook.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              socialConnect.is_connected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {socialConnect.is_connected ? '🟢 Connected' : '🟡 Setup Required'}
            </span>
          </div>

          <form onSubmit={handleSaveSocial} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Meta User / Page Access Token <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={socialConnect.meta_access_token}
                onChange={e => setSocialConnect({ ...socialConnect, meta_access_token: e.target.value })}
                placeholder="EAA..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Generated from Meta Developer Portal (Graph API Explorer) with <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>pages_show_list</code> permissions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instagram Professional Account ID
                </label>
                <input
                  type="text"
                  value={socialConnect.instagram_account_id}
                  onChange={e => setSocialConnect({ ...socialConnect, instagram_account_id: e.target.value })}
                  placeholder="178414..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Facebook Page ID
                </label>
                <input
                  type="text"
                  value={socialConnect.facebook_page_id}
                  onChange={e => setSocialConnect({ ...socialConnect, facebook_page_id: e.target.value })}
                  placeholder="1098..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingSocial}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {savingSocial ? 'Saving...' : '💾 Save Social Connection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ PREFERENCES TAB ============ */}
      {activeTab === 'preferences' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Content Studio Defaults */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-sm">✍️</span>
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Content Studio Defaults</h3>
            </div>
            <div className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Platform</label>
                  <select
                    value={defaultPlatform}
                    onChange={(e) => setDefaultPlatform(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Instagram">📸 Instagram</option>
                    <option value="TikTok">🎵 TikTok</option>
                    <option value="Facebook">📘 Facebook</option>
                    <option value="Twitter">🐦 Twitter/X</option>
                    <option value="LinkedIn">💼 LinkedIn</option>
                    <option value="WhatsApp">💬 WhatsApp</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Writing Tone</label>
                  <select
                    value={defaultTone}
                    onChange={(e) => setDefaultTone(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Exciting">🔥 Exciting</option>
                    <option value="Professional">💼 Professional</option>
                    <option value="Friendly">🤝 Friendly</option>
                    <option value="Humorous">😂 Humorous</option>
                    <option value="Inspirational">✨ Inspirational</option>
                    <option value="Persuasive">💡 Persuasive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Gbege Book & Invoice Defaults */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-sm">📒</span>
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Gbege Book & Invoice Defaults</h3>
            </div>
            <div className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Reminder Tone</label>
                  <select
                    value={defaultReminderTone}
                    onChange={(e) => setDefaultReminderTone(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="POLITE">😊 Polite</option>
                    <option value="FIRM">😤 Firm</option>
                    <option value="STRICT">😠 Strict</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Currency</label>
                  <select
                    value={invoiceCurrency}
                    onChange={(e) => setInvoiceCurrency(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="NGN">🇳🇬 Nigerian Naira (₦)</option>
                    <option value="USD">🇺🇸 US Dollar ($)</option>
                    <option value="GBP">🇬🇧 British Pound (£)</option>
                    <option value="GHS">🇬🇭 Ghanaian Cedi (₵)</option>
                    <option value="KES">🇰🇪 Kenyan Shilling (KSh)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Payment Terms</label>
                  <select
                    value={invoicePaymentTerms}
                    onChange={(e) => setInvoicePaymentTerms(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory & Catalog Toggles */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-sm">📦</span>
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Inventory & Catalog</h3>
            </div>
            <div className="p-6 sm:p-8 space-y-5">
              <div className="space-y-4">
                {/* Auto-deduct stock toggle */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Auto-Deduct Stock on Credit Sale</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Automatically reduce catalog quantities when debts are recorded in Gbege Book.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoDeductStock(!autoDeductStock)}
                    className={`w-12 h-6 rounded-full transition-all relative border-0 cursor-pointer ${autoDeductStock ? 'bg-emerald-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${autoDeductStock ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                
                {/* Traction mode toggle */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Traction Mode (Offline Demo)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Run the platform with local mock data instead of requiring a backend connection.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTractionMode(!tractionMode)}
                    className={`w-12 h-6 rounded-full transition-all relative border-0 cursor-pointer ${tractionMode ? 'bg-emerald-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${tractionMode ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Preferences Button */}
          <button
            onClick={handleSavePreferences}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl transition-all border-0 cursor-pointer"
          >
            Save All Preferences
          </button>

        </div>
      )}

      {/* ============ DATA & BACKUP TAB ============ */}
      {activeTab === 'data' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Data Overview */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm">📊</span>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Business Data Overview</h3>
              </div>
              <button
                onClick={handleExportAllData}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-0 cursor-pointer"
              >
                📥 Export Full Backup
              </button>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Debtor Records', count: dataStats.debtors, icon: '📒', color: 'red', key: 'sb_debtors' },
                  { label: 'Invoices', count: dataStats.invoices, icon: '🧾', color: 'blue', key: 'sb_invoices_detailed' },
                  { label: 'Inventory Items', count: dataStats.products, icon: '📦', color: 'emerald', key: 'sb_idice_products' },
                  { label: 'Audit Logs', count: dataStats.transactionLogs, icon: '📋', color: 'amber', key: 'sb_idice_transaction_logs' },
                  { label: 'Content History', count: dataStats.contentHistory, icon: '✍️', color: 'indigo', key: 'sb_content_history' },
                  { label: 'Brand Profile', count: dataStats.brandProfile ? 1 : 0, icon: '✨', color: 'purple', key: 'sb_brand' },
                ].map(item => (
                  <div key={item.key} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{item.icon}</span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-800 font-heading">{item.count}</p>
                    </div>
                    {item.count > 0 && (
                      <button
                        onClick={() => handleClearSpecificData(item.key, item.label)}
                        className="w-full text-[9px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 py-1.5 rounded-lg transition-all bg-transparent border border-red-200/50 cursor-pointer"
                      >
                        Clear {item.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-[32px] border border-red-100 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <h3 className="font-extrabold text-red-800 text-xs uppercase tracking-widest">Danger Zone</h3>
            </div>
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Clear All Local Data</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Remove all locally stored business data (debtors, invoices, products, content). This cannot be undone.</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("⚠️ WARNING: This will delete ALL local business data. Are you absolutely sure?")) {
                      ['sb_debtors', 'sb_invoices_detailed', 'sb_invoices', 'sb_idice_products', 'sb_idice_transaction_logs', 'sb_content_history', 'sb_brand'].forEach(k => localStorage.removeItem(k));
                      toast.success("All local data cleared.");
                      setDataStats({ debtors: 0, invoices: 0, products: 0, transactionLogs: 0, brandProfile: false, contentHistory: 0 });
                    }
                  }}
                  className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border-0 cursor-pointer"
                >
                  Wipe All Data
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============ ADMIN TAB ============ */}
      {activeTab === 'admin' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Admin Stats Overview */}
          <div className="bg-slate-900 text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-2xl" />
            <div className="relative z-10">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Admin Control Center</p>
              <h3 className="text-2xl font-black mt-1 mb-6 font-heading">Payment Revenue Audit Dashboard</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Revenue</p>
                  <h4 className="text-lg font-black text-emerald-400 mt-1 font-heading">₦{(adminData?.total_revenue || 0).toLocaleString()}</h4>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Payments Sold</p>
                  <h4 className="text-lg font-black text-slate-100 mt-1 font-heading">{adminData?.success_count || 0} Successful</h4>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Failed Attempts</p>
                  <h4 className="text-lg font-black text-red-400 mt-1 font-heading">{adminData?.failed_count || 0} Failed</h4>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pending Checks</p>
                  <h4 className="text-lg font-black text-yellow-400 mt-1 font-heading">{adminData?.pending_count || 0} Pending</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Master Transaction Ledger */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-55 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Master Payment Ledger</h3>
              <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">All Users Transactions</span>
            </div>

            <div className="divide-y divide-slate-50 overflow-y-auto max-h-[450px]">
              {loadingAdmin ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading master ledger...</div>
              ) : !adminData || adminData.transactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">No payments recorded across the platform.</div>
              ) : (
                adminData.transactions.map(tx => (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-800">{tx.business_name || tx.username}</span>
                        <span className="text-[9px] text-slate-400">({tx.email})</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{tx.description}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Ref: {tx.reference} · {new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1.5">
                      <p className="text-xs font-black text-slate-900">₦{tx.amount.toLocaleString()}</p>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider
                        ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paystack Payment Modal */}
      {showTopUp && selectedPack && (
        <PaymentModal
          amount={selectedPack.price}
          description={`Top-Up: ${selectedPack.credits} BizCredits`}
          email={user.email}
          onClose={() => setShowTopUp(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Settings;
