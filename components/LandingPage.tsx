import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        { icon: '✨', title: 'AI Brand Builder', desc: 'Generate logos, brand colors, taglines, and a full visual identity tailored to your Nigerian audience in seconds.', color: 'from-violet-500 to-purple-600', bgHover: 'hover:bg-violet-50 hover:border-violet-200' },
        { icon: '✍️', title: 'Content Studio', desc: 'Create viral social media posts, WhatsApp broadcasts, and promotional flyers — customized to Nigerian culture and trends.', color: 'from-pink-500 to-rose-600', bgHover: 'hover:bg-pink-50 hover:border-pink-200' },
        { icon: '📄', title: 'Business Plan Generator', desc: 'Produce investor-ready, bank-quality business plans in under 5 minutes. Perfect for BOI, CBN, and TEF applications.', color: 'from-blue-500 to-indigo-600', bgHover: 'hover:bg-blue-50 hover:border-blue-200' },
        { icon: '💰', title: 'Grant & Funding Matcher', desc: 'Automatically scan and match your business with available grants, BOI loans, and international donor programs.', color: 'from-emerald-500 to-teal-600', bgHover: 'hover:bg-emerald-50 hover:border-emerald-200' },
        { icon: '📒', title: 'Gbege Book (Debtor Tracker)', desc: 'Track every customer that owes you money. Send polite or firm AI-generated WhatsApp reminders to recover funds.', color: 'from-red-500 to-orange-600', bgHover: 'hover:bg-red-50 hover:border-red-200' },
        { icon: '🧾', title: 'Smart Invoicing', desc: 'Generate professional, shareable PDF invoices in seconds. Track payments and get notified on overdue invoices.', color: 'from-amber-500 to-yellow-600', bgHover: 'hover:bg-amber-50 hover:border-amber-200' },
        { icon: '⚖️', title: 'CAC Compliance Checker', desc: 'Navigate CAC registration, TIN, SCUML, and NAFDAC requirements. Get a step-by-step checklist for your business type.', color: 'from-teal-500 to-cyan-600', bgHover: 'hover:bg-teal-50 hover:border-teal-200' },
        { icon: '💬', title: 'WhatsApp Sales Closer', desc: 'Never lose a sale again. Get AI-crafted responses for objections, follow-ups, and closing — ready to paste into WhatsApp.', color: 'from-green-500 to-lime-600', bgHover: 'hover:bg-green-50 hover:border-green-200' },
        { icon: '📦', title: 'Inventory Management', desc: 'Track your stock levels, get low-stock alerts, and understand your best-selling products with smart analytics.', color: 'from-slate-500 to-gray-600', bgHover: 'hover:bg-slate-50 hover:border-slate-200' },
    ];

    const steps = [
        { num: '01', title: 'Create Your Free Account', desc: 'Sign up in 60 seconds with your email. No credit card required. Start exploring immediately.', icon: '🚀' },
        { num: '02', title: 'Set Up Your Business Profile', desc: 'Tell us your business name, industry, and location. Our AI personalizes everything to your context.', icon: '🏢' },
        { num: '03', title: 'Use Any AI Tool You Need', desc: 'Generate a business plan, create content, find grants, or check compliance — all from one dashboard.', icon: '⚡' },
        { num: '04', title: 'Share, Download & Grow', desc: 'Share results directly to WhatsApp, download PDFs, and watch your business grow faster than before.', icon: '📈' },
    ];

    const testimonials = [
        { name: 'Chidinma Obi', role: 'Fashion Designer, Lagos', avatar: 'CO', color: 'bg-pink-500', text: 'SmartBiz Coach generated a full brand identity for my clothing line in 3 minutes. I\'ve been trying to do this for 2 years. This app is a serious game changer for us hustlers.', stars: 5 },
        { name: 'Emeka Nwosu', role: 'Agro-Processor, Enugu', avatar: 'EN', color: 'bg-green-600', text: 'I used the Grant Matcher and found a BOI loan I didn\'t even know existed. The business plan it generated was exactly what the bank asked for. My application is in progress!', stars: 5 },
        { name: 'Fatima Al-Hassan', role: 'Boutique Owner, Kano', avatar: 'FA', color: 'bg-purple-500', text: 'The Gbege Book alone is worth everything. I was losing track of who owed me money. Now I send AI reminders and people actually pay! E don do.', stars: 5 },
        { name: 'Tunde Adeyemi', role: 'Tech Freelancer, Abuja', avatar: 'TA', color: 'bg-blue-500', text: 'The CAC compliance checker saved me ₦50k in legal consultation fees. It walked me through everything step by step. Nigerian entrepreneurs need this app.', stars: 5 },
        { name: 'Ngozi Williams', role: 'Caterer & Events, Port Harcourt', avatar: 'NW', color: 'bg-amber-500', text: 'My social media content used to take me all day. Now I generate a week\'s worth of captions in 10 minutes. My engagement has gone up by 300%.', stars: 5 },
        { name: 'Bello Abdullahi', role: 'Building Materials, Kaduna', avatar: 'BA', color: 'bg-teal-600', text: 'The invoice generator is clean, professional and my clients take me more seriously now. Sending invoices on WhatsApp with one tap — e be like magic.', stars: 5 },
    ];

    const packs = [
        { name: 'Starter Pack', price: '₦300', credits: '30 Credits', tag: null, color: 'border-slate-200', btnColor: 'bg-slate-900 hover:bg-slate-700', popular: false, perks: ['30 AI Credits', '~30 basic tasks', 'Brand Builder (6x)', 'Content Posts (15x)', 'Debt Reminders (30x)', 'Email Support'] },
        { name: 'Grower Pack', price: '₦1,000', credits: '120 Credits', tag: '🔥 Most Popular', color: 'border-green-500', btnColor: 'bg-green-600 hover:bg-green-500', popular: true, perks: ['120 AI Credits', 'Best value for money', 'Business Plans (8x)', 'Grant Searches (60x)', 'Brand Builder (24x)', 'Priority Support'] },
        { name: 'Pro Pack', price: '₦3,000', credits: '400 Credits', tag: '💎 Best Value', color: 'border-purple-500', btnColor: 'bg-purple-700 hover:bg-purple-600', popular: false, perks: ['400 AI Credits', 'For serious businesses', 'Business Plans (26x)', 'Content Posts (200x)', 'All features unlocked', 'Priority Support'] },
    ];

    const faqs = [
        { q: 'Is SmartBiz Coach free to use?', a: 'Yes! You get free daily usage on most AI tools when you sign up. You only pay for extra usage with our affordable credit packs starting at just ₦300.' },
        { q: 'How does the credit system work?', a: 'Each AI task uses a small number of credits. You can buy credit packs via Paystack (card, bank transfer, or USSD). Credits never expire.' },
        { q: 'Is my business data safe?', a: 'Yes. We use industry-standard encryption and never share your business data with third parties. Your information is yours alone.' },
        { q: 'Can I use it on my phone?', a: 'Absolutely. SmartBiz Coach is fully mobile-responsive and works perfectly on Android and iPhone browsers — no download needed.' },
        { q: 'What if I run out of credits?', a: 'You can top up instantly via Paystack from inside the app. There is no monthly subscription — just buy what you need, when you need it.' },
        { q: 'Are the business plans good enough for banks/investors?', a: 'Yes. Our AI generates detailed, structured plans with financial projections, market analysis, and SWOT analysis — meeting the standards for BOI, CBN, and most Nigerian banks.' },
    ];

    const stats = [
        { value: '10,000+', label: 'Active Businesses' },
        { value: '₦500M+', label: 'In Grants Discovered' },
        { value: '50,000+', label: 'AI Tasks Completed' },
        { value: '4.9★', label: 'Average Rating' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-green-200 overflow-x-hidden">
            <SEO
                title="SmartBiz Coach | AI Platform for Nigerian SMEs"
                description="The ultimate operating system for Nigerian businesses. Generate premium business plans, social media content, invoices, and find grants instantly."
            />

            {/* Navigation Bar */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
                            <img src="/logo-horizontal.png" alt="SmartBiz Coach" className="h-10 w-auto object-contain" />
                        </div>

                        <div className="hidden md:flex space-x-8 items-center">
                            <a href="#features" className="text-slate-600 hover:text-green-600 font-medium transition-colors text-sm">Features</a>
                            <a href="#how-it-works" className="text-slate-600 hover:text-green-600 font-medium transition-colors text-sm">How it Works</a>
                            <a href="#pricing" className="text-slate-600 hover:text-green-600 font-medium transition-colors text-sm">Pricing</a>
                            <a href="#faq" className="text-slate-600 hover:text-green-600 font-medium transition-colors text-sm">FAQ</a>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button onClick={() => navigate('/login')} className="hidden md:block text-slate-600 hover:text-slate-900 font-semibold transition-colors text-sm px-4 py-2 rounded-lg hover:bg-slate-100">
                                Sign In
                            </button>
                            <button onClick={() => navigate('/register')} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-0.5 text-sm">
                                Start Free →
                            </button>
                            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                                <div className="w-5 h-0.5 bg-slate-700 mb-1"></div>
                                <div className="w-5 h-0.5 bg-slate-700 mb-1"></div>
                                <div className="w-5 h-0.5 bg-slate-700"></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden bg-white border-t border-slate-100 shadow-lg px-4 py-4 space-y-2">
                            {['#features', '#how-it-works', '#pricing', '#faq'].map(href => (
                                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 text-slate-700 font-medium hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors capitalize">
                                    {href.replace('#', '').replace('-', ' ')}
                                </a>
                            ))}
                            <button onClick={() => navigate('/login')} className="w-full text-left py-2 px-3 text-slate-700 font-medium hover:bg-slate-50 rounded-lg">Sign In</button>
                            <button onClick={() => navigate('/register')} className="w-full bg-green-600 text-white py-2.5 px-4 rounded-xl font-bold text-center">Get Started Free</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* ───────── HERO ───────── */}
            <section className="relative pt-32 pb-20 sm:pt-44 sm:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-400/10 rounded-full blur-3xl -mr-60 -mt-60 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-400/10 rounded-full blur-3xl -ml-40 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-400/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div className="text-center max-w-4xl mx-auto" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                            <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-green-100 text-green-700 text-sm font-bold tracking-wide border border-green-200 mb-8">
                                🇳🇬 <span>Built for Nigerian Entrepreneurs</span>
                            </span>
                        </motion.div>

                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight font-heading mb-6 leading-[1.05]">
                            The AI Business Partner
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500">
                                Every Nigerian SME Needs
                            </span>
                        </h1>

                        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
                            Stop juggling ten different apps. Brand your business, generate content, create invoices, find grants, and track debtors — all powered by AI, all in Naira, all in one place.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                            <button onClick={() => navigate('/register')} className="flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-1 transition-all">
                                🚀 Start for Free — No Credit Card
                            </button>
                            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 text-lg font-bold rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all">
                                See All Features ↓
                            </button>
                        </div>

                        {/* Social proof numbers */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                            {stats.map((s, i) => (
                                <motion.div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                                    <div className="text-2xl font-extrabold text-slate-900 font-heading">{s.value}</div>
                                    <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Dashboard Mockup */}
                    <motion.div className="mt-20 relative max-w-5xl mx-auto" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
                        <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 via-emerald-400/20 to-teal-500/20 rounded-3xl blur-2xl"></div>
                        <div className="relative rounded-2xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                            {/* Browser chrome */}
                            <div className="bg-slate-100 flex items-center px-4 py-3 border-b border-slate-200">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="mx-auto bg-white rounded-md px-4 py-1 text-xs text-slate-400 font-mono shadow-sm border border-slate-200 flex items-center gap-2">
                                    <div className="w-3 h-3 text-green-500">🔒</div>
                                    app.smartbizcoach.com.ng
                                </div>
                            </div>

                            {/* High-Fidelity Dashboard Mockup */}
                            <div className="flex aspect-[16/9] w-full bg-slate-50 overflow-hidden font-sans">
                                {/* Sidebar */}
                                <div className="w-1/4 max-w-[220px] bg-white border-r border-slate-100 flex-col hidden md:flex">
                                    <div className="p-4 border-b border-slate-100 flex items-center space-x-2">
                                        <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow">S</div>
                                        <span className="font-bold text-slate-800 text-sm">SmartBiz</span>
                                    </div>
                                    <div className="flex-1 p-2 space-y-0.5 overflow-hidden">
                                        <div className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Business</div>
                                        {[
                                            ['📊', 'Dashboard', true],
                                            ['✨', 'Brand Builder', false],
                                            ['✍️', 'Content Studio', false],
                                            ['🧾', 'Invoices', false],
                                            ['📦', 'Inventory', false],
                                            ['📒', 'Gbege Book', false],
                                            ['💰', 'Grants', false],
                                        ].map(([icon, label, active], i) => (
                                            <div key={i} className={`w-full rounded-md px-3 py-1.5 flex items-center space-x-2 text-[11px] font-medium ${active ? 'bg-green-50 text-green-700' : 'text-slate-500'}`}>
                                                <span>{icon}</span><span>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-2">
                                        <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-xl p-3 text-center">
                                            <div className="text-[9px] font-bold mb-0.5">⚡ 45 Credits</div>
                                            <div className="text-[8px] opacity-80 bg-white/20 py-0.5 rounded cursor-pointer">Top Up →</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main content */}
                                <div className="flex-1 p-3 sm:p-5 overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-800">Good morning, Chidinma 👋</h2>
                                            <p className="text-[10px] text-slate-400">Sunday, Jun 28 • Lagos, Nigeria</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-green-700">45 Credits</span>
                                        </div>
                                    </div>

                                    {/* Daily wisdom */}
                                    <div className="w-full bg-slate-900 rounded-xl p-3 sm:p-4 text-white shadow-lg mb-3 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/20 rounded-full blur-xl"></div>
                                        <div className="flex items-center space-x-2 text-yellow-400 text-[9px] font-bold tracking-wider uppercase mb-1"><span>💡</span><span>Daily Wisdom</span></div>
                                        <p className="text-xs font-semibold text-white/90 font-heading">"No food for lazy man. Go get that bag today!"</p>
                                        <p className="text-[9px] text-slate-400 mt-1">— SmartBiz Coach AI</p>
                                    </div>

                                    {/* Quick actions */}
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {[['🧾', 'Invoice'], ['📒', 'Debt'], ['📦', 'Stock'], ['✨', 'Post']].map(([icon, label], i) => (
                                            <div key={i} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                                                <div className="text-lg mb-0.5">{icon}</div>
                                                <span className="text-[8px] font-medium text-slate-600">{label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-white p-2 rounded-xl border-l-4 border-red-500 border border-slate-100 shadow-sm">
                                            <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Debts Owed</div>
                                            <div className="text-sm font-bold text-slate-800">₦45,000</div>
                                            <div className="text-[8px] text-red-500 font-medium">3 debtors</div>
                                        </div>
                                        <div className="bg-white p-2 rounded-xl border-l-4 border-blue-500 border border-slate-100 shadow-sm">
                                            <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Stock Value</div>
                                            <div className="text-sm font-bold text-slate-800">₦320,000</div>
                                            <div className="text-[8px] text-blue-500 font-medium">18 items</div>
                                        </div>
                                        <div className="bg-white p-2 rounded-xl border-l-4 border-green-500 border border-slate-100 shadow-sm">
                                            <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Grant Score</div>
                                            <div className="text-sm font-bold text-slate-800">72/100</div>
                                            <div className="text-[8px] text-green-600 font-medium">High eligibility</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ───────── FEATURES ───────── */}
            <section id="features" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-green-100 text-green-700 text-sm font-bold tracking-wider uppercase mb-4 border border-green-200">Everything You Need</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 font-heading mb-4">One platform. Every business tool.</h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto">Replace 10+ apps with one affordable platform designed specifically for the Nigerian market.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((f, i) => (
                            <motion.div key={i} className={`group bg-slate-50 rounded-2xl p-7 border border-slate-100 ${f.bgHover} transition-all duration-300 cursor-pointer`}
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                                <div className={`w-12 h-12 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center text-2xl shadow-md mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">{f.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───────── HOW IT WORKS ───────── */}
            <section id="how-it-works" className="py-24 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/40 via-slate-900 to-slate-900 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-green-900/60 text-green-400 text-sm font-bold tracking-wider uppercase mb-4 border border-green-800">Simple to Get Started</span>
                        <h2 className="text-4xl font-extrabold text-white font-heading mb-4">Up and running in 4 steps</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">No tech knowledge needed. If you can use WhatsApp, you can use SmartBiz Coach.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {steps.map((s, i) => (
                            <motion.div key={i} className="relative" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                {i < steps.length - 1 && (
                                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-green-600/40 to-transparent z-0 -translate-y-0.5"></div>
                                )}
                                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 relative z-10 hover:border-green-600/50 transition-colors group">
                                    <div className="text-[10px] font-bold text-green-500 tracking-widest mb-3 uppercase">{s.num}</div>
                                    <div className="text-3xl mb-4">{s.icon}</div>
                                    <h3 className="text-base font-bold text-white mb-2 font-heading">{s.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───────── TESTIMONIALS ───────── */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-amber-100 text-amber-700 text-sm font-bold tracking-wider uppercase mb-4 border border-amber-200">Real Stories</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 font-heading mb-4">Nigerian entrepreneurs love it</h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto">Join thousands of business owners already using SmartBiz Coach to grow faster.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {testimonials.map((t, i) => (
                            <motion.div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-md hover:border-slate-200 transition-all" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                                <div className="flex mb-2">
                                    {[...Array(t.stars)].map((_, si) => <span key={si} className="text-amber-400 text-sm">★</span>)}
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${t.color} rounded-full flex items-center justify-center text-white text-xs font-bold shadow`}>{t.avatar}</div>
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

            {/* ───────── PRICING ───────── */}
            <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-bold tracking-wider uppercase mb-4 border border-blue-200">Affordable Pricing</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 font-heading mb-4">Pay only for what you use</h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto">No monthly subscriptions. Buy credit packs with Paystack — card, bank transfer, or USSD. Credits never expire.</p>
                    </motion.div>

                    {/* Free tier banner */}
                    <motion.div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-8 text-white text-center shadow-xl shadow-green-600/20" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                        <div className="text-2xl font-extrabold mb-1">🎉 Start Free — Always</div>
                        <p className="text-green-100 text-sm">Every new account gets free daily usage on most tools. No credit card required to get started.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packs.map((p, i) => (
                            <motion.div key={i} className={`relative bg-white rounded-2xl p-8 border-2 ${p.color} ${p.popular ? 'shadow-2xl shadow-green-500/20 scale-105' : 'shadow-sm'} transition-all hover:shadow-lg`}
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                {p.tag && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">{p.tag}</div>
                                )}
                                <div className="text-center mb-6">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{p.name}</div>
                                    <div className="text-5xl font-extrabold text-slate-900 font-heading">{p.price}</div>
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

            {/* ───────── FAQ ───────── */}
            <section id="faq" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-sm font-bold tracking-wider uppercase mb-4 border border-slate-200">Got Questions?</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 font-heading">Frequently Asked Questions</h2>
                    </motion.div>

                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <motion.div key={i} className="border border-slate-200 rounded-2xl overflow-hidden" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="w-full text-left p-5 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                    <span className="font-semibold text-slate-900 text-sm pr-4">{faq.q}</span>
                                    <span className={`text-slate-400 text-lg flex-shrink-0 transition-transform duration-200 ${activeFaq === i ? 'rotate-45' : ''}`}>+</span>
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

            {/* ───────── CTA ───────── */}
            <section className="bg-slate-900 py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-slate-900 to-slate-900 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <div className="text-5xl mb-6">🚀</div>
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-white font-heading mb-6">
                            Ready to grow your business?
                        </h2>
                        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                            Join over 10,000 Nigerian entrepreneurs using SmartBiz Coach to build better businesses. Start free today — no credit card needed.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button onClick={() => navigate('/register')} className="bg-green-500 hover:bg-green-400 text-slate-900 px-10 py-4 rounded-2xl text-lg font-extrabold transition-all shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-1">
                                Create Your Free Account →
                            </button>
                            <button onClick={() => navigate('/login')} className="border-2 border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all">
                                Already have an account?
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>
            {/* ───────── BLOG OUTLINE & SOCIAL STRATEGY SECTION ───────── */}
            <section id="blog" className="py-24 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold tracking-wider uppercase mb-4 border border-indigo-200">Featured Guides & Insights</span>
                        <h2 className="text-4xl font-extrabold text-slate-900 font-heading mb-4">SmartBiz Blog & Strategy Studio</h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto">Get actionable growth frameworks, digital marketing tactics, and compliance secrets for Nigerian business success.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Blog Card 1 */}
                        <motion.div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                            <div className="bg-indigo-600 text-white py-4 px-6 font-bold text-xs uppercase tracking-widest">
                                Marketing Strategy
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 font-heading mb-3">Scaling Your Retail Business with WhatsApp status sales loops</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                        Discover how local brands in Lagos generate over ₦500,000 monthly using targeted status updates, automated objection handling scripts, and seamless invoice closing.
                                    </p>
                                </div>
                                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs font-bold text-indigo-600">
                                    <span>5 Min Read</span>
                                    <span className="cursor-pointer hover:underline" onClick={() => navigate('/register')}>Read Framework →</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Blog Card 2 */}
                        <motion.div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                            <div className="bg-emerald-600 text-white py-4 px-6 font-bold text-xs uppercase tracking-widest">
                                Compliance & Funding
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 font-heading mb-3">CAC Registration & TIN Guide: Step-by-Step for MSMEs</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                        Stop paying legal consultants fortunes. Learn the exact requirements for limited liability registration and obtaining your Tax Identification Number directly.
                                    </p>
                                </div>
                                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs font-bold text-emerald-600">
                                    <span>7 Min Read</span>
                                    <span className="cursor-pointer hover:underline" onClick={() => navigate('/register')}>Read Checklist →</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Blog Card 3 */}
                        <motion.div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                            <div className="bg-purple-600 text-white py-4 px-6 font-bold text-xs uppercase tracking-widest">
                                SME Operations
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 font-heading mb-3">AI Business Planning: Drive Daily Sales & Boost Your Business ROI</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                        Learn how to leverage our Brand Builder, AI Content Studio, and automated WhatsApp payment reminders to streamline invoicing, attract local customers, and maximize your weekly profits.
                                    </p>
                                </div>
                                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs font-bold text-purple-600">
                                    <span>4 Min Read</span>
                                    <span className="cursor-pointer hover:underline" onClick={() => navigate('/register')}>Boost Your ROI →</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ───────── FOOTER ───────── */}
            <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                        <div className="col-span-2">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg">S</div>
                                <span className="font-bold text-xl text-white font-heading">SmartBiz Coach</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
                                The most comprehensive AI business management platform built specifically for Nigerian SMEs. Brand, manage, and grow — all in one place.
                            </p>
                            
                            {/* Verified Social Handles & Links */}
                            <div className="flex flex-wrap items-center gap-3">
                                <a href="https://www.facebook.com/profile.php?id=61580131486753" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-850 hover:bg-blue-600 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-slate-800">
                                    <span>📘</span> SmartBiz Facebook Page
                                </a>
                                <a href="https://www.facebook.com/zacharia.meshach/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-850 hover:bg-blue-700 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-slate-800">
                                    <span>👤</span> Founder FB
                                </a>
                                <a href="https://www.instagram.com/smartbizcoach1/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-850 hover:bg-pink-600 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-slate-800">
                                    <span>📸</span> Instagram
                                </a>
                                <a href="https://www.linkedin.com/in/meshach-zachariah-5a578912a/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-850 hover:bg-blue-800 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-slate-800">
                                    <span>💼</span> LinkedIn
                                </a>
                                <a href="https://wa.me/2349064556107" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-850 hover:bg-green-500 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-slate-800">
                                    <span>💬</span> WhatsApp Live
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Product</h4>
                            <ul className="space-y-3">
                                {['Features', 'Pricing', 'How It Works', 'FAQ'].map(l => (
                                    <li key={l}><a href={`#${l.toLowerCase().replace(' ', '-')}`} className="text-sm text-slate-400 hover:text-green-400 transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Resources</h4>
                            <ul className="space-y-3">
                                <li><a href="#blog" className="text-sm text-slate-400 hover:text-green-400 transition-colors">Blog Outline</a></li>
                                <li><span onClick={() => navigate('/help')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Help Center</span></li>
                                <li><span onClick={() => navigate('/grants-guide')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Grants Guide</span></li>
                                <li><span onClick={() => navigate('/cac-checklist')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">CAC Checklist</span></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-4 uppercase text-xs tracking-wider">Company</h4>
                            <ul className="space-y-3">
                                <li><span onClick={() => navigate('/about')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">About Us</span></li>
                                <li><span onClick={() => navigate('/contact')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Contact</span></li>
                                <li><span onClick={() => navigate('/privacy')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Privacy Policy</span></li>
                                <li><span onClick={() => navigate('/terms')} className="text-sm text-slate-400 hover:text-green-400 transition-colors cursor-pointer">Terms of Service</span></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-4">
                        <p>© {new Date().getFullYear()} SmartBiz Coach. All rights reserved. 🇳🇬 Made for Nigeria.</p>
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                            <span className="text-green-400 text-xs">🔒</span>
                            <span className="text-xs text-slate-400">Secured by Paystack</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
