import React, { useState, useEffect } from 'react';
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

const STORAGE_KEY = 'smartbiz_saved_business_plan';

const BusinessPlanGenerator: React.FC<BusinessPlanGeneratorProps> = ({ brand, businessName, credits, onUpdateCredits }) => {
  const [step, setStep] = useState<'INPUT' | 'LOADING' | 'RESULT'>('INPUT');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [startupCapital, setStartupCapital] = useState('₦1,000,000 - ₦5,000,000');
  const [employeesCount, setEmployeesCount] = useState('1-3 employees');
  const [revenueModel, setRevenueModel] = useState('Direct retail & service sales');
  const [location, setLocation] = useState(brand?.location || 'Lagos, Nigeria');
  
  // AI Original vs Editable Working Copy
  const [rawPlan, setRawPlan] = useState<BusinessPlan | null>(null);
  const [editablePlan, setEditablePlan] = useState<BusinessPlan | null>(null);
  
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<number>(0);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Credit modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  // Defaults from Brand Identity if available
  const name = brand?.businessName || businessName;
  const niche = brand?.niche || 'General Commercial Enterprise';

  // Load saved custom plan if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.executiveSummary || parsed.marketAnalysis)) {
          setRawPlan(parsed);
          setEditablePlan(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load saved plan:", e);
    }
  }, []);

  const handleAutoFill = () => {
    if (!brand) return;
    const parts = [];
    const b = brand as any;
    const pitch = brand.elevatorPitch || b.elevator_pitch;
    const bio = brand.socialBio || b.social_bio;
    const audience = brand.targetAudience || b.target_audience;
    const voice = brand.brandVoice || b.brand_voice;
    
    if (pitch) parts.push(`Elevator Pitch: ${pitch}`);
    if (bio) parts.push(`About: ${bio}`);
    if (audience) parts.push(`Target Market: ${audience}`);
    if (voice) parts.push(`Style: ${voice}`);
    
    setAdditionalDetails(parts.join('\n\n'));
    if (brand.location) setLocation(brand.location);
  };

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
      
      setRawPlan(result);
      setEditablePlan(result);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      } catch (e) {}
      
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

    // Business plan costs 15 credits
    setDeductOnConfirm(() => async () => {
      await executeGenerate();
    });
    setShowCreditPrompt(true);
  };

  const handleSectionContentChange = (fieldKey: keyof BusinessPlan, newContent: string) => {
    if (!editablePlan) return;
    const updated = { ...editablePlan, [fieldKey]: newContent };
    setEditablePlan(updated);
  };

  const handleSavePlan = () => {
    if (!editablePlan) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(editablePlan));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (e) {
      console.warn("Error saving plan:", e);
    }
  };

  const handleResetToAIDraft = () => {
    if (!rawPlan) return;
    if (window.confirm("Are you sure you want to revert all your edits back to the original AI draft?")) {
      setEditablePlan({ ...rawPlan });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rawPlan));
      } catch (e) {}
    }
  };

  const handleDownloadPDF = () => {
    if (!editablePlan) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // -------------------------------------------------------------
    // Page 1: Premium Title Page & Executive Dossier
    // -------------------------------------------------------------
    doc.setFillColor(15, 23, 42); // Deep Slate Navy (Slate-900)
    doc.rect(0, 0, 210, 95, 'F'); // Top accent banner
    
    doc.setFillColor(30, 58, 138); // Indigo / Royal Blue accent strip
    doc.rect(0, 95, 210, 4, 'F');
    
    // Cover Header Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(name.toUpperCase(), 180);
    doc.text(titleLines, 105, 42, { align: "center" });
    
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(191, 219, 254); // Blue-200
    doc.text("STRATEGIC BUSINESS PLAN & INVESTOR DOSSIER", 105, 62, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(226, 232, 240); // Slate-200
    doc.text(`Sector: ${niche} | Location: ${location}`, 105, 72, { align: "center" });
    
    // Executive Metadata Card (Center/Bottom)
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(25, 120, 160, 110, 4, 4, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138); // Indigo-900
    doc.text("CONFIDENTIAL BUSINESS PROFILE", 105, 135, { align: "center" });
    
    doc.setDrawColor(203, 213, 225);
    doc.line(35, 140, 175, 140);

    // -------------------------------------------------------------
    // Content Processing Engine
    // -------------------------------------------------------------
    const cleanTextForPDF = (text: string) => {
      if (!text) return "";
      let clean = text.replace(/[₦]|[â‚¦]|[\u20A6]|[\u00A6]/g, 'NGN ');
      return clean;
    };

    const metaLeft = 35;
    let metaY = 152;
    const addMetaRow = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // Slate-600
      doc.text(cleanTextForPDF(label), metaLeft, metaY);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(cleanTextForPDF(value), metaLeft + 55, metaY);
      metaY += 10;
    };

    const todayStr = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
    addMetaRow("Enterprise:", name);
    addMetaRow("Operating Base:", location);
    addMetaRow("Target Capital:", startupCapital);
    addMetaRow("Staffing Scale:", employeesCount);
    addMetaRow("Revenue Engine:", revenueModel.substring(0, 35));
    addMetaRow("Prepared For:", "Bank, Grant (iDICE/BOI/TEF) & Investor Review");
    addMetaRow("Compiled Date:", todayStr);
    
    // Bottom seal
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("SmartBiz Coach • Verified MSME Enterprise Planning System", 105, 280, { align: "center" });

    const sections = [
      { num: "01", title: "Executive Summary & Pitch Dossier", content: cleanTextForPDF(editablePlan.executiveSummary) },
      { num: "02", title: "Market Analysis & Industry Dynamics", content: cleanTextForPDF(editablePlan.marketAnalysis) },
      { num: "03", title: "Marketing & Customer Acquisition Strategy", content: cleanTextForPDF(editablePlan.marketingStrategy) },
      { num: "04", title: "Operational & Execution Framework", content: cleanTextForPDF(editablePlan.operationalPlan) },
      { num: "05", title: "3-Year Financial Model & Projections", content: cleanTextForPDF(editablePlan.financialProjection) },
      { num: "06", title: "SWOT Strategic Matrix", content: cleanTextForPDF(editablePlan.swotAnalysis) },
      { num: "07", title: "Risk Mitigation & Institutional Compliance", content: cleanTextForPDF(editablePlan.riskMitigation) }
    ];

    const margin = 20;
    const pageWidth = 210;
    const contentWidth = 170;
    const maxY = 276;
    let pageCount = 1;

    sections.forEach((sec) => {
      doc.addPage();
      pageCount++;
      let y = 28;

      // Top running header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`${cleanTextForPDF(name).toUpperCase()} • STRATEGIC BUSINESS PLAN`, margin, 15);
      doc.text("CONFIDENTIAL", pageWidth - margin, 15, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 18, pageWidth - margin, 18);

      // Section Banner Box
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.roundedRect(margin, y, contentWidth, 13, 2, 2, 'F');
      
      doc.setFillColor(30, 58, 138); // Navy left indicator
      doc.roundedRect(margin, y, 4, 13, 1, 1, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(30, 58, 138);
      doc.text(`${sec.num}. ${sec.title.toUpperCase()}`, margin + 8, y + 9);
      
      y += 20;

      // Section Content Parsing (Handling subheadings, tables, and paragraphs)
      const rawLines = sec.content.split('\n');

      const renderFooter = () => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${pageCount}`, 105, 287, { align: "center" });
        doc.text("SmartBiz AI Enterprise System", pageWidth - margin, 287, { align: "right" });
      };

      for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (!line) {
          y += 2.5;
          continue;
        }

        // Filter out markdown table divider lines (e.g. |---|---| or |---|---|---|>)
        if (/^\|?[\s\-:|<>+]+\|?$/.test(line) || (line.startsWith('|') && line.includes('---')) || line.includes('---|')) {
          continue;
        }

        // Check if page overflow
        if (y > maxY) {
          renderFooter();
          doc.addPage();
          pageCount++;
          y = 28;

          // Header on new page
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`${cleanTextForPDF(name).toUpperCase()} • STRATEGIC BUSINESS PLAN (Cont.)`, margin, 15);
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, 18, pageWidth - margin, 18);
        }

        // 1. Detect Subheadings (e.g., 1.1, 2.3, ### Heading, or ALL-CAPS short titles)
        const isSubheading = /^(\d+\.\d+|###|[A-Z\s]{4,}:)/.test(line) || 
                             (line.startsWith('**') && line.endsWith('**') && line.length < 60);

        if (isSubheading) {
          y += 2.5;
          let headingText = line.replace(/###|\*\*/g, '').trim();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(30, 58, 138); // Navy Blue
          
          const splitH = doc.splitTextToSize(headingText, contentWidth);
          splitH.forEach((hLine: string) => {
            doc.text(hLine, margin, y);
            y += 5;
          });
          y += 0.5;
          continue;
        }

        // 2. Detect Markdown Table Rows (e.g. | Col 1 | Col 2 |)
        if (line.startsWith('|') && line.includes('|')) {
          const cols = line.split('|').map(c => c.trim().replace(/\*\*/g, '')).filter(c => c !== '');
          if (cols.length >= 2) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85); // Slate-700
            
            const col1 = cols[0];
            const col2 = cols.slice(1).join(' | ');
            
            doc.text(`• ${col1}:`, margin + 2, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            
            const splitVal = doc.splitTextToSize(col2, contentWidth - 45);
            splitVal.forEach((vLine: string, vIdx: number) => {
              if (vIdx === 0) {
                doc.text(vLine, margin + 45, y);
              } else {
                y += 4;
                doc.text(vLine, margin + 45, y);
              }
            });
            y += 4.5;
            continue;
          }
        }

        // 3. Bullet Point Handling
        if (line.startsWith('- ') || line.startsWith('• ') || /^\d+\.\s/.test(line)) {
          let bulletText = line.replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85); // Slate-700
          
          const splitBullet = doc.splitTextToSize(`• ${bulletText}`, contentWidth - 4);
          splitBullet.forEach((bLine: string) => {
            if (y > maxY) {
              renderFooter();
              doc.addPage();
              pageCount++;
              y = 28;
            }
            doc.text(bLine, margin + 3, y);
            y += 4.5;
          });
          continue;
        }

        // 4. Standard Paragraph Text
        const cleanParagraph = line.replace(/\*\*/g, '');
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85); // Slate-700
        
        const splitText = doc.splitTextToSize(cleanParagraph, contentWidth);
        splitText.forEach((pLine: string) => {
          if (y > maxY) {
            renderFooter();
            doc.addPage();
            pageCount++;
            y = 28;
          }
          doc.text(pLine, margin, y);
          y += 4.5;
        });
        y += 1.5;
      }

      // Render footer for last page of section
      renderFooter();
    });

    // Save and trigger browser download
    const safeFilename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Business_Plan_Dossier.pdf`;
    doc.save(safeFilename);
  };

  if (step === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-2xl animate-bounce">📊</div>
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-xl font-bold text-slate-900 font-heading">Generating Investor Business Plan</h3>
          <p className="text-slate-500 text-sm mt-2">
            Structuring 3-year financial models (NGN), TAM/SAM/SOM market metrics, and Nigerian risk shielding protocols...
          </p>
          <div className="flex justify-center gap-2 mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 py-1.5 px-3 rounded-full inline-block">
            ⚡ Preparing Bank & Grant (iDICE/BOI/TEF) Format
          </div>
        </div>
      </div>
    );
  }

  if (step === 'RESULT' && editablePlan) {
    const sectionList: { id: number; key: keyof BusinessPlan; title: string; icon: string; desc: string }[] = [
      { id: 0, key: 'executiveSummary', title: '1. Executive Summary & Pitch Dossier', icon: '📊', desc: 'Problem, UVP, target market, business model, and 3-year growth goals.' },
      { id: 1, key: 'marketAnalysis', title: '2. Market Analysis & TAM/SAM/SOM', icon: '📈', desc: 'Industry overview, customer personas, Nigerian market sizing, and competitor matrix.' },
      { id: 2, key: 'marketingStrategy', title: '3. Marketing & Sales Strategy', icon: '📣', desc: 'WhatsApp commerce, short-form video reels, CAC vs LTV, and retention loops.' },
      { id: 3, key: 'operationalPlan', title: '4. Operational & Execution Plan', icon: '⚙️', desc: 'Daily SOPs, wholesale supply chain, dispatch waybills, and solar power backup.' },
      { id: 4, key: 'financialProjection', title: '5. 3-Year Financial Projections (NGN)', icon: '💰', desc: 'CAPEX allocation, 3-year income statement, monthly cash flow, and breakeven point.' },
      { id: 5, key: 'swotAnalysis', title: '6. SWOT Strategic Matrix', icon: '⚖️', desc: 'Strengths, weaknesses, market growth opportunities, threats, and action matrix.' },
      { id: 6, key: 'riskMitigation', title: '7. Risk Mitigation & Compliance', icon: '🛡️', desc: 'Inflation/FX shielding, CAC/TIN compliance roadmap, and grant readiness.' }
    ];

    const currentSection = sectionList[activeSection] || sectionList[0];

    return (
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        {/* Header Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                ✓ Investor-Grade Plan Ready
              </span>
              <span className="text-xs text-slate-400">• Fully Editable</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-heading mt-1">{name} Business Plan</h2>
            <p className="text-xs text-slate-500">
              Sector: <span className="font-semibold text-slate-700">{niche}</span> | Base: <span className="font-semibold text-slate-700">{location}</span> | Capital: <span className="font-semibold text-slate-700">{startupCapital}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsEditingAll(!isEditingAll)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                isEditingAll
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span>{isEditingAll ? '👁️ Switch to Preview View' : '✏️ Quick Edit All Sections'}</span>
            </button>

            <button
              onClick={handleSavePlan}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>💾</span> Save Custom Plan
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>📥</span> Download Full PDF Dossier (10+ Pages)
            </button>
          </div>
        </div>

        {/* Save Toast Notification */}
        {saveToast && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between animate-in fade-in">
            <span>✓ Your custom edits have been saved to browser storage and will be included in the exported PDF.</span>
            <button onClick={() => setSaveToast(false)} className="text-emerald-900 hover:underline">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section Navigation Tabs (Left Sidebar) */}
          <div className="lg:col-span-4 space-y-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
                Plan Chapters
              </div>
              <div className="space-y-1">
                {sectionList.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSection(sec.id);
                      setEditingSectionId(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 ${
                      activeSection === sec.id
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold shadow-sm'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="text-lg mt-0.5">{sec.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{sec.title}</div>
                      <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">{sec.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between px-2">
                <button
                  onClick={handleResetToAIDraft}
                  className="text-[11px] text-slate-500 hover:text-red-600 font-medium transition-colors"
                >
                  🔄 Reset to AI Draft
                </button>
                <button
                  onClick={() => setStep('INPUT')}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  + Create New Plan
                </button>
              </div>
            </div>
          </div>

          {/* Active Section Content & Editor Panel (Right) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-indigo-50 rounded-xl">{currentSection.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base font-heading">{currentSection.title}</h3>
                    <p className="text-xs text-slate-500">{currentSection.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (editingSectionId === currentSection.id) {
                        setEditingSectionId(null);
                        handleSavePlan();
                      } else {
                        setEditingSectionId(currentSection.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      editingSectionId === currentSection.id || isEditingAll
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{editingSectionId === currentSection.id || isEditingAll ? '✓ Done Editing' : '✏️ Edit Section'}</span>
                  </button>
                </div>
              </div>

              {/* Editor or Formatted Viewer */}
              <div className="mt-5">
                {editingSectionId === currentSection.id || isEditingAll ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                        ✏️ In-Place Editor Mode • Changes update the live PDF automatically
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {editablePlan[currentSection.key]?.length || 0} characters
                      </span>
                    </div>
                    <textarea
                      rows={18}
                      className="w-full p-4 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-xs md:text-sm text-slate-800 leading-relaxed bg-slate-50/50"
                      value={editablePlan[currentSection.key] || ''}
                      onChange={(e) => handleSectionContentChange(currentSection.key, e.target.value)}
                    />
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <span className="text-slate-400">Tip: Keep subheadings formatted as 1.1, 1.2 or bullet points (•) for best PDF rendering.</span>
                      <button
                        onClick={() => {
                          setEditingSectionId(null);
                          handleSavePlan();
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                      >
                        Save & Preview
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/40 p-5 rounded-xl border border-slate-100 text-sm">
                    {editablePlan[currentSection.key]}
                  </div>
                )}
              </div>

              {/* Section Navigation Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <button
                  disabled={activeSection === 0}
                  onClick={() => {
                    setActiveSection(Math.max(0, activeSection - 1));
                    setEditingSectionId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  ← Previous Chapter
                </button>

                <span className="text-xs text-slate-400 font-medium">
                  Chapter {activeSection + 1} of {sectionList.length}
                </span>

                <button
                  disabled={activeSection === sectionList.length - 1}
                  onClick={() => {
                    setActiveSection(Math.min(sectionList.length - 1, activeSection + 1));
                    setEditingSectionId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                >
                  Next Chapter →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // Input Step Form
  // ----------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 font-semibold text-xs mb-2">
          <span>🏛️</span> Bank & Grant Investor Ready
        </div>
        <h2 className="text-2xl font-bold text-slate-900 font-heading">AI Business Plan & Investor Dossier 🚀</h2>
        <p className="text-slate-600 text-sm mt-1">
          Generate an exhaustive, multi-page business plan structured for Nigerian financial institutions, Bank of Industry (BOI), iDICE, and TEF grant competitions.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4 border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-800 font-bold">×</button>
        </div>
      )}

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between bg-blue-50/70 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="font-bold text-blue-900 text-xs sm:text-sm">Auto-Populate from Brand Profile</h4>
              <p className="text-blue-700 text-xs mt-0.5">
                Speed up generation by pulling your saved brand pitch, target audience, and location.
              </p>
            </div>
          </div>
          {brand && (
            <button
              onClick={handleAutoFill}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm whitespace-nowrap transition-colors"
            >
              ✨ Auto-Fill
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Business Name</label>
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm">
              {name || "Configure in Settings / Brand"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Operating Location</label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              placeholder="e.g. Lagos, Nigeria"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Target Capital / Funding Goal</label>
            <select
              className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium"
              value={startupCapital}
              onChange={(e) => setStartupCapital(e.target.value)}
            >
              <option value="Under ₦500,000">Under ₦500,000 (Micro Tier)</option>
              <option value="₦500,000 - ₦1,000,000">₦500,000 - ₦1,000,000 (Seed)</option>
              <option value="₦1,000,000 - ₦5,000,000">₦1,000,000 - ₦5,000,000 (BOI / TEF Standard)</option>
              <option value="₦5,000,000 - ₦15,000,000">₦5,000,000 - ₦15,000,000 (SME Growth)</option>
              <option value="₦15,000,000+">₦15,000,000+ (Commercial Scale)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Staffing Scale</label>
            <select
              className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium"
              value={employeesCount}
              onChange={(e) => setEmployeesCount(e.target.value)}
            >
              <option value="Just me (Sole Proprietor)">Just me (Sole Proprietor)</option>
              <option value="1-3 employees">1-3 employees (Agile Core)</option>
              <option value="4-8 employees">4-8 employees (Established)</option>
              <option value="10+ employees">10+ employees (Scale-up)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Primary Revenue Model</label>
          <select
            className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium"
            value={revenueModel}
            onChange={(e) => setRevenueModel(e.target.value)}
          >
            <option value="Direct retail & service sales">Direct retail & service sales (D2C)</option>
            <option value="Wholesale & Bulk Distribution">Wholesale & Bulk Distribution (B2B)</option>
            <option value="Subscription & Retainer Contracts">Subscription & Retainer Contracts</option>
            <option value="Hybrid Retail + Wholesale Model">Hybrid Retail + Wholesale Model</option>
            <option value="Commission & Brokerage Model">Commission & Brokerage Model</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Key Offerings, Unique Edge & Equipment Needed (Optional)
          </label>
          <textarea
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm bg-slate-50/50"
            placeholder="e.g. We specialize in locally processed spices with zero preservatives. We need ₦2.5M for automated sealing machines, solar power setup, and bulk farm sourcing from Benue State..."
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleGenerate}
            disabled={!name}
            className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5 active:scale-95 flex justify-center items-center gap-2"
          >
            <span>Generate Investor Business Plan (10+ Pages)</span>
            <span>🚀</span>
          </button>
          
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-orange-600 font-semibold flex items-center gap-1">
              <span>⚡</span> Costs 15 BizCredits
            </span>
            {editablePlan && (
              <button
                onClick={() => setStep('RESULT')}
                className="text-indigo-600 hover:text-indigo-800 font-bold underline"
              >
                View Previously Saved Plan →
              </button>
            )}
          </div>
        </div>
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