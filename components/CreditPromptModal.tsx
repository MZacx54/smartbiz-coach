import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { openPaystackCheckout } from '../services/paystackService';
import { billingService } from '../services/billingService';
import { Zap, ShieldCheck, Check, Sparkles, X, ChevronRight } from 'lucide-react';

interface CreditPromptModalProps {
  isOpen: boolean;
  featureLabel: string;
  creditCost: number;
  currentCredits: number;
  onConfirm: () => void;
  onClose: () => void;
  onCreditsUpdated?: (newBalance: number) => void;
}

const CREDIT_PACK_OPTIONS = [
  { credits: 40, price: 500, label: 'Micro Pack', desc: '40 🪙 for quick tasks & daily AI' },
  { credits: 150, price: 1500, label: 'Starter Pack', desc: '150 🪙 for 1 Boost or Brand Kit' },
  { credits: 400, price: 3500, label: 'Grower Pack', desc: '400 🪙 for Business Plan + Boost', popular: true },
  { credits: 1000, price: 7500, label: 'Vendor Pro', desc: '1,000 🪙 for Verified Badge + Boosts' },
  { credits: 2500, price: 15000, label: 'Mogul Pack', desc: '2,500 🪙 for continuous heavy boosts' },
];

const CreditPromptModal: React.FC<CreditPromptModalProps> = ({
  isOpen,
  featureLabel,
  creditCost,
  currentCredits,
  onConfirm,
  onClose,
  onCreditsUpdated,
}) => {
  const navigate = useNavigate();

  // Pick suitable default pack based on creditCost
  const defaultPack = CREDIT_PACK_OPTIONS.find(p => p.credits >= creditCost) || CREDIT_PACK_OPTIONS[2];
  const [selectedPack, setSelectedPack] = useState(defaultPack);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  if (!isOpen) return null;

  const hasEnoughCredits = currentCredits >= creditCost;

  // Auto-confirm if user already has enough credits
  if (hasEnoughCredits) {
    onConfirm();
    return null;
  }

  const handlePaystackTopUp = async () => {
    setIsProcessingPayment(true);
    try {
      toast.loading(`Opening Paystack checkout for ${selectedPack.label}...`, { id: 'topup-toast' });
      
      await openPaystackCheckout({
        amount: selectedPack.price,
        customerName: 'SmartBiz Merchant',
        customerPhone: '',
        orderNotes: `BizCredit Top-Up: ${selectedPack.credits} Credits for ${featureLabel}`,
        onSuccess: async (res) => {
          toast.loading('Verifying transaction & crediting wallet...', { id: 'topup-toast' });
          try {
            const verifyRes = await billingService.verifyPayment(res.reference, selectedPack.price);
            const newBal = verifyRes.credits || (currentCredits + selectedPack.credits);
            
            toast.success(`🎉 +${selectedPack.credits} BizCredits added! Starting ${featureLabel}...`, { id: 'topup-toast' });
            
            // Dispatch update event
            window.dispatchEvent(new CustomEvent('smartbiz_credits_updated', { detail: newBal }));
            if (onCreditsUpdated) onCreditsUpdated(newBal);

            // Execute the action that requested credits
            onConfirm();
            onClose();
          } catch (vErr) {
            toast.error('Payment succeeded but wallet sync is finalizing. Please refresh balance.', { id: 'topup-toast' });
            onClose();
          } finally {
            setIsProcessingPayment(false);
          }
        },
        onClose: () => {
          toast.dismiss('topup-toast');
          setIsProcessingPayment(false);
        }
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open Paystack', { id: 'topup-toast' });
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 relative border border-slate-100 text-center animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm">
          🪙
        </div>
        <h3 className="text-lg font-black text-slate-900 font-heading">
          Unlock {featureLabel}
        </h3>
        
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
          This premium tool requires <strong>{creditCost} BizCredits</strong>. You have <strong className="text-amber-600">{currentCredits} credits</strong> left in your wallet.
        </p>

        {/* Quick Pack Selection */}
        <div className="space-y-2 mt-5 text-left">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
            Select Top-Up Credit Pack:
          </label>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {CREDIT_PACK_OPTIONS.map((pack) => {
              const isSelected = selectedPack.credits === pack.credits;
              const willCover = (currentCredits + pack.credits) >= creditCost;
              return (
                <div
                  key={pack.credits}
                  onClick={() => setSelectedPack(pack)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs text-slate-900 font-bold">{pack.label}</strong>
                        {pack.popular && (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">
                            Best Value
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{pack.desc}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-black text-slate-900 block font-heading">
                      ₦{pack.price.toLocaleString()}
                    </span>
                    <span className={`text-[9px] font-bold ${willCover ? 'text-emerald-700' : 'text-slate-400'}`}>
                      +{pack.credits} 🪙
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1-Tap Paystack Instant Button */}
        <div className="mt-6 space-y-2">
          <button
            onClick={handlePaystackTopUp}
            disabled={isProcessingPayment}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs transition-all active:scale-95 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>{isProcessingPayment ? 'Connecting Paystack...' : `Pay ₦${selectedPack.price.toLocaleString()} & Continue`}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              navigate('/dashboard/settings');
            }}
            className="w-full py-2 text-slate-500 hover:text-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
          >
            Or pay via Bank Transfer in Settings ➔
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secured by Paystack • Instant Auto-Crediting</span>
        </div>

      </div>
    </div>
  );
};

export default CreditPromptModal;
