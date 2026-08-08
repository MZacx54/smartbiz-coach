import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Building2, CheckCircle2, ShieldCheck, ArrowRight, RefreshCw, CreditCard } from 'lucide-react';

interface BankOption {
  name: string;
  code: string;
}

interface PayoutDetails {
  is_setup: boolean;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  paystack_subaccount_code: string;
}

const DEFAULT_BANKS: BankOption[] = [
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Zenith Bank", code: "057" },
  { name: "Access Bank", code: "044" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Moniepoint Microfinance Bank", code: "50515" },
  { name: "OPay Digital Services", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Kuda Bank", code: "50211" },
  { name: "FCMB (First City Monument Bank)", code: "214" },
  { name: "Wema Bank (ALAT)", code: "035" },
  { name: "Sterling Bank", code: "232" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "Ecobank Nigeria", code: "050" },
];

export const BankPayoutSetup: React.FC = () => {
  const [banks, setBanks] = useState<BankOption[]>(DEFAULT_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState('');
  
  const [isResolving, setIsResolving] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);

  // Fetch payout details and bank list on mount
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [detailsRes, bankRes] = await Promise.allSettled([
          api.get('/api/marketplace/payout/details/'),
          api.get('/api/marketplace/payout/banks/')
        ]);

        if (detailsRes.status === 'fulfilled' && detailsRes.value.data) {
          setPayoutDetails(detailsRes.value.data);
          if (detailsRes.value.data.bank_code) {
            setSelectedBankCode(detailsRes.value.data.bank_code);
          }
          if (detailsRes.value.data.account_number) {
            setAccountNumber(detailsRes.value.data.account_number);
          }
          if (detailsRes.value.data.account_name) {
            setResolvedAccountName(detailsRes.value.data.account_name);
          }
        }

        if (bankRes.status === 'fulfilled' && bankRes.value.data?.banks) {
          setBanks(bankRes.value.data.banks);
        }
      } catch (e) {
        console.error("Payout details load notice:", e);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchDetails();
  }, []);

  const handleResolveBank = async () => {
    if (!accountNumber || accountNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit NUBAN account number");
      return;
    }
    if (!selectedBankCode) {
      toast.error("Please select your bank");
      return;
    }

    setIsResolving(true);
    setResolvedAccountName('');
    try {
      const res = await api.post('/api/marketplace/payout/resolve-bank/', {
        account_number: accountNumber,
        bank_code: selectedBankCode
      });
      if (res.data?.account_name) {
        setResolvedAccountName(res.data.account_name);
        toast.success(`Account Verified: ${res.data.account_name}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not resolve bank account details. Check account number.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleEnablePayouts = async () => {
    if (!selectedBankCode || !accountNumber || !resolvedAccountName) {
      toast.error("Please resolve and verify your account name first.");
      return;
    }

    const selectedBankObj = banks.find(b => b.code === selectedBankCode);
    const bankName = selectedBankObj ? selectedBankObj.name : 'Nigerian Commercial Bank';

    setIsSettingUp(true);
    try {
      const res = await api.post('/api/marketplace/payout/setup/', {
        bank_name: bankName,
        bank_code: selectedBankCode,
        account_number: accountNumber,
        account_name: resolvedAccountName
      });

      setPayoutDetails({
        is_setup: true,
        bank_name: bankName,
        bank_code: selectedBankCode,
        account_number: accountNumber,
        account_name: resolvedAccountName,
        paystack_subaccount_code: res.data.paystack_subaccount_code || ''
      });

      toast.success("Direct Paystack Bank Payouts enabled! Customer product payments will now route directly to your bank account.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to enable payouts. Try again.");
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isLoadingDetails) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs font-medium text-slate-400">Loading Payout Configuration...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">Direct Paystack Bank Payouts</h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                0% Platform Fee
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Receive 100% of storefront product sales directly into your bank account via Paystack Subaccounts.
            </p>
          </div>
        </div>

        {payoutDetails?.is_setup && (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PAYOUT ACTIVE ({payoutDetails.paystack_subaccount_code || 'CONNECTED'})</span>
          </div>
        )}
      </div>

      {/* Linked Payout Status Summary Card */}
      {payoutDetails?.is_setup && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Connected Settlement Account</span>
            <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded text-slate-300">
              {payoutDetails.paystack_subaccount_code}
            </span>
          </div>

          <div className="relative z-10">
            <h4 className="text-base font-black text-white">{payoutDetails.account_name}</h4>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              {payoutDetails.bank_name} • {payoutDetails.account_number}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
            <span>✅ Customer Online Payments Route Directly to Your Bank</span>
            <span>Paystack Automated Next-Day Settlement</span>
          </div>
        </div>
      )}

      {/* Setup Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">Select Bank</label>
            <select
              value={selectedBankCode}
              onChange={(e) => {
                setSelectedBankCode(e.target.value);
                setResolvedAccountName('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Choose Commercial / Microfinance / Fintech Bank --</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">10-Digit NUBAN Account Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ''));
                  setResolvedAccountName('');
                }}
                placeholder="e.g. 0123456789"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleResolveBank}
                disabled={isResolving || !accountNumber || accountNumber.length !== 10 || !selectedBankCode}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-xl text-xs font-bold disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
              >
                {isResolving ? 'Verifying...' : 'Verify Account'}
              </button>
            </div>
          </div>
        </div>

        {/* Resolved Account Name Badge */}
        {resolvedAccountName && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">Verified NUBAN Account Holder Name</span>
                <span className="text-sm font-black text-emerald-950">{resolvedAccountName}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnablePayouts}
              disabled={isSettingUp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {isSettingUp ? 'Enabling Payouts...' : 'Save & Enable Payouts'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
