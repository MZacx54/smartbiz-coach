
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
    gender: 'Male'
  });

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  const executeSearch = async (deduct: boolean, cost: number) => {
    setStep('LOADING');
    setError('');
    setShowCreditPrompt(false);

    try {
      if (deduct) {
        const billingResponse = await billingService.deductCredits(cost, 'AI Grant Search');
        if (onUpdateCredits) onUpdateCredits(billingResponse.credits);
      } else {
        usageLimiter.incrementUsage('grant_search');
      }

      const results = await findGrants({
        businessName,
        ...formData
      });
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
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
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

  if (step === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="animate-spin text-4xl">🏦</div>
        <div className="text-center">
          <p className="text-indigo-900 font-bold text-lg">Scanning Financial Databases...</p>
          <p className="text-gray-500 text-sm">Matching your profile with opportunities in {formData.location}.</p>
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
            <p className="text-sm text-gray-500">Best matches for {businessName}</p>
          </div>
          <button
            onClick={() => setStep('INPUT')}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Update Profile
          </button>
        </div>

        <div className="grid gap-6">
          {grants.length === 0 && (
            <div className="text-center p-10 bg-white rounded-xl">No specific grants found. Try changing your criteria.</div>
          )}

          {grants.map((grant) => (
            <div key={grant.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 flex flex-col md:flex-row gap-6">
                {/* Left: Score & Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getTypeColor(grant.type)}`}>
                      {grant.type}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(grant.matchScore)}`}>
                      {grant.matchScore}% Match
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">{grant.name}</h3>
                  <p className="text-sm text-gray-500 font-medium mb-3">{grant.provider}</p>

                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mb-4">
                    <span className="font-semibold">Why: </span> {grant.matchReason}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>💰</span>
                    <span className="font-semibold text-gray-900">{grant.amountRange}</span>
                  </div>
                  {grant.deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <span>📅</span>
                      <span>Deadline: {grant.deadline}</span>
                    </div>
                  )}
                </div>

                {/* Right: Requirements & Action */}
                <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-4 md:pt-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Requirements</h4>
                    <ul className="space-y-2">
                      {grant.requirements.map((req, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                    Start Application
                  </button>
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
        <h2 className="text-2xl font-bold text-gray-900">Grant Matcher 🚀</h2>
        <p className="text-gray-600 text-sm mt-2">
          Find tailored funding opportunities in the Nigerian ecosystem.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Location</label>
            <select
              className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            >
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja (FCT)</option>
              <option value="Kano">Kano</option>
              <option value="Rivers">Rivers (Port Harcourt)</option>
              <option value="Oyo">Oyo (Ibadan)</option>
              <option value="Enugu">Enugu</option>
              <option value="Other">Other State</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry Sector</label>
            <select
              className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            >
              <option value="Agriculture">Agriculture & Agro-processing</option>
              <option value="Technology">Technology & ICT</option>
              <option value="Fashion">Fashion & Textile</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Education">Education</option>
              <option value="Creative Arts">Creative Arts & Entertainment</option>
              <option value="Retail">Retail & Commerce</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years Active</label>
              <select
                className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Gender</label>
              <select
                className="w-full px-3 py-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Mixed Team">Mixed Team</option>
              </select>
              <p className="text-[10px] text-gray-500 mt-1">Required for gender-specific grants.</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
            <span className="text-lg">💡</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              Matching algorithm includes eligibility checks for TEF, BOI, LSETF, and international donor agencies operating in Nigeria.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-all shadow-lg transform active:scale-95"
          >
            Find Funding 🔎
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