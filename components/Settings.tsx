
import React, { useState } from 'react';
import { User, UserStats, Transaction } from '../types';
import PaymentModal from './PaymentModal';

interface SettingsProps {
  user: User;
  userStats: UserStats;
  transactions?: Transaction[];
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
  onTopUp?: (credits: number, amount: number, provider: 'PAYSTACK' | 'SQUAD') => void;
}

const Settings: React.FC<SettingsProps> = ({ user, userStats, transactions = [], onLogout, onUpdateUser, onTopUp }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name || '',
    businessName: user.businessName || '',
    email: user.email || '',
    phone: user.phone || ''
  });

  // Top Up State
  const [showTopUp, setShowTopUp] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ credits: number, price: number } | null>(null);

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
    }
    setIsEditing(false);
  };

  const handlePlanSelect = (credits: number, price: number) => {
    setSelectedPlan({ credits, price });
    setShowTopUp(true);
  };

  const handlePaymentSuccess = (provider: 'PAYSTACK' | 'SQUAD') => {
    if (selectedPlan && onTopUp) {
      onTopUp(selectedPlan.credits, selectedPlan.price, provider);
    }
    setShowTopUp(false);
    setSelectedPlan(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings & Billing</h2>
        <p className="text-gray-600 text-sm mt-1">Manage your profile and credits.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">My Profile</h3>
          <div className="flex gap-2">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full uppercase">
              {user.plan} Plan
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
              <input
                className="w-full p-2 border rounded-lg"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Name</label>
              <input
                className="w-full p-2 border rounded-lg"
                value={editForm.businessName}
                onChange={e => setEditForm({ ...editForm, businessName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input
                  className="w-full p-2 border rounded-lg"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                <input
                  className="w-full p-2 border rounded-lg"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">Save Changes</button>
          </form>
        ) : (
          <div className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold overflow-hidden">
              {user.logo ? <img src={user.logo} className="w-full h-full object-cover" /> : (user.name ? user.name.charAt(0) : 'U')}
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{user.name}</h4>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 mt-1">{user.businessName}</p>
              {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
            </div>
          </div>
        )}
      </div>

      {/* BizCredits Wallet */}
      <div className="bg-indigo-900 rounded-xl shadow-lg text-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>

        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider">BizCredits Balance</p>
          <h3 className="text-4xl font-bold mt-1 mb-4">{userStats.bizCredits} <span className="text-lg font-normal opacity-70">Credits</span></h3>
          <p className="text-xs text-indigo-200 mb-6">Use credits for AI Video (50), Advanced Branding (20), and more.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Starter Plan */}
            <button
              onClick={() => handlePlanSelect(20, 900)}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-left hover:bg-white/20 transition-all group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 bg-gray-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg text-white opacity-50">STARTER</div>
              <div>
                <p className="text-2xl font-bold">20 <span className="text-sm font-normal opacity-70">Credits</span></p>
                <p className="text-3xl font-bold text-green-300 mt-2">₦900</p>
              </div>
              <p className="text-[10px] text-indigo-200 mt-3 pt-3 border-t border-white/10">Perfect for quick tasks.</p>
            </button>

            {/* Hustler Plan (Most Popular) */}
            <button
              onClick={() => handlePlanSelect(80, 3000)}
              className="bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-indigo-400 rounded-xl p-4 text-left hover:scale-105 transition-all shadow-xl relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 bg-orange-500 text-[10px] font-bold px-3 py-1 rounded-bl-lg text-white shadow-sm">POPULAR</div>
              <div>
                <p className="text-2xl font-bold">80 <span className="text-sm font-normal opacity-70">Credits</span></p>
                <p className="text-3xl font-bold text-green-300 mt-2">₦3,000</p>
              </div>
              <p className="text-[10px] text-indigo-100 mt-3 pt-3 border-t border-white/20">Can generate 1 Video + Posts.</p>
            </button>

            {/* Business Plan */}
            <button
              onClick={() => handlePlanSelect(300, 9000)}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-left hover:bg-white/20 transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 bg-green-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg text-white">BEST VALUE</div>
              <div>
                <p className="text-2xl font-bold">300 <span className="text-sm font-normal opacity-70">Credits</span></p>
                <p className="text-3xl font-bold text-green-300 mt-2">₦9,000</p>
              </div>
              <p className="text-[10px] text-indigo-200 mt-3 pt-3 border-t border-white/10">Full Agency Mode. 5+ Videos.</p>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Transaction History</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm italic">
              No transactions yet. Start trading!
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="text-sm font-bold text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()} • {tx.provider}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">- ₦{tx.amount.toLocaleString()}</p>
                  <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">{tx.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="text-red-600 font-medium text-sm hover:text-red-700 flex items-center gap-2"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>

      {/* Payment Modal */}
      {showTopUp && selectedPlan && (
        <PaymentModal
          amount={selectedPlan.price}
          description={`Top Up: ${selectedPlan.credits} BizCredits`}
          email={user.email}
          onClose={() => setShowTopUp(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Settings;
