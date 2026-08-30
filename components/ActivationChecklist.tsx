import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandIdentity, User, AppView } from '../types';

interface ActivationChecklistProps {
  savedBrand: BrandIdentity | null;
  user: User | null;
  onNavigate: (view: AppView) => void;
  credits: number;
}

export const ActivationChecklist: React.FC<ActivationChecklistProps> = ({
  savedBrand,
  user,
  onNavigate,
  credits
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return localStorage.getItem('sb_activation_dismissed') === 'true';
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Check state of completion
  const isBrandDone = Boolean(savedBrand && savedBrand.businessName && (savedBrand.niche || savedBrand.elevatorPitch));
  const isPayoutDone = Boolean(user?.phone && user?.phone.length >= 10);
  const isProductDone = Boolean(localStorage.getItem('sb_products') && JSON.parse(localStorage.getItem('sb_products') || '[]').length > 0);
  const isDebtorDone = Boolean(localStorage.getItem('sb_debtors') && JSON.parse(localStorage.getItem('sb_debtors') || '[]').length > 0);
  const isPlanDone = Boolean(localStorage.getItem('sb_saved_plan') || localStorage.getItem('sb_plan_data'));

  const steps = [
    {
      id: 'brand',
      title: 'Define Your Brand DNA & Voice',
      desc: 'Set up elevator pitch, taglines & colors so AI can write personalized copy.',
      icon: '🎨',
      reward: '+25 BizCredits',
      isCompleted: isBrandDone,
      actionText: isBrandDone ? 'Review Brand' : '⚡ Setup in 60s',
      view: AppView.BRAND_BUILDER,
      highlight: true
    },
    {
      id: 'payout',
      title: 'Connect Direct Bank Payouts',
      desc: 'Link your bank/OPay account to receive 100% direct customer settlements via Paystack.',
      icon: '🏦',
      reward: 'Direct Settlements',
      isCompleted: isPayoutDone,
      actionText: isPayoutDone ? 'Manage Bank' : 'Connect Bank',
      view: AppView.SETTINGS,
      highlight: false
    },
    {
      id: 'product',
      title: 'Snap & List Your First Product',
      desc: 'Launch your Public Storefront & Market Square catalog in seconds.',
      icon: '📦',
      reward: 'Live Public Store',
      isCompleted: isProductDone,
      actionText: isProductDone ? 'View Inventory' : 'Add Product',
      view: AppView.PRODUCT_MANAGER,
      highlight: false
    },
    {
      id: 'debtor',
      title: 'Log Debt or Invoice in Gbege Book',
      desc: 'Track debtor balances and recover money fast with 1-click WhatsApp prompts.',
      icon: '📒',
      reward: 'WhatsApp Prompts',
      isCompleted: isDebtorDone,
      actionText: isDebtorDone ? 'Open Book' : 'Record Entry',
      view: AppView.DEBTOR_BOOK,
      highlight: false
    },
    {
      id: 'business_plan',
      title: 'Generate Investor Business Plan',
      desc: 'Institutional 7-chapter financial model & deck for BOI/bank grants.',
      icon: '📄',
      reward: 'Investor Deck',
      isCompleted: isPlanDone,
      actionText: isPlanDone ? 'View Plan' : 'Generate Plan',
      view: AppView.BUSINESS_PLAN,
      highlight: false
    }
  ];

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (dismissed && progressPercent === 100) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-[28px] p-5 shadow-2xl text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-xl shadow-inner">
            🚀
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">
                MSME Launch & Activation Checklist
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {progressPercent}% Complete
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Complete these foundation steps to unlock the full power of your SmartBiz Operating System.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all border border-white/10 font-bold cursor-pointer"
          >
            {isExpanded ? 'Minimize ▲' : 'Expand Steps ▼'}
          </button>
          {progressPercent === 100 && (
            <button
              onClick={() => {
                setDismissed(true);
                localStorage.setItem('sb_activation_dismissed', 'true');
              }}
              className="text-xs text-slate-400 hover:text-white p-1.5 cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 mt-3">
        <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full shadow-lg"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1.5 px-0.5">
          <span>{completedCount} of {steps.length} Core Foundations Done</span>
          <span className="text-emerald-400 font-extrabold">
            {progressPercent === 100 ? '🎉 All Set! Pro Merchant Active' : `${100 - progressPercent}% Remaining`}
          </span>
        </div>
      </div>

      {/* Step items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 mt-4 space-y-2.5"
          >
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl border transition-all gap-3 ${
                  step.isCompleted
                    ? 'bg-slate-900/40 border-emerald-500/20 text-slate-300'
                    : step.highlight
                    ? 'bg-indigo-900/30 border-indigo-400/40 text-white shadow-lg shadow-indigo-950/50'
                    : 'bg-slate-900/60 border-white/10 text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 font-bold ${
                      step.isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    {step.isCompleted ? '✓' : step.icon}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-black ${step.isCompleted ? 'text-slate-300 line-through' : 'text-white'}`}>
                        {idx + 1}. {step.title}
                      </h4>
                      {step.reward && !step.isCompleted && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          🎁 {step.reward}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => onNavigate(step.view)}
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      step.isCompleted
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        : step.highlight
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold shadow-indigo-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                    }`}
                  >
                    <span>{step.actionText}</span>
                    <span className="text-[10px]">➔</span>
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivationChecklist;
