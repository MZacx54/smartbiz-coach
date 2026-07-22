import React, { useState } from 'react';
import { MessageCircle, Send, Copy, Check, Info, ShieldCheck, ArrowRight, Wand2, Sparkles, User, Bot, RotateCcw, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

type SalesContext = 'CLOSING' | 'OBJECTION' | 'FOLLOW_UP' | 'GREETING' | 'PRICE_ISSUE';
type ClosingStyle = 'MIXED' | 'PIDGIN' | 'CORPORATE' | 'FOMO' | 'SOFT_PULL';

interface SalesResult {
  intent_analysis?: string;
  options: string[];
  one_liner: string;
  strategy_tip: string;
  do_not_say: string[];
}

interface ChatMessage {
  sender: 'user' | 'buyer';
  text: string;
  feedback?: string;
}

interface SalesAssistantProps {
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const SalesAssistant: React.FC<SalesAssistantProps> = ({ credits = 0, onUpdateCredits }) => {
  const [activeTab, setActiveTab] = useState<'SUGGEST' | 'ROLEPLAY'>('SUGGEST');
  const [context, setContext] = useState<SalesContext>('CLOSING');
  const [closingStyle, setClosingStyle] = useState<ClosingStyle>('MIXED');
  const [customerMessage, setCustomerMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SalesResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Interactive Roleplay Simulator States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'buyer', text: "Hello! I saw your product post on WhatsApp. How much is the last price and do you deliver to Port Harcourt?" }
  ]);
  const [userReply, setUserReply] = useState('');
  const [isRoleplaying, setIsRoleplaying] = useState(false);

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  const contextOptions: { id: SalesContext; label: string; icon: string; desc: string }[] = [
    { id: 'CLOSING', label: 'Close the Sale', icon: '💰', desc: 'Convert interest into payment' },
    { id: 'OBJECTION', label: 'Handle Objection', icon: '🛡️', desc: 'Answer customer doubts' },
    { id: 'PRICE_ISSUE', label: 'Price is High', icon: '🏷️', desc: 'Explain your value' },
    { id: 'FOLLOW_UP', label: 'Follow Up', icon: '⏰', desc: 'Re-engage quiet customers' },
    { id: 'GREETING', label: 'First Contact', icon: '👋', desc: 'Professional first reply' },
  ];

  const styleOptions: { id: ClosingStyle; label: string; icon: string }[] = [
    { id: 'MIXED', label: 'Balanced (3 Angles)', icon: '⚡' },
    { id: 'PIDGIN', label: 'Naija Pidgin Vibe', icon: '🇳🇬' },
    { id: 'CORPORATE', label: 'Corporate B2B', icon: '👔' },
    { id: 'FOMO', label: 'Urgency & Scarcity', icon: '🔥' },
    { id: 'SOFT_PULL', label: 'Consultative Soft', icon: '🤝' },
  ];

  const executeGenerate = async (deduct: boolean, cost: number) => {
    setIsGenerating(true);
    setShowCreditPrompt(false);
    try {
      const response = await api.post('/api/content/generate-sales-script/', {
        context,
        customer_message: customerMessage,
        closing_style: closingStyle,
        mode: 'SUGGEST'
      });

      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Sales Assistant');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('sales_assistant');
      }

      setResult(response.data);
      toast.success("AI Sales scripts generated!");
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
        customer_message: currentInput,
        chat_history: chatMessages
      });

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'buyer',
          text: res.data.buyer_reply || "Alright, that sounds good!",
          feedback: res.data.feedback
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'buyer',
          text: "Okay, send me your bank details so I can complete the order!",
          feedback: "Great negotiation reply! Direct payment directive sent."
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
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black font-heading">AI Sales Closer & Negotiation Engine</h1>
          </div>
          <p className="text-emerald-50 max-w-xl text-xs sm:text-sm leading-relaxed">
            Generate high-converting WhatsApp scripts or practice live customer negotiations in real-time.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="relative z-10 bg-black/30 p-1.5 rounded-2xl flex items-center border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('SUGGEST')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'SUGGEST' ? 'bg-white text-emerald-950 shadow-lg' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Script Generator
          </button>
          <button
            onClick={() => setActiveTab('ROLEPLAY')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'ROLEPLAY' ? 'bg-white text-emerald-950 shadow-lg' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Practice Simulator
          </button>
        </div>
      </div>

      {/* ================= MODE 1: SCRIPT GENERATOR ================= */}
      {activeTab === 'SUGGEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Style Selector */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Select Tone & Style
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {styleOptions.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setClosingStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      closingStyle === style.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <span className="block text-base mb-1">{style.icon}</span>
                    <span className="text-[11px] leading-tight block">{style.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                1. Select Situation
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {contextOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setContext(opt.id)}
                    className={`flex items-start p-3 rounded-2xl border-2 transition-all text-left group ${
                      context === opt.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-50 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-xl mr-3">{opt.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${context === opt.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-500">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                2. Customer's Message (Optional)
              </h3>
              <textarea
                rows={4}
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                placeholder="Paste what the customer said here (e.g. 'Your price is high' or 'Can I pay on delivery?')..."
                className="w-full rounded-2xl border-slate-100 p-4 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-slate-50/50 resize-none"
              ></textarea>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2 active:scale-95 text-xs uppercase tracking-wider"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate AI Closing Options</span>
                  </>
                )}
              </button>
            </section>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <MessageCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-400">Ready to Close Deals</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">Select a situation, enter customer objection, and generate high-converting WhatsApp replies.</p>
                  </div>
                </motion.div>
              )}

              {isGenerating && (
                <div className="h-full flex flex-col items-center justify-center p-12 space-y-4">
                   <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-slate-500 font-medium animate-pulse text-xs uppercase tracking-wider">AI Sales Strategy Engine Thinking...</p>
                </div>
              )}

              {result && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Customer Intent Analysis Badge */}
                  {result.intent_analysis && (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3">
                      <span className="text-lg">🧠</span>
                      <div>
                        <h4 className="text-[10px] font-black text-indigo-650 uppercase tracking-widest">Customer Mindset Analysis</h4>
                        <p className="text-xs font-bold text-indigo-900 mt-0.5">{result.intent_analysis}</p>
                      </div>
                    </div>
                  )}

                  {/* One Liner Opener */}
                  {result.one_liner && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-[32px] shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                      <div className="flex items-start gap-4">
                        <div className="bg-white/10 p-2.5 rounded-xl text-xl">
                          🎯
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[10px] uppercase tracking-wider text-amber-100 mb-1">One-Liner Hook Opener</h4>
                          <p className="text-xs font-bold leading-relaxed">"{result.one_liner}"</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(result.one_liner);
                              toast.success("Opener copied!");
                            }}
                            className="mt-2.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-all"
                          >
                            Copy Opener
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Do Not Say Warnings */}
                  {result && Array.isArray(result.do_not_say) && result.do_not_say.length > 0 && (
                    <div className="bg-red-50 border border-red-100 text-red-800 p-5 rounded-[24px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚠️</span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-red-900">What to AVOID saying:</h4>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs font-semibold">
                        {result.do_not_say.map((phrase, idx) => (
                          <li key={idx}>"{phrase}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-slate-800 text-sm font-heading uppercase tracking-wider">Response Options</h3>
                    <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Pro Strategy</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result && Array.isArray(result.options) && result.options.map((option, idx) => (
                      <div key={idx} className="group relative">
                         <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative group-hover:shadow-md transition-all">
                           <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-black text-emerald-650 uppercase tracking-widest">
                                {idx === 0 ? 'Direct & Professional' : idx === 1 ? 'Naija Friendly / Local Rapport' : 'Urgent Scarcity Angle'}
                              </span>
                              <button
                                onClick={() => copyToClipboard(option, idx)}
                                className={`p-2 rounded-xl transition-all ${
                                  copiedIndex === idx ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-emerald-600'
                                }`}
                              >
                                {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                           </div>
                           <p className="text-slate-700 leading-relaxed text-xs sm:text-sm">{option}</p>
                           
                           <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-emerald-600">
                                 <Info className="w-3.5 h-3.5" />
                                 <span className="text-[10px] font-medium italic">Ready to paste into WhatsApp</span>
                              </div>
                              <button 
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(option)}`, '_blank')}
                                className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                              >
                                Open in WhatsApp <ArrowRight className="w-3 h-3" />
                              </button>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="flex items-start gap-4">
                      <div className="bg-white/10 p-2 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-widest text-emerald-400 mb-1">Coach's Strategic Tip</h4>
                        <p className="text-xs text-slate-200 leading-relaxed italic">"{result.strategy_tip}"</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ================= MODE 2: INTERACTIVE ROLEPLAY SIMULATOR ================= */}
      {activeTab === 'ROLEPLAY' && (
        <div className="max-w-3xl mx-auto bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[600px] animate-in fade-in">
          
          {/* Simulator Header */}
          <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-sm">Customer Negotiation Sandbox</h3>
                <p className="text-[10px] text-slate-400">Practice closing real buyers before sending your WhatsApp messages.</p>
              </div>
            </div>

            <button
              onClick={() => setChatMessages([
                { sender: 'buyer', text: "Hello! I saw your product post on WhatsApp. How much is the last price and do you deliver to Port Harcourt?" }
              ])}
              className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl transition-all"
            >
              <RotateCcw className="w-3 h-3" /> Reset Chat
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}>
                  <p className="font-semibold">{msg.text}</p>
                </div>

                {/* AI feedback indicator */}
                {msg.feedback && (
                  <div className="mt-1 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[10px] text-amber-800 max-w-[80%] flex items-center gap-2">
                    <span>💡</span>
                    <span className="font-bold">Coach Feedback:</span> {msg.feedback}
                  </div>
                )}
              </div>
            ))}

            {isRoleplaying && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                Buyer is typing a reply...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendRoleplayReply} className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
            <input
              type="text"
              value={userReply}
              onChange={(e) => setUserReply(e.target.value)}
              placeholder="Type your response to practice negotiating..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={isRoleplaying || !userReply.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-3 rounded-2xl transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Sales Assistant"
        creditCost={1}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default SalesAssistant;

