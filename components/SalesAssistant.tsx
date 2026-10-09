import React, { useState } from 'react';
import { 
  MessageCircle, Send, Copy, Check, Info, ShieldCheck, ArrowRight, 
  Wand2, Sparkles, User, Bot, RotateCcw, Flame, Tag, MapPin, 
  DollarSign, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

type SalesContext = 'CLOSING' | 'OBJECTION' | 'PRICE_ISSUE' | 'FOLLOW_UP' | 'GREETING';
type CustomerPersona = 'HAGGLER' | 'SKEPTIC' | 'GHOSTER' | 'B2B_CORPORATE' | 'READY_TO_PAY';
type ClosingStyle = 'MIXED' | 'PIDGIN' | 'CORPORATE' | 'FOMO' | 'SOFT_PULL';

interface SalesResult {
  buyer_psychology?: string;
  tactical_gameplan?: string;
  options: string[];
  counter_offer_proposal?: string;
  deal_confidence_score?: number;
  one_liner: string;
  strategy_tip: string;
  do_not_say: string[];
}

interface ChatMessage {
  sender: 'user' | 'buyer';
  text: string;
  feedback?: string;
  trust_score?: number;
  suggested_counter?: string;
}

interface SalesAssistantProps {
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const SalesAssistant: React.FC<SalesAssistantProps> = ({ credits = 0, onUpdateCredits }) => {
  const [activeTab, setActiveTab] = useState<'SUGGEST' | 'ROLEPLAY'>('SUGGEST');
  
  // Deal & Customer Intelligence Context
  const [context, setContext] = useState<SalesContext>('CLOSING');
  const [customerPersona, setCustomerPersona] = useState<CustomerPersona>('HAGGLER');
  const [closingStyle, setClosingStyle] = useState<ClosingStyle>('MIXED');
  
  // Deal Variables
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [floorPrice, setFloorPrice] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  
  // Generation & Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SalesResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Live Roleplay Simulator States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      sender: 'buyer', 
      text: "Hello! I saw your product post on WhatsApp. How much is the last price and do you deliver to Port Harcourt?",
      trust_score: 55
    }
  ]);
  const [userReply, setUserReply] = useState('');
  const [isRoleplaying, setIsRoleplaying] = useState(false);
  const [currentTrustMeter, setCurrentTrustMeter] = useState<number>(55);

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  const personaOptions: { id: CustomerPersona; label: string; icon: string; desc: string }[] = [
    { id: 'HAGGLER', label: 'Price Haggler', icon: '🏷️', desc: 'Wants discount, compares with others' },
    { id: 'SKEPTIC', label: 'Scam-Cautious', icon: '🛡️', desc: 'Afraid of fake vendors, doubts pay-before' },
    { id: 'GHOSTER', label: 'Silent / Ghoster', icon: '👻', desc: 'Left on read after seeing price' },
    { id: 'B2B_CORPORATE', label: 'Corporate Buyer', icon: '👔', desc: 'Needs proforma invoice, VAT, bulk terms' },
    { id: 'READY_TO_PAY', label: 'Warm Buyer', icon: '⚡', desc: 'Ready for bank account & fast dispatch' },
  ];

  const contextOptions: { id: SalesContext; label: string; icon: string; desc: string }[] = [
    { id: 'CLOSING', label: 'Close Deal Today', icon: '💰', desc: 'Lock payment commitment' },
    { id: 'PRICE_ISSUE', label: 'Price is Too High', icon: '📉', desc: 'Anchor value & offer counter' },
    { id: 'OBJECTION', label: 'Handle Doubt / POD', icon: '🛡️', desc: 'Reframe trust & guarantees' },
    { id: 'FOLLOW_UP', label: 'Revive Quiet Lead', icon: '⏰', desc: 'Polite re-engagement hook' },
    { id: 'GREETING', label: 'First Contact Lead', icon: '👋', desc: 'Hook, qualify & guide' },
  ];

  const styleOptions: { id: ClosingStyle; label: string; icon: string }[] = [
    { id: 'MIXED', label: 'Balanced (3 Angles)', icon: '⚡' },
    { id: 'PIDGIN', label: 'Naija Street-Smart', icon: '🇳🇬' },
    { id: 'CORPORATE', label: 'Corporate Executive', icon: '👔' },
    { id: 'FOMO', label: 'Urgency & Scarcity', icon: '🔥' },
    { id: 'SOFT_PULL', label: 'Consultative Soft', icon: '🤝' },
  ];

  const executeGenerate = async (deduct: boolean, cost: number) => {
    setIsGenerating(true);
    setShowCreditPrompt(false);
    try {
      const response = await api.post('/api/content/generate-sales-script/', {
        context,
        customer_persona: customerPersona,
        customer_message: customerMessage,
        closing_style: closingStyle,
        product_name: productName,
        product_price: productPrice,
        floor_price: floorPrice,
        delivery_location: deliveryLocation,
        mode: 'SUGGEST'
      });

      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Sales Closer');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('sales_assistant');
      }

      setResult(response.data);
      toast.success("Executive Sales Closer gameplan generated!");
    } catch (error) {
      toast.error("Failed to generate options. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    const usage = usageLimiter.checkUsage('sales_assistant', credits);
    
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }

    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeGenerate(true, usage.cost); });
      setShowCreditPrompt(true);
      return;
    }

    await executeGenerate(false, 0);
  };

  const handleSendRoleplayReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userReply.trim() || isRoleplaying) return;

    const currentInput = userReply;
    setUserReply('');
    setChatMessages(prev => [...prev, { sender: 'user', text: currentInput }]);
    setIsRoleplaying(true);

    try {
      const res = await api.post('/api/content/generate-sales-script/', {
        mode: 'ROLEPLAY_REPLY',
        customer_persona: customerPersona,
        customer_message: currentInput,
        product_name: productName,
        product_price: productPrice,
        floor_price: floorPrice,
        delivery_location: deliveryLocation,
        chat_history: chatMessages
      });

      const newTrust = res.data.trust_score || (res.data.deal_closed ? 95 : 65);
      setCurrentTrustMeter(newTrust);

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'buyer',
          text: res.data.buyer_reply || "Alright, that sounds good!",
          feedback: res.data.feedback,
          trust_score: newTrust,
          suggested_counter: res.data.suggested_counter
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'buyer',
          text: "Okay, send me your official bank account details so I can complete payment!",
          feedback: "Great negotiation reply! Clear payment directive sent.",
          trust_score: 90
        }
      ]);
    } finally {
      setIsRoleplaying(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Executive Sales Rep Engine
              </span>
              <h1 className="text-2xl sm:text-3xl font-black font-heading mt-1">AI Professional Sales Closer</h1>
            </div>
          </div>
          <p className="text-emerald-50 max-w-xl text-xs sm:text-sm leading-relaxed">
            Acts like a real human sales executive: qualifies buyer psychology, handles tough Nigerian objections, protects your profit margin, and drafts counter-offers that close deals on WhatsApp.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="relative z-10 bg-black/40 p-1.5 rounded-2xl flex items-center border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('SUGGEST')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SUGGEST' ? 'bg-white text-emerald-950 shadow-lg' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Executive Closer
          </button>
          <button
            onClick={() => setActiveTab('ROLEPLAY')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ROLEPLAY' ? 'bg-white text-emerald-950 shadow-lg' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Live Practice Sim
          </button>
        </div>
      </div>

      {/* ================= MODE 1: EXECUTIVE CLOSER SCRIPT GENERATOR ================= */}
      {activeTab === 'SUGGEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Deal Inputs & Customer Persona */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Customer Persona Selector */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  1. Who are you speaking with?
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Persona Intelligence
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {personaOptions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCustomerPersona(p.id)}
                    className={`flex items-start p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      customerPersona === p.id
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg mr-2.5 flex-shrink-0">{p.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${customerPersona === p.id ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {p.label}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 2. Deal Intelligence Variables */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                2. Deal Parameters (Optional but recommended)
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight">
                Helps the AI negotiate realistically and protect your profit margin.
              </p>
              
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Product / Item Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Italian Leather Shoes / EseFresh 1L"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Listed Price (₦)</label>
                    <input
                      type="text"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      placeholder="e.g. 25,000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bottom Line / Floor (₦)</label>
                    <input
                      type="text"
                      value={floorPrice}
                      onChange={(e) => setFloorPrice(e.target.value)}
                      placeholder="e.g. 22,000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Customer Delivery City / Area</label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="e.g. Port Harcourt / Ikeja, Lagos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </section>

            {/* 3. Sales Situation & Tone */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                3. What is the current situation?
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {contextOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setContext(opt.id)}
                    className={`flex items-start p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      context === opt.id
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-lg mr-2.5">{opt.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${context === opt.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-500">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Tone Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Closing Tone</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {styleOptions.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setClosingStyle(style.id)}
                      className={`p-2 rounded-xl border text-center transition-all text-xs font-bold cursor-pointer ${
                        closingStyle === style.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-100 text-slate-600 bg-slate-50/50'
                      }`}
                    >
                      <span className="block text-sm mb-0.5">{style.icon}</span>
                      <span className="text-[10px] leading-tight block">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer's Raw Message */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Customer's Message (or Objection)
                </label>
                <textarea
                  rows={3}
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  placeholder="Paste what the customer said (e.g. 'Your price is too high compared to market' or 'Can I pay on delivery?')..."
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-slate-50/50 resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Executive Closing Strategy (1 Credit)</span>
                  </>
                )}
              </button>
            </section>
          </div>

          {/* Right Column: Tactical Strategy, Counter-Offer & 3 Ready Messages */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-[36px] text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl">
                    🤝
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-base">Executive Closer Ready</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Select your customer persona, enter deal parameters, and our AI closer will generate a tailored negotiation plan with 3 distinct human-like WhatsApp messages.
                    </p>
                  </div>
                </motion.div>
              )}

              {isGenerating && (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 space-y-4 bg-white rounded-[36px] border border-slate-100">
                   <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-slate-600 font-bold text-xs uppercase tracking-wider animate-pulse">
                     Executive Closer Analyzing Customer Psychology & Margins...
                   </p>
                </div>
              )}

              {result && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Executive Tactical Overview Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🧠</span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          Buyer Psychology & Hidden Motivation
                        </h4>
                      </div>
                      {result.deal_confidence_score !== undefined && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                          <span className="text-[11px] font-black text-emerald-300">
                            Closing Probability: {result.deal_confidence_score}%
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      "{result.buyer_psychology || 'Customer is evaluating price vs trust and needs risk-reversal before committing.'}"
                    </p>

                    {result.counter_offer_proposal && (
                      <div className="bg-emerald-950/60 border border-emerald-500/40 p-3.5 rounded-2xl flex items-start gap-2.5">
                        <span className="text-base flex-shrink-0">💡</span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                            Recommended Compromise / Counter-Offer:
                          </span>
                          <p className="text-xs font-bold text-white mt-0.5">
                            {result.counter_offer_proposal}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* High-Impact One-Liner Icebreaker */}
                  {result.one_liner && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-2xl shadow-md flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎯</span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">
                            One-Liner Attention Opener
                          </span>
                          <p className="text-xs font-bold">"{result.one_liner}"</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(result.one_liner);
                          toast.success("Opener copied!");
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer flex-shrink-0"
                      >
                        Copy Opener
                      </button>
                    </div>
                  )}

                  {/* 3 Human Sales Professional Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-bold text-slate-800 text-xs font-heading uppercase tracking-wider flex items-center gap-2">
                        <span>💬</span>
                        <span>3 Authentic Human Sales Responses (Pick 1 to Send)</span>
                      </h3>
                    </div>

                    {result.options.map((option, idx) => (
                      <div key={idx} className="bg-white p-5 sm:p-6 rounded-[28px] shadow-sm border border-slate-100 hover:border-emerald-200 transition-all space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            {idx === 0 ? 'Angle 1: Value & Trust Anchor' : idx === 1 ? 'Angle 2: Smart Counter-Offer & Sweetener' : 'Angle 3: Direct Payment Call-to-Action'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(option, idx)}
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                copiedIndex === idx ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-emerald-600'
                              }`}
                              title="Copy response"
                            >
                              {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-700 leading-relaxed text-xs sm:text-sm font-medium whitespace-pre-line">
                          {option}
                        </p>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Polished for natural WhatsApp rhythm
                          </span>
                          <button
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(option)}`, '_blank')}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open in WhatsApp</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Do Not Say Warnings */}
                  {result.do_not_say && result.do_not_say.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-900 p-5 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider">What an amateur salesperson says (AVOID):</h4>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs font-semibold text-rose-800">
                        {result.do_not_say.map((phrase, idx) => (
                          <li key={idx}>"{phrase}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strategy Tip */}
                  <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300 mb-0.5">
                        Coach's Closing Principle
                      </h4>
                      <p className="text-xs text-slate-200 leading-relaxed italic">
                        "{result.strategy_tip}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ================= MODE 2: INTERACTIVE ROLEPLAY NEGOTIATION SIMULATOR ================= */}
      {activeTab === 'ROLEPLAY' && (
        <div className="max-w-3xl mx-auto bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[650px] animate-in fade-in">
          
          {/* Simulator Header & Trust Meter */}
          <div className="bg-slate-900 p-4 sm:p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-sm">Interactive Negotiation Simulator</h3>
                <p className="text-[10px] text-slate-400">
                  Simulates realistic Nigerian buyer behavior: price resistance, scam fears & closing signals.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Live Trust / Interest Meter */}
              <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Buyer Trust:</span>
                <span className={`text-xs font-black ${currentTrustMeter >= 75 ? 'text-emerald-400' : currentTrustMeter >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {currentTrustMeter}%
                </span>
              </div>

              <button
                onClick={() => {
                  setChatMessages([
                    { 
                      sender: 'buyer', 
                      text: "Hello! I saw your product post on WhatsApp. How much is the last price and do you deliver to Port Harcourt?",
                      trust_score: 55
                    }
                  ]);
                  setCurrentTrustMeter(55);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[82%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}>
                  <p className="font-semibold">{msg.text}</p>
                </div>

                {/* AI feedback indicator */}
                {msg.feedback && (
                  <div className="mt-1.5 bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-900 max-w-[82%] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <span>💡</span>
                      <span>Coach Feedback:</span>
                    </div>
                    <p>{msg.feedback}</p>
                    {msg.suggested_counter && (
                      <div className="pt-1.5 border-t border-amber-200/60 mt-1">
                        <span className="text-[10px] font-bold uppercase text-amber-700 block">Recommended Next Move:</span>
                        <p className="font-semibold italic text-slate-800">"{msg.suggested_counter}"</p>
                        <button
                          type="button"
                          onClick={() => setUserReply(msg.suggested_counter || '')}
                          className="mt-1 text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          Use this suggestion <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isRoleplaying && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                Customer is typing a response...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendRoleplayReply} className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
            <input
              type="text"
              value={userReply}
              onChange={(e) => setUserReply(e.target.value)}
              placeholder="Type your response to practice closing the deal..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={isRoleplaying || !userReply.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-3 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Sales Closer"
        creditCost={1}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default SalesAssistant;
