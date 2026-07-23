import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';

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

    const handlePartnerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPartnerLoading(true);
        setTimeout(() => { setPartnerLoading(false); setPartnerSubmitted(true); }, 1200);
    };

    // ROI Calculator derived values
    const timeSaved = Math.round(roiHours * 0.7 * 4);
    const debtRecovered = Math.round(roiRevenue * 0.08);
    const grantEligibility = roiRevenue < 200000 ? 'TEF, BOI MSME' : roiRevenue < 1000000 ? 'BOI, CBN, TEF' : 'BOI, DBN, Angel Investors';

    // ── DATA ──
    const allFeatures = [
        { icon: '🎥', title: 'Product Video Suite', desc: 'Record short 15-30s product videos directly or upload clips. AI extracts key frames to pre-fill listings, while the teleprompter helps you record scrolling video scripts.', color: 'from-pink-600 to-rose-600', tag: 'New' },
        { icon: '📲', title: 'Direct Meta Publishing', desc: '1-click direct social publishing to Instagram Business and Facebook Pages. Push posts, reels, captions, and hashtags instantly without copy-pasting.', color: 'from-blue-600 to-indigo-600', tag: 'New' },
        { icon: '📣', title: 'Broadcast HQ Campaigns', desc: 'Send targeted WhatsApp & SMS campaign blasts. Import CSV contacts, filter by audience tags (VIP, Lead), and insert personalized {{name}} variables.', color: 'from-emerald-600 to-teal-600', tag: 'Upgraded' },
        { icon: '🤝', title: 'WhatsApp Negotiation Sandbox', desc: 'Practice closing tough deals with interactive AI customer roleplay before messaging live leads. Includes Pidgin, Corporate, and FOMO tones.', color: 'from-amber-500 to-orange-600', tag: 'New' },
        { icon: '📸', title: 'AI Snap & List', desc: 'Photograph any product and our vision AI instantly creates the listing — name, price, category, and sales copy. Onboard 50 products in minutes.', color: 'from-violet-500 to-purple-600' },
        { icon: '✨', title: 'AI Brand Builder', desc: 'Generate logos, colors, taglines, and a full visual identity tailored to your Nigerian audience in seconds.', color: 'from-pink-500 to-rose-600' },
        { icon: '✍️', title: 'Content Studio', desc: 'Create viral social media posts, WhatsApp broadcasts, and promotional flyers — customized to Nigerian culture and trends.', color: 'from-orange-500 to-amber-600' },
        { icon: '📄', title: 'Business Plan Generator', desc: 'Produce investor-ready, bank-quality business plans in under 5 minutes. Perfect for BOI, CBN, and TEF applications.', color: 'from-blue-500 to-indigo-600' },
        { icon: '💰', title: 'Grant & Funding Matcher', desc: 'Automatically scan and match your business with available grants, BOI loans, and international donor programs.', color: 'from-emerald-500 to-teal-600' },
        { icon: '📒', title: 'Gbege Book (Debt Tracker)', desc: 'Track every customer owing you money. Send AI-generated WhatsApp reminders to recover funds — politely or firmly.', color: 'from-red-500 to-orange-600' },
        { icon: '🧾', title: 'Smart Invoicing', desc: 'Generate professional, shareable PDF invoices in seconds. Track payments and get notified on overdue invoices.', color: 'from-amber-500 to-yellow-600' },
        { icon: '🏪', title: 'Unified Marketplace', desc: 'List your products, services, properties, or B2B offers on our Nigerian SME marketplace — with WhatsApp lead routing built in.', color: 'from-green-500 to-emerald-600' },
    ];

    const featureTabs = [
        {
            label: '🎥 Product Video Suite',
            headline: 'Showcase your products live with 360-degree video reels',
            subheadline: 'Record. AI Frame Extraction. Teleprompter Scripting.',
            body: 'Buyers trust video demonstrations 3x more than still photos. Record 15-30s product videos directly on your phone camera or upload clips. AI Vision extracts key frames to pre-fill listings, while the in-app scrolling teleprompter helps you present like a pro.',
            bullets: [
                '🎥 Direct phone camera video recording & file upload (no external links needed)',
                '🤖 AI Vision extracts video frames to auto-detect title, category & sales copy',
                '📜 Scrolling in-app Teleprompter overlay while recording video scripts',
                '▶️ Reels-style vertical video player modal on Storefront & Marketplace',
                '⚡ Direct 1-click publishing to Instagram Reels, TikTok & Facebook',
            ],
            color: 'from-rose-600 to-pink-700',
            mockup: 'snap',
        },
        {
            label: '📲 Direct Meta & Broadcast HQ',
            headline: '1-Click Social Publishing & WhatsApp/SMS Broadcast Blasts',
            subheadline: 'Meta Direct Publishing + Tagged Audience Campaigns.',
            body: 'Publish generated captions, graphics, and hashtags directly to your Facebook Pages and Instagram Business accounts in 1 click. Then launch high-converting WhatsApp & SMS campaigns using CSV contact imports and dynamic {{name}} placeholders.',
            bullets: [
                '📲 Direct 1-click publishing to Facebook Pages & Instagram Business',
                '📊 Import CSV customer lists & segment by tags (VIP, Lead, Pending Payment)',
                '✍️ Dynamic template placeholders ({{name}}, {{product}}) for personalized messages',
                '🚀 Dual-channel dispatch: Safe rate-limited WhatsApp + Termii SMS backup',
                '📈 Real-time delivery logs & engagement metrics tracking',
            ],
            color: 'from-blue-600 to-indigo-700',
            mockup: 'crm',
        },
        {
            label: '💬 WhatsApp Negotiation Sandbox',
            headline: 'Practice closing tough deals with interactive AI customer roleplay',
            subheadline: 'Master buyer objections before messaging live leads.',
            body: 'Enter the negotiation sandbox to test your WhatsApp closing skills against realistic AI buyers. Get instant feedback on mindset analysis, objection handling, and closing scripts tailored in Naija Pidgin, Corporate, or FOMO tones.',
            bullets: [
                '🤝 Interactive negotiation sandbox with live buyer feedback',
                '🧠 Automatic intent detection: price skepticism, delivery doubts & trust deficits',
                '🇳🇬 Multi-tone closing scripts: Naija Pidgin, Corporate, Soft-Pull & FOMO',
                '📋 Instant one-tap copy & paste into live WhatsApp customer chats',
                '📈 Boost lead conversion rates by up to 45%',
            ],
            color: 'from-amber-600 to-orange-700',
            mockup: 'crm',
        },
        {
            label: '📸 AI Snap & List',
            headline: 'List 50 products in 5 minutes with your camera',
            subheadline: 'Point. Snap. Done.',
            body: 'No more typing product names one by one. Our AI Vision technology reads your photos and video clips to instantly generate the product name, category, estimated price, and a compelling sales description. Just review, edit, and publish.',
            bullets: [
                '📷 Works with phone or desktop camera upload',
                '🤖 Gemini AI vision classifies product type automatically',
                '✍️ Auto-generates professional sales copy per listing',
                '🏪 One tap to publish to the marketplace',
                '📦 Updates inventory stock and ledger instantly',
            ],
            color: 'from-violet-600 to-purple-700',
            mockup: 'snap',
        },
        {
            label: '🏦 Investor Ready',
            headline: 'Get funded. Get compliant. Get official.',
            subheadline: 'Built for BOI, CBN, TEF, NGO, and bank applications.',
            body: 'SmartBiz Coach generates the exact documentation investors and government agencies expect. From business plans to financial ledgers, compliance checklists and grant matching — everything you need to access funding in Nigeria is in one dashboard.',
            bullets: [
                '📄 Bank-grade business plans accepted by BOI, CBN, TEF',
                '💰 Scans 100+ Nigerian grants and matches your eligibility',
                '⚖️ CAC, TIN, SCUML, NAFDAC step-by-step compliance guide',
                '📊 Transaction ledger meets NGO and investor reporting standards',
                '🤝 Direct partnership intake with investors and agencies',
            ],
            color: 'from-emerald-600 to-teal-700',
            mockup: 'investor',
        },
    ];

    const ecosystemSteps = [
        { icon: '📸', label: 'Snap Photo', desc: 'Camera or upload', color: 'bg-violet-100 border-violet-300 text-violet-700' },
        { icon: '🤖', label: 'AI Classifies', desc: 'Type, price, copy', color: 'bg-blue-100 border-blue-300 text-blue-700' },
        { icon: '📦', label: 'Inventory Updated', desc: 'Stock & ledger sync', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
        { icon: '🛒', label: 'Marketplace Live', desc: 'Buyers see listing', color: 'bg-amber-100 border-amber-300 text-amber-700' },
        { icon: '💬', label: 'WhatsApp Lead', desc: 'CRM auto-logs deal', color: 'bg-green-100 border-green-300 text-green-700' },
        { icon: '💳', label: 'Cash Tracked', desc: 'Ledger & invoice', color: 'bg-pink-100 border-pink-300 text-pink-700' },
    ];

    const testimonials = [
        { name: 'Chidinma Obi', role: 'Fashion Designer, Lagos', avatar: 'CO', color: 'bg-pink-500', text: 'SmartBiz Coach generated my entire brand identity in 3 minutes. Logo, colors, tagline — everything. I\'ve been trying for 2 years. This is a real game changer.', stars: 5 },
        { name: 'Emeka Nwosu', role: 'Agro-Processor, Enugu', avatar: 'EN', color: 'bg-green-600', text: 'I used the Grant Matcher and found a BOI loan I didn\'t know existed. The business plan was exactly what the bank wanted. My application got approved!', stars: 5 },
        { name: 'Fatima Al-Hassan', role: 'Boutique Owner, Kano', avatar: 'FA', color: 'bg-purple-500', text: 'The Gbege Book alone is worth everything. I was losing track of who owed me. Now I send AI reminders and people actually pay! E don do.', stars: 5 },
        { name: 'Tunde Adeyemi', role: 'Tech Freelancer, Abuja', avatar: 'TA', color: 'bg-blue-500', text: 'The CAC compliance checker saved me ₦50k in legal consultation fees. Walked me through everything step by step. Every entrepreneur needs this app.', stars: 5 },
        { name: 'Ngozi Williams', role: 'Caterer & Events, Port Harcourt', avatar: 'NW', color: 'bg-amber-500', text: 'My social media content used to take all day. Now I generate a week\'s worth of captions in 10 minutes. My engagement has gone up 300%.', stars: 5 },
        { name: 'Alhaji Bello', role: 'Building Materials, Kaduna', avatar: 'BA', color: 'bg-teal-600', text: 'I used AI Snap to list my entire warehouse of materials in one afternoon. Now buyers find me on the B2B marketplace and message me on WhatsApp. Business has doubled.', stars: 5 },
    ];

    const packs = [
        { name: 'Starter Pack', price: '₦300', credits: '30 Credits', tag: null, color: 'border-slate-200', btnColor: 'bg-slate-900 hover:bg-slate-700', popular: false, perks: ['30 AI Credits', '~30 basic tasks', 'Brand Builder (6x)', 'Content Posts (15x)', 'Debt Reminders (30x)', 'Email Support'] },
        { name: 'Grower Pack', price: '₦1,000', credits: '120 Credits', tag: '🔥 Most Popular', color: 'border-green-500', btnColor: 'bg-green-600 hover:bg-green-500', popular: true, perks: ['120 AI Credits', 'Best value for money', 'Business Plans (8x)', 'Grant Searches (60x)', 'Brand Builder (24x)', 'Priority Support'] },
        { name: 'Pro Pack', price: '₦3,000', credits: '400 Credits', tag: '💎 Best Value', color: 'border-purple-500', btnColor: 'bg-purple-700 hover:bg-purple-600', popular: false, perks: ['400 AI Credits', 'For serious businesses', 'Business Plans (26x)', 'Content Posts (200x)', 'All features unlocked', 'VIP Support'] },
    ];

    const faqs = [
        { q: 'Is SmartBiz Coach free to use?', a: 'Yes! You get free daily usage on most AI tools when you sign up. You only pay for extra usage with our affordable credit packs starting at just ₦300 — no credit card required to get started.' },
        { q: 'How does the AI Snap & List feature work?', a: 'Simply take photos of your products and upload them. Our Gemini Vision AI analyzes each image, identifies the product type, suggests a name, category, price range, and writes a professional sales copy. You review and publish in one click.' },
        { q: 'What business types can use SmartBiz Coach?', a: 'Any Nigerian SME! Whether you sell physical goods, offer services (by hour or project), rent/sell property, or operate B2B (logistics, wholesale, influencer marketing, raw materials) — we have category-specific tools for you.' },
        { q: 'How does the WhatsApp CRM lead feature work?', a: 'When buyers find your marketplace listing, they click "Contact via WhatsApp" which opens a pre-filled professional message to you. Every inquiry is automatically saved in your CRM ledger so you can track and follow up on all leads.' },
        { q: 'Are the business plans accepted by Nigerian banks and investors?', a: 'Yes. Our AI generates detailed, structured plans with financial projections, market analysis, and SWOT analysis — meeting the standards for BOI, CBN, TEF, and most Nigerian commercial banks and NGO grant bodies.' },
        { q: 'Is my business data safe?', a: 'Absolutely. We use industry-standard encryption and never share your business data with third parties. Your information, your inventory, your clients — all protected. We also comply with NDPR data privacy requirements.' },
        { q: 'Can NGOs and agencies use SmartBiz Coach for their beneficiaries?', a: 'Yes! We have a dedicated NGO/Agency partner program that lets organizations onboard SME cohorts, track their progress, generate reports, and access bulk credit allocations. Contact us via the Partnership section below.' },
        { q: 'How do I top up credits?', a: 'Instantly via Paystack from inside the app — bank card, bank transfer, or USSD. Credits never expire and there\'s no monthly subscription. Buy what you need, when you need it.' },
    ];

    const stats = [
        { value: '10,000+', label: 'Active Businesses', icon: '🏢' },
        { value: '₦500M+', label: 'In Grants Discovered', icon: '💰' },
        { value: '50,000+', label: 'AI Tasks Completed', icon: '⚡' },
        { value: '4.9★', label: 'Average Rating', icon: '⭐' },
    ];

    const ngoStats = [
        { value: '35+', label: 'Grant Programs Matched' },
        { value: '₦2.5B+', label: 'Funding Accessible' },
        { value: '98%', label: 'Plan Acceptance Rate' },
        { value: '12+', label: 'Agency Partners' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-green-200 overflow-x-hidden">
            <SEO
                title="SmartBiz Coach | AI Platform for Nigerian SMEs"
                description="The ultimate AI operating system for Nigerian businesses. Snap products with AI, manage inventory, find grants, close sales on WhatsApp — all in Naira, all in one place."
            />

            {/* ═══════════ NAVBAR ═══════════ */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center cursor-pointer gap-2" onClick={() => navigate('/')}>
                            <img src="/logo-horizontal.png" alt="SmartBiz Coach" className="h-9 w-auto object-contain" onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextSibling as HTMLElement;
                                if (sibling) sibling.style.display = 'flex';
                            }} />
                            <div className="hidden items-center gap-2">
                                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-black shadow">S</div>
                                <span className="font-black text-slate-900 text-lg">SmartBiz<span className="text-green-600">Coach</span></span>
                            </div>
                        </div>

                        <div className="hidden md:flex space-x-8 items-center">
                            {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ'], ['#partnership', 'Partners']].map(([href, label]) => (
                                <a key={href} href={href} className="text-slate-600 hover:text-green-600 font-semibold transition-colors text-sm">{label}</a>
                            ))}
                        </div>

                        <div className="flex items-center space-x-3">
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
                            {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ'], ['#partnership', 'Partners']].map(([href, label]) => (
                                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 text-slate-700 font-semibold hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">{label}</a>
                            ))}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <button onClick={() => navigate('/login')} className="w-full text-left py-2.5 px-3 text-slate-700 font-semibold hover:bg-slate-50 rounded-xl">Sign In</button>
                                <button onClick={() => navigate('/register')} className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-bold text-center">Get Started Free →</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ═══════════ HERO ═══════════ */}
            <section className="relative pt-28 pb-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900">
                {/* Decorative background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-green-500/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl -ml-40"></div>
                    <div className="absolute top-1/3 left-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl"></div>
                    {/* Grid lines */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[85vh] pb-0">
                        {/* Left: Copy */}
                        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="text-left pt-8">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
                                <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-green-500/20 text-green-400 text-xs font-black tracking-widest border border-green-500/30 uppercase">
                                    🇳🇬 Built for Nigerian Entrepreneurs
                                </span>
                            </motion.div>

                            <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-6">
                                The AI Business
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400">
                                    Operating System
                                </span>
                                <br />
                                <span className="text-slate-300 text-4xl sm:text-5xl font-bold">for every Nigerian SME</span>
                            </h1>

                            <p className="text-lg text-slate-400 max-w-xl leading-relaxed mb-8">
                                Snap products with AI, manage inventory, find grants worth billions, close deals on WhatsApp, and track every naira — all in one powerful platform built <strong className="text-slate-200">for Nigeria, priced for Nigeria</strong>.
                            </p>

                            {/* Feature badges */}
                            <div className="flex flex-wrap gap-2 mb-10">
                                {['📸 AI Snap & List', '🏪 B2B Marketplace', '💰 Grant Matcher', '🧾 Smart Invoicing', '💬 WhatsApp CRM'].map(badge => (
                                    <span key={badge} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-full">{badge}</span>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mb-12">
                                <button onClick={() => navigate('/register')} className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-base font-black rounded-2xl shadow-2xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-1 transition-all">
                                    🚀 Start Free — No Credit Card
                                </button>
                                <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-base font-bold rounded-2xl border border-white/20 hover:border-white/40 transition-all">
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
                                    src="/hero-illustration.png"
                                    alt="Nigerian entrepreneur using SmartBiz Coach"
                                    className="w-full h-auto max-h-[600px] object-contain drop-shadow-2xl"
                                    onError={(e) => {
                                        e.currentTarget.parentElement!.innerHTML = `
                                        <div class="w-full aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 flex items-center justify-center">
                                            <div class="text-center text-slate-400">
                                                <div class="text-6xl mb-4">🇳🇬</div>
                                                <div class="font-bold">SmartBiz Coach</div>
                                                <div class="text-sm">AI Business Platform</div>
                                            </div>
                                        </div>`;
                                    }}
                                />

                                {/* Floating UI cards */}
                                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute top-8 -left-10 bg-white rounded-2xl shadow-2xl p-3 border border-slate-100 w-44">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center text-xs">📦</div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Stock Alert</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900">Fabric — Low Stock</div>
                                    <div className="text-[10px] text-red-500 font-semibold mt-0.5">5 units remaining</div>
                                </motion.div>

                                <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                                    className="absolute bottom-20 -left-6 bg-white rounded-2xl shadow-2xl p-3 border border-slate-100 w-48">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center text-xs">💰</div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Grant Match</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900">BOI MSME Loan</div>
                                    <div className="text-[10px] text-green-600 font-bold">96% Match • Up to ₦5M</div>
                                </motion.div>

                                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                                    className="absolute top-16 -right-8 bg-white rounded-2xl shadow-2xl p-3 border border-slate-100 w-44">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center text-xs">💬</div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">New Lead</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900">Bulk Order Inquiry</div>
                                    <div className="text-[10px] text-green-600 font-bold">WhatsApp • Just now</div>
                                </motion.div>

                                <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                                    className="absolute bottom-8 -right-6 bg-slate-900 rounded-2xl shadow-2xl p-3 border border-slate-700 w-44">
                                    <div className="text-[10px] font-black text-green-400 uppercase tracking-wider mb-1">Revenue Today</div>
                                    <div className="text-xl font-black text-white">₦47,500</div>
                                    <div className="text-[10px] text-emerald-400 font-semibold">↑ 23% vs yesterday</div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Bottom wave into white */}
                <div className="relative h-24 mt-0">
                    <svg viewBox="0 0 1440 96" className="absolute bottom-0 w-full" preserveAspectRatio="none">
                        <path d="M0,64 C480,96 960,0 1440,64 L1440,96 L0,96 Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* ═══════════ ECOSYSTEM FLOW ═══════════ */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-violet-100 text-violet-700 text-xs font-black tracking-widest uppercase mb-4 border border-violet-200">How the Magic Works</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">From camera snap to closed deal</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">The entire SmartBiz ecosystem — connected, automated, and working for you 24/7.</p>
                    </motion.div>

                    {/* Ecosystem flow diagram */}
                    <div className="relative">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {ecosystemSteps.map((step, i) => (
                                <motion.div key={i} className="relative flex flex-col items-center text-center"
                                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                    {/* Connector line */}
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

            {/* ═══════════ FEATURE TABS ═══════════ */}
            <section id="features" className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-black tracking-widest uppercase mb-4 border border-green-200">Key Capabilities</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Built for every stage of your business</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Explore what makes SmartBiz Coach different from every other app you've tried.</p>
                    </motion.div>

                    {/* Tab Buttons */}
                    <div className="flex flex-wrap justify-center gap-2 mb-10">
                        {featureTabs.map((tab, i) => (
                            <button key={i} onClick={() => setActiveFeatureTab(i)}
                                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${activeFeatureTab === i ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'}`}>
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
                                    <div className={`inline-block w-12 h-12 rounded-2xl bg-gradient-to-br ${tab.color} flex items-center justify-center text-2xl mb-6 shadow-lg`}>
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
                                        Try This Feature Free →
                                    </button>
                                </div>

                                {/* Mockup panel */}
                                <div className={`bg-gradient-to-br ${tab.color} rounded-2xl p-6 shadow-2xl min-h-[320px] flex flex-col justify-between relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>

                                    {tab.mockup === 'snap' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/80 text-xs font-black uppercase tracking-wider">📸 AI Snap Processing</div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                                                <div className="text-white text-xs font-black mb-2">Photo Uploaded ✓</div>
                                                <div className="space-y-1.5">
                                                    {[['Product Name', 'Ankara Print Fabric (6 yards)'], ['Category', 'Fashion & Textiles'], ['Est. Price', '₦4,500 — ₦6,000'], ['Type', 'Physical Goods']].map(([k, v]) => (
                                                        <div key={k} className="flex justify-between text-[10px]">
                                                            <span className="text-white/70">{k}:</span>
                                                            <span className="text-white font-bold">{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                                                <div className="text-white text-[10px] font-black mb-1">✍️ AI Sales Copy</div>
                                                <div className="text-white/90 text-[10px] leading-relaxed">"Premium Ankara print fabric, 6 yards. Perfect for aso-ebi, matching outfits, and tailoring. Vibrant colors, soft texture. Available for nationwide delivery..."</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-white text-violet-700 rounded-xl py-2 text-[10px] font-black text-center">✓ Save to Inventory</div>
                                                <div className="flex-1 bg-white/20 text-white rounded-xl py-2 text-[10px] font-black text-center border border-white/30">Publish to Market</div>
                                            </div>
                                        </div>
                                    )}
                                    {tab.mockup === 'inventory' && (
                                        <div className="relative z-10 space-y-2">
                                            <div className="text-white/80 text-xs font-black uppercase tracking-wider">📦 Inventory Categories</div>
                                            {[
                                                { icon: '🛍️', type: 'Physical Goods', example: 'Fabric, Electronics, Food', count: '45 items' },
                                                { icon: '🛠️', type: 'Services', example: 'Tailoring per hour', count: '3 offers' },
                                                { icon: '🏠', type: 'Properties', example: '3-bed Lagos Island flat', count: '1 listing' },
                                                { icon: '🤝', type: 'B2B Hub', example: 'Wholesale, Logistics, Influencer', count: '8 listings' },
                                            ].map(({ icon, type, example, count }) => (
                                                <div key={type} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 flex items-center gap-3">
                                                    <span className="text-lg">{icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white text-[10px] font-black">{type}</div>
                                                        <div className="text-white/70 text-[9px] truncate">{example}</div>
                                                    </div>
                                                    <span className="text-white/80 text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {tab.mockup === 'crm' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/80 text-xs font-black uppercase tracking-wider">💬 Active Leads</div>
                                            {[
                                                { name: 'Kola Adesanya', type: 'Wholesale Inquiry', time: '2 min ago', status: 'New' },
                                                { name: 'Amaka Traders', type: 'Logistics Quote', time: '15 min ago', status: 'Replied' },
                                                { name: 'TechVault Ltd', type: 'B2B Service Deal', time: '1 hr ago', status: 'Pending' },
                                            ].map(({ name, type, time, status }) => (
                                                <div key={name} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="text-white text-[11px] font-black">{name}</div>
                                                            <div className="text-white/70 text-[9px]">{type}</div>
                                                        </div>
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${status === 'New' ? 'bg-emerald-400 text-emerald-900' : status === 'Replied' ? 'bg-blue-400 text-blue-900' : 'bg-amber-400 text-amber-900'}`}>{status}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <div className="flex-1 bg-white text-green-700 rounded-lg py-1 text-[9px] font-black text-center">💬 WhatsApp</div>
                                                        <div className="text-white/50 text-[9px]">{time}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {tab.mockup === 'investor' && (
                                        <div className="relative z-10 space-y-3">
                                            <div className="text-white/80 text-xs font-black uppercase tracking-wider">🏦 Funding Dashboard</div>
                                            {[
                                                { name: 'BOI MSME Loan', amount: 'Up to ₦5M', match: '96%', status: 'Apply Now' },
                                                { name: 'TEF Entrepreneurship', amount: '$5,000 USD', match: '88%', status: 'Eligible' },
                                                { name: 'CBN Creative Fund', amount: 'Up to ₦2.5M', match: '78%', status: 'Eligible' },
                                            ].map(({ name, amount, match, status }) => (
                                                <div key={name} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg">💰</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white text-[10px] font-black truncate">{name}</div>
                                                        <div className="text-white/70 text-[9px]">{amount}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-emerald-300 text-[10px] font-black">{match}</div>
                                                        <div className="text-white/50 text-[8px]">{status}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="bg-white text-blue-800 rounded-xl p-3 text-[10px] font-black flex items-center gap-2">
                                                <span>📄</span> Business Plan: Ready for Download
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>

            {/* ═══════════ ALL FEATURES GRID ═══════════ */}
            <section className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-black tracking-widest uppercase mb-4 border border-slate-200">Full Feature Suite</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">One platform. Every tool you need.</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Replace 10+ separate apps with a single Nigerian-focused AI platform that costs less than a bowl of suya.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {allFeatures.map((f, i) => (
                            <motion.div key={i} className="group bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all duration-300 cursor-pointer relative"
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                                {f.tag && (
                                    <span className={`absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${f.tag === 'New' ? 'bg-green-100 text-green-700' : f.tag === 'Upgraded' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {f.tag}
                                    </span>
                                )}
                                <div className={`w-11 h-11 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center text-xl shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    {f.icon}
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
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
                                Estimates are based on average SME outcomes reported by SmartBiz Coach users across Lagos, Abuja, Kano, and Port Harcourt.
                            </p>
                        </motion.div>

                        {/* Results */}
                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="space-y-4">
                            {[
                                { icon: '⏱️', label: 'Hours Saved Monthly', value: `${timeSaved} hrs`, sub: 'From automated invoicing, debt reminders & content', color: 'from-violet-600 to-purple-700' },
                                { icon: '💸', label: 'Avg. Debt Recovered/Month', value: `₦${debtRecovered.toLocaleString('en-NG')}`, sub: 'Via AI-powered WhatsApp debt reminders (Gbege Book)', color: 'from-red-600 to-rose-700' },
                                { icon: '💰', label: 'Grant Programs Eligible', value: grantEligibility, sub: 'Based on your revenue tier — matched automatically', color: 'from-emerald-600 to-teal-700' },
                                { icon: '🚀', label: 'Potential Revenue Uplift', value: `+₦${Math.round(roiRevenue * 0.15).toLocaleString('en-NG')}`, sub: 'From content automation, marketplace visibility & CRM', color: 'from-amber-600 to-orange-700' },
                            ].map(({ icon, label, value, sub, color }, i) => (
                                <motion.div key={i} className={`bg-gradient-to-r ${color} rounded-2xl p-5 shadow-lg`}
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
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">No tech degree needed. If you can send a WhatsApp voice note, you can use SmartBiz Coach.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { num: '01', icon: '🚀', title: 'Create Free Account', desc: 'Sign up in 60 seconds. No credit card. No hidden fees. Just your email and you\'re in.' },
                            { num: '02', icon: '🏢', title: 'Set Up Your Business', desc: 'Tell us your business name, type, location, and industry. AI personalizes everything to your context.' },
                            { num: '03', icon: '📸', title: 'Snap, List & Publish', desc: 'Use AI Snap to onboard your products, or manually create listings. Publish to the marketplace in one click.' },
                            { num: '04', icon: '📈', title: 'Grow & Get Funded', desc: 'Attract buyers via WhatsApp, track leads in your CRM, apply for matched grants, and watch your business grow.' },
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
                        <span className="inline-block py-1 px-3 rounded-full bg-amber-100 text-amber-700 text-xs font-black tracking-widest uppercase mb-4 border border-amber-200">🇳🇬 Real Stories</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Nigerian entrepreneurs love it</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Join thousands of business owners already using SmartBiz Coach to grow faster and smarter.</p>
                    </motion.div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {testimonials.map((t, i) => (
                            <motion.div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md hover:border-slate-200 transition-all"
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                                <div className="flex mb-3">
                                    {[...Array(t.stars)].map((_, si) => <span key={si} className="text-amber-400 text-sm">★</span>)}
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${t.color} rounded-full flex items-center justify-center text-white text-xs font-black shadow`}>{t.avatar}</div>
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

            {/* ═══════════ PRICING ═══════════ */}
            <section id="pricing" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-black tracking-widest uppercase mb-4 border border-green-200">Naira-Friendly Pricing</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Pay only for what you use</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">No monthly subscriptions. No hidden fees. Top up with Paystack via card, bank transfer, or USSD. Credits never expire.</p>
                    </motion.div>

                    <motion.div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-8 text-white text-center shadow-xl shadow-green-600/20"
                        initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                        <div className="text-2xl font-extrabold mb-1">🎉 Start Free — Always</div>
                        <p className="text-green-100 text-sm">Every new account gets free daily usage on most tools. No credit card required to get started.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packs.map((p, i) => (
                            <motion.div key={i} className={`relative bg-white rounded-2xl p-8 border-2 ${p.color} ${p.popular ? 'shadow-2xl shadow-green-500/20 scale-105' : 'shadow-sm'} transition-all hover:shadow-lg`}
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                {p.tag && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">{p.tag}</div>}
                                <div className="text-center mb-6">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{p.name}</div>
                                    <div className="text-5xl font-extrabold text-slate-900">{p.price}</div>
                                    <div className="text-sm text-slate-500 mt-1">{p.credits}</div>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {p.perks.map((perk, pi) => (
                                        <li key={pi} className="flex items-center gap-3 text-sm text-slate-600">
                                            <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                                            {perk}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/register')} className={`w-full py-3 ${p.btnColor} text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-md`}>
                                    Get Started →
                                </button>
                            </motion.div>
                        ))}
                    </div>
                    <p className="text-center text-slate-400 text-sm mt-8">All packs are one-time top-ups via Paystack. Secure payment guaranteed 🔒</p>
                </div>
            </section>

            {/* ═══════════ NGO & INVESTOR HUB ═══════════ */}
            <section id="partnership" className="py-24 bg-gradient-to-br from-slate-950 to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-blue-900/60 text-blue-400 text-xs font-black tracking-widest uppercase mb-4 border border-blue-800">For Investors & Agencies</span>
                        <h2 className="text-4xl font-extrabold text-white mb-4">Partner in the African SME Digital Revolution</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">SmartBiz Coach is building the infrastructure for 40 million Nigerian micro-entrepreneurs to access capital, markets, and tools. Join us.</p>
                    </motion.div>

                    {/* NGO Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                        {ngoStats.map((s, i) => (
                            <motion.div key={i} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 text-center"
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                <div className="text-3xl font-extrabold text-white mb-1"><AnimatedCounter target={s.value} /></div>
                                <div className="text-xs text-slate-400 font-semibold">{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        {/* Left: Value propositions */}
                        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
                            {[
                                { icon: '🏦', title: 'Bank & BOI Compliant Business Plans', desc: 'Our AI generates plans structured to meet Nigerian banking requirements and government agency templates (BOI, CBN, BOA, DBN).' },
                                { icon: '📊', title: 'Investor-Grade Transaction Ledger', desc: 'SMEs get a professional cash flow ledger and income statement. NGOs can pull aggregate impact reports on beneficiary businesses.' },
                                { icon: '🎓', title: 'Cohort Management for NGOs', desc: 'Onboard hundreds of SMEs under your program, track their digital readiness progress, and generate reporting dashboards for your funders.' },
                                { icon: '🌍', title: 'International Donor Ready', desc: 'Supports USAID, World Bank, GIZ, and EU digital inclusion grant documentation formats. Perfect for SME support organizations.' },
                            ].map(({ icon, title, desc }, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-slate-800 border border-slate-700 text-2xl rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">{icon}</div>
                                    <div>
                                        <h4 className="font-bold text-white text-base mb-1">{title}</h4>
                                        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>

                        {/* Right: Partnership Form */}
                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 backdrop-blur-sm">
                            {partnerSubmitted ? (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                                    <div className="w-16 h-16 bg-green-900/50 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-md border border-green-800">✓</div>
                                    <h3 className="text-2xl font-bold text-white mb-3">Proposal Submitted!</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                                        Thank you, <strong className="text-white">{partnerName}</strong>. We received your <strong className="text-green-400">{partnerType}</strong> inquiry. We'll reach out to <strong className="text-white">{partnerEmail}</strong> shortly.
                                    </p>
                                    <a href={`https://wa.me/2349064556107?text=Hello%20Meshach,%20I%20just%20submitted%20a%20partnership%20proposal%20for%20SmartBiz%20Coach%20as%20a%20${encodeURIComponent(partnerType)}.`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-extrabold px-6 py-3 rounded-xl text-sm transition-all shadow-md">
                                        💬 Discuss on WhatsApp →
                                    </a>
                                </motion.div>
                            ) : (
                                <form onSubmit={handlePartnerSubmit} className="space-y-5">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">Partnership Inquiry</h3>
                                        <p className="text-xs text-slate-400 mb-6">Let's discuss how we can work together to scale SmartBiz Coach across Nigeria and Africa.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                                            <input type="text" required value={partnerName} onChange={e => setPartnerName(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-slate-500" placeholder="Full Name" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                                            <input type="email" required value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-slate-500" placeholder="email@firm.com" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Organization</label>
                                        <input type="text" required value={partnerOrg} onChange={e => setPartnerOrg(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-slate-500" placeholder="Company / NGO / Investment Firm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Partnership Type</label>
                                        <select value={partnerType} onChange={e => setPartnerType(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors">
                                            <option value="Equity Investment">Equity Investment / VC Funding</option>
                                            <option value="NGO Program Integration">NGO / Development Agency Program</option>
                                            <option value="Government Agency">Government Agency (BOI, CBN, etc.)</option>
                                            <option value="Corporate Sponsorship">Corporate Sponsorship</option>
                                            <option value="Creative Hub Integration">Creative Hub / Incubator Integration</option>
                                            <option value="International Donor">International Donor / Grant Body</option>
                                            <option value="Other">Other Strategic Partnership</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Message</label>
                                        <textarea required rows={3} value={partnerMessage} onChange={e => setPartnerMessage(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-600 text-white rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors resize-none placeholder-slate-500" placeholder="Describe your collaboration interest or investment thesis..."></textarea>
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
                        <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-black tracking-widest uppercase mb-4 border border-slate-200">Got Questions?</span>
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
            <section className="relative py-28 bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 overflow-hidden">
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
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-300">world-class tools</span>
                        </h2>
                        <p className="text-xl text-green-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Join 10,000+ Nigerian entrepreneurs using SmartBiz Coach to brand, manage, sell, and get funded. Start completely free today.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button onClick={() => navigate('/register')} className="bg-white hover:bg-green-50 text-green-800 px-10 py-4 rounded-2xl text-lg font-extrabold transition-all shadow-2xl hover:-translate-y-1 hover:shadow-white/20">
                                Create Your Free Account →
                            </button>
                            <button onClick={() => navigate('/login')} className="border-2 border-white/30 hover:border-white/60 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all hover:bg-white/10">
                                Already have an account?
                            </button>
                        </div>
                        <p className="text-green-200/60 text-sm mt-8">No credit card • No monthly fee • Cancel anytime • Paystack secured 🔒</p>
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
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">The most comprehensive AI business management platform built specifically for Nigerian SMEs. Brand, manage, and grow — all in one place.</p>

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
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Product</h4>
                            <ul className="space-y-3">
                                {[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
                                    <li key={label}><a href={href} className="text-sm text-slate-400 hover:text-green-400 transition-colors">{label}</a></li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Resources</h4>
                            <ul className="space-y-3">
                                <li><a href="#blog" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Blog & Guides</a></li>
                                <li><span onClick={() => navigate('/help')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Help Center</span></li>
                                <li><span onClick={() => navigate('/grants-guide')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Grants Guide</span></li>
                                <li><span onClick={() => navigate('/cac-checklist')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">CAC Checklist</span></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Company</h4>
                            <ul className="space-y-3">
                                <li><span onClick={() => navigate('/about')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">About Us</span></li>
                                <li><a href="#partnership" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Investors & NGOs</a></li>
                                <li><span onClick={() => navigate('/privacy')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Privacy Policy</span></li>
                                <li><span onClick={() => navigate('/terms')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Terms of Service</span></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-4">
                        <p>© {new Date().getFullYear()} SmartBiz Coach. All rights reserved. 🇳🇬 Made in Nigeria, for Nigeria.</p>
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                            <span className="text-green-400 text-xs">🔒</span>
                            <span className="text-xs text-slate-400">Secured by Paystack · NDPR Compliant</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
