
import React, { useState } from 'react';
import { BusinessPlan, BrandIdentity } from '../types';
import { generateBusinessPlan } from '../services/geminiService';

interface BusinessPlanGeneratorProps {
  brand: BrandIdentity | null;
  businessName: string; // Fallback if brand is null
}

const BusinessPlanGenerator: React.FC<BusinessPlanGeneratorProps> = ({ brand, businessName }) => {
  const [step, setStep] = useState<'INPUT' | 'LOADING' | 'RESULT'>('INPUT');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [error, setError] = useState('');

  // Defaults from Brand Identity if available
  const name = brand?.businessName || businessName;
  const niche = brand?.niche || 'General Business';

  const handleGenerate = async () => {
    if (!name) {
      setError("Business name is required.");
      return;
    }

    setStep('LOADING');
    setError('');

    try {
      // Combine brand elevator pitch with user details for better context
      const context = `${brand?.elevatorPitch ? `Elevator Pitch: ${brand.elevatorPitch}. ` : ''} ${additionalDetails}`;
      const result = await generateBusinessPlan(name, niche, context);
      setPlan(result);
      setStep('RESULT');
    } catch (e) {
      setError("Failed to generate business plan. Please try again.");
      setStep('INPUT');
    }
  };

  const Section = ({ title, content }: { title: string, content: string }) => (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3 uppercase tracking-wider text-xs">{title}</h3>
      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{content}</p>
    </div>
  );

  if (step === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xl">📄</div>
        </div>
        <div className="text-center">
          <p className="text-indigo-900 font-bold text-lg">Drafting your Business Plan...</p>
          <p className="text-gray-500 text-sm">Analyzing market trends and strategies.</p>
        </div>
      </div>
    );
  }

  if (step === 'RESULT' && plan) {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Business Plan</h2>
            <p className="text-sm text-gray-500">Generated for {name}</p>
          </div>
          <button
            onClick={() => setStep('INPUT')}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Start Over
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100 print:shadow-none print:border-none">
          {/* Document Header */}
          <div className="bg-indigo-900 text-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-2 uppercase tracking-widest">{name}</h1>
            <p className="text-indigo-200 font-medium">Strategic Business Plan</p>
            <div className="mt-4 text-xs opacity-70 uppercase">Confidential Document</div>
          </div>

          <div className="p-8 md:p-12">
            <Section title="1. Executive Summary" content={plan.executiveSummary} />
            <Section title="2. Market Analysis" content={plan.marketAnalysis} />
            <Section title="3. Marketing & Sales Strategy" content={plan.marketingStrategy} />
            <Section title="4. Operational Plan" content={plan.operationalPlan} />
            <Section title="5. Financial Projections" content={plan.financialProjection} />

            <div className="mt-12 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800 italic text-center">
              Disclaimer: This is an AI-generated draft intended for planning purposes. Please consult a financial advisor before making investment decisions.
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all"
          >
            <span>🖨️</span> Print / Save as PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Business Plan Generator</h2>
        <p className="text-gray-600 text-sm mt-2">
          Create a professional business plan to apply for grants, loans, or investors.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-bold text-blue-900 text-sm">Why do you need this?</h4>
            <p className="text-blue-800 text-xs mt-1">
              A solid business plan increases your "Grant Readiness Score" by 40%. Lenders want to see you have a strategy.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <div className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-600">
            {name || "Please create a brand first"}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Key Details (Optional)</label>
          <p className="text-xs text-gray-500 mb-2">
            Describe your specific products, location (e.g. Lagos, Abuja), and any unique selling points.
          </p>
          <textarea
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="e.g. We sell organic skincare products sourced from Northern Nigeria. We plan to open a physical store in Ikeja next year..."
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!name}
          className="w-full py-3 bg-indigo-600 disabled:bg-gray-300 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-lg transform active:scale-95 flex justify-center items-center gap-2"
        >
          <span>Generate Plan</span>
          <span>🚀</span>
        </button>
      </div>
    </div>
  );
};

export default BusinessPlanGenerator;