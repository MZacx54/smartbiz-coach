import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Check, Sparkles, ShieldCheck, Zap, ArrowRight, 
  HelpCircle, ChevronDown, Building2, Star, Coins
} from 'lucide-react';
import SEO from './SEO';
import PaymentModal from './PaymentModal';
import { toast } from 'react-hot-toast';

interface PricingPageProps {
  onTopUpSuccess?: (newCredits: number) => void;
  currentUser?: any;
}

const CREDIT_PACKS = [
  { credits: 50, price: 500, label: 'Micro Pack', desc: '50 BizCredits (~₦10/credit) for daily AI marketing & price tags' },
  { credits: 150, price: 1500, label: 'Starter Pack', desc: '150 BizCredits for 7-day boost + photo AI' },
  { credits: 400, price: 3500, label: 'Grower Pack', desc: '400 BizCredits (+50 Bonus) for Verified Badge & Studio Shoots', popular: true },
  { credits: 1000, price: 7500, label: 'Vendor Pro Pack', desc: '1,000 BizCredits (+250 Bonus) for 30-Day VIP + Full AI Studio' },
  { credits: 2500, price: 15000, label: 'Mogul Pack', desc: '2,500 BizCredits for continuous weekly boosts & business plans' },
];

const FAQS = [
  {
    q: 'Can I really use the Daily Cashbook 100% free forever?',
    a: 'Yes, absolutely. Core daily business tools—including sales logging, expense recording, debt tracking in the Gbege Book, and generating customer receipts—are 100% free and do not require any subscription or credit deduction.'
  },
  {
    q: 'What are BizCredits used for?',
    a: 'BizCredits are compute tokens used exclusively for heavy AI operations (such as high-resolution Photo Studio background replacement, generating full 3-year bankable business plans, AI voice POS transcription, and automated WhatsApp Cloud broadcasts).'
  },
  {
    q: 'How does NACCIMA and Chamber bulk onboarding work?',
    a: 'Chamber coordinators and association executives can upload member rosters via CSV to provision verified MSME accounts in bulk. Each member receives 100 welcome BizCredits and their chapter dashboard tracks adoption in real time.'
  },
  {
    q: 'Is my commercial transaction data safe and NDPR compliant?',
    a: 'Yes. SmartBiz Coach operates in strict compliance with the Nigeria Data Protection Regulation (NDPR) and the Nigeria Data Protection Act (NDPA 2023). We never sell your sales or customer debt books to third parties.'
  },
  {
    q: 'What payment methods do you accept for credit packs?',
    a: 'We accept all Nigerian bank debit cards (Mastercard, Visa, Verve), instant bank transfers, and USSD via our licensed Paystack gateway.'
  }
];

export const PricingPage: React.FC<PricingPageProps> = ({ onTopUpSuccess, currentUser }) => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPack, setSelectedPack] = useState<typeof CREDIT_PACKS[0] | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSelectPack = (pack: typeof CREDIT_PACKS[0]) => {
    if (!currentUser) {
      toast('Please sign in or create an account to purchase BizCredits.', { icon: '🔐' });
      navigate('/login?redirect=/pricing');
      return;
    }
    setSelectedPack(pack);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (_reference: string) => {
    setShowPaymentModal(false);
    toast.success(`Payment verified! ${selectedPack?.credits} BizCredits added to your wallet.`);
    if (onTopUpSuccess && selectedPack) {
      onTopUpSuccess(selectedPack.credits);
    }
  };

  const pricingSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SmartBiz Coach MSME Platform',
    description: 'AI-Powered Business Cockpit, Cashbook, and Digital Storefront for Nigerian MSMEs',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Forever MSME Starter',
        price: '0',
        priceCurrency: 'NGN',
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Growth Merchant Pro Tier',
        price: billingCycle === 'annual' ? '35000' : '3500',
        priceCurrency: 'NGN',
        availability: 'https://schema.org/InStock'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <SEO 
        title="Transparent Pricing for Nigerian MSMEs & Chambers | SmartBiz Coach"
        description="Simple, fair pricing starting at ₦0. Manage day-books, debtors, invoices, AI photo studio, and credit scoring. Bulk onboarding available for NACCIMA members."
        schema={pricingSchema}
      />

      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-sm">
              SB
            </div>
            <span className="font-heading font-black text-white text-lg tracking-tight group-hover:text-emerald-400 transition-colors">
              SmartBiz <span className="text-emerald-400">Coach</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link 
              to="/dashboard"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/register"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
            >
              Start Free
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-black text-emerald-400 uppercase tracking-widest">
            <span>🇳🇬</span> Fair & Accessible Pricing for Nigerian MSMEs
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight leading-tight">
            Start Free Forever. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Upgrade as Your Revenue Scales.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            No forced credit card requirements. Free daily bookkeeping forever, with pay-as-you-grow AI superchargers and institutional chamber licensing.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly')}
              className="w-14 h-8 bg-slate-800 rounded-full p-1 relative transition-colors border border-slate-700"
              aria-label="Toggle Billing Cycle"
            >
              <div 
                className={`w-6 h-6 rounded-full bg-emerald-400 transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-white' : 'text-slate-500'}`}>
              Annual
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* 3 Core Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          
          {/* Tier 1: Free Starter */}
          <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                Entry & Micro-Retail
              </span>
              <h2 className="text-2xl font-black text-white font-heading">MSME Starter</h2>
              <p className="text-xs text-slate-400">Everything needed to run daily books and sales on mobile.</p>
              
              <div className="pt-2">
                <span className="text-4xl font-black text-white font-heading">₦0</span>
                <span className="text-xs text-slate-500 font-bold ml-1">/ Free Forever</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                {[
                  'Daily Cashbook (5-sec Sales & Petty Cash)',
                  'Gbege Book (Debtor Reminders & partial payments)',
                  'Unlimited Invoices & Receipts (WhatsApp share)',
                  'Public Storefront Link (/shop/your-name)',
                  '50 Welcome BizCredits on sign up',
                  'Apprentice Cashier Lock Mode (Owner PIN)',
                  '100% Offline-capable Local Storage'
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/register"
              className="w-full text-center bg-slate-800 hover:bg-slate-700 text-white font-black text-xs py-3 rounded-2xl transition-all border border-slate-700 active:scale-95 block"
            >
              Get Started Free
            </Link>
          </div>

          {/* Tier 2: Growth Merchant (Highlighted) */}
          <div className="bg-gradient-to-b from-slate-900 to-emerald-950/40 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500 relative flex flex-col justify-between space-y-6 shadow-2xl shadow-emerald-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg">
              Most Popular for Growth
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Active Traders & Boutiques
              </span>
              <h2 className="text-2xl font-black text-white font-heading">Growth Merchant</h2>
              <p className="text-xs text-slate-300">AI-powered studio, voice ingestion, and verified merchant badge.</p>
              
              <div className="pt-2">
                <span className="text-4xl font-black text-white font-heading">
                  {billingCycle === 'annual' ? '₦35,000' : '₦3,500'}
                </span>
                <span className="text-xs text-slate-400 font-bold ml-1">
                  {billingCycle === 'annual' ? '/ year (₦2,916/mo)' : '/ month'}
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 pt-4 border-t border-emerald-500/20">
                {[
                  'Everything in Free Starter +',
                  'AI Photo Studio (Clean background removal & tags)',
                  'Voice POS Note Ingest (Pidgin & English audio-to-sale)',
                  'Paper Receipt OCR Camera Scanner',
                  'Verified CAC Merchant Badge on Marketplace',
                  '400 Monthly BizCredits Included',
                  'Automated WhatsApp Outbound Confirmations',
                  'Priority Google & AI Search Engine (GEO) Indexing',
                  'Exportable Financial Health Score for Banks'
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSelectPack(CREDIT_PACKS[2])}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              Upgrade to Growth Pro
            </button>
          </div>

          {/* Tier 3: Chambers & Enterprise */}
          <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
                NACCIMA, SMEDAN & Chambers
              </span>
              <h2 className="text-2xl font-black text-white font-heading">Chamber Enterprise</h2>
              <p className="text-xs text-slate-400">Institutional bulk onboarding, underwriting cohorts, and donor reporting.</p>
              
              <div className="pt-2">
                <span className="text-4xl font-black text-white font-heading">Custom</span>
                <span className="text-xs text-slate-500 font-bold ml-1">/ Institutional Cohort</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                {[
                  'Bulk MSME CSV Onboarding (100 - 5,000+ members)',
                  'Dedicated Chapter Admin & Activation Dashboard',
                  'Bank of Industry (BOI) & DBN Underwriting Export',
                  '100 Welcome BizCredits pre-allocated per member',
                  'NACCIMA Co-branded Chamber Portal variant',
                  'WhatsApp Cloud Conversational Ledger Integration',
                  'Dedicated Technical Support & Training Sessions',
                  'NDPR Certified Data Custody & Encryption'
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/partner-portal"
              className="w-full text-center bg-slate-800 hover:bg-slate-700 text-white font-black text-xs py-3 rounded-2xl transition-all border border-slate-700 active:scale-95 block"
            >
              Access Chamber Portal
            </Link>
          </div>

        </div>

        {/* BizCredits Pay-As-You-Go Packs */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                <Coins className="w-4 h-4" /> Need Extra AI Power?
              </div>
              <h2 className="text-2xl font-black text-white font-heading mt-1">
                BizCredit Top-Up Packs (No Subscription Required)
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Credits never expire. Top up anytime.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <div 
                key={pack.credits}
                className={`bg-slate-950 p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all hover:border-emerald-500/50 ${
                  pack.popular ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-slate-800'
                }`}
              >
                <div>
                  {pack.popular && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full inline-block mb-2">
                      Popular
                    </span>
                  )}
                  <h3 className="font-extrabold text-white text-sm">{pack.label}</h3>
                  <p className="text-2xl font-black text-white font-heading mt-2">
                    ₦{pack.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-400 font-bold mt-0.5">
                    {pack.credits} BizCredits
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    {pack.desc}
                  </p>
                </div>

                <button
                  onClick={() => handleSelectPack(pack)}
                  className="w-full bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-black text-xs py-2 rounded-xl transition-all border border-slate-700 active:scale-95 cursor-pointer"
                >
                  Buy Pack
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white font-heading">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-400">Everything you need to know about SmartBiz Coach billing and data privacy.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex justify-between items-center text-left text-sm font-bold text-white hover:text-emerald-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 rounded-3xl p-8 sm:p-12 border border-emerald-500/20 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
            Ready to Digitize Your Trade Operations Today?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of Nigerian retailers, wholesalers, and artisans managing their daily books and scaling their revenue with SmartBiz Coach.
          </p>
          <div className="pt-2 flex justify-center items-center gap-3 flex-wrap">
            <Link
              to="/register"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95"
            >
              Create Free Account
            </Link>
            <Link
              to="/market"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl transition-all border border-slate-700 active:scale-95"
            >
              Explore Public Marketplace
            </Link>
          </div>
        </div>

      </div>

      {/* Paystack Modal */}
      {showPaymentModal && selectedPack && currentUser && (
        <PaymentModal
          amount={selectedPack.price}
          description={`Top-Up: ${selectedPack.credits} BizCredits`}
          email={currentUser.email}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default PricingPage;
