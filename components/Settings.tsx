import React, { useState, useEffect } from 'react';
import { User, UserStats } from '../types';
import PaymentModal from './PaymentModal';
import { billingService, TransactionData, CreditLedgerData, AdminDashboardData } from '../services/billingService';
import { authService } from '../services/authService';
import { marketingService } from '../services/marketingService';
import { toast } from 'react-hot-toast';

import { useLocation } from 'react-router-dom';

interface SettingsProps {
  user: User;
  userStats: UserStats;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
  onTopUpSuccess?: (newCredits: number) => void;
}

const CREDIT_PACKS = [
  { credits: 40, price: 500, label: 'Micro Pack', desc: 'For quick AI tasks & emergency SMS' },
  { credits: 150, price: 1500, label: 'Starter Pack', desc: '1 Product Boost or 30 AI generations' },
  { credits: 400, price: 3500, label: 'Grower Pack', desc: '1 Grant Business Plan or 7-Day Boost', popular: true },
  { credits: 1000, price: 7500, label: 'Vendor Pro Pack', desc: 'Vendor Badge + 2 Boosts + SMS campaigns' },
];

import { BankPayoutSetup } from './BankPayoutSetup';

type SettingsTab = 'profile' | 'payout' | 'billing' | 'social' | 'preferences' | 'data' | 'admin';

const Settings: React.FC<SettingsProps> = ({ user, userStats, onLogout, onUpdateUser, onTopUpSuccess }) => {
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name || '',
    businessName: user.businessName || user.business_name || '',
    email: user.email || '',
    phone: user.phone || '',
    location: user.location || '',
    currency: user.currency || 'NGN'
  });

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Switch activeTab based on search parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'billing') {
      setActiveTab('billing');
    }
  }, [location]);

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
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
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
            whatsapp_phone_number_id: res.whatsapp_phone_number_id || '',
            whatsapp_access_token: res.whatsapp_access_token || '',
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
  const [adminSubTab, setAdminSubTab] = useState<'orders' | 'credits' | 'payouts'>('orders');

  const handleExportAdminCSV = () => {
    if (!adminData) return;
    let csv = "Category,ID,Merchant/User,Customer/Email,Amount (NGN),Details/Ref,Status,Date\n";
    
    (adminData.storefront_orders || []).forEach(o => {
      csv += `"Storefront Order",${o.id},"${o.business_name}","${o.customer_name} (${o.customer_contact})",${o.amount},"${o.product_name}",${o.status},"${o.created_at}"\n`;
    });

    (adminData.transactions || []).forEach(t => {
      csv += `"BizCredit AI Purchase",${t.id},"${t.business_name}","${t.email}",${t.amount},"${t.description} (Ref: ${t.reference})",${t.status},"${t.created_at}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartBiz_Admin_Financial_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Financial Audit CSV exported!");
  };

  // Sync edit form when user changes
  useEffect(() => {
    setEditForm({
      name: user.name || '',
      businessName: user.businessName || user.business_name || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || '',
      currency: user.currency || 'NGN'
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

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, SVG)');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        } else {
          if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const base64Logo = canvas.toDataURL('image/jpeg', 0.85);

        try {
          await authService.updateProfile({ logo: base64Logo });
          const updatedUser = { ...user, logo: base64Logo };
          if (onUpdateUser) onUpdateUser(updatedUser);
          toast.success("Business logo updated & synced across your storefront, invoices, and marketplace!");
        } catch (err: any) {
          toast.error("Failed to update logo. Try again.");
        } finally {
          setIsUploadingLogo(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.updateProfile({
        name: editForm.name,
        business_name: editForm.businessName,
        email: editForm.email,
        phone: editForm.phone,
        location: editForm.location,
        currency: editForm.currency
      });

      const updatedUser = {
        ...user,
        name: editForm.name,
        businessName: editForm.businessName,
        business_name: editForm.businessName,
        email: editForm.email,
        phone: editForm.phone,
        location: editForm.location,
        currency: editForm.currency
      };

      if (onUpdateUser) onUpdateUser(updatedUser);
      toast.success("Profile & Business Brand updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save profile changes.");
    }
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
    { id: 'payout' as SettingsTab, label: 'Bank Payouts', icon: '🏦' },
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
      <div className="flex border-b border-slate-200/80 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1.5 flex-nowrap shrink-0">
        {settingsTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap cursor-pointer border-0 bg-transparent flex items-center gap-2 shrink-0 ${
              activeTab === tab.id 
                ? 'border-b-2 border-indigo-600 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Hidden File Input for Profile & Logo Upload */}
      <input
        type="file"
        id="profile-logo-file-input"
        accept="image/*"
        className="hidden"
        onChange={handleLogoFileUpload}
      />

      {/* ============ PROFILE TAB ============ */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200 space-y-0">
          
          {/* Hero Banner & Logo Upload */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />

            {/* Avatar Circle with Camera Overlay */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-tr from-indigo-600 to-indigo-700 rounded-3xl sm:rounded-[32px] flex items-center justify-center text-white text-3xl font-extrabold shadow-2xl overflow-hidden uppercase border-2 border-white/20">
                {user.logo ? (
                  <img src={user.logo} className="w-full h-full object-cover" alt="Business Logo" />
                ) : (
                  <span>{(user.name || user.businessName || 'U').charAt(0)}</span>
                )}
              </div>

              {/* Camera Icon Overlay */}
              <label
                htmlFor="profile-logo-file-input"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-3xl sm:rounded-[32px] flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-1 backdrop-blur-xs"
              >
                <span className="text-lg">📷</span>
                <span>{isUploadingLogo ? 'Uploading...' : 'Change Logo'}</span>
              </label>

              <label
                htmlFor="profile-logo-file-input"
                className="absolute -bottom-2 -right-2 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl shadow-lg border-2 border-slate-900 cursor-pointer transition-transform active:scale-90"
                title="Upload Business Logo"
              >
                <span className="text-xs">📷</span>
              </label>
            </div>

            {/* User Meta Info */}
            <div className="flex-1 text-center sm:text-left space-y-2 relative z-10">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                  {user.businessName || user.business_name || user.name || 'My Business'}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  {user.plan || 'Free'} Plan
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium">{user.name} ({user.email})</p>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-1 text-[11px]">
                {user.location && (
                  <span className="bg-white/10 text-slate-200 px-3 py-1 rounded-full font-bold">
                    📍 {user.location}
                  </span>
                )}
                {user.phone && (
                  <span className="bg-white/10 text-slate-200 px-3 py-1 rounded-full font-bold">
                    📞 {user.phone}
                  </span>
                )}
                <span className="bg-emerald-400/20 text-emerald-300 px-3 py-1 rounded-full font-bold">
                  ✓ Logo Auto-Synced to Storefront
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer border-0 shrink-0 relative z-10"
            >
              {isEditing ? 'Cancel Edit' : '✏️ Edit Profile Details'}
            </button>
          </div>

          {/* Form / Details View */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name *</label>
                  <input
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name *</label>
                  <input
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.businessName}
                    onChange={e => setEditForm({ ...editForm, businessName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Lagos, Yaba / Abuja"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.location}
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Currency</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.currency}
                    onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                  >
                    <option value="NGN">NGN (₦ - Nigerian Naira)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-bold transition-all border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 active:scale-95 border-0 cursor-pointer"
                >
                  Save Profile & Sync Logo
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name</span>
                  <span className="text-sm font-bold text-slate-800">{user.name || 'Not set'}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Business Name</span>
                  <span className="text-sm font-bold text-slate-800">{user.businessName || user.business_name || 'Not set'}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</span>
                  <span className="text-sm font-bold text-slate-800">{user.email || 'Not set'}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">WhatsApp / Phone</span>
                  <span className="text-sm font-bold text-slate-800">{user.phone || 'Not set'}</span>
                </div>
              </div>

              {/* Peer Referral & Organic Growth Hub */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      Earn +50 AI Credits Per Referral
                    </span>
                    <h4 className="text-lg font-black text-white mt-2">Invite Merchants & Promote Platform</h4>
                    <p className="text-xs text-slate-300">Share your unique referral link with fellow business owners. Earn +50 AI Credits for every new store created!</p>
                  </div>
                  <span className="text-3xl">🎁</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    readOnly
                    className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-emerald-400 outline-none"
                    value={`https://smartbizcoach.com.ng/register?ref=${encodeURIComponent(user.name || user.email || 'vendor')}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://smartbizcoach.com.ng/register?ref=${encodeURIComponent(user.name || user.email || 'vendor')}`);
                      toast.success("Referral link copied to clipboard!");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border-0 cursor-pointer shrink-0"
                  >
                    📋 Copy Link
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hi! Register your business on SmartBiz Coach to launch a 24/7 digital storefront with direct Paystack bank payouts: https://smartbizcoach.com.ng/register?ref=${encodeURIComponent(user.name || user.email || 'vendor')}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border-0 cursor-pointer flex items-center justify-center gap-1.5 text-decoration-none shrink-0"
                  >
                    <span>💬 Share on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ BANK PAYOUTS TAB ============ */}
      {activeTab === 'payout' && (
        <div className="animate-in fade-in duration-200">
          <BankPayoutSetup />
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

            {/* WhatsApp Cloud API Section */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <span>💬</span> WhatsApp Cloud API Automation Settings
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={socialConnect.whatsapp_phone_number_id}
                    onChange={e => setSocialConnect({ ...socialConnect, whatsapp_phone_number_id: e.target.value })}
                    placeholder="105492..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Access Token (Optional if Meta Token used)
                  </label>
                  <input
                    type="password"
                    value={socialConnect.whatsapp_access_token}
                    onChange={e => setSocialConnect({ ...socialConnect, whatsapp_access_token: e.target.value })}
                    placeholder="Leave blank to use Meta Access Token above"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
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
          {/* Admin Header & Stats */}
          <div className="bg-slate-900 text-white rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full filter blur-3xl" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div>
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  Platform Admin Control Center
                </span>
                <h3 className="text-2xl font-black mt-2 font-heading text-white">Payment Revenue & Settlement Audit</h3>
                <p className="text-xs text-slate-400 mt-1">Ecosystem-wide financial intelligence across merchant stores and AI wallet top-ups.</p>
              </div>

              <button
                type="button"
                onClick={handleExportAdminCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 border-0"
              >
                📥 Export Financial CSV
              </button>
            </div>
            
            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Storefront Products GMV</p>
                <h4 className="text-lg font-black text-white mt-1 font-heading">₦{(adminData?.storefront_gmv || 0).toLocaleString()}</h4>
                <span className="text-[9px] text-slate-400">All Merchant Store Sales</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">BizCredit AI Wallet Revenue</p>
                <h4 className="text-lg font-black text-white mt-1 font-heading">₦{(adminData?.total_revenue || 0).toLocaleString()}</h4>
                <span className="text-[9px] text-slate-400">Platform AI Credits</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Linked Paystack Payouts</p>
                <h4 className="text-lg font-black text-white mt-1 font-heading">{adminData?.active_subaccounts_count || 0} Subaccounts</h4>
                <span className="text-[9px] text-slate-400">Direct Merchant Settlement</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">Total Ecosystem Logs</p>
                <h4 className="text-lg font-black text-white mt-1 font-heading">{adminData?.total_count || 0} Transactions</h4>
                <span className="text-[9px] text-slate-400">Paid & Tracked Orders</span>
              </div>
            </div>
          </div>

          {/* Ledger Sub-Tab Selector */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              onClick={() => setAdminSubTab('orders')}
              className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer border-0 bg-transparent ${
                adminSubTab === 'orders' ? 'border-indigo-600 text-indigo-650' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              🛍️ Storefront Product Orders ({adminData?.storefront_orders?.length || 0})
            </button>
            <button
              onClick={() => setAdminSubTab('credits')}
              className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer border-0 bg-transparent ${
                adminSubTab === 'credits' ? 'border-indigo-600 text-indigo-650' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              ⚡ BizCredit AI Purchases ({adminData?.transactions?.length || 0})
            </button>
            <button
              onClick={() => setAdminSubTab('payouts')}
              className={`pb-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer border-0 bg-transparent ${
                adminSubTab === 'payouts' ? 'border-indigo-600 text-indigo-650' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              🏛️ Merchant Bank Subaccounts ({adminData?.merchant_payout_directory?.length || 0})
            </button>
          </div>

          {/* Ledger Content Container */}
          <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            
            {/* SUB-TAB 1: STOREFRONT PRODUCT ORDERS */}
            {adminSubTab === 'orders' && (
              <div>
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Storefront Product Purchases (All Merchants)</h3>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full">
                    GMV Total: ₦{(adminData?.storefront_gmv || 0).toLocaleString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[480px]">
                  {loadingAdmin ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading storefront orders...</div>
                  ) : !adminData?.storefront_orders || adminData.storefront_orders.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">No storefront orders recorded yet.</div>
                  ) : (
                    adminData.storefront_orders.map(ord => (
                      <div key={ord.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{ord.business_name}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              Customer: {ord.customer_name} ({ord.customer_contact})
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-700">{ord.product_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Date: {new Date(ord.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1">
                          <p className="text-sm font-black text-emerald-600">₦{ord.amount.toLocaleString()}</p>
                          <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase tracking-wider">
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: BIZCREDIT AI PURCHASES */}
            {activeTab === 'admin' && adminSubTab === 'credits' && (
              <div>
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">BizCredit AI Wallet Purchases (Platform Revenue)</h3>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-3 py-0.5 rounded-full">
                    Platform Revenue: ₦{(adminData?.total_revenue || 0).toLocaleString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[480px]">
                  {loadingAdmin ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading wallet purchases...</div>
                  ) : !adminData || adminData.transactions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">No credit purchases recorded.</div>
                  ) : (
                    adminData.transactions.map(tx => (
                      <div key={tx.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{tx.business_name || tx.username}</span>
                            <span className="text-[10px] text-slate-400">({tx.email})</span>
                          </div>
                          <p className="text-xs font-medium text-slate-600">{tx.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Ref: {tx.reference} • {new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1">
                          <p className="text-sm font-black text-indigo-600">₦{tx.amount.toLocaleString()}</p>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                            tx.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: MERCHANT BANK SUBACCOUNTS */}
            {activeTab === 'admin' && adminSubTab === 'payouts' && (
              <div>
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Merchant Paystack Direct Payout Subaccount Directory</h3>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full">
                    {adminData?.active_subaccounts_count || 0} Subaccounts Active
                  </span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[480px]">
                  {!adminData?.merchant_payout_directory || adminData.merchant_payout_directory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">No merchant payout records found.</div>
                  ) : (
                    adminData.merchant_payout_directory.map(v => (
                      <div key={v.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{v.business_name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{v.business_type}</span>
                            {v.is_verified && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">CAC VERIFIED</span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            {v.account_name} ({v.bank_name} • {v.account_number})
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">WhatsApp: {v.whatsapp_number}</p>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1">
                          <span className="text-xs font-mono font-bold bg-slate-900 text-emerald-400 px-3 py-1 rounded-lg">
                            {v.paystack_subaccount_code}
                          </span>
                          <span className="text-[9px] text-slate-400">Direct Paystack Settlement</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
