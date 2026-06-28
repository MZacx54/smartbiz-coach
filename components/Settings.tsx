import React, { useState, useEffect } from 'react';
import { User, UserStats } from '../types';
import PaymentModal from './PaymentModal';
import { billingService, TransactionData, CreditLedgerData } from '../services/billingService';

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

const Settings: React.FC<SettingsProps> = ({ user, userStats, onLogout, onUpdateUser, onTopUpSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name || '',
    businessName: user.businessName || '',
    email: user.email || '',
    phone: user.phone || ''
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');

  // Billing states
  const [showTopUp, setShowTopUp] = useState(false);
  const [selectedPack, setSelectedPack] = useState<typeof CREDIT_PACKS[0] | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync edit form when user changes
  useEffect(() => {
    setEditForm({
      name: user.name || '',
      businessName: user.businessName || '',
      email: user.email || '',
      phone: user.phone || ''
    });
  }, [user]);

  // Load history on mount
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
      showToast("Profile updated successfully!");
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
      showToast(`Success! Added ${selectedPack.credits} credits to your account.`);
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
      alert(err?.response?.data?.error || "Payment verification failed. Please contact support.");
    } finally {
      setVerifyingPayment(false);
      setSelectedPack(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white text-sm font-semibold px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2 border border-gray-800 animate-in slide-in-from-top duration-300">
          <span>✨</span> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings & Wallet</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage your profile, wallet, and credit ledger.</p>
        </div>
        <button
          onClick={onLogout}
          className="text-red-600 font-semibold text-sm hover:text-red-700 transition-colors flex items-center gap-1.5 bg-red-50 hover:bg-red-100/70 px-4 py-2 rounded-xl border border-red-100"
        >
          🚪 Sign Out
        </button>
      </div>

      {/* Verification Loader Overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-xs">
            <svg className="animate-spin w-10 h-10 text-green-600 mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <h4 className="font-bold text-gray-900 text-lg">Verifying Payment</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              We are connecting with Paystack to credit your wallet. Please hold on...
            </p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-6 font-bold text-sm border-b-2 transition-all ${activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          👤 Profile Settings
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-4 px-6 font-bold text-sm border-b-2 transition-all ${activeTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          💳 Credit Wallet & Billing
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">My Profile</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input
                  required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Name</label>
                <input
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editForm.businessName}
                  onChange={e => setEditForm({ ...editForm, businessName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp / Phone</label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-600/10"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="p-6 flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-2xl font-extrabold shadow-inner overflow-hidden uppercase">
                {user.logo ? <img src={user.logo} className="w-full h-full object-cover" /> : (user.name ? user.name.charAt(0) : 'U')}
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">{user.name || user.username}</h4>
                <p className="text-gray-500 text-sm">{user.email}</p>
                {user.businessName && (
                  <p className="text-xs text-indigo-600 font-semibold mt-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                    🏢 {user.businessName}
                  </p>
                )}
                {user.phone && <p className="text-xs text-gray-400 mt-1">📞 {user.phone}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Wallet */}
          <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-2xl shadow-xl text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-8 -translate-y-8" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full transform -translate-x-12 translate-y-16" />
            
            <div className="relative z-10">
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">BizCredits Balance</p>
              <h3 className="text-4xl font-black mt-1 mb-2">
                {userStats.bizCredits} <span className="text-lg font-medium text-indigo-300">Credits</span>
              </h3>
              <p className="text-xs text-indigo-300 max-w-sm leading-relaxed mb-6">
                Use your credits to run advanced tasks like Business Plans (15) or social graphics (2) when you exceed free limits.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CREDIT_PACKS.map(pack => (
                  <button
                    key={pack.credits}
                    onClick={() => handlePackSelect(pack)}
                    className={`relative text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group active:scale-95
                      ${pack.popular 
                        ? 'bg-indigo-600 border-indigo-400 shadow-lg hover:bg-indigo-700' 
                        : 'bg-white/10 hover:bg-white/20 border-white/20'}`}
                  >
                    {pack.popular && (
                      <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-950 text-[9px] font-extrabold px-2 py-0.5 rounded-bl">
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Credit Ledger</h3>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Usage History</span>
              </div>
              <div className="divide-y divide-gray-100 overflow-y-auto max-h-[350px] flex-1">
                {isLoadingHistory ? (
                  <div className="p-8 text-center text-sm text-gray-400">Loading ledger...</div>
                ) : ledger.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400 italic">No credit activities recorded.</div>
                ) : (
                  ledger.map(item => (
                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-bold text-gray-800 truncate">{item.activity}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className={`text-sm font-black whitespace-nowrap shrink-0 ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.amount < 0 ? '' : '+'}{item.amount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Paystack Transactions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Payments History</h3>
                <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Paystack</span>
              </div>
              <div className="divide-y divide-gray-100 overflow-y-auto max-h-[350px] flex-1">
                {isLoadingHistory ? (
                  <div className="p-8 text-center text-sm text-gray-400">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400 italic">No payments processed yet.</div>
                ) : (
                  transactions.map(tx => (
                    <div key={tx.id} className="p-4 flex justify-between items-start hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-bold text-gray-800 truncate">{tx.description}</p>
                        <p className="text-[9px] text-gray-400 mt-1 uppercase font-semibold">Ref: {tx.reference}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-gray-900">₦{Number(tx.amount).toLocaleString()}</p>
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
