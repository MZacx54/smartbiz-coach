import React, { useState } from 'react';
import { MessageCircle, Send, Copy, Check, Info, ShieldCheck, ArrowRight, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

type SalesContext = 'CLOSING' | 'OBJECTION' | 'FOLLOW_UP' | 'GREETING' | 'PRICE_ISSUE';

interface SalesResult {
  options: string[];
  strategy_tip: string;
}

interface SalesAssistantProps {
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const SalesAssistant: React.FC<SalesAssistantProps> = ({ credits = 0, onUpdateCredits }) => {
  const [context, setContext] = useState<SalesContext>('CLOSING');
  const [customerMessage, setCustomerMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SalesResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  const executeGenerate = async (deduct: boolean, cost: number) => {
    setIsGenerating(true);
    setShowCreditPrompt(false);
    try {
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Sales Assistant');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('sales_assistant');
      }

      const response = await api.post('/api/content/generate-sales-script/', {
        context,
        customer_message: customerMessage
      });
      setResult(response.data);
      toast.success("Sales options generated!");
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

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-heading">WhatsApp Sales Closer</h1>
          </div>
          <p className="text-emerald-50 max-w-xl text-sm leading-relaxed">
            Struggling with what to say to a customer? Let our AI sales coach help you handle objections and close deals professionally on WhatsApp.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              1. Select Situation
            </h3>
            <div className="grid grid-cols-1 gap-3">
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
                    <p className={`text-sm font-bold ${context === opt.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-slate-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              2. Customer's Message (Optional)
            </h3>
            <textarea
              rows={4}
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder="Paste what the customer said here (e.g. 'Your price is too high' or 'I will get back to you')..."
              className="w-full rounded-2xl border-slate-100 p-4 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-slate-50/50 resize-none"
            ></textarea>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Get Sales Options</span>
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
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Select a situation and click generate to see professional WhatsApp replies.</p>
                </div>
              </motion.div>
            )}

            {isGenerating && (
              <div className="h-full flex flex-col items-center justify-center p-12 space-y-4">
                 <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-slate-500 font-medium animate-pulse text-sm">AI Coach is thinking...</p>
              </div>
            )}

            {result && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-800 text-lg">Response Options</h3>
                  <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Pro Strategy</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {result.options.map((option, idx) => (
                    <div key={idx} className="group relative">
                       <div className="absolute -left-2 top-4 w-4 h-4 bg-white rotate-45 border-l border-b border-slate-100 hidden md:block"></div>
                       <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative group-hover:shadow-md transition-all">
                         <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {idx === 0 ? 'Direct & Professional' : idx === 1 ? 'Friendly & Persuasive' : 'Urgent / Scarcity'}
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
                         <p className="text-slate-700 leading-relaxed text-sm">{option}</p>
                         
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

                <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                  <div className="flex items-start gap-4">
                    <div className="bg-white/10 p-2 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1 text-indigo-100">Coach's Pro Tip</h4>
                      <p className="text-xs text-indigo-200 leading-relaxed italic">"{result.strategy_tip}"</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
