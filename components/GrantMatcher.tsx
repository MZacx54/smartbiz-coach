import React, { useState } from 'react';
import { Grant } from '../types';
import { findGrants } from '../services/geminiService';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

interface GrantMatcherProps {
  businessName: string;
  credits?: number;
  onUpdateCredits?: (credits: number) => void;
}

const GrantMatcher: React.FC<GrantMatcherProps> = ({ businessName, credits = 0, onUpdateCredits }) => {
  const [step, setStep] = useState<'INPUT' | 'LOADING' | 'RESULT'>('INPUT');
  const [grants, setGrants] = useState<Grant[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    location: 'Lagos',
    industry: 'Agriculture',
    yearsInBusiness: '0-1 years',
    gender: 'Male',
    cacRegistration: 'Unregistered',
    hasCorporateAccount: 'No',
    targetAmount: 'Under ₦1M'
  });

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  const executeSearch = async (deduct: boolean, cost: number) => {
    setStep('LOADING');
    setError('');
    setShowCreditPrompt(false);

    try {
      const results = await findGrants({
        businessName,
        ...formData
      });
      
      // Only deduct credits / increment usage if successful
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Grant Search');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('grant_search');
      }

      setGrants(results);
      setStep('RESULT');
    } catch (err) {
      setError("Could not fetch grant data. Please try again.");
      setStep('INPUT');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const usage = usageLimiter.checkUsage('grant_search', credits);
    
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }

    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => { await executeSearch(true, usage.cost); });
      setShowCreditPrompt(true);
      return;
    }

    await executeSearch(false, 0);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-100 text-emerald-800 font-bold';
    if (score >= 60) return 'bg-amber-100 text-amber-800 font-bold';
    return 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'GRANT': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'LOAN': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'EQUITY': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Major Nigerian states representing commercial centers
  const NIGERIAN_STATES = [
    'Lagos', 'Abuja (FCT)', 'Rivers', 'Kano', 'Kaduna', 'Enugu', 'Oyo', 'Anambra', 
    'Delta', 'Edo', 'Abia', 'Ogun', 'Kwara', 'Cross River', 'Akwa Ibom', 'Plateau', 
    'Imo', 'Ondo', 'Kogi', 'Bauchi', 'Katsina', 'Sokoto', 'Gombe', 'Other State'
  ];

  if (step === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative">
          <div className="animate-spin text-5xl">🏦</div>
          <span className="absolute -top-1 -right-1 text-xs animate-bounce">🇳🇬</span>
        </div>
        <div className="text-center max-w-sm">
          <p className="text-indigo-900 font-extrabold text-lg">Scanning Financial Repositories...</p>
          <p className="text-gray-500 text-xs mt-1">Cross-referencing active FGN Grants, LSETF matching loans, and SMEDAN database opportunities for {formData.location}.</p>
        </div>
      </div>
    );
  }

  if (step === 'RESULT') {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Funding Opportunities</h2>
            <p className="text-sm text-gray-500">Tailored matches for {businessName}</p>
          </div>
          <button
            onClick={() => setStep('INPUT')}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95"
          >
            Update Profile
          </button>
        </div>

        <div className="grid gap-6">
          {grants.length === 0 && (
            <div className="text-center p-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm">No specific active grants matched this profile. Try expanding your state, industry, or registering your CAC certificate.</p>
            </div>
          )}

          {grants.map((grant) => (
            <div key={grant.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Header inside card */}
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center flex-wrap gap-2">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getTypeColor(grant.type)}`}>
                    {grant.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    grant.is_currently_open 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-250' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {grant.is_currently_open ? '● ACTIVE' : '● CLOSED'}
                  </span>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs ${getScoreColor(grant.matchScore)}`}>
                  {grant.matchScore}% Match Score
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-black text-gray-900 mb-1">{grant.name}</h3>
                <p className="text-sm text-indigo-650 font-bold mb-4">{grant.provider}</p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column: Info & Eligibility */}
                  <div className="space-y-4">
                    <p className="text-xs text-gray-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 leading-relaxed">
                      <span className="font-bold text-indigo-900">Recommendation Matrix: </span> {grant.matchReason}
                    </p>

                    <div className="flex flex-col gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💰</span>
                        <span>Target Capital: <strong className="text-gray-900">{grant.amountRange}</strong></span>
                      </div>
                      {grant.deadline && (
                        <div className="flex items-center gap-2">
                          <span className="text-base">📅</span>
                          <span>Submission Window: <strong className="text-slate-800">{grant.deadline}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Eligibility Checklist */}
                    {grant.eligibility_checklist && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">Nigerian Eligibility Auditing</h4>
                        <div className="space-y-2">
                          {grant.eligibility_checklist.map((item, idx) => (
                            <label key={idx} className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-650 select-none">
                              <input type="checkbox" defaultChecked={!item.toLowerCase().includes('no') && !item.toLowerCase().includes('unregistered')} className="mt-0.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500" />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Steps & Apply */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Requirements */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Credentials</h4>
                        <ul className="space-y-1.5">
                          {grant.requirements.map((req, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Application Steps */}
                      {grant.application_steps && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Application Roadmap</h4>
                          <ol className="space-y-2">
                            {grant.application_steps.map((stepDesc, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                <span className="bg-indigo-150 text-indigo-700 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                                <span className="leading-relaxed">{stepDesc}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => alert(`Redirecting to ${grant.provider} Portal. Ensure you have your CAC certificate, Corporate Bank statements, and BVN ready!`)} 
                      className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-750 transition-all active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Start Application 🚀
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Find Funding & Grants 🇳🇬</h2>
        <p className="text-gray-600 text-sm mt-2">
          Discover and match with current active matching grants, single-digit loans, and micro-capital options in Nigeria.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">State Location</label>
              <select
                className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              >
                {NIGERIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Industry Sector</label>
              <select
                className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              >
                <option value="Agriculture">Agriculture & Agro-processing</option>
                <option value="Technology">Technology & Software</option>
                <option value="Fashion">Fashion & Textile</option>
                <option value="Manufacturing">Manufacturing & Crafting</option>
                <option value="Education">Education & Training</option>
                <option value="Creative Arts">Creative Arts & Media</option>
                <option value="Retail">Retail & Commerce</option>
                <option value="Services">Professional Services</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Years Active</label>
              <select
                className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={formData.yearsInBusiness}
                onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
              >
                <option value="Idea Stage">Idea Stage (Pre-revenue)</option>
                <option value="0-1 years">0-1 years</option>
                <option value="1-3 years">1-3 years</option>
                <option value="3+ years">3+ years</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Owner Gender</label>
              <select
                className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Mixed Team">Mixed Team</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 my-4 pt-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Nigerian Compliance & Scale Parameters</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">CAC Registration</label>
                <select
                  className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.cacRegistration}
                  onChange={(e) => setFormData({ ...formData, cacRegistration: e.target.value })}
                >
                  <option value="Unregistered">❌ Unregistered Business</option>
                  <option value="Business Name">Registered: Business Name</option>
                  <option value="Limited Liability">Registered: Ltd Liability Company</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Corporate Bank Account</label>
                <select
                  className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.hasCorporateAccount}
                  onChange={(e) => setFormData({ ...formData, hasCorporateAccount: e.target.value })}
                >
                  <option value="No">No (Personal Account)</option>
                  <option value="Yes">Yes (Business/Corporate Account)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Target Capital Pool</label>
            <select
              className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
            >
              <option value="Under ₦1M">Under ₦1 Million (Micro/Nano Grant)</option>
              <option value="₦1M - ₦5M">₦1 Million - ₦5 Million (Growth Loan/Grant)</option>
              <option value="₦5M - ₦20M">₦5 Million - ₦20 Million (SME Expansion Funding)</option>
              <option value="Above ₦20M">Above ₦20 Million (Enterprise Funding)</option>
            </select>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3">
            <span className="text-lg">💡</span>
            <p className="text-xs text-emerald-850 leading-relaxed">
              Our AI engine audits your profile against actual FGN Schemes, BoI, LSETF matching funds, and SMEDAN grants to identify high-probability approvals.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-750 transition-all shadow-lg transform active:scale-95 text-xs uppercase tracking-widest cursor-pointer"
          >
            Match My Funding opportunities 🔎
          </button>
        </form>
      </div>

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Grant Search"
        creditCost={2}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default GrantMatcher;