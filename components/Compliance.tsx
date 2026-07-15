import React, { useState, useEffect } from 'react';
import { analyzeBusinessName } from '../services/geminiService';
import { getComplianceStatus, updateComplianceStatus, submitHireRequest, ComplianceStatus } from '../services/complianceService';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';
import { BrandIdentity, User } from '../types';

interface ComplianceProps {
  brand?: BrandIdentity | null;
  user?: User | null;
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const CHECKLIST = [
  {
    id: 'name_search_completed' as keyof ComplianceStatus,
    title: 'Perform Name Availability Search',
    description: 'Check if your proposed business name is free on CAC portal.',
    icon: '🔍',
    link: 'https://pre.cac.gov.ng/home',
    linkLabel: 'Search on CAC →',
  },
  {
    id: 'business_reg_completed' as keyof ComplianceStatus,
    title: 'Register Business Name (BN)',
    description: 'Official CAC registration for Sole Proprietors. Costs ~₦10,775.',
    icon: '📄',
    link: 'https://pre.cac.gov.ng/home',
    linkLabel: 'Register on CAC →',
  },
  {
    id: 'tin_obtained_completed' as keyof ComplianceStatus,
    title: 'Obtain Tax Identification Number (TIN)',
    description: 'Required by FIRS before opening a corporate bank account.',
    icon: '🏛️',
    link: 'https://www.firs.gov.ng/',
    linkLabel: 'Get TIN from FIRS →',
  },
  {
    id: 'bank_account_completed' as keyof ComplianceStatus,
    title: 'Open Corporate Bank Account',
    description: 'Separate personal funds from business funds. Required for grants.',
    icon: '🏦',
    link: null,
    linkLabel: null,
  },
];

const BUSINESS_TYPES = [
  'Business Name (Sole Proprietor)',
  'Private Limited Company (Ltd)',
  'Limited Liability Partnership (LLP)',
  'Incorporated Trustee (NGO/Church)',
];

const Compliance: React.FC<ComplianceProps> = ({ brand, user, credits = 0, onUpdateCredits }) => {
  // Credit prompt state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);
  const [compliance, setCompliance] = useState<ComplianceStatus>({
    name_search_completed: false,
    business_reg_completed: false,
    tin_obtained_completed: false,
    bank_account_completed: false,
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // AI Name Search
  const [nameToAnalyze, setNameToAnalyze] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    probability: string;
    reason: string;
    alternatives: string[];
  } | null>(null);

  // Hire Agent Modal
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireForm, setHireForm] = useState({
    business_name: brand?.businessName || user?.businessName || '',
    business_type: BUSINESS_TYPES[0],
    phone_number: user?.phone || '',
  });
  const [isSubmittingHire, setIsSubmittingHire] = useState(false);
  const [hireSuccess, setHireSuccess] = useState(false);
  const [hireError, setHireError] = useState('');

  // Load persisted compliance status on mount
  useEffect(() => {
    const load = async () => {
      try {
        const status = await getComplianceStatus();
        setCompliance(status);
      } catch (e) {
        // Not logged in or network error - use local state
      } finally {
        setIsLoadingStatus(false);
      }
    };
    load();
  }, []);

  // Sync hire form when brand/user changes
  useEffect(() => {
    setHireForm(prev => ({
      ...prev,
      business_name: brand?.businessName || user?.businessName || prev.business_name,
      phone_number: user?.phone || prev.phone_number,
    }));
  }, [brand, user]);

  const toggleItem = async (id: keyof ComplianceStatus) => {
    const newValue = !compliance[id];
    setUpdatingId(id);
    setCompliance(prev => ({ ...prev, [id]: newValue }));
    try {
      const updated = await updateComplianceStatus({ [id]: newValue });
      setCompliance(updated);
    } catch (e) {
      // Revert on failure
      setCompliance(prev => ({ ...prev, [id]: !newValue }));
    } finally {
      setUpdatingId(null);
    }
  };

  const executeNameAnalysis = async (deduct: boolean, cost: number) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setShowCreditPrompt(false);
    try {
      const result = await analyzeBusinessName(nameToAnalyze);
      
      // Only deduct credits / increment usage if successful
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Name Availability Check');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('name_check');
      }

      setAnalysisResult(result);
    } catch {
      // silent
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameToAnalyze) return;

    const usage = usageLimiter.checkUsage('name_check', credits);
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }
    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeNameAnalysis(true, usage.cost); });
      setShowCreditPrompt(true);
      return;
    }
    await executeNameAnalysis(false, 0);
  };

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHire(true);
    setHireError('');
    try {
      await submitHireRequest(hireForm);
      setHireSuccess(true);
    } catch (err: any) {
      setHireError(err?.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingHire(false);
    }
  };

  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'High': return 'text-green-700 bg-green-50 border-green-300';
      case 'Medium': return 'text-yellow-700 bg-yellow-50 border-yellow-300';
      case 'Low': return 'text-red-700 bg-red-50 border-red-300';
      default: return 'text-gray-600';
    }
  };

  const completedCount = CHECKLIST.filter(item => compliance[item.id]).length;
  const progress = Math.round((completedCount / CHECKLIST.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compliance & Registration</h2>
        <p className="text-gray-500 text-sm mt-1">Get your business legally recognised in Nigeria.</p>
      </div>

      {/* Partner Banner */}
      <div className="relative bg-gradient-to-br from-green-900 to-green-700 rounded-2xl p-6 text-white shadow-xl overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-4 -bottom-10 w-56 h-56 bg-white/5 rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Pro Service
            </span>
            <h3 className="font-bold text-xl mt-2">Skip the Stress — Hire a Pro Agent</h3>
            <p className="text-green-100 text-sm mt-1 max-w-md">
              We handle your CAC registration end-to-end. Certificate delivered in 7 working days.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs font-semibold">
              <span className="bg-white/20 px-3 py-1 rounded-full">BN Reg: ₦20,000</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">Ltd Company: ₦65,000</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">TIN: Included</span>
            </div>
          </div>
          <button
            onClick={() => setShowHireModal(true)}
            className="shrink-0 bg-white text-green-900 px-6 py-3 rounded-xl font-bold hover:bg-green-50 transition-all shadow-lg active:scale-95 whitespace-nowrap"
          >
            Hire an Agent →
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-sm font-semibold text-gray-700">Compliance Readiness</span>
            <p className="text-xs text-gray-400">{completedCount} of {CHECKLIST.length} steps completed</p>
          </div>
          <span className={`text-3xl font-extrabold ${progress === 100 ? 'text-green-600' : 'text-indigo-600'}`}>
            {isLoadingStatus ? '...' : `${progress}%`}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${progress === 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <p className="text-green-700 text-sm font-semibold mt-3 flex items-center gap-2">
            <span>✅</span> Your business is fully compliant! Great work.
          </p>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Checklist */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Registration Roadmap</h3>
          {CHECKLIST.map(item => {
            const isDone = !!compliance[item.id];
            const isUpdating = updatingId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => !isUpdating && toggleItem(item.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md
                  ${isDone ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                    ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}
                  >
                    {isUpdating ? (
                      <svg className="animate-spin w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : isDone ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span>{item.icon}</span>
                      <h4 className={`text-sm font-semibold ${isDone ? 'text-green-900 line-through opacity-70' : 'text-gray-800'}`}>
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500">{item.description}</p>
                    {item.link && !isDone && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-indigo-600 font-semibold hover:underline mt-1 inline-block"
                      >
                        {item.linkLabel}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column — AI Name Search + Partners */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">AI Name Availability Check</h3>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 mb-3">
              Enter a proposed business name. Our AI will estimate its availability on CAC and suggest alternatives.
            </p>
            <form onSubmit={handleAnalyzeName} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                  placeholder="e.g. Lagos Logistics"
                  value={nameToAnalyze}
                  onChange={e => setNameToAnalyze(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isAnalyzing || !nameToAnalyze}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Checking
                    </span>
                  ) : 'Check'}
                </button>
              </div>
            </form>

            {analysisResult && (
              <div className="animate-pulse-once space-y-3">
                <div className={`p-3 rounded-lg border ${getProbabilityColor(analysisResult.probability)}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">CAC Approval Probability</span>
                    <span className="font-extrabold text-sm">{analysisResult.probability}</span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">{analysisResult.reason}</p>
                </div>
                {analysisResult.alternatives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Suggested Alternatives:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.alternatives.map((alt, i) => (
                        <button
                          key={i}
                          onClick={() => setNameToAnalyze(alt)}
                          className="text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-800 text-gray-700 px-3 py-1 rounded-full border border-gray-200 transition-colors"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!analysisResult && !isAnalyzing && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700">
                💡 Tip: Avoid generic words like "Global", "Universal", or "Best" — CAC often rejects them.
              </div>
            )}
          </div>

          {/* Partner links */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <h4 className="font-bold text-gray-800 text-sm mb-3">Trusted Registration Partners</h4>
            <div className="space-y-2">
              {[
                { name: 'Sidebrief', price: '₦18,000', url: 'https://sidebrief.com' },
                { name: 'DIYLaw', price: '₦20,000', url: 'https://diylaw.ng' },
                { name: 'Lawyered', price: '₦25,000', url: 'https://lawyered.ng' },
              ].map(p => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:shadow-sm transition-all group"
                >
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700">{p.name}</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">{p.price}</span>
                </a>
              ))}
              <p className="text-[10px] text-gray-400 text-center mt-1">Consultations from ₦2,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hire Agent Modal */}
      {showHireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => { setShowHireModal(false); setHireSuccess(false); setHireError(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold"
            >
              ✕
            </button>

            {hireSuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  An agent will reach out to you within <strong>24 hours</strong> to begin your registration.
                </p>
                <button
                  onClick={() => { setShowHireModal(false); setHireSuccess(false); }}
                  className="mt-6 bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Hire a Registration Agent</h3>
                <p className="text-sm text-gray-500 mb-5">Fill in your details and an agent will contact you within 24 hours.</p>

                <form onSubmit={handleHireSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Proposed Business Name</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="e.g. Chukwu Logistics"
                      value={hireForm.business_name}
                      onChange={e => setHireForm(p => ({ ...p, business_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Business Type</label>
                    <select
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
                      value={hireForm.business_type}
                      onChange={e => setHireForm(p => ({ ...p, business_type: e.target.value }))}
                    >
                      {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp / Phone Number</label>
                    <input
                      type="tel"
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="e.g. 08012345678"
                      value={hireForm.phone_number}
                      onChange={e => setHireForm(p => ({ ...p, phone_number: e.target.value }))}
                    />
                  </div>

                  {hireError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                      {hireError}
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-xs text-green-800">
                    <strong>Pricing:</strong> BN (Sole Prop) — ₦20,000 &nbsp;|&nbsp; Ltd Company — ₦65,000
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingHire}
                    className="w-full bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all disabled:opacity-60 active:scale-95"
                  >
                    {isSubmittingHire ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Name Availability Check"
        creditCost={1}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default Compliance;