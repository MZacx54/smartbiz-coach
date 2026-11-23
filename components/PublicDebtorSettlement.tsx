import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, ShieldCheck, ArrowLeft, ExternalLink, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { openPaystackCheckout } from '../services/paystackService';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface DebtorData {
  id: string;
  name: string;
  phone: string;
  amount: number;
  outstanding: number;
  itemsBought: string;
  dueDate: string;
  merchantName: string;
  merchantPhone: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}

const PublicDebtorSettlement: React.FC = () => {
  const { debtorId } = useParams<{ debtorId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [debtor, setDebtor] = useState<DebtorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [copiedBank, setCopiedBank] = useState(false);

  useEffect(() => {
    const loadDebtor = async () => {
      setLoading(true);
      let foundDebtor: DebtorData | null = null;
      const DUMMY_ACCOUNTS = ['0098765432', '1012345678', '0123456789', '1234567890'];

      // 1. Try Live Backend API lookup first (works on any device/phone globally)
      if (debtorId) {
        try {
          const res = await api.get(`/api/marketplace/debtors/settle/${debtorId}/`);
          if (res.data && res.data.found) {
            const data = res.data;
            const validBankAcc = data.has_verified_bank && !DUMMY_ACCOUNTS.includes(data.account_number) ? data.account_number : '';
            foundDebtor = {
              id: debtorId,
              name: data.customer_name || 'Valued Customer',
              phone: data.customer_phone || '',
              amount: data.total_amount || 0,
              outstanding: data.is_paid ? 0 : (data.outstanding || 0),
              itemsBought: data.item_name || 'Credit purchase',
              dueDate: data.due_date || '',
              merchantName: data.merchant_name || 'Verified Merchant Store',
              merchantPhone: data.merchant_phone || '',
              bankName: validBankAcc ? (data.bank_name || '') : '',
              bankAccount: validBankAcc,
              bankAccountName: validBankAcc ? (data.account_name || data.merchant_name || '') : ''
            };
          }
        } catch (err) {
          console.warn("Backend debtor lookup notice:", err);
        }
      }

      // 2. Try localStorage if on merchant's own browser/device
      if (!foundDebtor) {
        try {
          const savedDebtors = localStorage.getItem('sb_debtors');
          if (savedDebtors && debtorId) {
            const list = JSON.parse(savedDebtors);
            const match = list.find((d: any) => String(d.id) === String(debtorId));
            if (match) {
              const totalPaid = (match.payments || []).reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
              const outstanding = Math.max(0, match.amount - totalPaid);
              
              // Only load valid verified bank accounts; never use fake placeholders
              let bankName = '';
              let bankAccount = '';
              let bankAccountName = '';
              
              try {
                const savedBank = localStorage.getItem('sb_bank_payout');
                if (savedBank) {
                  const b = JSON.parse(savedBank);
                  if (b.account_number && !DUMMY_ACCOUNTS.includes(b.account_number)) {
                    bankName = b.bank_name || '';
                    bankAccount = b.account_number;
                    bankAccountName = b.account_name || '';
                  }
                }
              } catch {}

              const savedUser = localStorage.getItem('sb_user');
              let merchantName = 'Verified Merchant Store';
              let merchantPhone = '';
              if (savedUser) {
                try {
                  const u = JSON.parse(savedUser);
                  merchantName = u.businessName || u.name || merchantName;
                  merchantPhone = u.phone || merchantPhone;
                } catch {}
              }

              foundDebtor = {
                id: match.id,
                name: match.name,
                phone: match.phone || '',
                amount: match.amount,
                outstanding: match.status === 'PAID' ? 0 : outstanding,
                itemsBought: match.itemsBought || 'Credit purchase',
                dueDate: match.dueDate || '',
                merchantName,
                merchantPhone,
                bankName,
                bankAccount,
                bankAccountName: bankAccountName || merchantName
              };
            }
          }
        } catch (e) {
          console.warn("Could not read local debtor data", e);
        }
      }

      // 3. URL parameters fallback (allows link to work on any remote device/phone)
      if (!foundDebtor && searchParams.get('n')) {
        const name = searchParams.get('n') || 'Valued Customer';
        const amount = parseFloat(searchParams.get('a') || '0') || 0;
        const outstanding = parseFloat(searchParams.get('b') || searchParams.get('a') || '0') || 0;
        const items = searchParams.get('i') || 'Credit Purchase';
        const due = searchParams.get('d') || '';
        const mName = searchParams.get('m') || 'SmartBiz Verified Merchant';
        const mPhone = searchParams.get('p') || '';
        const rawBAcc = searchParams.get('ba') || '';
        const isBAccValid = rawBAcc && !DUMMY_ACCOUNTS.includes(rawBAcc);
        const bName = isBAccValid ? (searchParams.get('bn') || '') : '';
        const bAcc = isBAccValid ? rawBAcc : '';
        const bAccName = isBAccValid ? (searchParams.get('ban') || mName) : '';

        foundDebtor = {
          id: debtorId || 'debt-settle',
          name,
          phone: '',
          amount,
          outstanding,
          itemsBought: items,
          dueDate: due,
          merchantName: mName,
          merchantPhone: mPhone,
          bankName: bName,
          bankAccount: bAcc,
          bankAccountName: bAccName
        };
      }

      setDebtor(foundDebtor);
      setLoading(false);
    };

    loadDebtor();
  }, [debtorId, searchParams]);

  const handlePayOnline = async () => {
    if (!debtor || debtor.outstanding <= 0) {
      toast.error("This account balance is already settled!");
      return;
    }

    setIsPaying(true);
    try {
      await openPaystackCheckout({
        amount: debtor.outstanding,
        customerName: debtor.name,
        customerPhone: debtor.phone || '08000000000',
        orderNotes: `Settlement of ${debtor.itemsBought} for ${debtor.merchantName}`,
        onSuccess: (res) => {
          setPaymentRef(res.reference);
          setPaymentSuccess(true);
          toast.success("Payment confirmed successfully! 🎉");

          // Sync settlement to backend DailySale
          if (debtor.id) {
            api.post(`/api/marketplace/debtors/settle/${debtor.id}/`, { reference: res.reference }).catch(() => {});
          }

          // Update local debtor record if present
          try {
            const savedDebtors = localStorage.getItem('sb_debtors');
            if (savedDebtors && debtor.id) {
              const list = JSON.parse(savedDebtors);
              const updated = list.map((d: any) => {
                if (String(d.id) === String(debtor.id)) {
                  const paymentEntry = {
                    amount: debtor.outstanding,
                    timestamp: new Date().toISOString(),
                    method: 'PAYSTACK_ONLINE',
                    note: `Settled via Public 1-Tap Portal (Ref: ${res.reference})`
                  };
                  return {
                    ...d,
                    status: 'PAID',
                    payments: [...(d.payments || []), paymentEntry]
                  };
                }
                return d;
              });
              localStorage.setItem('sb_debtors', JSON.stringify(updated));
            }
          } catch (e) {
            console.error("Local sync error", e);
          }
        },
        onClose: () => {
          setIsPaying(false);
        }
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to launch Paystack checkout. Please use direct bank transfer.");
      setIsPaying(false);
    }
  };

  const handleCopyAccount = () => {
    if (!debtor?.bankAccount) return;
    navigator.clipboard?.writeText(debtor.bankAccount);
    setCopiedBank(true);
    toast.success("Account number copied!");
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const handleNotifyMerchantWhatsApp = () => {
    if (!debtor) return;
    const cleanPhone = (debtor.merchantPhone || '').replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('0') ? '234' + cleanPhone.slice(1) : (cleanPhone || '2349064556107');
    const text = paymentSuccess
      ? `Hello ${debtor.merchantName} 👋! I have just settled my balance of *₦${debtor.outstanding.toLocaleString()}* for *${debtor.itemsBought}* via online card/transfer payment.\n\nTransaction Reference: *${paymentRef}*\nKindly verify and confirm receipt. Thank you!`
      : `Hello ${debtor.merchantName} 👋! Regarding my balance of *₦${debtor.outstanding.toLocaleString()}* for *${debtor.itemsBought}*:\nI have initiated a direct bank transfer. Please check your bank app and acknowledge payment once received. Thank you!`;

    window.open(`https://wa.me/${phoneToUse}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading secure settlement portal...</p>
        </div>
      </div>
    );
  }

  if (!debtor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Settlement Record Not Found</h2>
          <p className="text-xs text-slate-500">This payment link may have expired or the invoice has already been fully reconciled.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-emerald-50/20 py-8 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-5">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              {debtor.merchantName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold text-slate-900 truncate">{debtor.merchantName}</h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                  <ShieldCheck size={11} /> Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">Official Credit & Debt Settlement Portal</p>
            </div>
          </div>
        </div>

        {/* Success State Banner */}
        {paymentSuccess && (
          <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-xl text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <h2 className="text-xl font-black">Payment Completed!</h2>
            <p className="text-xs text-emerald-100 max-w-sm mx-auto">
              Your debt balance of ₦{debtor.outstanding.toLocaleString()} has been settled in full. A notification receipt has been logged.
            </p>
            <div className="bg-white/10 rounded-2xl p-3 text-left space-y-1 text-xs">
              <p className="text-emerald-200 text-[10px] uppercase font-bold tracking-wider">Transaction Reference</p>
              <p className="font-mono font-bold text-white select-all">{paymentRef}</p>
            </div>
            <button
              onClick={handleNotifyMerchantWhatsApp}
              className="w-full py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <MessageCircle size={15} /> Send Payment Receipt on WhatsApp
            </button>
          </div>
        )}

        {/* Bill / Invoice Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-5">
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Name</p>
              <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{debtor.name}</h2>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
              debtor.outstanding <= 0 || paymentSuccess
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {debtor.outstanding <= 0 || paymentSuccess ? '✓ SETTLED' : 'PENDING PAYMENT'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Items / Goods Supplied:</span>
              <span className="font-bold text-slate-800 text-right max-w-[200px]">{debtor.itemsBought}</span>
            </div>
            {debtor.dueDate && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Credit Due Date:</span>
                <span className="font-bold text-slate-800">{debtor.dueDate}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Total Credit Value:</span>
              <span className="font-bold text-slate-800">₦{debtor.amount.toLocaleString()}</span>
            </div>
            {debtor.amount > debtor.outstanding && (
              <div className="flex justify-between text-xs text-emerald-700">
                <span className="font-medium">Previous Payments:</span>
                <span className="font-bold">- ₦{(debtor.amount - debtor.outstanding).toLocaleString()}</span>
              </div>
            )}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Outstanding Balance:</span>
              <span className="text-2xl font-black text-rose-600">
                ₦{(paymentSuccess ? 0 : debtor.outstanding).toLocaleString()}
              </span>
            </div>
          </div>

          {!paymentSuccess && debtor.outstanding > 0 && (
            <div className="space-y-3 pt-3">
              {/* Primary 1-Tap Pay Online */}
              <button
                onClick={handlePayOnline}
                disabled={isPaying}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPaying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting Paystack...</span>
                  </>
                ) : (
                  <>
                    <span>💳 Pay Online Instantly (₦{debtor.outstanding.toLocaleString()})</span>
                    <span>→</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" />
                Secured by Paystack (Card, USSD, Bank Transfer, Apple Pay)
              </p>
            </div>
          )}
        </div>

        {/* Direct Bank Transfer Option */}
        {!paymentSuccess && debtor.outstanding > 0 && debtor.bankAccount ? (
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Option 2: Direct Bank Transfer</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Transfer directly to the merchant's verified bank account:</p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</span>
                <span className="text-xs font-extrabold text-white">{debtor.bankName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Account Name</span>
                <span className="text-xs font-extrabold text-white truncate max-w-[200px]">{debtor.bankAccountName}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Number</span>
                  <span className="text-base font-mono font-black text-emerald-400 tracking-wider">{debtor.bankAccount}</span>
                </div>
                <button
                  onClick={handleCopyAccount}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Copy size={12} />
                  <span>{copiedBank ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleNotifyMerchantWhatsApp}
              className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle size={14} /> Notify Merchant on WhatsApp After Transfer
            </button>
          </div>
        ) : !paymentSuccess && debtor.outstanding > 0 ? (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 text-center space-y-2 shadow-sm">
            <p className="text-xs font-bold text-slate-800">Need to pay via Bank Transfer or USSD?</p>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
              Please use <strong>Option 1 (Pay Online Instantly)</strong> above. Paystack supports instant Nigerian Bank Transfer, USSD, Debit Cards, and Mobile Banking.
            </p>
            {debtor.merchantPhone && (
              <button
                onClick={handleNotifyMerchantWhatsApp}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <MessageCircle size={14} className="text-emerald-600" />
                <span>Message Merchant on WhatsApp</span>
              </button>
            )}
          </div>
        ) : null}

        {/* Footer info */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-slate-400">Powered by SmartBiz Coach Gbege Book Automation Engine</p>
          <p className="text-[9px] text-slate-400">Encrypted 256-bit SSL Settlement Gateway</p>
        </div>

      </div>
    </div>
  );
};

export default PublicDebtorSettlement;
