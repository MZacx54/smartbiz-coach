import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { BusinessPlan, BrandIdentity } from '../types';
import { generateBusinessPlan } from '../services/geminiService';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

interface BusinessPlanGeneratorProps {
  brand: BrandIdentity | null;
  businessName: string;
  credits: number;
  onUpdateCredits: (credits: number) => void;
}

const BusinessPlanGenerator: React.FC<BusinessPlanGeneratorProps> = ({ brand, businessName, credits, onUpdateCredits }) => {
  const [step, setStep] = useState<'INPUT' | 'LOADING' | 'RESULT'>('INPUT');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [startupCapital, setStartupCapital] = useState('₦500,000 - ₦1,000,000');
  const [employeesCount, setEmployeesCount] = useState('1-2 employees');
  const [revenueModel, setRevenueModel] = useState('Direct retail sales');
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<number>(0);

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  // Defaults from Brand Identity if available
  const name = brand?.businessName || businessName;
  const niche = brand?.niche || 'General Business';

  const executeGenerate = async () => {
    setStep('LOADING');
    setError('');
    setShowCreditPrompt(false);
    try {
      const result = await generateBusinessPlan({
        businessName: name,
        niche,
        details: additionalDetails,
        startupCapital,
        employeesCount,
        revenueModel
      });
      
      if (!result || result.error || (!result.executiveSummary && !result.marketAnalysis)) {
        throw new Error(result?.error || 'The AI generator returned an incomplete plan. Please refine your details and try again.');
      }
      
      // Only deduct credits if generation successfully completed
      const billingResponse = await billingService.deductCredits(15, 'AI Business Plan Generator');
      onUpdateCredits(billingResponse.credits);
      
      setPlan(result);
      setStep('RESULT');
    } catch (e: any) {
      setError(e?.message || e?.response?.data?.error || 'Failed to generate business plan. Please try again.');
      setStep('INPUT');
    }
  };

  const handleGenerate = async () => {
    if (!name) {
      setError('Business name is required.');
      return;
    }

    const usage = usageLimiter.checkUsage('business_plan', credits);
    if (!usage.allowed) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }

    // Business plan always costs credits (free limit = 0)
    setDeductOnConfirm(() => async () => {
      await executeGenerate();
    });
    setShowCreditPrompt(true);
  };

  const handleDownloadPDF = () => {
    if (!plan) return;
    const doc = new jsPDF();
    
    // Page 1: Premium Title Page
    doc.setFillColor(30, 58, 138); // Navy Blue (Indigo-900)
    doc.rect(0, 0, 210, 80, 'F'); // Top accent block
    
    // Cover Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255); // White text
    doc.text(name.toUpperCase(), 105, 45, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(229, 231, 235); // Gray-200
    doc.text("Strategic Business Plan", 105, 58, { align: "center" });
    
    // Metadata block (in bottom half)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.text("PREPARED BY:", 105, 140, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39); // Slate-900
    doc.text("SmartBiz Coach AI Portal", 105, 148, { align: "center" });
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // Gray-500
    const today = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated on: ${today}`, 105, 156, { align: "center" });
    
    // Bottom logo brand note
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175); // Gray-400
    doc.text("SmartBiz Coach - Empowering African Micro-Businesses", 105, 270, { align: "center" });
    
    // Add page for start of content
    doc.addPage();
    
    let y = 30;
    const margin = 20;
    const width = 170;
    let pageCount = 2;
    
    const cleanTextForPDF = (text: string) => {
      if (!text) return "";
      
      // Replace Naira symbols and common broken encodings with NGN
      let clean = text.replace(/[₦]|[â‚¦]/g, 'NGN ');
      
      // Process line by line to format markdown tables and bold text cleanly
      const lines = clean.split('\n');
      const processedLines = lines.map(line => {
        let trimmed = line.trim();
        
        // Skip markdown table divider lines like |---|---|
        if (trimmed.startsWith('|') && (trimmed.includes('---') || trimmed.includes('-:-'))) {
          return null;
        }
        
        // Format table data rows to descriptive bullet points
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const cols = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
          if (cols.length === 2) {
            // Strip bold markers from columns if present
            const col1 = cols[0].replace(/\*\*/g, '');
            const col2 = cols[1].replace(/\*\*/g, '');
            return `• ${col1}: ${col2}`;
          }
          return cols.map(c => c.replace(/\*\*/g, '')).join(' - ');
        }
        
        // Strip markdown bold markers **
        trimmed = trimmed.replace(/\*\*/g, '');
        
        return trimmed;
      }).filter(line => line !== null);
      
      return processedLines.join('\n');
    };

    const sections = [
      { title: "1. Executive Summary", content: cleanTextForPDF(plan.executiveSummary) },
      { title: "2. Market Analysis", content: cleanTextForPDF(plan.marketAnalysis) },
      { title: "3. Marketing & Sales Strategy", content: cleanTextForPDF(plan.marketingStrategy) },
      { title: "4. Operational Plan", content: cleanTextForPDF(plan.operationalPlan) },
      { title: "5. Financial Projections", content: cleanTextForPDF(plan.financialProjection) },
      { title: "6. SWOT Analysis", content: cleanTextForPDF(plan.swotAnalysis) },
      { title: "7. Risk Mitigation Plan", content: cleanTextForPDF(plan.riskMitigation) }
    ];
    
    sections.forEach((sec, idx) => {
      // Start a new page for each section (except the first one if we want clean layout, but let's just make it flow)
      if (idx > 0) {
        doc.addPage();
        y = 30;
        pageCount++;
      }
      
      // Section header styling with a navy colored border line underneath
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(30, 58, 138); // Indigo-900
      doc.text(sec.title.toUpperCase(), margin, y);
      y += 5;
      
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.8);
      doc.line(margin, y, margin + 45, y);
      y += 12;
      
      // Section body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(55, 65, 81); // Gray-700
      
      const splitText = doc.splitTextToSize(sec.content || "", width);
      splitText.forEach((line: string) => {
        if (y > 270) {
          // Page number footer before moving to next page
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page ${pageCount}`, 105, 285, { align: "center" });
          
          doc.addPage();
          y = 30;
          pageCount++;
          
          // Restore content font styles after adding a page
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(55, 65, 81);
        }
        doc.text(line, margin, y);
        y += 6.5;
      });
      
      // Page number footer for the last page of the section
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${pageCount}`, 105, 285, { align: "center" });
    });
    
    doc.save(`${name.replace(/\s+/g, '_')}_Business_Plan.pdf`);
  };

  if (step === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xl">📄</div>
        </div>
        <div className="text-center animate-pulse">
          <p className="text-indigo-900 font-bold text-lg">Drafting your detailed Business Plan...</p>
          <p className="text-gray-500 text-sm">Analyzing local Nigerian markets and formatting financials (NGN)...</p>
        </div>
      </div>
    );
  }

  if (step === 'RESULT' && plan) {
    const sections = [
      { id: 0, title: "1. Executive Summary", icon: "📊", content: plan.executiveSummary },
      { id: 1, title: "2. Market Analysis", icon: "📈", content: plan.marketAnalysis },
      { id: 2, title: "3. Marketing & Sales Strategy", icon: "📣", content: plan.marketingStrategy },
      { id: 3, title: "4. Operational Plan", icon: "⚙️", content: plan.operationalPlan },
      { id: 4, title: "5. Financial Projections", icon: "💰", content: plan.financialProjection },
      { id: 5, title: "6. SWOT Analysis", icon: "⚖️", content: plan.swotAnalysis },
      { id: 6, title: "7. Risk Mitigation Plan", icon: "🛡️", content: plan.riskMitigation }
    ];

    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">AI Business Plan</h2>
            <p className="text-sm text-gray-500">Drafted for {name} ({niche})</p>
          </div>
          <button
            onClick={() => setStep('INPUT')}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Start Over
          </button>
        </div>

        {/* Accordion Layout */}
        <div className="space-y-4">
          {sections.map((sec) => (
            <div key={sec.id} className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setActiveSection(activeSection === sec.id ? -1 : sec.id)}
                className="w-full flex justify-between items-center p-5 text-left font-bold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span>{sec.icon}</span>
                  <span>{sec.title}</span>
                </span>
                <span className={`text-xl transition-transform duration-200 ${activeSection === sec.id ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {activeSection === sec.id && (
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                  {sec.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span>📥</span> Download PDF Report
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95"
          >
            <span>🖨️</span> Print Document
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-800 italic text-center">
          Disclaimer: This is an AI-generated draft intended for planning purposes. Please customize and review thoroughly before submitting to official institutions.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 font-heading">AI Business Plan Generator 🚀</h2>
        <p className="text-slate-600 text-sm mt-2">
          Create an investor-ready, comprehensive business plan optimized for Nigerian grants (TEF, BOI, LSETF) and local bank loans.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4 border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-bold text-blue-900 text-sm">Naija Grant Ready</h4>
            <p className="text-blue-800 text-xs mt-1">
              Adding accurate startup capital, employees count, and a clear revenue source helps the AI customize NGN cash flow projections for your application.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name</label>
          <div className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 font-bold">
            {name || "Please setup your brand identity first"}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Startup Capital / Budget</label>
            <select
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              value={startupCapital}
              onChange={(e) => setStartupCapital(e.target.value)}
            >
              <option value="Under ₦500,000">Under ₦500,000</option>
              <option value="₦500,000 - ₦1,000,000">₦500,000 - ₦1,000,000</option>
              <option value="₦1,000,000 - ₦5,000,000">₦1,000,000 - ₦5,000,000</option>
              <option value="₦5,000,000 - ₦10,000,000">₦5,000,000 - ₦10,000,000</option>
              <option value="₦10,000,000+">₦10,000,000+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Number of Employees</label>
            <select
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              value={employeesCount}
              onChange={(e) => setEmployeesCount(e.target.value)}
            >
              <option value="Just me (Sole Proprietor)">Just me (Sole Proprietor)</option>
              <option value="1-2 employees">1-2 employees</option>
              <option value="3-5 employees">3-5 employees</option>
              <option value="6-10 employees">6-10 employees</option>
              <option value="10+ employees">10+ employees</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Revenue Model / Source</label>
          <select
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
            value={revenueModel}
            onChange={(e) => setRevenueModel(e.target.value)}
          >
            <option value="Direct retail sales (Selling to consumers)">Direct retail sales (Selling to consumers)</option>
            <option value="Wholesale (Selling in bulk to retailers)">Wholesale (Selling in bulk to retailers)</option>
            <option value="Service-based fees (Charging for tasks/skills)">Service-based fees (Charging for tasks/skills)</option>
            <option value="Subscription model (Recurring monthly fees)">Subscription model (Recurring monthly fees)</option>
            <option value="Commission/Agency model">Commission/Agency model</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Key Products & Unique Strategy (Optional)</label>
          <textarea
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm bg-slate-50/50"
            placeholder="e.g. We sell organic shea butter creams sourced from Minna. Our differentiator is fast, affordable delivery via local dispatch and strong Instagram presence..."
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!name}
          className="w-full py-3.5 bg-indigo-600 disabled:bg-gray-300 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 flex justify-center items-center gap-2"
        >
          <span>Generate Plan</span>
          <span>🚀</span>
        </button>
        <p className="text-center text-xs text-orange-600 font-semibold mt-2">
          ⚡ Costs 15 credits per generation
        </p>
      </div>

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Business Plan Generator"
        creditCost={15}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default BusinessPlanGenerator;