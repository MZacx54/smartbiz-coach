
import React, { useState } from 'react';
import { analyzeBusinessName } from '../services/geminiService';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

const Compliance: React.FC = () => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', title: 'Perform Name Availability Search', description: 'Check if your business name is free on CAC.', isCompleted: false },
    { id: '2', title: 'Register Business Name (BN)', description: 'Official registration for Sole Proprietors.', isCompleted: false },
    { id: '3', title: 'Obtain Tax Identification Number (TIN)', description: 'Required for opening a corporate bank account.', isCompleted: false },
    { id: '4', title: 'Open Corporate Bank Account', description: 'Separate personal funds from business funds.', isCompleted: false },
  ]);

  const [nameToAnalyze, setNameToAnalyze] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    probability: string;
    reason: string;
    alternatives: string[];
  } | null>(null);

  const toggleItem = (id: string) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const handleAnalyzeName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameToAnalyze) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeBusinessName(nameToAnalyze);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'High': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600';
    }
  };

  const progress = Math.round((checklist.filter(i => i.isCompleted).length / checklist.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compliance & Registration</h2>
        <p className="text-gray-600 text-sm mt-1">Get your business recognized by the Nigerian Government.</p>
      </div>

      {/* Partner Banner Upsell */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-bold text-lg">Too stressful? Hire a Pro Agent.</h3>
          <p className="text-indigo-200 text-sm mt-1 mb-3">Get your CAC certificate delivered to you in 7 days.</p>
          <div className="flex gap-2 text-xs">
            <span className="bg-white/20 px-2 py-1 rounded">Reg: ₦20,000</span>
            <span className="bg-white/20 px-2 py-1 rounded">TIN: Included</span>
          </div>
        </div>
        <button className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-md whitespace-nowrap">
          Hire Agent (Starts @ ₦2k)
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-semibold text-gray-700">Compliance Readiness</span>
          <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Checklist Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800">Registration Roadmap</h3>
          <div className="space-y-3">
            {checklist.map(item => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center ${item.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                    }`}>
                    {item.isCompleted && '✓'}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${item.isCompleted ? 'text-green-900' : 'text-gray-800'}`}>{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Name Search Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800">Smart Name Search 🤖</h3>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <form onSubmit={handleAnalyzeName} className="mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Proposed Business Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Lagos Logistics"
                  value={nameToAnalyze}
                  onChange={(e) => setNameToAnalyze(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isAnalyzing || !nameToAnalyze}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {isAnalyzing ? '...' : 'Check'}
                </button>
              </div>
            </form>

            {analysisResult && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className={`p-3 rounded-lg border mb-3 ${getProbabilityColor(analysisResult.probability)}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase">Approval Probability</span>
                    <span className="font-bold">{analysisResult.probability}</span>
                  </div>
                  <p className="text-xs opacity-90">{analysisResult.reason}</p>
                </div>

                {analysisResult.alternatives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Suggested Alternatives:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.alternatives.map((alt, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!analysisResult && !isAnalyzing && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700">
                Tip: Avoid generic words like "Global", "Limited", or "Enterprise" as the first word.
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <h4 className="font-bold text-gray-800 text-sm mb-2">Our Trusted Partners</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                <span className="text-sm font-medium">Sidebrief</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">₦18,000</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                <span className="text-sm font-medium">DIYLaw</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">₦20,000</span>
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-2">Consultations start from ₦2,000</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Compliance;