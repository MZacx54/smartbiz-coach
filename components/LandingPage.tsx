import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';
import { PWAInstallButton } from './PWAInstallPrompt';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// --- Animated Counter Component ---
const AnimatedCounter: React.FC<{ target: string; duration?: number }> = ({ target, duration = 2 }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    const [display, setDisplay] = useState('0');

    useEffect(() => {
        if (!isInView) return;
        const numeric = parseFloat(target.replace(/[^0-9.]/g, ''));
        const suffix = target.replace(/[0-9.,]/g, '');
        if (isNaN(numeric)) { setDisplay(target); return; }
        const steps = 60;
        const increment = numeric / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= numeric) { setDisplay(target); clearInterval(timer); return; }
            const formatted = numeric > 999
                ? Math.floor(current).toLocaleString('en-NG')
                : current.toFixed(current < 10 ? 1 : 0);
            setDisplay(formatted + suffix);
        }, (duration * 1000) / steps);
        return () => clearInterval(timer);
    }, [isInView, target, duration]);

    return <span ref={ref}>{display}</span>;
};

// --- Main LandingPage Component ---
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeFeatureTab, setActiveFeatureTab] = useState(0);
    const [roiRevenue, setRoiRevenue] = useState(500000);
    const [roiHours, setRoiHours] = useState(10);

    // Partnership Form States
    const [partnerSubmitted, setPartnerSubmitted] = useState(false);
    const [partnerLoading, setPartnerLoading] = useState(false);
    const [partnerName, setPartnerName] = useState('');
    const [partnerEmail, setPartnerEmail] = useState('');
    const [partnerOrg, setPartnerOrg] = useState('');
    const [partnerType, setPartnerType] = useState('Equity Investment');
    const [partnerMessage, setPartnerMessage] = useState('');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handlePartnerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPartnerLoading(true);
        try {
            await api.post('/users/partnership-inquiry/', {
                name: partnerName,
                email: partnerEmail,
                organization: partnerOrg,
                partnership_type: partnerType,
                message: partnerMessage,
                source: 'Landing Page Institutional Desk'
            });
            toast.success("Partnership proposal recorded in Executive Portal!");
        } catch (err) {
            console.warn("Backend partnership logging note:", err);
            // Fallback: save to localStorage so no data is ever lost
            try {
                const savedInquiries = JSON.parse(localStorage.getItem('sb_partner_inquiries') || '[]');
                savedInquiries.push({
                    name: partnerName,
                    email: partnerEmail,
                    organization: partnerOrg,
                    partnership_type: partnerType,
                    message: partnerMessage,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('sb_partner_inquiries', JSON.stringify(savedInquiries));
            } catch (e) {
                // ignore
            }
        } finally {
            setPartnerLoading(false);
            setPartnerSubmitted(true);
        }
    };

    // ROI Calculator derived values
    const timeSaved = Math.round(roiHours * 0.7 * 4);
    const debtRecovered = Math.round(roiRevenue * 0.08);
    const grantEligibility = roiRevenue < 200000 ? 'TEF, SMEDAN Micro' : roiRevenue < 1000000 ? 'BOI MSME, DBN, TEF' : 'BOI Growth, DBN, Commercial Syndicate';

    // ── 16 COMPREHENSIVE PLATFORM CAPABILITIES (All 4 Pillars) ──
    const allFeatures = [
        // Pillar 1: Daily Retail & Operations
        { icon: '📱', title: 'Phone Camera Barcode & QR Scanner', desc: 'Scan product barcodes and QR codes instantly using your phone camera with zero expensive POS hardware and instant audio beep feedback.', color: 'from-emerald-600 to-teal-700', tag: 'New POS', pillar: 'Operations' },
        { icon: '⚡', title: '5-Second POS Day-Book', desc: 'Rapid counter checkout for Cash, POS card, Bank Transfer, and Customer Debt with instant stock deduction and offline queue sync.', color: 'from-emerald-600 to-teal-700', tag: 'Core Free', pillar: 'Operations' },
        { icon: '🛡️', title: 'Anti-Theft Apprentice Lock', desc: 'Lock checkout with a 4-digit supervisor PIN. Attendants log daily sales without backdating, modifying records, or accessing profit margins.', color: 'from-blue-600 to-indigo-700', tag: 'Anti-Theft', pillar: 'Operations' },
        { icon: '📶', title: 'Open Market Offline PWA Mode', desc: 'Sell seamlessly in Alaba, Balogun, and Computer Village even with 0% data or dead network. Syncs automatically when back online.', color: 'from-cyan-600 to-blue-700', tag: 'Offline First', pillar: 'Operations' },
        { icon: '⛽', title: 'Petty Cash & Fuel Logger', desc: 'Track daily generator fueling, dispatch waybills, and store supplies. Real-time net daily profit margin balances.', color: 'from-amber-500 to-orange-600', tag: 'Expense Tracker', pillar: 'Operations' },
        { icon: '🔒', title: 'Fake Transfer Fraud Shield', desc: 'Step-by-step verification checklist protecting shop owners from counterfeit bank SMS alerts via bank app push confirmations.', color: 'from-rose-600 to-red-700', tag: 'Security', pillar: 'Operations' },

        // Pillar 2: AI Creative & Commercial Studio
        { icon: '📸', title: 'Snap-to-Studio 2.0', desc: 'Snap raw items on a bedsheet or shop counter; AI transforms them into 16 photorealistic luxury sets (Marble, Sunlight, Raffia, Cafe Table, etc.).', color: 'from-violet-600 to-purple-700', tag: 'Top Feature', pillar: 'AI Studio' },
        { icon: '✨', title: 'AI Brand Builder', desc: 'Generate high-resolution logos, brand colors, taglines, and a complete visual identity tailored to Nigerian buyers in seconds.', color: 'from-pink-500 to-rose-600', pillar: 'AI Studio' },
        { icon: '✍️', title: 'Content Studio & Broadcasts', desc: 'Create viral WhatsApp Status copy, Instagram reels copy, promotional flyers, and sales scripts tuned to Naija pop culture.', color: 'from-orange-500 to-amber-600', pillar: 'AI Studio' },
        { icon: '🎥', title: 'Product Video Suite', desc: 'Record 15-30s video demos with an in-app scrolling teleprompter script overlay and 1-click video reels export.', color: 'from-pink-600 to-rose-600', pillar: 'AI Studio' },

        // Pillar 3: Commerce & Debt Recovery
        { icon: '🏪', title: 'Central MSME Market Square', desc: 'Showcase products across 36 Nigerian states with verified CAC & SMEDAN trust badges, 1-click WhatsApp Status virality, and direct buyer orders.', color: 'from-green-600 to-emerald-700', tag: 'Nationwide Trade', pillar: 'Commerce' },
        { icon: '📒', title: 'Gbege Debt Recovery', desc: 'Dual ledger tracking "Who Dey Owe Me" and "Who I Owe". Automated WhatsApp reminders with embedded Paystack payment links.', color: 'from-red-500 to-orange-600', tag: 'Cashflow', pillar: 'Commerce' },
        { icon: '🧾', title: '1-Tap WhatsApp Invoicing', desc: 'Dispatch instant itemized receipts and PDF invoices to customer WhatsApp with embedded Paystack links and real-time payment webhook alerts.', color: 'from-amber-500 to-yellow-600', tag: 'Instant Receipts', pillar: 'Commerce' },
        { icon: '🤝', title: 'WhatsApp Negotiation Sandbox', desc: 'Practice closing tough deals with interactive AI customer roleplay across Naija Pidgin, Corporate, and FOMO tones.', color: 'from-amber-500 to-orange-600', pillar: 'Commerce' },

        // Pillar 4: Governance, Tax & Capital
        { icon: '⚖️', title: 'Section 23 CITA Tax Shield', desc: 'Official legal tax exemption memo citing the Companies Income Tax Act (0% tax rate for MSMEs under ₦25M turnover).', color: 'from-emerald-700 to-teal-800', tag: 'Legal Shield', pillar: 'Capital & Law' },
        { icon: '🏛️', title: 'Accredited CAC Filing Desk', desc: 'Fast-track Done-For-You CAC registration: Business Name (₦27,500), Ltd Co (₦68,000), NGO/Trustee, and SCUML in 3-7 days.', color: 'from-emerald-600 to-teal-700', tag: 'Accredited', pillar: 'Capital & Law' },
        { icon: '💰', title: 'Grant & Funding Matcher', desc: 'Automatically scan and match your business with available grants, BOI loans, and international donor programs worth ₦Billions.', color: 'from-emerald-500 to-teal-600', tag: '₦Billions', pillar: 'Capital & Law' },
        { icon: '📄', title: 'BOI 5-Year Business Plans', desc: 'Generate bank-grade, investor-ready business plans with 5-year cashflow projections, break-even analysis, and official PDF export.', color: 'from-blue-500 to-indigo-600', pillar: 'Capital & Law' },

        // Pillar 5: Machine Learning & Institutional Data Science
        { icon: '🧠', title: '300-850 MSME Credit Underwriting', desc: 'Scikit-Learn algorithmic credit risk scorer evaluating real ledger volume, debt recovery speed, and compliance for BOI & bank loans.', color: 'from-indigo-600 to-purple-700', tag: 'Bankable ML', pillar: 'Data Science' },
        { icon: '📈', title: 'Stockout Demand Forecaster', desc: 'Ridge regression time-series model predicting exact stockout dates and reorder quantities before weekend sales rushes.', color: 'from-blue-600 to-cyan-600', tag: 'Predictive', pillar: 'Data Science' },
        { icon: '🛡️', title: 'Till Fraud Isolation Forest', desc: 'Unsupervised ML anomaly detection scanner detecting petty cash leaks, float manipulation, and cashier till irregularities.', color: 'from-rose-600 to-pink-700', tag: 'Anti-Theft AI', pillar: 'Data Science' },
        { icon: '🎙️', title: 'Voice Note POS Auto-Ingestion', desc: 'Speak for 5 seconds on WhatsApp or mic: Multimodal AI transcribes Pidgin/English and logs sales & petty cash without typing.', color: 'from-pink-600 to-rose-600', tag: 'Multimodal AI', pillar: 'Data Science' },
        { icon: '🧾', title: 'Paper Receipt & Waybill OCR', desc: 'Snap photo of handwritten market receipts or wholesaler waybills; Vision AI extracts line items and logs restock expenses in 1 tap.', color: 'from-teal-600 to-emerald-700', tag: 'Vision AI', pillar: 'Data Science' },
        { icon: '🎯', title: 'K-Means Customer Segmentation', desc: 'Algorithmic Recency, Frequency, and Monetary (RFM) clustering to target VIPs, at-risk buyers, and regulars on WhatsApp.', color: 'from-purple-600 to-indigo-700', tag: 'RFM Clusters', pillar: 'Data Science' },
        { icon: '🏷️', title: 'OLS Price Elasticity Optimizer', desc: 'Econometric demand elasticity model identifying inelastic goods where you can safely increase markup without losing volume.', color: 'from-amber-600 to-orange-600', tag: 'Margin Booster', pillar: 'Data Science' },
        { icon: '📷', title: 'Visual Photo Search & Cart Copilot', desc: 'Search marketplace inventory by uploading photos, and recover 25%+ of abandoned buyers via AI WhatsApp discount sweeteners.', color: 'from-cyan-600 to-blue-700', tag: 'Commerce AI', pillar: 'Data Science' },
    ];

    // ── THE 6 MASTER FEATURE TABS ──
    const featureTabs = [
        {
            label: '⚡ Daily POS & Barcode Scanner',
            headline: 'Phone Camera Barcode POS, Apprentice Lock & Offline Resilience',
            subheadline: 'Zero Hardware Cost • The Operational Heartbeat of Nigerian Retail',
            body: 'Run your retail store or supermarket directly from your phone. Scan barcodes with your smartphone camera with instant beep audio feedback, record sales in under 5 seconds across Cash, Card, and Bank Transfer, and lock the register with a 4-digit apprentice PIN to prevent staff theft. Works 100% offline in busy open markets.',
            bullets: [
                '📱 Phone Camera Barcode & QR Scanner with instant audio beep confirmation',
                '⚡ 5-second multi-tender checkout: Cash, POS Terminal, Bank Transfer & Debt',
                '🛡️ Anti-Theft Apprentice Shift Mode with 4-digit supervisor PIN lock',
                '📶 100% Open Market Offline PWA Mode — records sales without network & auto-syncs',
                '⛽ Petty Cash & Generator Fuel expense tracker for true daily net profit',
                '📲 1-click End-of-Day financial reconciliation sent directly to owner WhatsApp',
            ],
            color: 'from-emerald-600 to-teal-700',
            mockup: 'pos',
        },
        {
            label: '📸 Snap-to-Studio 2.0',
            headline: 'Snap on a Bedsheet or Shop Counter ➔ Transform into 4K Luxury Photos',
            subheadline: '16 Photorealistic Commercial Studio Backdrops in Seconds',
            body: 'Stop paying ₦50,000+ for commercial photographers. Snap raw photos of your shoes, bags, cosmetics, or packaged food directly on your bed, shop counter, or floor. Our computer-vision engine isolates the product, renders realistic contact shadows and glossy surface reflections, and composites it into 16 luxury commercial scenes with 1-click WhatsApp Status copy.',
            bullets: [
                '🏛️ 16 Photorealistic Sets: Luxury Marble & Fluted Wood, Azure Sunlight, Botanical Leaves, Warm Oak, African Raffia & 3D Podiums',
                '✨ Automatic ambient contact shadows, ground reflections & edge isolation',
                '🏷️ 4 Promotional overlay badges: Luxury Gold, Midnight Noir, Neon Viral & Emerald Green',
                '📱 Interactive Before/After split comparison slider',
                '💬 Auto-generated WhatsApp promotional sales copy with direct broadcast link',
                '📦 1-click Save to Inventory and instant publish to Central Market Square',
            ],
            color: 'from-violet-600 to-purple-700',
            mockup: 'studio',
        },
        {
            label: '📒 Gbege Debt & WhatsApp Invoices',
            headline: 'Stop Losing Working Capital: Recover Customer Debts & Send 1-Tap Invoices',
            subheadline: 'Dual Receivables Ledger with Automated WhatsApp Reminders & Paystack',
            body: 'Customer debt is the #1 killer of Nigerian small businesses. Gbege Book tracks exactly "Who Dey Owe Me" and "Who I Owe". Send automated, respectful-to-firm WhatsApp payment reminders and 1-tap itemized receipts featuring direct Paystack debit card and transfer links so debtors settle right on their phones.',
            bullets: [
                '📒 Dual Ledger: Track customer debts ("Who Dey Owe Me") & supplier payables ("Who I Owe")',
                '🧾 1-Tap WhatsApp Itemized Invoices & official branded PDF receipts',
                '📢 3-Tier WhatsApp Escalation: Gentle Courtesy ➔ Due Notice ➔ Formal Legal Warning',
                '💳 Embedded Paystack Payment Links in reminders for instant phone payments',
                '⚡ Real-time webhook payment confirmation & automatic debt reconciliation',
                '✅ Over ₦50,000,000+ in overdue merchant debt recovered to date',
            ],
            color: 'from-red-600 to-rose-700',
            mockup: 'debt',
        },
        {
            label: '🏪 Central MSME Market Square',
            headline: 'Showcase Your Products Nationwide Across 36 States with Verified Badges',
            subheadline: 'Physical Goods, Services, Commercial Real Estate & Wholesale Hub',
            body: 'The central marketplace for Nigerian MSMEs. Showcase your products and services to buyers nationwide across all 36 states and Abuja. Build instant buyer trust with CAC and SMEDAN verification badges, share listings directly to WhatsApp Status with 1 click, and boost featured items for maximum sales.',
            bullets: [
                '🇳🇬 Nationwide trade directory spanning all 36 Nigerian states & FCT Abuja',
                '🛡️ Official CAC & SMEDAN Verified Merchant Trust Badges to stop buyer doubt',
                '📲 1-Click WhatsApp Status showcase sharing with pre-formatted viral cards',
                '💬 Direct WhatsApp buyer routing with zero middlemen commissions or platform cuts',
                '🛍️ 4 Core Trade Pillars: Physical Goods, Professional Services, Commercial Real Estate & Wholesale',
                '🚀 7-Day Priority Showcase Boosts powered by SmartBiz BizCredits',
            ],
            color: 'from-blue-600 to-indigo-700',
            mockup: 'market',
        },
        {
            label: '⚖️ Tax Shield & CAC Desk',
            headline: 'Section 23 CITA 0% Tax Exemption Memo & Accredited CAC Filing',
            subheadline: 'Protect Your Business from Illegal Harassment & Formalize for Growth',
            body: 'Stop getting harassed by rogue local tax agents. Under Section 23 and 40 of the Companies Income Tax Act (CITA), small companies with annual turnover under ₦25,000,000 are legally exempt from company income tax (0% rate). Download your customized formal legal Tax Exemption Shield Memo and access our accredited CAC desk for done-for-you registrations.',
            bullets: [
                '🛡️ Section 23/40 CITA Official Legal Memo (0% Company Tax under ₦25M turnover)',
                '🏛️ Accredited CAC Desk: Business Name (₦27,500), Limited Co (₦68,000), NGO/Trustee',
                '📋 SCUML Anti-Money Laundering and NAFDAC compliance checklists',
                '📑 Annual returns compliance calendar and statutory filing reminders',
                '⚖️ 100% Free legal exemption memo generator for all registered merchants',
            ],
            color: 'from-emerald-700 to-teal-800',
            mockup: 'tax',
        },
        {
            label: '💰 Grants & BOI Business Plans',
            headline: 'Access ₦Billions in Grants & Generate 5-Year Bankable Proposals',
            subheadline: 'Built for BOI, SMEDAN, TEF, DBN, and Bank Loan Approvals',
            body: 'SmartBiz Coach scans and matches your business against active government and international funding programs. Generate 5-year bank-grade business plans complete with Executive Summary, Market Analysis, 5-Year Cashflow Projections, Break-Even calculations, and CapEx breakdown formatted for official PDF download.',
            bullets: [
                '💰 Live matching for SMEDAN, BOI MSME Fund, Presidential Palliative, and TEF Grants',
                '📄 5-Year Bank-Grade Business Plan Generator accepted by commercial banks',
                '📊 Comprehensive financial modeling: P&L, 5-year cashflow & break-even analysis',
                '📥 Instant official PDF export formatted to institutional lender standards',
                '🤝 Direct NGO and development agency cohort onboarding and impact tracking',
            ],
            color: 'from-amber-600 to-yellow-700',
            mockup: 'grants',
        },
        {
            label: '🧠 ML Data Science & Credit Underwriting',
            headline: 'FICO 300-850 Credit Risk Engine, Stockout Forecasting & Till Audit AI',
            subheadline: 'Zero-Cost Scikit-Learn Machine Learning • Certified Bankable Dossier PDF',
            body: 'Transform informal paper trade into institutional banking power. Our in-house machine learning engine trains on your live transaction velocity to compute your 300–850 Credit Health Score, predict exact stockout dates with Ridge time-series regression, detect cashier till theft with Isolation Forests, and export certified multi-page Underwriting Dossiers with tamper-evident SHA-256 digital verification hashes.',
            bullets: [
                '🏛️ FICO-style 300–850 Credit Risk Score accepted for BOI, SMEDAN & commercial bank loans',
                '📈 Ridge Regression Time-Series Demand Forecasting with exact stockout runway dates',
                '🛡️ Isolation Forest Unsupervised Till Anomaly Detection to catch apprentice cash theft',
                '🎯 K-Means Customer RFM Segmentation to trigger targeted WhatsApp re-engagement',
                '🏷️ OLS Price Elasticity of Demand analyzer to identify products where markups can safely rise',
                '📄 1-Click Certified Institutional Underwriting Dossier (PDF) with SHA-256 cryptographic verification',
            ],
            color: 'from-indigo-700 to-purple-800',
            mockup: 'datascience',
        },
    ];

    // ── 7-STEP DAILY OPERATING TIMELINE ──
    const ecosystemSteps = [
        { icon: '📱', label: 'Morning POS & Scan', desc: 'Phone camera barcode scan & PIN lock', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
        { icon: '📸', label: 'Snap-to-Studio 2.0', desc: 'Raw bedsheet to 4K luxury scenes', color: 'bg-violet-100 border-violet-300 text-violet-700' },
        { icon: '🏪', label: 'Market Square Live', desc: '36 States showcase & CAC badge', color: 'bg-blue-100 border-blue-300 text-blue-700' },
        { icon: '📒', label: 'Recover Bad Debt', desc: 'Gbege Book WhatsApp auto-nudges', color: 'bg-red-100 border-red-300 text-red-700' },
        { icon: '⛽', label: 'Fuel & Expenses', desc: 'Log generator fuel & petty cash', color: 'bg-amber-100 border-amber-300 text-amber-700' },
        { icon: '📊', label: 'Evening Close', desc: '1-click WhatsApp daily profit memo', color: 'bg-teal-100 border-teal-300 text-teal-700' },
        { icon: '🧠', label: 'ML Underwrite & Audit', desc: 'FICO 300–850 score & till theft defense', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
    ];

    const testimonials = [
        { name: 'Chidinma Obi', role: 'Fashion Designer & Boutique, Lagos', avatar: 'CO', color: 'bg-pink-500', text: 'The Snap-to-Studio transformed photos I took on my bed into luxury marble catalog shots! My WhatsApp Status orders tripled within a week.', stars: 5 },
        { name: 'Chief Emeka Okonkwo', role: 'Building Materials Wholesaler, Onitsha', avatar: 'EO', color: 'bg-green-600', text: 'Apprentice Shift Mode solved attendant theft in my 3 stores. They cannot delete or change prices without my 4-digit PIN. Every kobo is accounted for.', stars: 5 },
        { name: 'Fatima Al-Hassan', role: 'Agro-Commodity Merchant, Kano', avatar: 'FA', color: 'bg-purple-500', text: 'The Gbege Book recovered ₦380,000 in overdue customer debt in just 10 days using the automated polite WhatsApp reminders. It is the best tool on the market.', stars: 5 },
        { name: 'Tunde Adeyemi', role: 'Tech & CAC Consultant, Abuja', avatar: 'TA', color: 'bg-blue-500', text: 'The Section 23 CITA Tax Exemption memo saved my client from paying illegal local council taxes. They confirmed 0% tax because their turnover is under ₦25M.', stars: 5 },
        { name: 'Ngozi Williams', role: 'Caterer & Events Manager, Port Harcourt', avatar: 'NW', color: 'bg-amber-500', text: 'The 5-Second POS is lightning fast. I record cash, transfers, and fuel expenses for my generator in real time, and get my daily profit on WhatsApp every night.', stars: 5 },
        { name: 'Alhaji Bello', role: 'Poultry & Feed Producer, Kaduna', avatar: 'AB', color: 'bg-teal-600', text: 'I matched with a ₦4.5M BOI agro loan and generated the complete 5-year business plan PDF on SmartBiz Coach. The loan officer accepted it without revisions.', stars: 5 },
    ];

    const packs = [
        { name: 'Micro Pack', price: '₦500', credits: '40 Credits', tag: null, color: 'border-slate-200', btnColor: 'bg-slate-900 hover:bg-slate-700', popular: false, perks: ['40 BizCredits (Never Expire)', '8x Snap-to-Studio 4K Shoots', 'Debt Recovery Workflows', 'Content & Script Posts', '1-Tap Paystack Instant Checkout', 'Standard Merchant Support'] },
        { name: 'Starter Pack', price: '₦1,500', credits: '150 Credits', tag: null, color: 'border-blue-500', btnColor: 'bg-blue-600 hover:bg-blue-500', popular: false, perks: ['150 BizCredits', '30x Snap-to-Studio 4K Shoots', '1x AI Brand Identity Kit', '1x Central Market Square 7-Day Boost', 'Pricing & Margin Audits', 'WhatsApp & Priority Email Desk'] },
        { name: 'Grower Pack', price: '₦3,500', credits: '400 Credits', tag: '🔥 Most Popular', color: 'border-green-500', btnColor: 'bg-green-600 hover:bg-green-500', popular: true, perks: ['400 BizCredits', '1x BOI Bankable Business Plan (PDF)', '80x Snap-to-Studio Shoots', '4x Market Square 7-Day Boosts', 'Full AI Creative Suite', 'Priority Merchant Support'] },
        { name: 'Vendor Pro Pack', price: '₦7,500', credits: '1,000 Credits', tag: '💎 High Velocity', color: 'border-purple-500', btnColor: 'bg-purple-700 hover:bg-purple-600', popular: false, perks: ['1,000 BizCredits', '2x Bank-Grade Business Plans', '200x Snap-to-Studio Shoots', '10x Market Square Priority Boosts', 'CAC & Grant Application Support', 'VIP Concierge Desk'] },
        { name: 'Mogul Pack', price: '₦15,000', credits: '2,500 Credits', tag: '👑 Enterprise Dominance', color: 'border-amber-500', btnColor: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500', popular: false, perks: ['2,500 BizCredits (Best Rate: ₦6/credit)', '5x Bank-Grade Business Plans', '500x Snap-to-Studio 4K Shoots', '25x Market Square Priority Boosts', 'Multi-Branch & Agency Ready', 'Dedicated 24/7 Account Director'] },
    ];

    // ── THE MSME ZERO-SURPRISE FAIR-USE GUARANTEE MATRIX ──
    const fairUseMatrix = [
        { feature: 'Phone Camera Barcode & QR Code POS Scanner', cost: '100% FREE FOREVER (0 Credits)', type: 'Smart Retail', icon: '📱' },
        { feature: 'Daily Day-Book & 5-Second POS Checkout', cost: '100% FREE FOREVER (0 Credits)', type: 'Core Utility', icon: '⚡' },
        { feature: 'Anti-Theft Apprentice Shift Lock (4-Digit PIN)', cost: '100% FREE FOREVER (0 Credits)', type: 'Shop Security', icon: '🛡️' },
        { feature: 'Open Market Offline PWA Mode (0% Network)', cost: '100% FREE FOREVER (0 Credits)', type: 'Offline Resilience', icon: '📶' },
        { feature: 'Petty Cash & Generator Fuel Expense Tracker', cost: '100% FREE FOREVER (0 Credits)', type: 'Expense Logger', icon: '⛽' },
        { feature: 'Payment Fraud Shield (Fake Transfer Checklist)', cost: '100% FREE FOREVER (0 Credits)', type: 'Fraud Defense', icon: '🔒' },
        { feature: 'Gbege Book Debt Ledger & Auto WhatsApp Nudges', cost: '100% FREE FOREVER (0 Credits)', type: 'Cashflow Protection', icon: '📒' },
        { feature: '1-Tap WhatsApp Invoicing & Receipts (PDF)', cost: '100% FREE FOREVER (0 Credits)', type: 'Instant Billing', icon: '🧾' },
        { feature: 'Central MSME Market Square (36 States Trade Hub)', cost: '100% FREE FOREVER (0 Credits)', type: 'Nationwide Trade', icon: '🏪' },
        { feature: 'Section 23 CITA 0% Tax Exemption Memo', cost: '100% FREE FOREVER (0 Credits)', type: 'Legal Shield', icon: '⚖️' },
        { feature: 'FICO 300-850 Credit Risk & Bankable PDF Dossier', cost: '100% FREE FOREVER (0 Credits)', type: 'Data Science & Credit', icon: '🧠' },
        { feature: 'Ridge Regression Stockout Velocity & Days Left', cost: '100% FREE FOREVER (0 Credits)', type: 'Predictive Inventory', icon: '📈' },
        { feature: 'Till Fraud Isolation Forest (Cashier Anomaly Audit)', cost: '100% FREE FOREVER (0 Credits)', type: 'Anti-Theft AI', icon: '🛡️' },
        { feature: 'Voice Note POS Ingestion & Paper Receipt OCR', cost: '2 BizCredits per audio/photo', type: 'Multimodal AI', icon: '🎙️' },
        { feature: 'Market Square 7-Day Priority Showcase Boost', cost: '50 BizCredits', type: 'Merchant Growth', icon: '🚀' },
        { feature: 'Snap-to-Studio 2.0 (4K Commercial Photos)', cost: '5 BizCredits per set', type: 'Advanced AI Compute', icon: '📸' },
        { feature: 'BOI-Compliant 5-Year Business Plan (PDF)', cost: '200 BizCredits', type: 'Financial Engine', icon: '📄' },
    ];

    const faqs = [
        { q: 'Are the Daily POS, Phone Barcode Scanner, and Day-Book really 100% free forever?', a: 'YES. We believe no Nigerian entrepreneur should ever be locked out of their daily sales records or bookkeeping. The Daily 5-Second POS, Phone Camera Barcode/QR Scanner (zero hardware needed), Apprentice Shift Lock, Petty Cash & Fuel Tracker, Gbege Debt Book, Central Market Square basic listings, 1-Tap WhatsApp Invoicing, Section 23 CITA Tax Exemption Memo, and Machine Learning Credit Scoring require 0 credits and are 100% free for life.' },
        { q: 'How does the FICO 300–850 Credit Risk Engine and Machine Learning Hub work without extra fees?', a: 'Traditional commercial banks demand landed property C-of-O or heavy collateral that 95% of small business owners do not possess. SmartBiz Coach includes an in-house Scikit-Learn data science engine running locally on your transactional records. It computes your 300–850 Credit Score based on live turnover consistency, customer debt recovery velocity, and inventory turnover. It also uses Ridge regression to predict stockout dates and Isolation Forest to audit tills for theft. Because this runs on serverless mathematical algorithms rather than expensive third-party APIs, it is completely free for business owners to generate institutional, bankable PDF Underwriting Dossiers with SHA-256 verification.' },
        { q: 'How does the Phone Camera Barcode & QR Scanner work?', a: 'You do not need to buy an expensive Bluetooth or USB barcode reader. Simply open POS checkout on your smartphone, tap "Scan Barcode", point your camera at any item barcode or QR code. The scanner reads it instantly with audio beep feedback, adjusts inventory, and adds the item to the active bill in milliseconds.' },
        { q: 'What is the Central MSME Market Square and how do I sell nationwide?', a: 'Central Market Square is our national trade directory connecting small business owners across all 36 Nigerian states and Abuja. You can showcase physical goods, professional services, commercial real estate, or wholesale offers with verified CAC and SMEDAN badges. Buyers connect directly with you on WhatsApp with zero middlemen taking cuts. You can also feature your listings with high-visibility credit boosts.' },
        { q: 'How does the Anti-Theft Apprentice Shift Mode protect my shop?', a: 'When you activate Apprentice Mode, the cashier/attendant screen is locked behind a 4-digit supervisor PIN. Attendants can rapidly record sales, but they CANNOT edit prices, delete previous sales, backdate transactions, or see your total profit margins. At the end of the shift, the system generates a reconciliation report comparing physical cash to recorded sales.' },
        { q: 'Does the POS Day-Book work when there is no internet / network is down?', a: 'Yes! SmartBiz Coach features an Open Market Offline-First engine specifically engineered for crowded hubs like Alaba International, Balogun, and Computer Village. If your data runs out or cell towers disconnect, you can record sales, scan barcodes, and issue offline receipts. As soon as you are reconnected, all data syncs automatically to the cloud.' },
        { q: 'How does Snap-to-Studio 2.0 work on photos taken on a bedsheet?', a: 'You do not need an expensive camera or backdrop. Simply snap your product on your bedspread, shop counter, or tile floor. Our vision AI removes the background, generates realistic ambient contact shadows and reflections, and composites the item into 16 photorealistic commercial studio environments like Luxury Marble, Sunlight & Shadows, African Raffia, or Warm Oak Cafe Tables.' },
        { q: 'How does the Section 23 CITA Tax Exemption Shield protect me?', a: 'Under the Nigerian Companies Income Tax Act (CITA) Sections 23 and 40, small businesses and companies with an annual gross turnover below ₦25,000,000 are legally subject to a 0% corporate income tax rate. SmartBiz Coach generates a customized, formal legal memo citing these exact statutory provisions to protect your business against unlawful harassment by local tax task forces.' },
        { q: 'How do customers pay me through Gbege Book debt reminders and WhatsApp invoices?', a: 'When you send an automated polite WhatsApp reminder or 1-tap invoice, it automatically includes an encrypted Paystack payment link. Your customer can tap the link and pay instantly using their debit card, bank transfer, or USSD. Once paid, the debt or invoice is automatically marked as settled in your ledger with real-time webhook confirmation.' },
        { q: 'How do I get the 50 Free Welcome Credits and how do top-ups work?', a: 'Every new Nigerian entrepreneur receives 50 Free Welcome Credits upon creating an account. You can use them immediately to experience Snap-to-Studio 4K photo shoots, debt recovery escalations, voice note POS transcription, or marketplace boosts. When you need more compute, credit packs start at just ₦500 via Paystack. Credits never expire and there are zero recurring monthly subscription traps.' },
    ];

    const stats = [
        { value: '5-Sec', label: 'Counter POS Speed', icon: '⚡' },
        { value: '16 Sets', label: 'Commercial 4K Backdrops', icon: '📸' },
        { value: '100% Free', label: 'Core Tools Guarantee', icon: '🔒' },
        { value: 'Pilot Live', label: 'Early Access Cohort', icon: '🚀' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-green-200 overflow-x-hidden">
            <SEO
                title="SmartBiz Coach | #1 AI Operating System for Nigerian SMEs"
                description="The complete AI Business Operating System for Nigerian SMEs. 5-Sec POS Day-Book, Apprentice Anti-Theft Lock, Snap-to-Studio 2.0 (Bedsheet to 4K Studio), WhatsApp Debt Recovery (Gbege Book), Section 23 CITA Tax Shield, and BOI Grants."
                keywords="SmartBiz Coach, AI business operating system, Nigerian SME POS, AI Commercial Photo Studio 2.0, Gbege Book WhatsApp debt recovery, Section 23 CITA tax shield, BOI business plan generator, CAC checklist Nigeria, SME grants 2026"
                schema={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    'mainEntity': faqs.map(f => ({
                        '@type': 'Question',
                        'name': f.q,
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': f.a
                        }
                    }))
                }}
            />

            {/* ═══════════ NAVBAR ═══════════ */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center cursor-pointer gap-2" onClick={() => navigate('/')}>
                            <img src="/logo-horizontal.webp" alt="SmartBiz Coach" className="h-9 w-auto object-contain" width="180" height="36" decoding="async" onError={(e) => {
                                const target = e.currentTarget;
                                if (target.src.endsWith('.webp')) {
                                    target.src = '/logo-horizontal.png';
                                } else {
                                    target.style.display = 'none';
                                    const sibling = target.nextSibling as HTMLElement;
                                    if (sibling) sibling.style.display = 'flex';
                                }
                            }} />
                            <div className="hidden items-center gap-2">
                                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-black shadow">S</div>
                                <span className="font-black text-slate-900 text-lg">SmartBiz<span className="text-green-600">Coach</span></span>
                            </div>
                        </div>

                        <div className="hidden md:flex space-x-8 items-center">
                            {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#guarantee', 'Free Tools Guarantee'], ['#pricing', 'Pricing'], ['#faq', 'FAQ'], ['#partnership', 'Partners']].map(([href, label]) => (
                                <a key={href} href={href} className="text-slate-600 hover:text-green-600 font-semibold transition-colors text-sm">{label}</a>
                            ))}
                            <button onClick={() => navigate('/blog')} className="text-slate-600 hover:text-green-600 font-semibold transition-colors text-sm flex items-center gap-1">
                                Blog <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            </button>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <PWAInstallButton variant="nav" />
                            <button onClick={() => navigate('/login')} className="hidden md:block text-slate-600 hover:text-slate-900 font-semibold transition-colors text-sm px-4 py-2 rounded-lg hover:bg-slate-100">
                                Sign In
                            </button>
                            <button onClick={() => navigate('/register')} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-0.5 text-sm">
                                Start Free →
                            </button>
                            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                                <div className={`w-5 h-0.5 bg-slate-700 transition-all mb-1.5 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                                <div className={`w-5 h-0.5 bg-slate-700 transition-all mb-1.5 ${mobileMenuOpen ? 'opacity-0' : ''}`}></div>
                                <div className={`w-5 h-0.5 bg-slate-700 transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden bg-white border-t border-slate-100 shadow-xl px-4 py-4 space-y-1">
                            {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#guarantee', 'Free Tools Guarantee'], ['#pricing', 'Pricing'], ['#faq', 'FAQ'], ['#partnership', 'Partners']].map(([href, label]) => (
                                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-slate-700 font-semibold hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">{label}</a>
                            ))}
                            <button onClick={() => { setMobileMenuOpen(false); navigate('/blog'); }} className="block w-full text-left py-2.5 px-3 text-slate-700 font-semibold hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                                📰 Impact & Partnership Blog
                            </button>
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <div className="pb-1">
                                    <PWAInstallButton variant="banner" className="w-full justify-center" label="📲 Install SmartBiz App" />
                                </div>
                                <button onClick={() => navigate('/login')} className="w-full text-left py-2.5 px-3 text-slate-700 font-semibold hover:bg-slate-50 rounded-xl">Sign In</button>
                                <button onClick={() => navigate('/register')} className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-bold text-center">Get Started Free →</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ═══════════ HERO ═══════════ */}
            <section className="relative pt-28 pb-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-green-500/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -ml-40"></div>
                    <div className="absolute top-1/3 left-1/2 w-[600px] h-[300px] bg-teal-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[85vh] pb-0">
                        {/* Left: Copy */}
                        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="text-left pt-8">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-green-500/20 text-green-400 text-xs font-black tracking-widest border border-green-500/30 uppercase">
                                    🇳🇬 Built for Nigerian MSMEs
                                </span>
                                <span className="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold border border-emerald-800/60">
                                    🔒 100% Free Core Tools Guarantee
                                </span>
                                <span className="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                                    🎁 50 Free Welcome Credits
                                </span>
                            </motion.div>

                            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.08] mb-6">
                                The Complete AI
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400">
                                    Operating System
                                </span>
                                <br />
                                <span className="text-slate-300 text-2xl sm:text-4xl font-bold">for every Nigerian SME</span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed mb-6 font-normal">
                                Built to empower Nigerian MSMEs with essential digital infrastructure — phone camera barcode checkout, 16 photorealistic 4K AI studio backdrops, nationwide Central Market Square showcasing, automated WhatsApp debt recovery, and bankable enterprise tools.
                            </p>

                            {/* Structured Provision Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8 max-w-xl">
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-emerald-400 text-sm mt-0.5">⚡</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">POS & Camera Barcode Scanner</div>
                                        <div className="text-[11px] text-slate-400">5-second sales, phone camera barcode reader & 4-digit apprentice PIN.</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-purple-400 text-sm mt-0.5">📸</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">Snap-to-Studio 2.0</div>
                                        <div className="text-[11px] text-slate-400">Transform raw phone photos into 16 luxury commercial 4K scenes.</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-blue-400 text-sm mt-0.5">🏪</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">Central MSME Market Square</div>
                                        <div className="text-[11px] text-slate-400">Showcase products across 36 states with CAC badges & WhatsApp reach.</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-red-400 text-sm mt-0.5">📒</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">Debt Recovery & 1-Tap Invoices</div>
                                        <div className="text-[11px] text-slate-400">Automated WhatsApp payment nudges & instant Paystack receipts.</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-12">
                                <button onClick={() => navigate('/register')} className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-base font-black rounded-2xl shadow-2xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-1 transition-all">
                                    🚀 Start Free — Claim 50 Free Welcome Credits 🎁
                                </button>
                                <PWAInstallButton variant="hero" label="📲 Install Free App (Phone / PC)" />
                                <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white text-base font-bold rounded-2xl border border-white/20 hover:border-white/40 transition-all">
                                    See All Features ↓
                                </button>
                            </div>

                            {/* Social proof numbers */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {stats.map((s, i) => (
                                    <motion.div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-center"
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                                        <div className="text-xl mb-1">{s.icon}</div>
                                        <div className="text-xl font-extrabold text-white">
                                            <AnimatedCounter target={s.value} />
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{s.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Right: Hero Illustration + Floating Cards */}
                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative hidden lg:block">
                            <div className="relative">
                                <img
                                    src="/hero-illustration.webp"
                                    alt="Nigerian entrepreneur using SmartBiz Coach"
                                    className="w-full h-auto max-h-[600px] object-contain drop-shadow-2xl"
                                    fetchPriority="high"
                                    decoding="async"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (target.src.endsWith('.webp')) {
                                            target.src = '/hero-illustration.png';
                                        } else {
                                            target.parentElement!.innerHTML = `
                                            <div class="w-full aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 flex items-center justify-center">
                                                <div class="text-center text-slate-400">
                                                    <div class="text-6xl mb-4">🇳🇬</div>
                                                    <div class="font-bold">SmartBiz Coach</div>
                                                    <div class="text-sm">AI Business Operating System</div>
                                                </div>
                                            </div>`;
                                        }
                                    }}
                                />

                                {/* Floating UI cards */}
                                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute top-8 -left-10 bg-white rounded-2xl shadow-2xl p-3.5 border border-slate-100 w-48">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center text-xs">📱</div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">POS Barcode Scanner</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900">Beep! Item Added ✓</div>
                                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Camera POS • PIN Protected</div>
                                </motion.div>

                                <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                                    className="absolute bottom-20 -left-6 bg-white rounded-2xl shadow-2xl p-3.5 border border-slate-100 w-52">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center text-xs">📒</div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Gbege Debt Recovery</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900">₦18,500 Recovered</div>
                                    <div className="text-[10px] text-green-600 font-bold">Via WhatsApp Paystack Link</div>
                                </motion.div>

                                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                                    className="absolute top-16 -right-8 bg-white rounded-2xl shadow-2xl p-3.5 border border-slate-100 w-48">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-xs">🏪</div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Market Square</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900">36 States Reach</div>
                                    <div className="text-[10px] text-blue-600 font-bold">CAC & SMEDAN Verified ✓</div>
                                </motion.div>

                                <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                                    className="absolute bottom-8 -right-6 bg-slate-900 rounded-2xl shadow-2xl p-3.5 border border-slate-700 w-48">
                                    <div className="text-[10px] font-black text-teal-400 uppercase tracking-wider mb-1">Section 23 CITA</div>
                                    <div className="text-xl font-black text-white">0% Tax Rate</div>
                                    <div className="text-[10px] text-emerald-400 font-semibold">MSME Legal Exemption</div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                <div className="relative h-24 mt-0">
                    <svg viewBox="0 0 1440 96" className="absolute bottom-0 w-full" preserveAspectRatio="none">
                        <path d="M0,64 C480,96 960,0 1440,64 L1440,96 L0,96 Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* ═══════════ 6-STEP DAILY OPERATING TIMELINE ═══════════ */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-widest uppercase mb-4 border border-emerald-200">The Daily Operating Timeline</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">How SmartBiz Coach Powers Your Business Every Day</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">From morning counter opening to evening WhatsApp financial close — automated, secure, and stress-free.</p>
                    </motion.div>

                    <div className="relative">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {ecosystemSteps.map((step, i) => (
                                <motion.div key={i} className="relative flex flex-col items-center text-center"
                                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                    {i < ecosystemSteps.length - 1 && (
                                        <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-slate-200 to-slate-100 z-0">
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-r-2 border-t-2 border-slate-300 rotate-45"></div>
                                        </div>
                                    )}
                                    <div className={`relative z-10 w-16 h-16 rounded-2xl border-2 ${step.color} flex items-center justify-center text-2xl mb-3 shadow-sm hover:shadow-md transition-shadow`}>
                                        {step.icon}
                                    </div>
                                    <div className="font-black text-slate-800 text-sm mb-1">{step.label}</div>
                                    <div className="text-xs text-slate-400">{step.desc}</div>
                                    <div className="mt-2 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-500">{i + 1}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ THE 6 MASTER FEATURE TABS ═══════════ */}
            <section id="features" className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-black tracking-widest uppercase mb-4 border border-green-200">The 6 Core Pillars</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Complete Operating Infrastructure for MSMEs</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Explore every structural component that keeps your shop profitable, protected, and funded.</p>
                    </motion.div>

                    {/* Tab Buttons */}
                    <div className="flex overflow-x-auto no-scrollbar gap-2 mb-10 pb-2 px-1 scroll-smooth">
                        {featureTabs.map((tab, i) => (
                            <button key={i} onClick={() => setActiveFeatureTab(i)}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex-shrink-0 ${activeFeatureTab === i ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {featureTabs.map((tab, i) => activeFeatureTab === i && (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                                className="grid lg:grid-cols-2 gap-12 items-center bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm">
                                {/* Text */}
                                <div>
                                    <div className={`inline-block w-12 h-12 rounded-2xl bg-gradient-to-br ${tab.color} flex items-center justify-center text-2xl mb-6 shadow-lg text-white`}>
                                        {tab.label.split(' ')[0]}
                                    </div>
                                    <div className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">{tab.subheadline}</div>
                                    <h3 className="text-3xl font-extrabold text-slate-900 mb-4 leading-tight">{tab.headline}</h3>
                                    <p className="text-slate-500 leading-relaxed mb-8">{tab.body}</p>
                                    <ul className="space-y-3">
                                        {tab.bullets.map((b, bi) => (
                                            <li key={bi} className="flex items-start gap-3 text-sm text-slate-600">
                                                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">✓</span>
                                                {b}
                                            </li>
                                        ))}
                                    </ul>
                                    <button onClick={() => navigate('/register')} className={`mt-8 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${tab.color} text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all text-sm`}>
                                        Get Started Free →
                                    </button>
                                </div>

                                {/* Mockup panel */}
                                <div className={`bg-gradient-to-br ${tab.color} rounded-2xl p-6 shadow-2xl min-h-[340px] flex flex-col justify-between relative overflow-hidden text-white`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>

                                    {tab.mockup === 'pos' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between">
                                                <span>⚡ 5-Second Rapid POS</span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Apprentice Mode ON 🔒</span>
                                            </div>
                                            <div className="bg-black/30 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20 flex items-center justify-between text-[10px]">
                                                <span className="flex items-center gap-1.5 font-bold"><span>📷</span> Phone Camera Barcode Scanner</span>
                                                <span className="bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.5 rounded text-[9px]">Beep! Active</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30 space-y-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold">Total Bill: ₦14,500</span>
                                                    <span className="bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-md text-[10px]">Tender: Split</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] text-white/80 pt-1">
                                                    <div className="bg-black/20 p-2 rounded-lg">💵 Cash: ₦5,000</div>
                                                    <div className="bg-black/20 p-2 rounded-lg">📲 Transfer: ₦9,500 (Verified)</div>
                                                </div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 text-[10px] space-y-1">
                                                <div className="font-black text-amber-300">⛽ Fuel Expense: -₦3,000 (Gen Petrol)</div>
                                                <div className="text-white/80">Net Profit Today: ₦42,500 • Offline Queue Synced ✓</div>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <div className="flex-1 bg-white text-emerald-800 rounded-xl py-2 text-[10px] font-black text-center shadow">1-Click WhatsApp Close</div>
                                                <div className="flex-1 bg-white/20 text-white rounded-xl py-2 text-[10px] font-black text-center border border-white/30">Supervisor Unlock</div>
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'studio' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between">
                                                <span>📸 Snap-to-Studio 2.0</span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">16 Scenes</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3.5 border border-white/30 space-y-2">
                                                <div className="text-white text-xs font-black">Input: Raw Photo on Bedspread</div>
                                                <div className="text-[10px] text-emerald-200">➔ Output: 4K Luxury Marble & Fluted Wood Set</div>
                                                <div className="text-[10px] text-white/80 bg-black/20 p-2 rounded-lg">Ambient Shadows: Rendered ✓ • Reflections: Active ✓ • Gold Badge Added ✓</div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 text-[10px]">
                                                <div className="font-bold mb-0.5">💬 WhatsApp Status Copy Generated:</div>
                                                <div className="text-white/80 italic text-[9px]">"Exclusive Luxury Edition now in stock. Nationwide delivery within 24 hours. Tap to order now!"</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-white text-purple-900 rounded-xl py-2 text-[10px] font-black text-center shadow">Download 4K Photo</div>
                                                <div className="flex-1 bg-white/20 text-white rounded-xl py-2 text-[10px] font-black text-center border border-white/30">Post to Status</div>
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'debt' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between">
                                                <span>📒 Gbege Book Recovery</span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">WhatsApp Auto-Nudge</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30 space-y-1.5 text-[10px]">
                                                <div className="flex justify-between font-bold">
                                                    <span>Customer: Emeka Johnson</span>
                                                    <span className="text-amber-300">Owing: ₦35,000</span>
                                                </div>
                                                <div className="text-white/70">Due: 14 Days Ago • Tone: Level 2 Firm Reminder</div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-[10px]">
                                                <div className="text-white font-black mb-1">📲 WhatsApp Message Dispatched:</div>
                                                <div className="text-white/85 text-[9px] leading-relaxed">"Good day Mr. Emeka, this is a gentle reminder regarding your outstanding invoice of ₦35,000. Kindly settle via instant Paystack link: paystack.com/pay/sb-928..."</div>
                                            </div>
                                            <div className="bg-emerald-400 text-emerald-950 rounded-xl p-2 text-center text-[10px] font-black">
                                                ✓ Payment Received: ₦35,000 Settled via Transfer!
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'market' && (
                                        <div className="relative z-10 space-y-2">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between items-center">
                                                <span>🏪 Central MSME Market Square</span>
                                                <span className="bg-emerald-400/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full text-[9px] font-bold">CAC & SMEDAN Verified ✓</span>
                                            </div>
                                            {[
                                                { icon: '🛍️', type: 'Physical Goods', example: 'Fabrics, Phones, Groceries, Beauty' },
                                                { icon: '🛠️', type: 'Professional Services', example: 'CAC Legal, Accounting, Repairs, Media' },
                                                { icon: '🏠', type: 'Commercial Real Estate', example: 'Plaza Shops, Warehouses, Office Hubs' },
                                                { icon: '⚡', type: 'B2B Wholesale Hub', example: 'Raw Materials, Dispatch Fleets, Influencers' },
                                            ].map(({ icon, type, example }) => (
                                                <div key={type} className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 flex items-center gap-3">
                                                    <span className="text-base">{icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white text-[10px] font-black">{type}</div>
                                                        <div className="text-white/70 text-[9px] truncate">{example}</div>
                                                    </div>
                                                    <span className="text-white/90 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full">WhatsApp Direct</span>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-1">
                                                <div className="flex-1 bg-white text-blue-900 rounded-xl py-2 text-[10px] font-black text-center shadow">1-Click WhatsApp Status Share</div>
                                                <div className="flex-1 bg-white/20 text-white rounded-xl py-2 text-[10px] font-black text-center border border-white/30">36 States Filter</div>
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'tax' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between">
                                                <span>⚖️ Legal Compliance Shield</span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">CITA Section 23/40</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30 space-y-2">
                                                <div className="text-white font-black text-xs">Section 23 CITA Exemption Memo ✓</div>
                                                <div className="text-[10px] text-emerald-200">Statutory Tax Rate: 0% (Turnover &lt; ₦25,000,000)</div>
                                                <div className="text-[9px] text-white/80 leading-relaxed">Official legal certificate confirming immunity from company income tax for micro & small enterprises in Nigeria.</div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-[10px] space-y-1">
                                                <div className="font-bold text-amber-300">🏛️ Accredited CAC Filing Desk</div>
                                                <div className="text-white/80">Business Name (₦27.5k) • Ltd Co (₦68k) • SCUML • 3-7 Days Delivery</div>
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'grants' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between">
                                                <span>💰 Institutional Funding Matcher</span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">₦Billions Active</span>
                                            </div>
                                            {[
                                                { name: 'BOI MSME Growth Fund', amount: 'Up to ₦10M', match: '96%' },
                                                { name: 'Presidential Palliative Grant', amount: '₦50,000 Free', match: '98%' },
                                                { name: 'Tony Elumelu Foundation', amount: '$5,000 USD', match: '88%' },
                                            ].map(({ name, amount, match }) => (
                                                <div key={name} className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm">💰</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white text-[10px] font-black truncate">{name}</div>
                                                        <div className="text-white/70 text-[9px]">{amount}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-emerald-300 text-[10px] font-black">{match} Match</div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="bg-white text-slate-900 rounded-xl p-2 text-[10px] font-black text-center shadow">
                                                📄 5-Year Bankable Business Plan Ready for PDF Download
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'datascience' && (
                                        <div className="relative z-10 space-y-2.5">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between items-center">
                                                <span>🧠 Scikit-Learn Underwriting Hub</span>
                                                <span className="bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-full text-[9px]">FICO 742 / 850 • Prime A+</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30 space-y-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold">Algorithmic Credit Grade: 87.3% Bankable</span>
                                                    <span className="text-emerald-300 font-black text-[10px]">BOI & TEF Certified ✓</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[9px] text-white/90">
                                                    <div className="bg-black/20 p-2 rounded-lg">
                                                        <span className="text-white/60 block">Cashflow Consistency</span>
                                                        <strong className="text-emerald-300 text-[10px]">94% (Stable Daily)</strong>
                                                    </div>
                                                    <div className="bg-black/20 p-2 rounded-lg">
                                                        <span className="text-white/60 block">Debt Recovery Velocity</span>
                                                        <strong className="text-amber-300 text-[10px]">4.2 Days Avg</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 space-y-1 text-[9px]">
                                                <div className="flex justify-between items-center font-bold">
                                                    <span className="text-amber-300">📈 Stockout Forecast: Indomie Cartons</span>
                                                    <span className="text-rose-300 font-mono">Runway: 4.8 Days</span>
                                                </div>
                                                <div className="flex justify-between items-center text-white/80">
                                                    <span>🛡️ Till Audit (Isolation Forest):</span>
                                                    <span className="text-emerald-300 font-bold">0 Anomalies • Clean Till ✓</span>
                                                </div>
                                                <div className="flex justify-between items-center text-white/80">
                                                    <span>🏷️ OLS Price Elasticity:</span>
                                                    <span className="text-purple-200 font-bold">+4.5% Safe Margin Window</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-0.5">
                                                <div className="flex-1 bg-white text-indigo-950 rounded-xl py-2 text-[10px] font-black text-center shadow">
                                                    📄 Export Dossier PDF (SHA-256)
                                                </div>
                                                <div className="flex-1 bg-white/20 text-white rounded-xl py-2 text-[10px] font-black text-center border border-white/30">
                                                    Audit Cash Register
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>

            {/* ═══════════ ALL 26 PLATFORM FEATURES GRID ═══════════ */}
            <section className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-black tracking-widest uppercase mb-4 border border-slate-200">Full Architectural Suite</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">26 Powerful Modules. Zero Missing Pieces.</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">From daily cashbook POS and apprentice anti-theft protection to 4K commercial photo studio, FICO credit underwriting, and BOI business plans — everything an MSME needs to thrive.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {allFeatures.map((f, i) => (
                            <motion.div key={i} className="group bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:bg-white hover:border-emerald-200 hover:shadow-lg transition-all duration-300 cursor-pointer relative"
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                                {f.tag && (
                                    <span className={`absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${f.tag === 'Core Free' ? 'bg-emerald-100 text-emerald-800' : f.tag === 'Anti-Theft' ? 'bg-blue-100 text-blue-800' : f.tag === 'Top Feature' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {f.tag}
                                    </span>
                                )}
                                <div className={`w-11 h-11 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center text-xl shadow-md mb-4 group-hover:scale-110 transition-transform duration-300 text-white`}>
                                    {f.icon}
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{f.pillar}</div>
                                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ THE MSME ZERO-SURPRISE FAIR-USE GUARANTEE ═══════════ */}
            <section id="guarantee" className="py-24 bg-slate-900 text-white relative overflow-hidden border-t border-slate-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-emerald-900/60 text-emerald-400 text-xs font-black tracking-widest uppercase mb-4 border border-emerald-800">Fair-Use & Zero Surprise Policy</span>
                        <h2 className="text-4xl font-extrabold text-white mb-4">Core Tools are 100% Free Forever. No Lockouts.</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">We do not believe in holding small business sales records hostage. See our transparent guarantee below.</p>
                    </motion.div>

                    <div className="bg-slate-800/80 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 bg-slate-950/60 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-6">Platform Feature / Tool</th>
                                        <th className="py-4 px-6">Operational Category</th>
                                        <th className="py-4 px-6">Cost / Credits Required</th>
                                        <th className="py-4 px-6">Guarantee Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/60 text-sm">
                                    {fairUseMatrix.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="py-3.5 px-6 font-semibold text-white flex items-center gap-2.5">
                                                <span>{row.icon}</span>
                                                <span>{row.feature}</span>
                                            </td>
                                            <td className="py-3.5 px-6 text-slate-400 text-xs">{row.type}</td>
                                            <td className="py-3.5 px-6">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.cost.includes('FREE') ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60' : 'bg-purple-900/60 text-purple-300 border border-purple-700/60'}`}>
                                                    {row.cost}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 text-xs text-slate-300">
                                                {row.cost.includes('FREE') ? '✅ Guaranteed Unlimited Access' : '⚡ Affordable Pay-As-You-Go'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ ROI CALCULATOR ═══════════ */}
            <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/30 via-slate-900 to-slate-900 pointer-events-none"></div>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-green-900/60 text-green-400 text-xs font-black tracking-widest uppercase mb-4 border border-green-800">ROI Calculator</span>
                        <h2 className="text-4xl font-extrabold text-white mb-4">See exactly how much SmartBiz saves you</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">Adjust your business profile below and see your projected savings instantly.</p>
                    </motion.div>

                    <div className="grid lg:grid-cols-2 gap-10 items-stretch">
                        {/* Sliders */}
                        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-3xl p-8 space-y-8">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-black text-white">Monthly Revenue</label>
                                    <span className="bg-green-900/60 text-green-400 text-sm font-black px-3 py-1 rounded-xl border border-green-800">
                                        ₦{roiRevenue.toLocaleString('en-NG')}
                                    </span>
                                </div>
                                <input type="range" min={50000} max={5000000} step={50000} value={roiRevenue} onChange={e => setRoiRevenue(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-green-500" />
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-bold">
                                    <span>₦50K</span><span>₦5M+</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-black text-white">Hours on Admin/Week</label>
                                    <span className="bg-blue-900/60 text-blue-400 text-sm font-black px-3 py-1 rounded-xl border border-blue-800">
                                        {roiHours} hrs/week
                                    </span>
                                </div>
                                <input type="range" min={2} max={40} step={1} value={roiHours} onChange={e => setRoiHours(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500" />
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-bold">
                                    <span>2 hrs</span><span>40 hrs</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed border-t border-slate-700 pt-6">
                                Estimates are based on average MSME outcomes reported by SmartBiz Coach merchants across Lagos, Onitsha, Kano, Abuja, and Port Harcourt.
                            </p>
                        </motion.div>

                        {/* Results */}
                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="space-y-4">
                            {[
                                { icon: '⏱️', label: 'Hours Saved Monthly', value: `${timeSaved} hrs`, sub: 'From 5-Sec POS, automated day-book & WhatsApp close', color: 'from-violet-600 to-purple-700' },
                                { icon: '💸', label: 'Avg. Debt Recovered/Month', value: `₦${debtRecovered.toLocaleString('en-NG')}`, sub: 'Via Gbege Book WhatsApp auto-nudges and Paystack links', color: 'from-red-600 to-rose-700' },
                                { icon: '💰', label: 'Grant Programs Eligible', value: grantEligibility, sub: 'Based on your revenue tier — matched automatically', color: 'from-emerald-600 to-teal-700' },
                                { icon: '🚀', label: 'Potential Revenue Uplift', value: `+₦${Math.round(roiRevenue * 0.15).toLocaleString('en-NG')}`, sub: 'From Snap-to-Studio 4K photos, marketplace reach & CRM', color: 'from-amber-600 to-orange-700' },
                            ].map(({ icon, label, value, sub, color }, i) => (
                                <motion.div key={i} className={`bg-gradient-to-r ${color} rounded-2xl p-5 shadow-lg text-white`}
                                    initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white/70 text-[10px] font-black uppercase tracking-wider mb-1">{label}</div>
                                            <div className="text-white font-black text-xl leading-tight">{value}</div>
                                            <div className="text-white/70 text-[10px] mt-1 leading-relaxed">{sub}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            <button onClick={() => navigate('/register')} className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black rounded-2xl shadow-2xl shadow-green-600/30 hover:-translate-y-0.5 transition-all text-sm">
                                🚀 Start Saving Today — It's Free
                            </button>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ HOW IT WORKS ═══════════ */}
            <section id="how-it-works" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-xs font-black tracking-widest uppercase mb-4 border border-blue-200">Simple Setup</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Running in under 5 minutes</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">No tech degree needed. If you can use WhatsApp and take a phone picture, you can run your entire business on SmartBiz Coach.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { num: '01', icon: '🚀', title: 'Create Free Account', desc: 'Sign up in 60 seconds. No credit card. No setup fees. Free lifetime access to core POS and bookkeeping.' },
                            { num: '02', icon: '🏢', title: 'Set Up Your Shop', desc: 'Add your business name, set your 4-digit apprentice shift PIN, and enter your opening cash balance.' },
                            { num: '03', icon: '⚡', title: 'Sell, Snap & Collect', desc: 'Check out sales in 5 seconds, turn raw bedsheet photos into 4K studio sets, and log customer debts.' },
                            { num: '04', icon: '📈', title: 'Get Funded & Grow', desc: 'Receive WhatsApp daily profit summaries, match government grants, and download BOI business plans.' },
                        ].map((s, i) => (
                            <motion.div key={i} className="relative" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                {i < 3 && <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-green-300/60 to-transparent z-0"></div>}
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:border-green-200 hover:bg-green-50/30 transition-all group relative z-10">
                                    <div className="text-[10px] font-black text-green-600 tracking-widest mb-3 uppercase">{s.num}</div>
                                    <div className="text-3xl mb-4">{s.icon}</div>
                                    <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ TESTIMONIALS ═══════════ */}
            <section className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-amber-100 text-amber-800 text-xs font-black tracking-widest uppercase mb-4 border border-amber-200">Merchant Voices</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Real Feedback from Nigerian Business Owners & Pilot Merchants</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">From Alaba and Balogun to Onitsha Main Market and Kano Kurmi, here is how Nigerian merchants win with SmartBiz Coach.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {testimonials.map((t, i) => (
                            <motion.div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                                <div>
                                    <div className="flex items-center gap-1 text-amber-400 mb-4">
                                        {[...Array(t.stars)].map((_, si) => <span key={si}>★</span>)}
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed italic mb-6">"{t.text}"</p>
                                </div>
                                <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                                    <div className={`w-10 h-10 ${t.color} text-white rounded-full flex items-center justify-center font-black text-sm flex-shrink-0`}>
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                                        <div className="text-xs text-slate-400">{t.role}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ PRICING PACKS ═══════════ */}
            <section id="pricing" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-purple-100 text-purple-700 text-xs font-black tracking-widest uppercase mb-4 border border-purple-200">Affordable AI Top-Ups</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Priced for Nigerian Reality. No Monthly Subscriptions.</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Core operating tools are 100% free. When you need heavy AI compute (commercial photoshoots, business plans), top up as you go starting at ₦500.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                        {packs.map((p, i) => (
                            <motion.div key={i} className={`rounded-3xl p-6 border-2 ${p.color} bg-white flex flex-col justify-between relative shadow-sm hover:shadow-xl transition-all`}
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                {p.tag && (
                                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow">
                                        {p.tag}
                                    </span>
                                )}
                                <div>
                                    <div className="text-slate-900 font-extrabold text-lg mb-1">{p.name}</div>
                                    <div className="text-xs text-slate-400 font-semibold mb-4">{p.credits}</div>
                                    <div className="text-3xl font-black text-slate-900 mb-6">{p.price}</div>
                                    <ul className="space-y-3 mb-8">
                                        {p.perks.map((perk, pi) => (
                                            <li key={pi} className="flex items-center gap-2 text-xs text-slate-600">
                                                <span className="text-green-600 font-black">✓</span>
                                                {perk}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button onClick={() => navigate('/register')} className={`w-full py-3 rounded-xl text-white font-bold text-xs transition-all shadow-md ${p.btnColor}`}>
                                    Get {p.name} →
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ NGO & INSTITUTIONAL PARTNERSHIP ═══════════ */}
            <section id="partnership" className="py-24 bg-slate-900 text-white relative overflow-hidden border-t border-slate-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Info */}
                        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
                            <span className="inline-block py-1 px-3 rounded-full bg-emerald-900/60 text-emerald-400 text-xs font-black tracking-widest uppercase border border-emerald-800">
                                Institutional & NGO Desk
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                                Partner with SmartBiz Coach to Formalize & Empower Nigerian MSMEs
                            </h2>
                            <p className="text-slate-400 leading-relaxed text-sm">
                                We collaborate with government agencies (SMEDAN, BOI), microfinance institutions, development partners, and NGOs to deliver digital bookkeeping, tax formalization, and financial inclusion to grassroots business clusters nationwide.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
                                    <div className="text-2xl font-black text-emerald-400">100%</div>
                                    <div className="text-xs text-slate-400">Audit-Ready POS & Ledger</div>
                                </div>
                                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
                                    <div className="text-2xl font-black text-teal-400">Section 23</div>
                                    <div className="text-xs text-slate-400">CITA Tax Legal Shield</div>
                                </div>
                            </div>

                            <div className="pt-3 space-y-2">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Direct Executive Contact Lines:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-slate-300">
                                    <a href="mailto:partners@smartbizcoach.com.ng" className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors block">
                                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">🤝 Partnerships</div>
                                        <div className="font-mono text-[11px] truncate mt-0.5">partners@smartbizcoach.com.ng</div>
                                    </a>
                                    <a href="mailto:support@smartbizcoach.com.ng" className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors block">
                                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">🛟 Support & Help</div>
                                        <div className="font-mono text-[11px] truncate mt-0.5">support@smartbizcoach.com.ng</div>
                                    </a>
                                    <a href="mailto:admin@smartbiz.com.ng" className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors block">
                                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">⚙️ Platform Admin</div>
                                        <div className="font-mono text-[11px] truncate mt-0.5">admin@smartbiz.com.ng</div>
                                    </a>
                                </div>
                                <div className="text-[11px] text-slate-400 pt-1">
                                    Official WhatsApp / Hotline: <strong className="text-emerald-300">09064556107</strong>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right: Partner Intake Form */}
                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 backdrop-blur-sm">
                            {partnerSubmitted ? (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                                    <div className="w-16 h-16 bg-green-900/50 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-md border border-green-800">✓</div>
                                    <h3 className="text-2xl font-bold text-white mb-3">Proposal Submitted!</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                                        Thank you, <strong className="text-white">{partnerName}</strong>. We received your <strong className="text-green-400">{partnerType}</strong> inquiry. We will reach out to <strong className="text-white">{partnerEmail}</strong> shortly.
                                    </p>
                                    <a href={`https://wa.me/2349064556107?text=Hello%20Meshach,%20I%20just%20submitted%20a%20partnership%20proposal%20for%20SmartBiz%20Coach%20as%20a%20${encodeURIComponent(partnerType)}.`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-extrabold px-6 py-3 rounded-xl text-sm transition-all shadow-md">
                                        💬 Discuss on WhatsApp →
                                    </a>
                                </motion.div>
                            ) : (
                                <form onSubmit={handlePartnerSubmit} className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">Partnership & Institutional Inquiry</h3>
                                        <p className="text-xs text-slate-400 mb-4">Let's discuss cohort onboarding, banking integrations, or grant disbursement.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                                            <input type="text" required value={partnerName} onChange={e => setPartnerName(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-slate-500" placeholder="Full Name" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                                            <input type="email" required value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-slate-500" placeholder="email@firm.com" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Organization</label>
                                        <input type="text" required value={partnerOrg} onChange={e => setPartnerOrg(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-slate-500" placeholder="Company / NGO / Bank / Agency" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Partnership Type</label>
                                        <select value={partnerType} onChange={e => setPartnerType(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors">
                                            <option value="SME Training & NGO Cohorts">SME Training & NGO Cohorts</option>
                                            <option value="Bank / Microfinance Credit Scoring">Bank / Microfinance Credit Scoring</option>
                                            <option value="Government Agency (SMEDAN, BOI)">Government Agency (SMEDAN, BOI)</option>
                                            <option value="Market Association / Cooperative">Market Association / Cooperative</option>
                                            <option value="Equity Investment / Venture Capital">Equity Investment / Venture Capital</option>
                                            <option value="Other">Other Strategic Partnership</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Message</label>
                                        <textarea required rows={3} value={partnerMessage} onChange={e => setPartnerMessage(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors resize-none placeholder-slate-500" placeholder="Describe your collaboration interest or cohort size..."></textarea>
                                    </div>
                                    <button type="submit" disabled={partnerLoading}
                                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                                        {partnerLoading ? '⏳ Submitting...' : 'Send Partnership Proposal →'}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ FAQ ═══════════ */}
            <section id="faq" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-black tracking-widest uppercase mb-4 border border-slate-200">Answers to Your Questions</span>
                        <h2 className="text-4xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
                    </motion.div>
                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <motion.div key={i} className="border border-slate-200 rounded-2xl overflow-hidden"
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="w-full text-left p-5 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                    <span className="font-semibold text-slate-900 text-sm pr-4">{faq.q}</span>
                                    <span className={`text-slate-400 text-xl flex-shrink-0 transition-transform duration-200 ${activeFaq === i ? 'rotate-45' : ''}`}>+</span>
                                </button>
                                <AnimatePresence>
                                    {activeFaq === i && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                                            <div className="px-5 pb-5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4 bg-slate-50">{faq.a}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ FINAL CTA ═══════════ */}
            <section className="relative py-28 bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 overflow-hidden text-white">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-400/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl"></div>
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                </div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <div className="text-6xl mb-6">🇳🇬</div>
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Your business deserves<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-300">world-class operating tools</span>
                        </h2>
                        <p className="text-xl text-green-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Join Nigerian entrepreneurs and pilot merchants using SmartBiz Coach to check out sales in 5 seconds, transform photos to 4K studio quality, recover debts, and formalize with ease.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button onClick={() => navigate('/register')} className="bg-white hover:bg-green-50 text-green-800 px-10 py-4 rounded-2xl text-lg font-extrabold transition-all shadow-2xl hover:-translate-y-1 hover:shadow-white/20">
                                Create Your Free Account →
                            </button>
                            <button onClick={() => navigate('/login')} className="border-2 border-white/30 hover:border-white/60 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all hover:bg-white/10">
                                Already have an account? Sign In
                            </button>
                        </div>
                        <p className="text-green-200/60 text-sm mt-8">No credit card required • 50 Free Welcome Credits 🎁 • Free core tools forever • Paystack secured 🔒 • NDPR Compliant</p>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════ FOOTER ═══════════ */}
            <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                        <div className="col-span-2">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg">S</div>
                                <span className="font-bold text-xl text-white">SmartBiz<span className="text-green-500">Coach</span></span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">The complete AI Business Operating System for Nigerian MSMEs. Phone Camera Barcode POS, Apprentice Shift Lock, Snap-to-Studio 2.0, Central MSME Market Square, WhatsApp Debt Recovery, and Section 23 CITA Tax Shield.</p>

                            <div className="space-y-3">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Follow Us</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { href: 'https://www.facebook.com/profile.php?id=61580131486753', label: 'SmartBiz', color: 'hover:bg-[#1877F2]', icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /> },
                                        { href: 'https://www.instagram.com/smartbizcoach1/', label: 'Instagram', color: 'hover:bg-gradient-to-r hover:from-[#833ab4] hover:via-[#fd1d1d] hover:to-[#fcb045]', icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /> },
                                        { href: 'https://www.linkedin.com/in/meshach-zachariah-5a578912a/', label: 'LinkedIn', color: 'hover:bg-[#0A66C2]', icon: <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /> },
                                        { href: 'https://wa.me/2349064556107', label: 'WhatsApp', color: 'hover:bg-[#25D366]', icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /> },
                                    ].map(({ href, label, color, icon }) => (
                                        <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                                            className={`group flex items-center gap-2 px-3 py-2 bg-slate-900 ${color} rounded-xl border border-slate-800 hover:border-transparent transition-all duration-200`}>
                                            <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">{icon}</svg>
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Platform</h4>
                            <ul className="space-y-3">
                                <li><a href="#features" className="text-sm text-slate-400 hover:text-green-400 transition-colors">6 Core Pillars</a></li>
                                <li><span onClick={() => navigate('/marketplace')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Central Market Square</span></li>
                                <li><a href="#how-it-works" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Operating Timeline</a></li>
                                <li><a href="#guarantee" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Free Tools Guarantee</a></li>
                                <li><a href="#pricing" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Pricing Top-Ups</a></li>
                                <li><a href="#faq" className="text-sm text-slate-400 hover:text-green-400 transition-colors">FAQ</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Resources</h4>
                            <ul className="space-y-3">
                                <li><span onClick={() => navigate('/blog')} className="text-sm text-emerald-400 font-semibold hover:underline transition-colors cursor-pointer flex items-center gap-1.5">Impact & Partnership Blog <span className="text-[10px] bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">New</span></span></li>
                                <li><span onClick={() => navigate('/help')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Help & Guides</span></li>
                                <li><span onClick={() => navigate('/grants-guide')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Grant Matcher Guide</span></li>
                                <li><span onClick={() => navigate('/cac-checklist')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">CAC Compliance Guide</span></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Legal & Trust</h4>
                            <ul className="space-y-3">
                                <li><span onClick={() => navigate('/about')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">About SmartBiz</span></li>
                                <li><a href="#partnership" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Institutional Partners</a></li>
                                <li><span onClick={() => navigate('/privacy')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Privacy Policy (NDPR)</span></li>
                                <li><span onClick={() => navigate('/terms')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Terms of Service</span></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-4">
                        <p>© {new Date().getFullYear()} SmartBiz Coach. All rights reserved. 🇳🇬 Made in Nigeria, for Nigerian MSMEs.</p>
                        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full">
                            <span className="text-green-400 text-xs">🔒</span>
                            <span className="text-xs text-slate-400">Secured by Paystack · NDPR Compliant · CITA Section 23/40 0% Tax Verified · Offline PWA</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ═══════════ STICKY MOBILE FLOATING CTA BAR ═══════════ */}
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 p-3 z-40 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-2.5">
                    <img src="/favicon.png" alt="SmartBiz Coach" className="w-8 h-8 rounded-lg object-cover shadow-sm flex-shrink-0" />
                    <div>
                        <div className="text-white text-xs font-bold font-heading leading-tight">SmartBiz Coach</div>
                        <div className="text-[9px] text-green-400 font-semibold">Active Pilot Cohort</div>
                    </div>
                </div>
                <button onClick={() => navigate('/register')} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-lg shadow-green-600/30 active:scale-95 transition-all">
                    🚀 Start Free →
                </button>
            </div>
        </div>
    );
};

export default LandingPage;
