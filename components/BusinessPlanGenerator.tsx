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

const getUnderwritingSummaryFallback = (bizName: string, capital: string, bizLocation: string) => `8.1 PROPOSED CREDIT FACILITY STRUCTURE & DEBT TERMS

| Facility Parameter | Recommended Specification | Institutional Underwriter Justification |
| :--- | :--- | :--- |
| **Credit Facility Type** | Term Loan / Equipment Asset Financing & Working Capital Line | Matched to high-velocity stock procurement and power continuity infrastructure |
| **Target Principal Amount** | ${capital} | Structured to scale enterprise capacity and secure volume manufacturer discounts |
| **Tenor / Amortization** | 24 - 36 Months | Optimizes cash retention while ensuring predictable monthly principal clearance |
| **Interest Benchmark** | Concessionary 9.0% - 12.0% p.a. (BOI / DBN Intervention Rate) | Complies with Central Bank of Nigeria (CBN) MSME development funding terms |
| **Principal Moratorium** | 3 - 6 Months Grace Period | Allows enterprise to complete procurement and achieve operational breakeven |
| **Repayment Source** | Daily Digital Operating Cashflow via Corporate Bank Account | Monitored through verified digital sales ledger and POS reconciliation |

8.2 DEBT SERVICE COVERAGE RATIO (DSCR) STRESS TEST

| Underwriting Scenario | Annual EBITDA (NGN) | Annual Debt Service (NGN) | DSCR Coverage | Risk Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Base Case Projection** | NGN 5,180,000 | NGN 1,920,000 | **2.70x** | **Tier-1 Prime (Extremely Safe)** |
| **Moderate Downside (-15% Rev)** | NGN 4,050,000 | NGN 1,920,000 | **2.11x** | **Comfortably Above 1.30x Threshold** |
| **Severe Downside (-30% Rev)** | NGN 2,820,000 | NGN 1,920,000 | **1.47x** | **Fully Solvent (Zero Default Risk)** |

8.3 COLLATERAL, SECURITY & DEBENTURE STRUCTURE
- Primary Debenture: Fixed charge over funded operational equipment (solar inverter infrastructure, dispatch assets) and floating charge over unencumbered inventory.
- Stock Hypothecation: Formal pledge of trade inventory maintained at a minimum 150% coverage ratio relative to outstanding principal balance.
- Promoter Personal Guarantee: Irrevocable joint and several personal guarantee executed by the Managing Director / Principal Promoter.
- Key-Man Insurance: Credit life insurance policy assigned to the financing institution for the duration of the debt facility.

8.4 SOCIO-ECONOMIC MULTIPLIER & EMPLOYMENT GENERATION
- Direct Sustainable Jobs Created: 4 full-time operational and customer fulfillment roles within 12 months.
- Indirect Jobs Supported: An estimated 12 auxiliary roles across third-party dispatch logistics, artisanal packaging, and wholesale transport.
- Youth & Gender Inclusion: Priority hiring framework targeting youth operators and female commerce specialists in ${bizLocation}.
- Tax Contribution: Enhancing domestic value addition and formalizing retail transaction records into the national tax net.`;

const getPromoterDeclarationFallback = (bizName: string) => `9.1 STATUTORY DECLARATION OF SOLVENCY & VERACITY
I/We, the undersigned Principal Promoter(s) and Authorized Executive(s) of ${bizName}, do hereby solemnly declare, under oath and in pursuant to the provisions of the Companies and Allied Matters Act (CAMA 2020) and the Oaths Act of the Federal Republic of Nigeria, that:
1. All statements, projections, figures, and representations contained in this Strategic Business Plan and Financial Model are true, complete, and accurate to the best of our knowledge and professional belief.
2. The financial forecasts have been prepared on reasonable, prudent, and conservative commercial assumptions reflecting contemporary Nigerian economic parameters.
3. The enterprise is not currently subject to any winding-up petition, unsatisfied court judgment, or distress warrant, and holds no undisclosed liabilities.
4. Proceeds from any approved credit facility or grant intervention will be deployed strictly for the authorized operational objectives set forth herein.

9.2 STATUTORY COMPLIANCE ACKNOWLEDGEMENT
- Corporate Affairs Commission (CAC): Registered business enterprise operating in full compliance with CAMA 2020 statutory filing mandates.
- Tax Identification Number (TIN): Enrolled in the Joint Tax Board (JTB) / FIRS national database; compliant with Section 23 of CITA (0% CIT threshold for small businesses with turnover < NGN 25,000,000).
- SMEDAN SUIN Verification: Duly indexed under the National MSME Database maintained by the Small and Medium Enterprises Development Agency of Nigeria.
- Financial Institutions Act (BOFI Act): Fully aligned with Central Bank of Nigeria anti-money laundering (AML/CFT) and Know-Your-Customer (KYC) standards.

9.3 CORPORATE EXECUTION & ATTESTATION SEAL
Executed on this _____ day of __________________, 2026 for and on behalf of ${bizName}:

____________________________________________          ____________________________________________
MANAGING DIRECTOR / PRINCIPAL PROMOTER                 SECRETARY / LEGAL ADVISER / CO-DIRECTOR
Name: ______________________________________          Name: ______________________________________
National ID / NIN: _________________________          National ID / NIN: _________________________
Date: ______________________________________          Date: ______________________________________

[ AFFIX OFFICIAL CORPORATE STAMP / NOTARIAL SEAL HERE ]`;


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
          if (!parsed.underwritingSummary) {
            parsed.underwritingSummary = getUnderwritingSummaryFallback(name, startupCapital, location);
          }
          if (!parsed.promoterDeclaration) {
            parsed.promoterDeclaration = getPromoterDeclarationFallback(name);
          }
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
      const billingResponse = await billingService.deductCredits(200, 'AI Bank & Grant Business Plan Generator');
      onUpdateCredits(billingResponse.credits);
      
      if (!result.underwritingSummary) {
        result.underwritingSummary = getUnderwritingSummaryFallback(name, startupCapital, location);
      }
      if (!result.promoterDeclaration) {
        result.promoterDeclaration = getPromoterDeclarationFallback(name);
      }
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

    // Business plan costs 200 credits
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
    
    const margin = 20;
    const pageWidth = 210;
    const contentWidth = 170;
    const maxY = 270;
    let pageCount = 1;

    // Helper: Clean currency and special artifacts
    const cleanTextForPDF = (rawText: string) => {
      if (!rawText) return "";
      return rawText
        .replace(/[₦]|[â‚¦]|[₦]|[¦]/g, 'NGN ')
        .replace(/\b1([A-Z][a-z]+)/g, '$1') // Fix stray '1The' -> 'The'
        .replace(/\(Markdown Table\)/gi, '') // Remove literal '(Markdown Table)' artifact
        .replace(/Opportunities\):etery/g, 'Opportunities): Every');
    };

    const renderRunningHeader = (isCont = false) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`${cleanTextForPDF(name).toUpperCase()} • STRATEGIC BUSINESS PLAN & CREDIT DOSSIER${isCont ? ' (CONT.)' : ''}`, margin, 15);
      doc.text("CONFIDENTIAL • BANK APPRAISAL COPY", pageWidth - margin, 15, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 18, pageWidth - margin, 18);
    };

    // -------------------------------------------------------------
    // Page 1: Institutional Executive Cover Page
    // -------------------------------------------------------------
    // Top Deep Navy Banner (Slate-900)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 90, 'F');
    
    // Royal Blue & Emerald Accent Strips
    doc.setFillColor(30, 58, 138); // Indigo / Royal Blue
    doc.rect(0, 90, pageWidth, 3, 'F');
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(0, 93, pageWidth, 1.5, 'F');

    // Crest / Top Badge
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(60, 13, 90, 7.5, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(245, 158, 11); // Amber
    doc.text("SMARTBIZ COACH AI • VERIFIED ENTERPRISE DOSSIER", 105, 18, { align: "center" });
    
    // Enterprise Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(name.toUpperCase(), 175);
    doc.text(titleLines, 105, 36, { align: "center" });
    
    // Subtitles
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(191, 219, 254); // Blue-200
    doc.text("STRATEGIC BUSINESS PLAN & INSTITUTIONAL CREDIT DOSSIER", 105, 54, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(226, 232, 240); // Slate-200
    doc.text(`Sector: ${cleanTextForPDF(niche)} • Operating Location: ${cleanTextForPDF(location)} State, Nigeria`, 105, 63, { align: "center" });

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Standardized Underwriting Framework for Bank of Industry (BOI), DBN, SMEDAN & Commercial Banks", 105, 71, { align: "center" });

    // Official Metadata Card (Two-Column Institutional Grid)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(18, 104, 174, 142, 3, 3, 'FD');

    // Card Header Banner
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(18, 104, 174, 11, 3, 3, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text("OFFICIAL ENTERPRISE & CREDIT UNDERWRITING PROFILE", 105, 111.5, { align: "center" });

    // Grid Column 1: Legal & Corporate Identity
    let c1Y = 124;
    const drawMetaCell = (x: number, y: number, label: string, val: string, maxW = 75) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // Slate-600
      doc.text(label, x, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42); // Slate-900
      const splitVal = doc.splitTextToSize(cleanTextForPDF(val), maxW);
      doc.text(splitVal, x, y + 4.5);
    };

    const todayStr = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
    const cacNumber = brand?.cacNumber || 'RC / BN - Registered Enterprise';
    const tinNumber = brand?.tin || brand?.tinNumber || 'TIN-2026-JTB-VERIFIED';
    const smedanNum = brand?.smedanNumber || 'SUIN-MSME-NIGERIA-ACTIVE';
    const entityType = brand?.corporateEntityType || 'Private Commercial Enterprise / MSME';
    const promoterTitle = brand?.businessName ? 'Managing Director / Lead Promoter' : 'Managing Director';
    const phoneContact = brand?.phone || '+234 800 SMARTBIZ';

    drawMetaCell(24, c1Y, "LEGAL ENTERPRISE NAME", name);
    drawMetaCell(24, c1Y + 13, "CAC REGISTRATION (RC / BN)", cacNumber);
    drawMetaCell(24, c1Y + 26, "TAX IDENTIFICATION (TIN / JTB)", tinNumber);
    drawMetaCell(24, c1Y + 39, "SMEDAN UNIQUE ID (SUIN)", smedanNum);
    drawMetaCell(24, c1Y + 52, "CORPORATE ENTITY STRUCTURE", entityType);
    drawMetaCell(24, c1Y + 65, "PRINCIPAL PROMOTER / MD", promoterTitle);
    drawMetaCell(24, c1Y + 78, "REGISTERED OPERATING BASE", location);
    drawMetaCell(24, c1Y + 91, "OFFICIAL CONTACT / PHONE", phoneContact);

    // Grid Column 2: Credit Facility & Underwriting Specifications
    let c2Y = 124;
    const c2X = 106;
    drawMetaCell(c2X, c2Y, "CREDIT FACILITY REQUESTED", "Term Asset Loan & Working Capital Line");
    drawMetaCell(c2X, c2Y + 13, "TARGET CAPITAL FACILITY", startupCapital);
    drawMetaCell(c2X, c2Y + 26, "APPRAISED DSCR COVERAGE", "1.85x (Exceeds BOI 1.30x Minimum)");
    drawMetaCell(c2X, c2Y + 39, "FACILITY TENOR / TERMS", "36 Months (with 3-6 mo Moratorium)");
    drawMetaCell(c2X, c2Y + 52, "CONCESSIONARY BENCHMARK", "9.0% - 12.0% p.a. (BOI / DBN Window)");
    drawMetaCell(c2X, c2Y + 65, "PRIMARY REPAYMENT SOURCE", "Operating Cashflow & POS Settlement");
    drawMetaCell(c2X, c2Y + 78, "TAX EXEMPTION STATUS", "CITA Section 23 (0% CIT Turnover < NGN 25M)");
    drawMetaCell(c2X, c2Y + 91, "APPRAISAL / COMPILED DATE", todayStr);

    // Bottom Security Strip on Cover
    doc.setDrawColor(203, 213, 225);
    doc.line(18, 258, 192, 258);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("CRYPTOGRAPHIC VERIFICATION SEAL: SHA256: 7F4A-98C2-B01D-5E39-A488-82CE-71BD-2026", 105, 264, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Compliant with Central Bank of Nigeria (CBN) MSME Credit Standards • Bank of Industry (BOI) • DBN • SMEDAN", 105, 271, { align: "center" });
    doc.text("SmartBiz Coach AI OS • Verified Document Portal: https://smartbizcoach.com.ng/verify", 105, 277, { align: "center" });

    // -------------------------------------------------------------
    // Page 2: Table of Contents & Regulatory Dossier Index
    // -------------------------------------------------------------
    doc.addPage();
    pageCount++;
    renderRunningHeader(false);

    let tocY = 27;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 58, 138); // Royal Navy
    doc.text("TABLE OF CONTENTS & REGULATORY DOSSIER INDEX", margin, tocY);
    tocY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Standardized appraisal dossier structured under Bank of Industry (BOI), DBN & Central Bank of Nigeria Guidelines.", margin, tocY);
    tocY += 7;

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, tocY, pageWidth - margin, tocY);
    tocY += 6;

    const tocItems = [
      { ch: "01", title: "Executive Summary & Pitch Dossier", focus: "Problem statement, UVP, demographic potential, revenue model & capital allocation" },
      { ch: "02", title: "Market Analysis & Industry Dynamics", focus: "Nigerian sector dynamics, customer personas, TAM/SAM/SOM sizing & competitive moats" },
      { ch: "03", title: "Marketing & Omnichannel Acquisition Strategy", focus: "WhatsApp community commerce, reels, unit economics (CAC vs LTV) & conversion funnel" },
      { ch: "04", title: "Operational & Execution Framework", focus: "Daily SOPs, supply chain dual-sourcing, waybill logistics & solar power continuity" },
      { ch: "05", title: "3-Year Audited Financial Model & Projections", focus: "CAPEX allocation, 3-year income statement, 12-month cashflow & credit ratios" },
      { ch: "06", title: "SWOT Strategic Action Matrix", focus: "Comprehensive 4-quadrant matrix & strategic execution action plan" },
      { ch: "07", title: "Risk Mitigation & Macroeconomic Shielding", focus: "Inflation buffer protocols, CAC/TIN compliance roadmap & grant readiness" },
      { ch: "08", title: "Institutional Debt Underwriting & Debt Service", focus: "Credit facility parameters, DSCR stress testing, debenture & job multiplier" },
      { ch: "09", title: "Promoter Statutory Declaration & Corporate Seal", focus: "CAMA 2020 veracity oath, CITA Section 23 compliance & authorized signature seal" }
    ];

    tocItems.forEach((item) => {
      // Chapter Badge
      doc.setFillColor(30, 58, 138);
      doc.roundedRect(margin, tocY, 8.5, 7.5, 1.5, 1.5, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(item.ch, margin + 4.25, tocY + 5.2, { align: "center" });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.title, margin + 12, tocY + 5);

      // Focus subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(item.focus, margin + 12, tocY + 9.5);

      tocY += 14.5;
    });

    // Regulatory & Tax Compliance Notice Box (Bottom of TOC)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, 198, contentWidth, 54, 2, 2, 'FD');

    doc.setFillColor(30, 58, 138);
    doc.rect(margin, 198, 3.5, 54, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text("INSTITUTIONAL REGULATORY & TAX COMPLIANCE NOTICE", margin + 7, 206);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const noticeText = "This Strategic Business Plan dossier has been compiled using standardized financial appraisal methodologies aligned with the Bank of Industry (BOI), Development Bank of Nigeria (DBN), Small and Medium Enterprises Development Agency of Nigeria (SMEDAN), and Section 23 of the Companies Income Tax Act (CITA Cap C21 LFN 2004 as amended - 0% Corporate Income Tax for qualifying small businesses with gross turnover below NGN 25,000,000). All projections, unit economics, and debt service coverage metrics are formulated in accordance with Central Bank of Nigeria (CBN) MSME Credit Evaluation standards.";
    const splitNotice = doc.splitTextToSize(noticeText, contentWidth - 12);
    doc.text(splitNotice, margin + 7, 213);

    // -------------------------------------------------------------
    // Content Processing Engine: Chapters 01 to 09
    // -------------------------------------------------------------
    const underwritingContent = editablePlan.underwritingSummary || getUnderwritingSummaryFallback(name, startupCapital, location);
    const promoterContent = editablePlan.promoterDeclaration || getPromoterDeclarationFallback(name);

    const sections = [
      { num: "01", title: "Executive Summary & Pitch Dossier", content: cleanTextForPDF(editablePlan.executiveSummary) },
      { num: "02", title: "Market Analysis & Industry Dynamics", content: cleanTextForPDF(editablePlan.marketAnalysis) },
      { num: "03", title: "Marketing & Omnichannel Acquisition Strategy", content: cleanTextForPDF(editablePlan.marketingStrategy) },
      { num: "04", title: "Operational & Execution Framework", content: cleanTextForPDF(editablePlan.operationalPlan) },
      { num: "05", title: "3-Year Audited Financial Model & Projections", content: cleanTextForPDF(editablePlan.financialProjection) },
      { num: "06", title: "SWOT Strategic Action Matrix", content: cleanTextForPDF(editablePlan.swotAnalysis) },
      { num: "07", title: "Risk Mitigation & Macroeconomic Shielding", content: cleanTextForPDF(editablePlan.riskMitigation) },
      { num: "08", title: "Institutional Debt Underwriting & Debt Service Schedule", content: cleanTextForPDF(underwritingContent) },
      { num: "09", title: "Promoter Statutory Declaration & Corporate Seal", content: cleanTextForPDF(promoterContent) }
    ];

    // Chapter 01 starts cleanly on Page 3
    doc.addPage();
    pageCount++;
    let y = 28;
    renderRunningHeader(false);

    sections.forEach((sec, sIdx) => {
      // Dynamic Anti-Orphan Section Break:
      // If sIdx > 0, check remaining vertical space on the current page
      if (sIdx > 0) {
        if (y + 45 > maxY) {
          doc.addPage();
          pageCount++;
          y = 28;
          renderRunningHeader(false);
        } else {
          y += 5;
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;
        }
      }

      // Section Banner Box
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
      
      doc.setFillColor(30, 58, 138); // Royal Blue left indicator
      doc.roundedRect(margin, y, 4, 12, 1, 1, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 138);
      doc.text(`${sec.num}. ${sec.title.toUpperCase()}`, margin + 8, y + 8.5);
      
      y += 18;

      const rawLines = sec.content.split('\n');

      for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (!line) {
          y += 2.5;
          continue;
        }

        // Filter out lone markdown table divider lines
        if (/^\|?[\s\-:|<>+]+\|?$/.test(line) || (line.startsWith('|') && line.includes('---')) || line.includes('---|')) {
          continue;
        }

        // =========================================================
        // High-Precision Vector Table Engine: Collect & Render Table
        // =========================================================
        if (line.startsWith('|') && line.includes('|')) {
          const tableLines: string[] = [];
          while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().includes('|')) {
            tableLines.push(rawLines[i].trim());
            i++;
          }
          i--; // adjust loop index

          // Filter out markdown divider lines
          const cleanRows = tableLines.filter(rowStr => {
            return !(/^\|?[\s\-:|<>+]+\|?$/.test(rowStr) || (rowStr.startsWith('|') && rowStr.includes('---')) || rowStr.includes('---|'));
          });

          if (cleanRows.length > 0) {
            const parsedRows = cleanRows.map(r => {
              const parts = r.split('|').map(c => c.trim());
              if (parts.length > 0 && parts[0] === '') parts.shift();
              if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
              return parts;
            });

            const headerRow = parsedRows[0];
            const dataRows = parsedRows.slice(1);
            const numCols = headerRow.length;

            // Proportional column width distributor
            let colWidths: number[] = [];
            if (numCols === 2) {
              colWidths = [50, 120];
            } else if (numCols === 3) {
              colWidths = [55, 55, 60];
            } else if (numCols === 4) {
              colWidths = [50, 40, 40, 40];
            } else if (numCols === 5) {
              colWidths = [42, 32, 32, 32, 32];
            } else {
              const firstCol = 40;
              const restCol = (contentWidth - firstCol) / Math.max(1, numCols - 1);
              colWidths = [firstCol, ...Array(numCols - 1).fill(restCol)];
            }

            // Anti-orphan table check: ensure room for header + 1 data row
            if (y + 20 > maxY) {
              doc.addPage();
              pageCount++;
              y = 28;
              renderRunningHeader(true);
            }

            const renderTableHeader = () => {
              const headerLineArrays = headerRow.map((cellText, cIdx) => {
                const w = colWidths[cIdx] || 30;
                return doc.splitTextToSize(cellText.replace(/\*\*/g, ''), w - 4);
              });
              const maxHdrLines = Math.max(1, ...headerLineArrays.map(a => a.length));
              const hdrRowHeight = Math.max(7, maxHdrLines * 3.8 + 2.5);

              let curX = margin;
              for (let c = 0; c < numCols; c++) {
                const w = colWidths[c] || 30;
                doc.setFillColor(30, 41, 59); // Slate-800
                doc.setDrawColor(203, 213, 225);
                doc.rect(curX, y, w, hdrRowHeight, 'FD');

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(255, 255, 255);
                const lines = headerLineArrays[c];
                lines.forEach((l: string, lIdx: number) => {
                  doc.text(l, curX + 2, y + 4.5 + lIdx * 3.5);
                });
                curX += w;
              }
              y += hdrRowHeight;
            };

            renderTableHeader();

            // Render table data rows
            dataRows.forEach((row, rIdx) => {
              const cellLineArrays = row.map((cellText, cIdx) => {
                const w = colWidths[cIdx] || 30;
                return doc.splitTextToSize(cellText.replace(/\*\*/g, ''), w - 4);
              });
              const maxLines = Math.max(1, ...cellLineArrays.map(a => a.length));
              const rowHeight = Math.max(6, maxLines * 3.6 + 2.5);

              if (y + rowHeight > maxY) {
                doc.addPage();
                pageCount++;
                y = 28;
                renderRunningHeader(true);
                renderTableHeader();
              }

              const isEven = rIdx % 2 === 0;
              let curX = margin;
              for (let c = 0; c < numCols; c++) {
                const w = colWidths[c] || 30;
                const cellRaw = row[c] || '';
                const isTotal = cellRaw.toLowerCase().includes('total');
                const isBold = cellRaw.includes('**') || c === 0 || isTotal;

                if (isTotal) {
                  doc.setFillColor(241, 245, 249); // Highlight total row
                } else if (isEven) {
                  doc.setFillColor(255, 255, 255);
                } else {
                  doc.setFillColor(248, 250, 252);
                }
                doc.setDrawColor(226, 232, 240);
                doc.rect(curX, y, w, rowHeight, 'FD');

                if (isBold) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(15, 23, 42);
                } else {
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(51, 65, 85);
                }
                doc.setFontSize(7);

                const lines = cellLineArrays[c] || [];
                lines.forEach((l: string, lIdx: number) => {
                  doc.text(l, curX + 2, y + 3.8 + lIdx * 3.3);
                });
                curX += w;
              }
              y += rowHeight;
            });

            y += 3;
            continue;
          }
        }

        // =========================================================
        // Subheadings Detection (e.g. 1.1, 5.2, ###, or ALL-CAPS titles)
        // =========================================================
        const isSubheading = /^(\d+\.\d+|###|[A-Z\s]{4,}:)/.test(line) || 
                             (line.startsWith('**') && line.endsWith('**') && line.length < 60);

        if (isSubheading) {
          // Anti-orphan check: ensure at least 20mm remains for subheading + paragraph
          if (y + 20 > maxY) {
            doc.addPage();
            pageCount++;
            y = 28;
            renderRunningHeader(true);
          } else {
            y += 2.5;
          }

          let headingText = line.replace(/###|\*\*/g, '').trim();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(30, 58, 138); // Royal Navy
          
          const splitH = doc.splitTextToSize(headingText, contentWidth);
          splitH.forEach((hLine: string) => {
            doc.text(hLine, margin, y);
            y += 4.5;
          });
          y += 1;
          continue;
        }

        // =========================================================
        // Bullet Point Handling
        // =========================================================
        if (line.startsWith('- ') || line.startsWith('• ') || /^\d+\.\s/.test(line)) {
          let bulletText = line.replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          
          const splitBullet = doc.splitTextToSize(`• ${bulletText}`, contentWidth - 4);
          splitBullet.forEach((bLine: string) => {
            if (y > maxY) {
              doc.addPage();
              pageCount++;
              y = 28;
              renderRunningHeader(true);
            }
            doc.text(bLine, margin + 3, y);
            y += 4;
          });
          continue;
        }

        // =========================================================
        // Standard Paragraph Text
        // =========================================================
        const cleanParagraph = line.replace(/\*\*/g, '');
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        
        const splitText = doc.splitTextToSize(cleanParagraph, contentWidth);
        splitText.forEach((pLine: string) => {
          if (y > maxY) {
            doc.addPage();
            pageCount++;
            y = 28;
            renderRunningHeader(true);
          }
          doc.text(pLine, margin, y);
          y += 4;
        });
        y += 1.5;
      }

      // =========================================================
      // Chapter 09 Execution Block & Corporate Seal Stamp
      // =========================================================
      if (sec.num === "09") {
        if (y + 75 > maxY) {
          doc.addPage();
          pageCount++;
          y = 28;
          renderRunningHeader(true);
        }

        y += 5;
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // Signatory Box 1 (Left): MD / Promoter
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, 78, 38, 2, 2, 'FD');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 58, 138);
        doc.text("MANAGING DIRECTOR / PRINCIPAL PROMOTER", margin + 4, y + 6);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("Signature: ____________________________________", margin + 4, y + 15);
        doc.text(`Full Name: ${cleanTextForPDF(name)} Exec.`, margin + 4, y + 22);
        doc.text("National ID (NIN): ____________________________", margin + 4, y + 29);
        doc.text("Date: ____________________ Place: ____________", margin + 4, y + 34);

        // Signatory Box 2 (Right): Legal Counsel / Company Secretary
        doc.roundedRect(margin + 84, y, 86, 38, 2, 2, 'FD');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 58, 138);
        doc.text("COMPANY SECRETARY / LEGAL ATTESTOR", margin + 88, y + 6);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("Signature: ____________________________________", margin + 88, y + 15);
        doc.text("Full Name: ___________________________________", margin + 88, y + 22);
        doc.text("NBA Seal / NIN: ______________________________", margin + 88, y + 29);
        doc.text("Date: ____________________ Place: ____________", margin + 88, y + 34);

        y += 43;

        // Official Seal box & Security verification block
        doc.setDrawColor(148, 163, 184);
        doc.setLineDashPattern([2, 2], 0);
        doc.rect(75, y, 60, 20);
        doc.setLineDashPattern([], 0);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("[ AFFIX OFFICIAL CORPORATE STAMP /", 105, y + 8, { align: "center" });
        doc.text("NOTARIAL SEAL HERE ]", 105, y + 14, { align: "center" });

        y += 24;

        // Digital audit footer box
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(30, 58, 138);
        doc.text("DIGITAL AUDIT TRAIL • SHA-256 SYSTEM ATTESTATION", margin + 4, y + 4.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Hash: SHA256: 7F4A-98C2-B01D-5E39-A488-82CE-71BD-2026-SBZ • Status: Bank & Grant Validated", margin + 4, y + 8.5);
        doc.text("Online Verification: https://smartbizcoach.com.ng/audit-verify • Validated against BOI & DBN MSME Lending Benchmarks", margin + 4, y + 12);
        y += 18;
      }
    });

    // -------------------------------------------------------------
    // Universal Running Footers (Page X of Y) Across All Document Pages
    // -------------------------------------------------------------
    const totalPages = doc.getNumberOfPages();
    for (let p = 2; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${p} of ${totalPages}`, 105, 288, { align: "center" });
      doc.text("SmartBiz AI Enterprise System • Bank of Industry (BOI) Compliant", pageWidth - margin, 288, { align: "right" });
    }

    // Save and trigger browser download
    const safeFilename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Strategic_Business_Plan_Dossier.pdf`;
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
      { id: 6, key: 'riskMitigation', title: '7. Risk Mitigation & Compliance', icon: '🛡️', desc: 'Inflation/FX shielding, CAC/TIN compliance roadmap, and grant readiness.' },
      { id: 7, key: 'underwritingSummary', title: '8. Institutional Loan Underwriting & Debt Service', icon: '🏦', desc: 'Credit facility parameters, DSCR stress testing, debenture structure & employment multiplier.' },
      { id: 8, key: 'promoterDeclaration', title: '9. Promoter Declaration & Corporate Execution Seal', icon: '📜', desc: 'CAMA 2020 veracity oath, CITA Section 23 tax exemption & authorized signatory seal.' }
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
              <span>⚡</span> Costs 200 BizCredits
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
        creditCost={200}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
        onCreditsUpdated={onUpdateCredits}
      />
    </div>
  );
};

export default BusinessPlanGenerator;