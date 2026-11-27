import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import SEO from './SEO';
import { PWAInstallButton } from './PWAInstallPrompt';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { getSupportDisplayPhone, getSupportWhatsAppUrl } from '../utils/supportContact';
import { FEATURE_FLAGS } from '../config/featureFlags';

// --- Static SSR-Safe Metric Display (eliminates 0 / mid-animation glitches) ---
const AnimatedCounter: React.FC<{ target: string; duration?: number }> = ({ target }) => {
    return <span>{target}</span>;
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

    // Live Public Market Square Showcase State
    const [marketItems, setMarketItems] = useState<any[]>([]);
    const [marketLoading, setMarketLoading] = useState(true);
    const [marketCategory, setMarketCategory] = useState<string>('');

    useEffect(() => {
        if (!FEATURE_FLAGS.marketSquareDirectory) {
            setMarketLoading(false);
            return;
        }
        let cancelled = false;
        const loadFeaturedMarket = async () => {
            setMarketLoading(true);
            try {
                const params: Record<string, string> = { sort_by: 'boosted', limit: '8' };
                if (marketCategory === 'SERVICE' || marketCategory === 'B2B') {
                    params.product_type = marketCategory;
                } else if (marketCategory) {
                    params.product_type = 'PHYSICAL';
                    params.category = marketCategory;
                }
                const res = await api.get('/api/marketplace/global/', { params, timeout: 8000 });
                if (!cancelled && Array.isArray(res.data)) {
                    setMarketItems(res.data.slice(0, 8));
                }
            } catch {
                // graceful fallback if offline
            } finally {
                if (!cancelled) setMarketLoading(false);
            }
        };
        loadFeaturedMarket();
        return () => { cancelled = true; };
    }, [marketCategory]);

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

    // ── CORE & ADVANCED PLATFORM CAPABILITIES ──
    const allFeatures = [
        // Pillar 1: Daily Retail & Operations (Core Wedge)
        { icon: '📱', title: 'Phone Camera Barcode & QR Scanner', desc: 'Scan product barcodes and QR codes instantly using your phone camera with audio beep feedback — zero external scanner needed.', color: 'from-emerald-600 to-teal-700', tag: 'Core Free', pillar: 'Operations' },
        { icon: '⚡', title: '5-Second POS Day-Book', desc: 'Rapid counter checkout for Cash, POS card, Bank Transfer, and Customer Debt with automatic stock deduction and offline sync.', color: 'from-emerald-600 to-teal-700', tag: 'Core Free', pillar: 'Operations' },
        { icon: '🛡️', title: 'Staff Shift Lock', desc: 'Lock checkout with a 6+ character Owner Security Password. Attendants log daily sales without editing prices, backdating, or viewing profit margins.', color: 'from-blue-600 to-indigo-700', tag: 'Anti-Theft', pillar: 'Operations' },
        { icon: '📶', title: 'Open Market Offline Mode', desc: 'Record sales in busy open markets even when cellular data drops. Queued transactions sync automatically once reconnected.', color: 'from-cyan-600 to-blue-700', tag: 'Offline Ready', pillar: 'Operations' },
        { icon: '⛽', title: 'Petty Cash & Fuel Logger', desc: 'Track daily generator fueling, dispatch waybills, and store supplies for clear daily net cashflow balances.', color: 'from-amber-500 to-orange-600', tag: 'Expense Tracker', pillar: 'Operations' },
        { icon: '🔒', title: 'Fake Transfer Fraud Checklist', desc: 'Counter verification checklist helping shop attendants confirm bank app push alerts before releasing goods.', color: 'from-rose-600 to-red-700', tag: 'Security', pillar: 'Operations' },

        // Pillar 2: Creative & Commercial Studio
        { icon: '📸', title: 'Product Catalog Studio', desc: 'Capture products on your counter, apply clean commercial backdrops, and generate ready-to-post WhatsApp sales copy.', color: 'from-violet-600 to-purple-700', tag: 'Visuals', pillar: 'Creative Studio' },
        { icon: '✨', title: 'AI Brand Builder', desc: 'Generate brand color palettes, taglines, and a cohesive visual identity tailored to your target buyers in seconds.', color: 'from-pink-500 to-rose-600', pillar: 'Creative Studio' },
        { icon: '✍️', title: 'Content Studio & Broadcasts', desc: 'Draft WhatsApp Status copy, social captions, and promotional offers tuned to Nigerian buyers.', color: 'from-orange-500 to-amber-600', pillar: 'Creative Studio' },
        { icon: '🎥', title: 'Product Video Teleprompter', desc: 'Record short 15–30s product demos with an in-app scrolling script teleprompter for social reels.', color: 'from-pink-600 to-rose-600', tag: 'Labs', pillar: 'Creative Studio' },

        // Pillar 3: Commerce & Debt Recovery
        { icon: '🏪', title: 'Web Storefront & Market Square', desc: 'Instant shareable store (/u/your-brand) plus placement on the Market Square with verified ID/CAC trust tiers and Paystack checkout.', color: 'from-green-600 to-emerald-700', tag: 'Core Free', pillar: 'Commerce' },
        { icon: '📒', title: 'Gbege Debt Recovery', desc: 'Dual ledger tracking customer debts and supplier payables. Send polite WhatsApp payment nudges with Paystack links.', color: 'from-red-500 to-orange-600', tag: 'Cashflow', pillar: 'Commerce' },
        { icon: '🧾', title: '1-Tap WhatsApp Invoicing', desc: 'Create itemized PDF invoices and receipts with optional VAT/discounts and share directly to customer WhatsApp.', color: 'from-amber-500 to-yellow-600', tag: 'Core Free', pillar: 'Commerce' },
        { icon: '🤝', title: 'WhatsApp Sales Practice', desc: 'Rehearse closing buyer objections with interactive AI roleplay across English, Pidgin, and formal tones.', color: 'from-amber-500 to-orange-600', tag: 'Labs', pillar: 'Commerce' },

        // Pillar 4: Governance, Tax & Capital
        { icon: '⚖️', title: 'Small Business Tax Guidance', desc: 'Informational summary referencing Nigeria Tax Act & CITA small-company CIT/VAT provisions plus annual filing checklists.', color: 'from-emerald-700 to-teal-800', tag: 'Guidance', pillar: 'Capital & Law' },
        { icon: '🏛️', title: 'CAC Formalization Desk', desc: 'Step-by-step checklists and assisted filing requests for Business Name (from ₦20,000), Ltd Co (from ₦65,000), and TIN.', color: 'from-emerald-600 to-teal-700', tag: 'Formalization', pillar: 'Capital & Law' },
        { icon: '💰', title: 'Grant & Funding Matcher', desc: 'Match your business profile against active Nigerian MSME funding and loan programs (LSETF, BOI, SMEDAN, TEF).', color: 'from-emerald-500 to-teal-600', tag: 'Funding', pillar: 'Capital & Law' },
        { icon: '📄', title: '3-Year Bankable Business Plans', desc: 'Draft structured business plans with 3-year cashflow projections and break-even tables exported to PDF.', color: 'from-blue-500 to-indigo-600', pillar: 'Capital & Law' },

        // Pillar 5: Smart Business Insights
        { icon: '🧠', title: 'SmartScore™ (300–850) Readiness', desc: 'Internal financial readiness score summarizing your recorded sales consistency, debt recovery speed, and margin health.', color: 'from-indigo-600 to-purple-700', tag: 'Readiness', pillar: 'Smart Insights' },
        { icon: '📈', title: 'Restock & Stockout Alerts', desc: 'Tracks sales velocity to warn you before fast-moving items run out ahead of busy market weekends.', color: 'from-blue-600 to-cyan-600', tag: 'Labs', pillar: 'Smart Insights' },
        { icon: '🛡️', title: 'Cashier Till Audit Alerts', desc: 'Flags unusual voids, discounts, or petty cash spikes in daily shift logs so owners can review quickly.', color: 'from-rose-600 to-pink-700', tag: 'Labs', pillar: 'Smart Insights' },
        { icon: '🎙️', title: 'Voice Note Sale Logger', desc: 'Speak a quick sale or expense in English or Pidgin to transcribe and log counter transactions faster.', color: 'from-pink-600 to-rose-600', tag: 'Labs', pillar: 'Smart Insights' },
        { icon: '🧾', title: 'Receipt & Waybill Scanner', desc: 'Snap a photo of supplier receipts or waybills to extract line items and log restock costs quickly.', color: 'from-teal-600 to-emerald-700', tag: 'Labs', pillar: 'Smart Insights' },
        { icon: '🎯', title: 'Customer Buying Groups', desc: 'Groups repeat buyers into VIP Champions, Regulars, and At-Risk tiers for targeted WhatsApp follow-ups.', color: 'from-purple-600 to-indigo-700', tag: 'Labs', pillar: 'Smart Insights' },
        { icon: '🏷️', title: 'Smart Margin Pricing Guide', desc: 'Highlights products where small margin adjustments can boost profit without hurting customer demand.', color: 'from-amber-600 to-orange-600', tag: 'Labs', pillar: 'Smart Insights' },
        { icon: '📷', title: 'Photo Search & Cart Recovery', desc: 'Search Market Square by photo and follow up on pending storefront checkout leads via WhatsApp.', color: 'from-cyan-600 to-blue-700', tag: 'Commerce AI', pillar: 'Smart Insights' },
    ];

    // ── THE 7 CORE PILLAR TABS ──
    const featureTabs = [
        {
            label: '⚡ Daily POS & Barcode Scanner',
            headline: 'Phone Camera Barcode POS, Staff Shift Lock & Offline Resilience',
            subheadline: 'Zero Hardware Cost • Core Operational Wedge',
            body: 'Run your retail store directly from your phone. Scan barcodes with your smartphone camera, record sales in seconds across Cash, Card, Bank Transfer, and Credit, and protect daily records with a supervisor security password. Built to keep working even when market data fluctuates.',
            bullets: [
                '📱 Phone Camera Barcode & QR Scanner with instant audio beep confirmation',
                '⚡ Fast multi-tender checkout: Cash, POS Terminal, Bank Transfer & Credit',
                '🛡️ Staff Shift Mode locked behind an Owner Security Password (6+ characters)',
                '📶 Offline-Resilient Day-Book — saves sales locally during outages & syncs when online',
                '⛽ Petty Cash & Generator Fuel expense tracker for accurate daily net profit',
                '📲 1-click End-of-Day summary ready to share on owner WhatsApp',
            ],
            color: 'from-emerald-600 to-teal-700',
            mockup: 'pos',
        },
        {
            label: '📸 Product Studio & Marketing',
            headline: 'Turn Smartphone Photos into Clean Product Catalog Listings',
            subheadline: 'Zero Professional Studio Costs • Ready-to-Post Social Copy',
            body: 'Capture your products on a counter or table and enhance them with clean commercial presentation backdrops. Generate compelling promotional captions for WhatsApp Status, Facebook, and Instagram in one tap, and publish directly to your online storefront.',
            bullets: [
                '✨ Clean commercial backdrops with natural shadows and surface framing',
                '🏷️ Promotional badge overlays for discounts, new arrivals, and special offers',
                '💬 Auto-generated WhatsApp promotional sales copy with direct product links',
                '📦 1-click Save to Inventory and instant showcase on your digital storefront',
                '📱 Mobile-optimized for fast sharing across social channels',
            ],
            color: 'from-violet-600 to-purple-700',
            mockup: 'studio',
        },
        {
            label: '📒 Debt Ledger & WhatsApp Invoices',
            headline: 'Protect Working Capital: Recover Customer Debts & Send 1-Tap Invoices',
            subheadline: 'Dual Receivables Ledger with WhatsApp Reminders & Paystack Links',
            body: 'Uncollected customer credit chokes cashflow. Track exactly who owes your business and who you owe. Generate polite WhatsApp payment reminders with Paystack payment links and your bank transfer details so customers settle faster.',
            bullets: [
                '📒 Dual Ledger: Track customer debts ("Who Dey Owe Me") & supplier payables ("Who I Owe")',
                '🧾 1-Tap WhatsApp itemized invoices & printable PDF receipts (with optional VAT)',
                '📢 3-Tier WhatsApp Escalation: Gentle Courtesy ➔ Due Notice ➔ Formal Settlement Notice',
                '💳 Embedded Paystack payment links in reminders for instant mobile settlements',
                '⚡ Real-time payment status tracking & partial repayment progress bars',
                '📲 Direct WhatsApp click-to-chat reminders (0 credits) or Cloud Bot alerts',
            ],
            color: 'from-red-600 to-rose-700',
            mockup: 'debt',
        },
        {
            label: '🏪 Central Market Square & Online Storefronts',
            headline: 'Your Personal Online Store + Nationwide Marketplace Across 36 States',
            subheadline: 'Zero Listing Fees • Verified Badges • Direct Bank Payouts • Live Tracking',
            body: 'Every business on SmartBiz Coach gets an instant public online store (/u/your-brand) and placement in the Nigerian MSME Market Square. Set state delivery fees, accept Paystack card/transfer payments or WhatsApp orders, and let buyers track deliveries (/track/:code).',
            bullets: [
                '🏪 Personal Brand Storefront (/u/:slug) ready to put in your WhatsApp & Instagram bio',
                '🇳🇬 Central Market Square (/market) connecting buyers and sellers across Nigeria',
                '🚚 Custom Delivery Quotes configured per state & FCT Abuja',
                '🛡️ Direct Paystack Merchant Payouts & WhatsApp order routing (Zero listing fees)',
                '📦 Public Order Tracking (/track/:code) from dispatch to buyer confirmation',
                '⭐ Verified-Purchase Buyer Reviews & Seller Responses to build authentic trust',
                '📣 AI WhatsApp Promo Assistant generating Status captions & broadcasts',
                '⚡ Optional Micro-Boosts starting at 10 BizCredits (~₦100) for extra visibility',
            ],
            color: 'from-blue-600 to-indigo-700',
            mockup: 'market',
        },
        {
            label: '⚖️ Tax Guide & CAC Desk',
            headline: 'Small Business Tax Guidance & Assisted CAC Formalization',
            subheadline: 'Informational Compliance Checklists • Not Legal or Tax Advice',
            body: 'Understand Nigeria’s MSME formalization rules without confusion. Review small-company CIT & VAT thresholds under Nigerian tax law (subject to entity structure, fixed-asset limits, exclusions for professional services, and mandatory annual NRS tax filings) and access our guided CAC registration desk.',
            bullets: [
                '📋 Informational Small-Company CIT & VAT Guide (0% CIT applies only to qualifying incorporated small companies; annual returns remain mandatory)',
                '🏛️ Assisted CAC Filing Desk: Business Name (from ₦20,000), Ltd Co (from ₦65,000), TIN & SCUML checklists',
                '📝 Clear reminder: Corporate CIT exemptions do not replace valid state or local government permits',
                '📑 Annual returns compliance calendar and statutory filing reminders',
                '⚖️ Free informational compliance summary generator (consult a licensed tax practitioner for formal filings)',
            ],
            color: 'from-emerald-700 to-teal-800',
            mockup: 'tax',
        },
        {
            label: '💰 Grants & BOI Business Plans',
            headline: 'Discover Nigerian Grants & Draft 3-Year Bankable Proposals',
            subheadline: 'Structured for LSETF, BOI, SMEDAN, TEF, and Bank Reviews',
            body: 'SmartBiz Coach matches your business profile against active Nigerian funding and loan programs. Draft structured 3-year business plans complete with Executive Summary, Market Analysis, Cashflow Projections, and Break-Even tables formatted for PDF export.',
            bullets: [
                '💰 Live matching for LSETF, SMEDAN, BOI MSME Fund, and TEF Grants with direct official portal links',
                '📄 3-Year Structured Business Plan Generator formatted for lender reviews',
                '📊 Comprehensive financial modeling: P&L, 3-year cashflow & break-even analysis',
                '📥 Instant PDF export for loan and grant applications',
                '🤝 Cohort readiness tracking for chambers of commerce and NGO programs',
            ],
            color: 'from-amber-600 to-yellow-700',
            mockup: 'grants',
        },
        {
            label: '🧠 SmartScore™ & Business Insights',
            headline: 'SmartScore™ 300–850 Readiness, Restock Alerts & Till Audit Insights',
            subheadline: 'Built-In Business Intelligence • Exportable Financial Dossier PDF',
            body: 'Turn daily sales records into clear, actionable insights. Track your internal SmartScore™ (300–850) based on sales consistency, debt collection speed, and profit margins, get early warnings before popular stock runs out, and spot unusual till adjustments.',
            bullets: [
                '🏛️ SmartScore™ 300–850 internal readiness gauge summarizing cashflow & repayment habits',
                '📈 Early Restock Alerts estimating days of inventory left before fast sellers run out',
                '🛡️ Cashier Till Audit Alerts highlighting unexpected voids or petty cash spikes',
                '🎯 Customer Buying Groups separating VIP repeat buyers from dormant accounts',
                '🏷️ Smart Margin Guide flagging products with room for healthier pricing',
                '📄 1-Click Financial Readiness Dossier (PDF) summarizing recorded ledger metrics',
            ],
            color: 'from-indigo-700 to-purple-800',
            mockup: 'datascience',
        },
    ];

    // ── 6-STEP DAILY OPERATING TIMELINE ──
    const ecosystemSteps = [
        { icon: '📱', label: 'Morning POS & Scan', desc: 'Barcode scan & staff PIN lock', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
        { icon: '📸', label: 'Catalog Studio', desc: 'Clean product photos & copy', color: 'bg-violet-100 border-violet-300 text-violet-700' },
        { icon: '🏪', label: 'Market Square Live', desc: 'Storefront & online orders', color: 'bg-blue-100 border-blue-300 text-blue-700' },
        { icon: '📒', label: 'Debt Recovery', desc: 'WhatsApp payment nudges', color: 'bg-red-100 border-red-300 text-red-700' },
        { icon: '⛽', label: 'Fuel & Expenses', desc: 'Log fuel & petty cash', color: 'bg-amber-100 border-amber-300 text-amber-700' },
        { icon: '📊', label: 'Evening Close & Score', desc: 'Daily profit & SmartScore™', color: 'bg-teal-100 border-teal-300 text-teal-700' },
    ];

    const pilotProgramTracks = [
        { badge: 'Open Cohort · Retail & Mini-Marts', title: 'Fast Counter POS & Staff Lock', desc: 'Test 5-second Cash, Transfer, and Credit sales with offline local persistence and owner-password shift protection.', icon: '⚡' },
        { badge: 'Open Cohort · Wholesale & Trade', title: 'Gbege Book & WhatsApp Reminders', desc: 'Track partial repayments in real time and send polite click-to-chat WhatsApp payment reminders with bank details.', icon: '📒' },
        { badge: 'Open Cohort · Fashion & Services', title: 'Personal Storefront (/u/your-brand)', desc: 'Publish live inventory to your own shareable web store and receive structured WhatsApp & Paystack orders in Leads Inbox.', icon: '🏪' },
    ];

    const packs = [
        { name: 'Micro Pack', price: '₦500', credits: '50 Credits', tag: null, color: 'border-slate-200', btnColor: 'bg-slate-900 hover:bg-slate-700', popular: false, perks: ['50 BizCredits (Never Expire)', 'Up to 25 Studio Backdrop Edits', 'AI Promo Copy & Content Posts', '1-Tap Paystack Checkout', 'Standard Email Support'] },
        { name: 'Starter Pack', price: '₦1,500', credits: '150 Credits', tag: null, color: 'border-blue-500', btnColor: 'bg-blue-600 hover:bg-blue-500', popular: false, perks: ['150 BizCredits', 'Up to 75 Studio Backdrop Edits', '1x AI Brand Identity Kit', '1x Market Square 7-Day Boost', 'Pricing & Margin Prompts', 'WhatsApp & Email Support Desk'] },
        { name: 'Grower Pack', price: '₦3,500', credits: '400 Credits', tag: '🔥 Most Popular', color: 'border-green-500', btnColor: 'bg-green-600 hover:bg-green-500', popular: true, perks: ['400 BizCredits', '2x 3-Year Business Plans', 'Up to 200 Studio Backdrop Edits', '4x Market Square 7-Day Boosts', 'Full AI Content & Copy Suite', 'Priority Email & Chat Support'] },
        { name: 'Vendor Pro Pack', price: '₦7,500', credits: '1,000 Credits', tag: '💎 High Velocity', color: 'border-purple-500', btnColor: 'bg-purple-700 hover:bg-purple-600', popular: false, perks: ['1,000 BizCredits', '5x 3-Year Business Plans', 'Up to 500 Studio Backdrop Edits', '10x Market Square Priority Boosts', 'Guided CAC & Grant Checklists', 'Priority Support Queue'] },
        { name: 'Mogul Pack', price: '₦15,000', credits: '2,500 Credits', tag: '👑 Best Credit Rate', color: 'border-amber-500', btnColor: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500', popular: false, perks: ['2,500 BizCredits (Best Rate: ₦6/credit)', '12x 3-Year Business Plans', 'Up to 1,250 Studio Backdrop Edits', '25x Market Square Priority Boosts', 'Multi-Store & Team Ready', 'Priority WhatsApp & Email Desk'] },
    ];

    // ── THE MSME ZERO-SURPRISE FAIR-USE GUARANTEE MATRIX ──
    const fairUseMatrix = [
        { feature: 'Phone Camera Barcode & QR Code POS Scanner', cost: '100% FREE FOREVER (0 Credits)', type: 'Smart Retail', icon: '📱' },
        { feature: 'Daily Day-Book & 5-Second POS Checkout', cost: '100% FREE FOREVER (0 Credits)', type: 'Core Utility', icon: '⚡' },
        { feature: 'Staff Shift Lock (Owner Security Password)', cost: '100% FREE FOREVER (0 Credits)', type: 'Shop Security', icon: '🛡️' },
        { feature: 'Offline-Resilient Day-Book Mode', cost: '100% FREE FOREVER (0 Credits)', type: 'Offline Resilience', icon: '📶' },
        { feature: 'Petty Cash & Generator Fuel Expense Tracker', cost: '100% FREE FOREVER (0 Credits)', type: 'Expense Logger', icon: '⛽' },
        { feature: 'Payment Fraud Shield (Transfer Verification Checklist)', cost: '100% FREE FOREVER (0 Credits)', type: 'Fraud Defense', icon: '🔒' },
        { feature: 'Debt Ledger & WhatsApp Click-to-Chat Reminders (wa.me)', cost: '100% FREE FOREVER (0 Credits)', type: 'Cashflow Protection', icon: '📒' },
        { feature: '1-Tap WhatsApp Invoicing & Printable PDF Receipts', cost: '100% FREE FOREVER (0 Credits)', type: 'Instant Billing', icon: '🧾' },
        { feature: 'Personal Web Storefront & Market Square Listings', cost: '100% FREE FOREVER (0 Credits)', type: 'Nationwide Trade', icon: '🏪' },
        { feature: 'Small Business Tax & CAC Readiness Guide', cost: '100% FREE FOREVER (0 Credits)', type: 'Compliance Guide', icon: '⚖️' },
        { feature: 'SmartScore™ Readiness & Financial Summary PDF', cost: '100% FREE FOREVER (0 Credits)', type: 'Readiness Score', icon: '🧠' },
        { feature: 'Inventory Stockout & Restock Alerts', cost: '100% FREE FOREVER (0 Credits)', type: 'Inventory Alerts', icon: '📈' },
        { feature: 'Cashier Till Anomaly Review', cost: '100% FREE FOREVER (0 Credits)', type: 'Audit Alerts', icon: '🛡️' },
        { feature: 'Micro-Boost Trial (24-Hour Spotlight)', cost: '10 BizCredits (~₦100)', type: 'Marketplace Growth', icon: '⚡' },
        { feature: 'AI WhatsApp Promo Pack (Status & Broadcast)', cost: '2 BizCredits', type: 'Marketing Copy', icon: '📣' },
        { feature: 'Voice Note Sale Ingestion & Receipt Scanner', cost: '2 BizCredits per audio/photo', type: 'AI Assistant', icon: '🎙️' },
        { feature: 'Market Square 7-Day Priority Showcase Boost', cost: '50 BizCredits (~₦500)', type: 'Store Visibility', icon: '🚀' },
        { feature: 'Product Studio Clean Backdrops', cost: '2 BizCredits per image', type: 'Visual Studio', icon: '📸' },
        { feature: '3-Year Structured Business Plan (PDF)', cost: '200 BizCredits', type: 'Planning Engine', icon: '📄' },
    ];

    const faqs = [
        { q: 'Are the Daily POS, Phone Barcode Scanner, and Day-Book really 100% free forever?', a: 'YES. Core daily bookkeeping should never be locked behind a paywall. The Daily 5-Second POS, Phone Camera Barcode/QR Scanner, Staff Shift Lock, Petty Cash & Fuel Tracker, Gbege Debt Book, Personal Storefront, 1-Tap Invoicing, and SmartScore™ Readiness summary require 0 credits and remain free forever.' },
        { q: 'How does the SmartScore™ 300–850 Readiness Score work?', a: 'Traditional banks often require landed collateral that many small businesses do not have. SmartBiz Coach calculates an internal 300–850 readiness score from your live recorded sales consistency, debt recovery rate, and margin health so you can export clean financial summaries when applying for loans or grants.' },
        { q: 'How does the Phone Camera Barcode & QR Scanner work?', a: 'You do not need to buy a Bluetooth or USB barcode reader. Open POS checkout on your smartphone, tap "Scan Barcode", and point your camera at an item barcode or QR code. It detects the code, adjusts inventory, and adds the item to the active bill.' },
        { q: 'What is the Central MSME Market Square and how does my personal online store work?', a: 'Every registered merchant gets a dedicated personal web store (smartbizcoach.com.ng/u/your-brand) and optional listing on /market. Buyers can browse products, see state delivery rates, and order via WhatsApp or Paystack checkout with live parcel tracking (/track/:code).' },
        { q: 'How does the Staff Shift Mode protect my shop?', a: 'When you activate Staff Shift Mode, cashier screens are locked behind your Owner Security Password (6+ characters). Attendants can record sales rapidly, but cannot delete previous sales, backdate entries, or view your owner profit margins.' },
        { q: 'Does the POS Day-Book work when there is no internet / network is down?', a: 'Yes. Sales and expenses logged during temporary network drops are saved locally on your device and synced automatically once your connection returns. We also recommend keeping periodic cloud backups when back online.' },
        { q: 'How does the Product Studio work on smartphone photos?', a: 'Take a photo of your product on your counter or table, choose a clean commercial backdrop (Marble, Sunlight, African Raffia, or Warm Oak), and generate promotional captions ready to post on WhatsApp and Instagram.' },
        { q: 'What does the Small Business Tax Guidance cover—is it legal advice?', a: 'No—it is strictly an informational guide and compliance checklist, not formal legal or tax advice. Under Nigeria’s small-company tax rules (Companies Income Tax Act / Nigeria Tax Act provisions), qualifying incorporated small companies below statutory turnover and fixed-asset caps (excluding professional services) may qualify for 0% corporate income tax, while annual tax returns with the Nigeria Revenue Service (NRS) and valid state/local government permits remain mandatory. Always consult a licensed tax practitioner for formal filings.' },
        { q: 'How do customers pay me through debt reminders and WhatsApp invoices?', a: 'When you send a WhatsApp reminder or 1-tap invoice via wa.me (0 credits), it automatically embeds your Paystack settlement link and your configured bank transfer details so customers can pay by card, bank transfer, or USSD.' },
        { q: 'How do I claim the 50 Free Welcome Credits and how do top-ups work?', a: 'After creating your account and verifying your email address, 50 Free Welcome Credits are credited to your wallet to try AI product studio edits, business plans, or marketplace boosts. Optional credit packs start at ₦500 (or Growth Merchant Pro subscriptions at ₦3,500/month on /pricing). Core store management tools stay free forever.' },
    ];

    const stats = [
        { value: '100% Offline', label: 'Zero-Data Daily Ledger', icon: '📶' },
        { value: '5-Sec', label: 'Counter POS Speed', icon: '⚡' },
        { value: 'Automated', label: 'WhatsApp Receipts & Debt Reminders', icon: '💬' },
        { value: '100% Free', label: 'Core Tools Guarantee', icon: '🔒' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-green-200 overflow-x-hidden">
            <SEO
                title="SmartBiz Coach | Practical AI Operating System for Nigerian MSMEs"
                description="The AI-powered Business Operating System for Nigerian MSMEs. Offline POS Day-Book, Apprentice Anti-Theft Lock, Product Studio, Automated WhatsApp Debt Recovery, Digital Storefront, and Verified Business Grants."
                keywords="SmartBiz Coach, Nigerian MSME POS, offline day-book, apprentice PIN anti-theft, WhatsApp debt recovery, Paystack storefront Nigeria, BOI grants, SMEDAN business plan"
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
                            <button onClick={() => navigate('/market')} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-full font-extrabold transition-colors text-xs flex items-center gap-1.5 cursor-pointer">
                                <span>🇳🇬</span> Market Square
                            </button>
                            <button onClick={() => navigate('/track')} className="text-slate-600 hover:text-green-600 font-semibold transition-colors text-xs cursor-pointer">
                                Track Order
                            </button>
                            <button onClick={() => navigate('/blog')} className="text-slate-600 hover:text-green-600 font-semibold transition-colors text-sm flex items-center gap-1">
                                Blog <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            </button>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <PWAInstallButton variant="nav" />
                            {typeof window !== 'undefined' && localStorage.getItem('sb_auth_token') ? (
                                <button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-0.5 text-sm cursor-pointer">
                                    Go to Dashboard →
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => navigate('/login')} className="hidden md:block text-slate-600 hover:text-slate-900 font-semibold transition-colors text-sm px-4 py-2 rounded-lg hover:bg-slate-100">
                                        Sign In
                                    </button>
                                    <button onClick={() => navigate('/register')} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-0.5 text-sm">
                                        Start Free →
                                    </button>
                                </>
                            )}
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
                            <button onClick={() => { setMobileMenuOpen(false); navigate('/market'); }} className="block w-full text-left py-2.5 px-3 text-emerald-700 bg-emerald-50 font-extrabold hover:bg-emerald-100 rounded-xl transition-colors">
                                🇳🇬 Shop Nigerian Market Square
                            </button>
                            <button onClick={() => { setMobileMenuOpen(false); navigate('/track'); }} className="block w-full text-left py-2.5 px-3 text-slate-700 font-semibold hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                                🚚 Track an Order
                            </button>
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
                                <span className="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                                    📶 Works 100% Offline
                                </span>
                            </motion.div>

                            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.08] mb-6">
                                Run, Grow & Digitize
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400">
                                    Your Entire Business
                                </span>
                                <br />
                                <span className="text-slate-300 text-2xl sm:text-4xl font-bold">Right From Your Smartphone</span>
                            </h1>

                            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed mb-6 font-normal">
                                SmartBiz Coach gives Nigerian merchants, retailers, and entrepreneurs a practical operating system to record daily sales offline, protect till cash with apprentice PINs, recover customer debts via automated WhatsApp reminders, and sell 24/7 on a verified digital storefront.
                            </p>

                            {/* Structured Provision Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8 max-w-xl">
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-emerald-400 text-sm mt-0.5">⚡</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">Offline Day-Book & POS</div>
                                        <div className="text-[11px] text-slate-400">Record cash, transfer, & POS sales in 5 seconds — even with zero network.</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-blue-400 text-sm mt-0.5">🛡️</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">Staff PIN & Till Defense</div>
                                        <div className="text-[11px] text-slate-400">Prevent till theft and price tampering with a 4-digit supervisor shift lock.</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-emerald-400 text-sm mt-0.5">💬</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">WhatsApp Debt Reminders</div>
                                        <div className="text-[11px] text-slate-400">Automated polite payment notices with 1-tap Paystack & bank transfer links.</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <span className="text-purple-400 text-sm mt-0.5">🏪</span>
                                    <div>
                                        <div className="text-xs font-bold text-white">Storefront & Market Square</div>
                                        <div className="text-[11px] text-slate-400">Your personal digital shop with direct bank payouts and nationwide reach.</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-12">
                                <button onClick={() => navigate('/register')} className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-base font-black rounded-2xl shadow-2xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-1 transition-all cursor-pointer">
                                    🚀 Start Free — Open Your Store
                                </button>
                                <button onClick={() => navigate('/market')} className="flex items-center justify-center gap-2 px-7 py-4 bg-white text-slate-950 hover:bg-emerald-50 text-base font-black rounded-2xl shadow-xl transition-all cursor-pointer">
                                    🇳🇬 Shop Market Square (No Login) →
                                </button>
                                <PWAInstallButton variant="hero" label="📲 Install Free App (Phone / PC)" />
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
                                    <div className="text-[10px] text-blue-600 font-bold">Tiered ID & CAC Badges</div>
                                </motion.div>

                                <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                                    className="absolute bottom-8 -right-6 bg-slate-900 rounded-2xl shadow-2xl p-3.5 border border-slate-700 w-48">
                                    <div className="text-[10px] font-black text-teal-400 uppercase tracking-wider mb-1">Formalization Desk</div>
                                    <div className="text-xl font-black text-white">CAC & Tax Ready</div>
                                    <div className="text-[10px] text-emerald-400 font-semibold">MSME Guidance & Checklists</div>
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

            {/* ═══════════ LIVE PUBLIC MARKET SQUARE SHOWCASE (ONLY WHEN POPULATED) ═══════════ */}
            {FEATURE_FLAGS.marketSquareDirectory && (marketItems.length > 0 || marketCategory !== '') && (
            <section id="live-marketplace" className="py-16 bg-gradient-to-b from-white via-emerald-50/30 to-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-widest uppercase mb-3 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                Live Public Marketplace · 36 States + FCT
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                🇳🇬 Featured Products from Nigerian Small Businesses
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
                                Browse and buy directly from verified Nigerian MSMEs — pay securely via Paystack or order on WhatsApp with zero account required.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <button
                                onClick={() => navigate('/track')}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold cursor-pointer"
                            >
                                🚚 Track an Order
                            </button>
                            <button
                                onClick={() => navigate('/market')}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/20 cursor-pointer"
                            >
                                View All Products in Market Square →
                            </button>
                        </div>
                    </div>

                    {/* Quick Category Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {[
                            { id: '', label: '🔥 All Featured' },
                            { id: 'Fashion', label: '👗 Fashion & Wears' },
                            { id: 'Electronics', label: '📱 Electronics & Gadgets' },
                            { id: 'Groceries', label: '🍲 Agro & Groceries' },
                            { id: 'Beauty', label: '💄 Beauty & Hair' },
                            { id: 'Home', label: '🛋️ Home & Living' },
                            { id: 'SERVICE', label: '🛠️ Professional Services' },
                            { id: 'B2B', label: '📦 B2B Wholesale' },
                        ].map((cat) => (
                            <button
                                key={cat.id || 'all'}
                                onClick={() => setMarketCategory(cat.id)}
                                className={`shrink-0 px-4 py-2 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
                                    marketCategory === cat.id
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Product Grid */}
                    {marketLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="bg-white rounded-3xl border border-slate-100 p-4 space-y-3 animate-pulse">
                                    <div className="aspect-[4/3] rounded-2xl bg-slate-100" />
                                    <div className="h-3 w-2/3 bg-slate-100 rounded" />
                                    <div className="h-4 w-1/2 bg-slate-100 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : marketItems.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
                            <p className="text-base font-extrabold text-slate-800">Explore the National Market Square</p>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Discover verified products, services, and wholesale suppliers across Nigeria or list your own shop items in 60 seconds.
                            </p>
                            <div className="flex justify-center gap-3 pt-1">
                                <button onClick={() => navigate('/market')} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer">
                                    🇳🇬 Open Market Square
                                </button>
                                <button onClick={() => navigate('/register')} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer">
                                    🏪 List Your Products Free
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {marketItems.map((item) => {
                                const itemUrl = item.brand_slug ? `/u/${item.brand_slug}/p/${item.id}` : `/market/p/${item.id}`;
                                const storeUrl = item.brand_slug ? `/u/${item.brand_slug}` : '/market';
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(itemUrl)}
                                        className="group bg-white rounded-3xl border border-slate-200/80 hover:border-emerald-400 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                                    >
                                        <div>
                                            <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
                                                )}
                                                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                                                    {item.is_promoted && (
                                                        <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase shadow">
                                                            ⚡ Featured
                                                        </span>
                                                    )}
                                                    {item.deal_active && item.discount_percent ? (
                                                        <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase shadow">
                                                            -{item.discount_percent}% Deal
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {item.location && (
                                                    <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md">
                                                        📍 {item.location}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-3.5 sm:p-4 space-y-1">
                                                <div className="flex items-center justify-between gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(storeUrl);
                                                        }}
                                                        className="text-[10px] font-extrabold text-emerald-700 hover:underline truncate cursor-pointer"
                                                    >
                                                        🏪 {item.brand_name || 'Verified MSME'}
                                                    </button>
                                                    {item.is_vendor_verified && (
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                            ✓ Verified
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-1 group-hover:text-emerald-700">
                                                    {item.name}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 flex items-center justify-between border-t border-slate-100">
                                            <div>
                                                <span className="text-sm sm:text-base font-black text-slate-900">
                                                    ₦{Number(item.price || 0).toLocaleString()}
                                                </span>
                                                {item.compare_at_price && Number(item.compare_at_price) > Number(item.price) && (
                                                    <span className="block text-[10px] text-slate-400 line-through">
                                                        ₦{Number(item.compare_at_price).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white px-2.5 py-1 rounded-xl transition-colors">
                                                Buy / View →
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Bottom Callout Strip for Merchants & Buyers */}
                    <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1 text-center sm:text-left">
                            <p className="text-sm sm:text-base font-black">
                                🏪 Own a small business in Nigeria? Get your own shareable online store & Market Square listing free.
                            </p>
                            <p className="text-xs text-slate-300">
                                Every product you add gets a direct WhatsApp/Paystack link (`/u/your-shop/p/item`) and appears in the nationwide Market Square.
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2.5 shrink-0">
                            <button
                                onClick={() => navigate('/market')}
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold cursor-pointer"
                            >
                                Browse All Listings
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer"
                            >
                                Open Your Free Store →
                            </button>
                        </div>
                    </div>
                </div>
            </section>
            )}

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
                        <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-black tracking-widest uppercase mb-4 border border-green-200">The 7 Core Pillars</span>
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
                                                <span>📸 Product Catalog Studio</span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">16 Backdrops</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3.5 border border-white/30 space-y-2">
                                                <div className="text-white text-xs font-black">Input: Raw Counter Photo</div>
                                                <div className="text-[10px] text-emerald-200">➔ Output: Clean Luxury Marble & Warm Oak Set</div>
                                                <div className="text-[10px] text-white/80 bg-black/20 p-2 rounded-lg">Backdrop Composite ✓ • Storefront Ready ✓ • Promo Badge Added ✓</div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 text-[10px]">
                                                <div className="font-bold mb-0.5">💬 WhatsApp Status Copy Generated:</div>
                                                <div className="text-white/80 italic text-[9px]">"Exclusive Luxury Edition now in stock. Nationwide delivery available. Tap to order now!"</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-white text-purple-900 rounded-xl py-2 text-[10px] font-black text-center shadow">Download Studio Photo</div>
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
                                        <div className="relative z-10 space-y-2.5">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between items-center">
                                                <span>🏪 Storefront /u/kemi-couture</span>
                                                <span className="bg-emerald-400/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full text-[9px] font-bold">⭐ 4.9 (58 Reviews)</span>
                                            </div>
                                            {[
                                                { icon: '📦', title: 'Live Order #SB-8921', sub: 'In Transit via Dispatch • Track at /track/SB-8921', badge: 'Paid (Paystack Direct)' },
                                                { icon: '🚚', title: 'Nationwide Delivery Quotes', sub: 'Lagos ₦1,500 • Abuja ₦2,500 • Rivers ₦2,500', badge: '36 States' },
                                                { icon: '📣', title: 'AI WhatsApp Promo Pack', sub: '1-Click viral Status & Broadcast captions in Pidgin/English', badge: '2 Credits' },
                                                { icon: '⚡', title: '24-Hour Spotlight Boost', sub: 'Promoted to #1 in Market Square Fashion Category', badge: '10 Credits' },
                                            ].map(({ icon, title, sub, badge }) => (
                                                <div key={title} className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 flex items-center gap-3">
                                                    <span className="text-base">{icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white text-[10px] font-black">{title}</div>
                                                        <div className="text-white/70 text-[9px] truncate">{sub}</div>
                                                    </div>
                                                    <span className="text-white/90 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap">{badge}</span>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-1">
                                                <div className="flex-1 bg-white text-blue-900 rounded-xl py-2 text-[10px] font-black text-center shadow">1-Click WhatsApp Store Share (+5 🪙)</div>
                                                <div className="flex-1 bg-white/20 text-white rounded-xl py-2 text-[10px] font-black text-center border border-white/30">Free Unlimited Listings</div>
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'tax' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between">
                                                <span>⚖️ Tax & Formalization Guide</span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Informational Only</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30 space-y-2">
                                                <div className="text-white font-black text-xs">Small-Company Tax Readiness Summary</div>
                                                <div className="text-[10px] text-emerald-200">Qualifying Incorporated Small Companies: 0% CIT (Annual NRS Return Still Mandatory)</div>
                                                <div className="text-[9px] text-white/80 leading-relaxed">Informational checklist covering turnover/asset caps, exclusions, and local permit reminders. Consult a licensed tax adviser for filings.</div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-[10px] space-y-1">
                                                <div className="font-bold text-amber-300">🏛️ Assisted CAC Filing Desk</div>
                                                <div className="text-white/80">Business Name (from ₦20k) • Ltd Co (from ₦65k) • TIN & SCUML Checklists</div>
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
                                                📄 3-Year Bankable Business Plan Ready for PDF Download
                                            </div>
                                        </div>
                                    )}

                                    {tab.mockup === 'datascience' && (
                                        <div className="relative z-10 space-y-2.5">
                                            <div className="text-white/90 text-xs font-black uppercase tracking-wider flex justify-between items-center">
                                                <span>🧠 SmartScore™ Readiness Hub</span>
                                                <span className="bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-full text-[9px]">SmartScore 742 / 850</span>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30 space-y-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold">Internal Readiness Grade: 87.3%</span>
                                                    <span className="text-emerald-300 font-black text-[10px]">Lender-Ready Summary ✓</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[9px] text-white/90">
                                                    <div className="bg-black/20 p-2 rounded-lg">
                                                        <span className="text-white/60 block">Cashflow Consistency</span>
                                                        <strong className="text-emerald-300 text-[10px]">94% (Stable Daily)</strong>
                                                    </div>
                                                    <div className="bg-black/20 p-2 rounded-lg">
                                                        <span className="text-white/60 block">Debt Recovery Speed</span>
                                                        <strong className="text-amber-300 text-[10px]">4.2 Days Avg</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 space-y-1 text-[9px]">
                                                <div className="flex justify-between items-center font-bold">
                                                    <span className="text-amber-300">📈 Restock Alert: Indomie Cartons</span>
                                                    <span className="text-rose-300 font-mono">Est. 4.8 Days Left</span>
                                                </div>
                                                <div className="flex justify-between items-center text-white/80">
                                                    <span>🛡️ Cashier Till Audit:</span>
                                                    <span className="text-emerald-300 font-bold">0 Anomalies • Clean Till ✓</span>
                                                </div>
                                                <div className="flex justify-between items-center text-white/80">
                                                    <span>🏷️ Margin Pricing Guide:</span>
                                                    <span className="text-purple-200 font-bold">+4.5% Suggested Margin</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-0.5">
                                                <div className="flex-1 bg-white text-indigo-950 rounded-xl py-2 text-[10px] font-black text-center shadow">
                                                    📄 Export Financial Dossier PDF
                                                </div>
                                                <div className="flex-1 bg-white/20 text-white rounded-xl py-2 text-[10px] font-black text-center border border-white/30">
                                                    Review Till Audit
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

            {/* ═══════════ FULL PLATFORM CAPABILITIES GRID ═══════════ */}
            <section className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-black tracking-widest uppercase mb-4 border border-slate-200">Core Wedge &amp; Advanced Suite</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Complete Operating Tools. Built for Daily Reliability.</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Start with our battle-tested core — offline Day-Book POS, staff shift lock, debt recovery, and your web storefront — and unlock optional AI &amp; planning tools as you grow.</p>
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
                                Illustrative planning estimates based on your slider inputs above. Actual time savings and collections vary by business volume and operations.
                            </p>
                        </motion.div>

                        {/* Results */}
                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="space-y-4">
                            {[
                                { icon: '⏱️', label: 'Hours Saved Monthly', value: `${timeSaved} hrs`, sub: 'From 5-Sec POS, automated day-book & WhatsApp close', color: 'from-violet-600 to-purple-700' },
                                { icon: '💸', label: 'Avg. Debt Recovered/Month', value: `₦${debtRecovered.toLocaleString('en-NG')}`, sub: 'Via automated WhatsApp reminders and Paystack links', color: 'from-red-600 to-rose-700' },
                                { icon: '💰', label: 'Grant Programs Eligible', value: grantEligibility, sub: 'Based on your revenue tier — matched automatically', color: 'from-emerald-600 to-teal-700' },
                                { icon: '🚀', label: 'Potential Revenue Uplift', value: `+₦${Math.round(roiRevenue * 0.15).toLocaleString('en-NG')}`, sub: 'From digital storefront, marketplace reach & social content', color: 'from-amber-600 to-orange-700' },
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
                            { num: '02', icon: '🏢', title: 'Set Up Your Shop', desc: 'Add your business name, set your Owner Security Password, and enter your opening cash balance.' },
                            { num: '03', icon: '⚡', title: 'Sell, Snap & Collect', desc: 'Check out sales in 5 seconds, turn phone photos into clean studio sets, and log customer debts.' },
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

            {/* ═══════════ PILOT MERCHANT PROGRAM ═══════════ */}
            <section className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-widest uppercase mb-4 border border-emerald-200">Pilot Merchant Program</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Join Our Open Pilot for Nigerian MSMEs</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">We are onboarding real Nigerian shops to test our core daily workflow—offline POS, apprentice lock, debt ledger, and web storefront—with direct founder support.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pilotProgramTracks.map((track, i) => (
                            <motion.div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <span className="text-2xl">{track.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{track.badge}</span>
                                    </div>
                                    <h3 className="text-base font-extrabold text-slate-900 mb-2">{track.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-6">{track.desc}</p>
                                </div>
                                <button onClick={() => navigate('/register')} className="text-left text-xs font-black text-emerald-700 hover:text-emerald-800 cursor-pointer">
                                    Reserve a Pilot Spot →
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ PRICING PACKS ═══════════ */}
            <section id="pricing" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-purple-100 text-purple-700 text-xs font-black tracking-widest uppercase mb-4 border border-purple-200">Flexible Pricing</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Simple, Transparent Pricing. Core POS Free Forever.</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Core daily tools are 100% free. Top up pay-as-you-go BizCredits starting at ₦500 for AI compute, or choose Growth Merchant Pro monthly/annual plans on <Link to="/pricing" className="text-emerald-700 font-bold underline">our pricing page</Link>.</p>
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
                                Built to help MSME training programs, microfinance institutions, chambers of commerce, and NGOs equip businesses with audit-ready bookkeeping, tax &amp; CAC readiness checklists, and structured financial documentation aligned with SMEDAN, BOI, and development-finance standards.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
                                    <div className="text-2xl font-black text-emerald-400">100%</div>
                                    <div className="text-xs text-slate-400">Audit-Ready POS &amp; Ledger</div>
                                </div>
                                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
                                    <div className="text-2xl font-black text-teal-400">Tax &amp; CAC</div>
                                    <div className="text-xs text-slate-400">MSME Formalization Guides</div>
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
                                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">🛟 Support &amp; Help</div>
                                        <div className="font-mono text-[11px] truncate mt-0.5">support@smartbizcoach.com.ng</div>
                                    </a>
                                    <a href="mailto:admin@smartbizcoach.com.ng" className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors block">
                                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">⚙️ Platform Admin</div>
                                        <div className="font-mono text-[11px] truncate mt-0.5">admin@smartbizcoach.com.ng</div>
                                    </a>
                                </div>
                                <div className="text-[11px] text-slate-400 pt-1">
                                    {getSupportDisplayPhone() ? (
                                        <>Official Support Line / WhatsApp: <a href={getSupportWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-bold underline">{getSupportDisplayPhone()}</a></>
                                    ) : (
                                        <>Dedicated Support Desk: <Link to="/contact" className="text-emerald-300 font-bold underline">smartbizcoach.com.ng/contact</Link></>
                                    )}
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
                                    <Link to="/contact"
                                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-extrabold px-6 py-3 rounded-xl text-sm transition-all shadow-md">
                                        🛟 Visit Support Desk →
                                    </Link>
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
                            Join Nigerian entrepreneurs and pilot merchants using SmartBiz Coach to check out sales in 5 seconds, enhance product photos, recover debts, and formalize with ease.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button onClick={() => navigate('/register')} className="bg-white hover:bg-green-50 text-green-800 px-10 py-4 rounded-2xl text-lg font-extrabold transition-all shadow-2xl hover:-translate-y-1 hover:shadow-white/20">
                                Create Your Free Account →
                            </button>
                            <button onClick={() => navigate('/login')} className="border-2 border-white/30 hover:border-white/60 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all hover:bg-white/10">
                                Already have an account? Sign In
                            </button>
                        </div>
                        <p className="text-green-200/60 text-sm mt-8">No credit card required • 50 Welcome Credits after email verification 🎁 • Free core tools forever • Paystack secured 🔒 • NDPA 2023 Compliant</p>
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
                            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">The practical Business Operating System for Nigerian MSMEs. Offline-capable POS Day-Book, Staff Shift Lock, Product Catalog Studio, Central MSME Market Square, WhatsApp Debt Recovery, and Tax &amp; CAC Readiness Guides.</p>

                            <div className="space-y-3">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Follow &amp; Contact</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { href: 'https://www.facebook.com/profile.php?id=61580131486753', label: 'Facebook', color: 'hover:bg-[#1877F2]', icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /> },
                                        { href: 'https://www.instagram.com/smartbizcoach1/', label: 'Instagram', color: 'hover:bg-gradient-to-r hover:from-[#833ab4] hover:via-[#fd1d1d] hover:to-[#fcb045]', icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /> },
                                    ].map(({ href, label, color, icon }) => (
                                        <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                                            className={`group flex items-center gap-2 px-3 py-2 bg-slate-900 ${color} rounded-xl border border-slate-800 hover:border-transparent transition-all duration-200`}>
                                            <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">{icon}</svg>
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{label}</span>
                                        </a>
                                    ))}
                                    <Link to="/contact" className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-emerald-600 rounded-xl border border-slate-800 hover:border-transparent transition-all duration-200 text-xs font-bold text-slate-400 hover:text-white">
                                        🛟 Support Desk
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Platform</h4>
                            <ul className="space-y-3">
                                <li><a href="#features" className="text-sm text-slate-400 hover:text-green-400 transition-colors">7 Core Pillars</a></li>
                                <li><Link to="/market" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Central Market Square</Link></li>
                                <li><a href="#how-it-works" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Operating Timeline</a></li>
                                <li><a href="#guarantee" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Free Tools Guarantee</a></li>
                                <li><Link to="/pricing" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Pricing &amp; Pro Plans</Link></li>
                                <li><a href="#faq" className="text-sm text-slate-400 hover:text-green-400 transition-colors">FAQ</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Resources</h4>
                            <ul className="space-y-3">
                                <li><Link to="/blog" className="text-sm text-emerald-400 font-semibold hover:underline transition-colors flex items-center gap-1.5">Impact &amp; Partnership Blog <span className="text-[10px] bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">New</span></Link></li>
                                <li><Link to="/help" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Help &amp; Guides</Link></li>
                                <li><Link to="/grants-guide" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Grant Matcher Guide</Link></li>
                                <li><Link to="/cac-checklist" className="text-sm text-slate-400 hover:text-green-400 transition-colors">CAC Compliance Guide</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Legal &amp; Trust</h4>
                            <ul className="space-y-3">
                                <li><Link to="/about" className="text-sm text-slate-400 hover:text-green-400 transition-colors">About SmartBiz</Link></li>
                                <li><Link to="/contact" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Contact &amp; Support</Link></li>
                                <li><a href="#partnership" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Institutional Partners</a></li>
                                <li><Link to="/privacy" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Privacy Policy (NDPA 2023)</Link></li>
                                <li><Link to="/terms" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Terms of Service</Link></li>
                                <li><Link to="/refund-policy" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Refund Policy</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-4">
                        <p>© {new Date().getFullYear()} SmartBiz Coach. All rights reserved. 🇳🇬 Made in Nigeria, for Nigerian MSMEs.</p>
                        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full">
                            <span className="text-green-400 text-xs">🔒</span>
                            <span className="text-xs text-slate-400">Secured by Paystack · NDPA 2023 Aligned · Built for Nigerian MSMEs</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ═══════════ STICKY MOBILE FLOATING CTA BAR ═══════════ */}
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] z-40 flex items-center justify-between gap-2 shadow-2xl">
                <button
                    onClick={() => navigate('/market')}
                    className="flex-1 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition"
                >
                    <span>🇳🇬</span>
                    <span>Market Square</span>
                </button>
                <button
                    onClick={() => navigate('/register')}
                    className="flex-1 min-h-[44px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-3 py-2 rounded-xl font-black text-xs shadow-lg shadow-green-600/30 active:scale-95 transition flex items-center justify-center gap-1"
                >
                    <span>🚀 Free +50 🪙</span>
                </button>
            </div>
        </div>
    );
};

export default LandingPage;
