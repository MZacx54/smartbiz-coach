import React, { useState } from 'react';
import { getPricingSuggestion } from '../services/geminiService';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

interface PricingAssistantProps {
  credits: number;
  onUpdateCredits: (credits: number) => void;
}

interface PricingResult {
  costPrice: number;
  suggestedPrices: {
    marginBased: number;
    competitive: number;
    psychological: number;
  };
  marginPercentages: {
    marginBased: number;
    competitive: number;
    psychological: number;
  };
  strategyExplanation: string;
  tips: string[];
  whatsappTemplate: string;
}

const PricingAssistant: React.FC<PricingAssistantProps> = ({ credits, onUpdateCredits }) => {
  const [productName, setProductName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [competitorPrice, setCompetitorPrice] = useState('');
  const [targetMargin, setTargetMargin] = useState('30');
  const [result, setResult] = useState<PricingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const executeAnalyse = async () => {
    setIsLoading(true);
    setError('');
    setShowCreditPrompt(false);
    try {
      const data = await getPricingSuggestion({
        productName,
        costPrice: parseFloat(costPrice),
        competitorPrice: competitorPrice || undefined,
        targetMargin: parseFloat(targetMargin),
      });

      // Only deduct credits if generation successfully completed
      const billingResponse = await billingService.deductCredits(2, 'AI Pricing Assistant');
      onUpdateCredits(billingResponse.credits);

      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to analyse pricing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyse = async () => {
    if (!productName || !costPrice) {
      setError('Please fill in Product Name and Cost Price.');
      return;
    }
    const usage = usageLimiter.checkUsage('pricing_assistant', credits);
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }
    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeAnalyse(); });
      setShowCreditPrompt(true);
      return;
    }
    usageLimiter.incrementUsage('pricing_assistant');
    await executeAnalyse();
  };

  const PriceCard = ({ label, price, margin, highlight = false }: { label: string; price: number; margin: number; highlight?: boolean }) => (
    <div className={`rounded-2xl p-5 border transition-all ${highlight ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{label}</p>
      <h3 className={`text-3xl font-bold font-heading mb-1 ${highlight ? 'text-white' : 'text-slate-900'}`}>
        ₦{price?.toLocaleString()}
      </h3>
      <p className={`text-xs font-semibold ${highlight ? 'text-indigo-200' : 'text-emerald-600'}`}>
        {margin?.toFixed(1)}% margin
      </p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-heading">AI Pricing Assistant 💰</h2>
        <p className="text-slate-500 text-sm mt-2">
          Find the perfect selling price for your products — margin-based, competitive, and psychologically optimised for Nigerian buyers.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm mb-4">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product / Service Name</label>
          <input
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="e.g. Ankara Fabric (6 yards), Jollof Rice per plate..."
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Cost Price (₦)</label>
            <input
              type="number"
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="e.g. 3500"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1">How much it costs you to produce or buy wholesale</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Competitor Price (₦) <span className="text-slate-400 font-normal">(Optional)</span></label>
            <input
              type="number"
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="e.g. 5000"
              value={competitorPrice}
              onChange={(e) => setCompetitorPrice(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1">What others sell the same product for</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Profit Margin: <span className="text-indigo-600 font-bold">{targetMargin}%</span></label>
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            className="w-full accent-indigo-600"
            value={targetMargin}
            onChange={(e) => setTargetMargin(e.target.value)}
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>5%</span><span>Low Risk</span><span>High Margin</span><span>200%</span>
          </div>
        </div>

        <button
          onClick={handleAnalyse}
          disabled={isLoading || !productName || !costPrice}
          className="w-full py-3.5 bg-indigo-600 disabled:bg-gray-300 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 flex justify-center items-center gap-2"
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculating...</>
          ) : (
            <><span>Analyse Pricing</span><span>💡</span></>
          )}
        </button>
        <p className="text-center text-xs text-slate-400">⚡ 2 credits per analysis • 2 free per day</p>
      </div>

      {result && !isLoading && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Price Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Suggested Selling Prices</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PriceCard
                label="📈 Margin-Based"
                price={result.suggestedPrices?.marginBased}
                margin={result.marginPercentages?.marginBased}
              />
              <PriceCard
                label="🏷️ Psychological"
                price={result.suggestedPrices?.psychological}
                margin={result.marginPercentages?.psychological}
                highlight
              />
              <PriceCard
                label="🏆 Competitive"
                price={result.suggestedPrices?.competitive}
                margin={result.marginPercentages?.competitive}
              />
            </div>
          </div>

          {/* Strategy explanation */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🧠</span>
              <h4 className="font-bold text-indigo-900 text-sm">AI Pricing Strategy</h4>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{result.strategyExplanation}</p>
          </div>

          {/* Tips */}
          {result.tips && result.tips.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider mb-3">💡 Nigerian Market Tips</h4>
              <ul className="space-y-2">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="text-amber-500 mt-0.5 font-bold">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* WhatsApp template */}
          {result.whatsappTemplate && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-green-900 text-xs uppercase tracking-wider">💬 WhatsApp Catalog Template</h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.whatsappTemplate);
                    setCopiedTemplate(true);
                    setTimeout(() => setCopiedTemplate(false), 2000);
                  }}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${copiedTemplate ? 'bg-green-600 text-white' : 'bg-white border border-green-200 text-green-700 hover:bg-green-600 hover:text-white'}`}
                >
                  {copiedTemplate ? '✓ Copied!' : 'Copy Text'}
                </button>
              </div>
              <pre className="text-xs text-green-800 whitespace-pre-wrap font-sans leading-relaxed bg-white p-4 rounded-xl border border-green-100">
                {result.whatsappTemplate}
              </pre>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(result.whatsappTemplate)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-green-600/10"
              >
                📤 Send to WhatsApp Now
              </a>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
          >
            Analyse Another Product
          </button>
        </div>
      )}

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Pricing Assistant"
        creditCost={2}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default PricingAssistant;
