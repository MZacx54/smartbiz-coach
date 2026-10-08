import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    ArrowRight, 
    Calendar, 
    Clock, 
    Building2, 
    Scale, 
    TrendingUp, 
    Store, 
    CheckCircle2, 
    Share2, 
    MessageSquare, 
    Filter,
    ShieldCheck,
    Sparkles,
    ArrowLeft
} from 'lucide-react';
import SEO from './SEO';
import { BLOG_POSTS, BlogPost } from '../data/blogPosts';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const BlogIndex: React.FC = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [cohortFormSubmitted, setCohortFormSubmitted] = useState<boolean>(false);
    const [orgName, setOrgName] = useState<string>('');
    const [orgEmail, setOrgEmail] = useState<string>('');
    const [cohortSize, setCohortSize] = useState<string>('500 - 2,000 MSMEs');

    const categories = ['All', 'Partnerships & NGOs', 'Tax & Compliance', 'Growth & Grants', 'Retail Operations'];

    const filteredPosts = useMemo(() => {
        return BLOG_POSTS.filter((post) => {
            const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                post.title.toLowerCase().includes(query) ||
                post.excerpt.toLowerCase().includes(query) ||
                post.tags.some(t => t.toLowerCase().includes(query));
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery]);

    const featuredPost = BLOG_POSTS[0];

    const handleCohortSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users/partnership-inquiry/', {
                name: orgName,
                email: orgEmail,
                organization: orgName,
                cohort_size: cohortSize,
                partnership_type: 'SME Training & NGO Cohorts',
                message: `Target Cohort Scale: ${cohortSize}`,
                source: 'Blog Cohort Box'
            });
            toast.success("Cohort inquiry recorded in Executive Portal!");
        } catch (err) {
            console.warn("Backend cohort logging notice:", err);
        }
        const whatsappMsg = `Hello SmartBiz Coach! I represent ${encodeURIComponent(orgName || 'our organization')}. We are interested in partnering to deploy a digital bookkeeping cohort of ${encodeURIComponent(cohortSize)}. Contact email: ${encodeURIComponent(orgEmail)}.`;
        window.open(`https://wa.me/2349064556107?text=${whatsappMsg}`, '_blank');
        setCohortFormSubmitted(true);
    };

    // Blog Index Schema for Google & AI Engines
    const blogIndexSchema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Blog',
                '@id': 'https://www.smartbizcoach.com.ng/blog#blog',
                'name': 'SmartBiz Coach MSME Impact & Partnership Hub',
                'description': 'Authoritative articles on Nigerian MSME digital inclusion, institutional NGO partnerships, Section 23 CITA tax exemption compliance, and retail modernization.',
                'url': 'https://www.smartbizcoach.com.ng/blog',
                'publisher': {
                    '@type': 'Organization',
                    'name': 'SmartBiz Coach',
                    'logo': 'https://www.smartbizcoach.com.ng/logo-square.png'
                },
                'blogPost': BLOG_POSTS.map(p => ({
                    '@type': 'BlogPosting',
                    'headline': p.title,
                    'url': `https://www.smartbizcoach.com.ng/blog/${p.slug}`,
                    'datePublished': p.publishedAt,
                    'dateModified': p.updatedAt,
                    'author': {
                        '@type': 'Person',
                        'name': p.author.name
                    }
                }))
            },
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    {
                        '@type': 'ListItem',
                        'position': 1,
                        'name': 'Home',
                        'item': 'https://www.smartbizcoach.com.ng/'
                    },
                    {
                        '@type': 'ListItem',
                        'position': 2,
                        'name': 'Blog & Impact Intelligence',
                        'item': 'https://www.smartbizcoach.com.ng/blog'
                    }
                ]
            }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-200">
            <SEO
                title="Impact & MSME Intelligence Blog | SmartBiz Coach Nigeria"
                description="Authoritative insights on Nigerian MSME digitization, NGO bulk cohort onboarding, Section 23 CITA tax exemption, and modern retail operating systems."
                url="https://www.smartbizcoach.com.ng/blog"
                keywords="NGO MSME partnership Nigeria, bulk merchant onboarding, Section 23 CITA tax exemption, SMEDAN digital bookkeeping, financial inclusion Nigeria, POS barcode scanner app"
                schema={blogIndexSchema}
            />

            {/* Navigation Header */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-50 py-3 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <img 
                            src="/logo-horizontal.webp" 
                            alt="SmartBiz Coach" 
                            className="h-8 w-auto object-contain" 
                            onError={(e) => {
                                const target = e.currentTarget;
                                if (target.src.endsWith('.webp')) {
                                    target.src = '/logo-horizontal.png';
                                } else {
                                    target.style.display = 'none';
                                }
                            }} 
                        />
                        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Intelligence Hub
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/')} 
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Platform
                        </button>
                        <button 
                            onClick={() => {
                                const elem = document.getElementById('cohort-lead-box');
                                if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                            }} 
                            className="hidden md:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                        >
                            <Building2 className="w-3.5 h-3.5 text-emerald-400" /> NGO / Agency Cohorts
                        </button>
                        <button 
                            onClick={() => navigate('/register')} 
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            Start Free →
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
                <div className="max-w-5xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>MSME Impact & Institutional Partnership Intelligence</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tight leading-tight mb-6">
                        Bridging Nigeria’s Informal Economy <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                            Through Digital Infrastructure & Policy
                        </span>
                    </h1>

                    <p className="text-slate-300 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-8">
                        Practical frameworks for donor agencies, NGOs, microfinance institutions, and growing entrepreneurs to deploy zero-hardware bookkeeping, claim Section 23 statutory tax relief, and unlock national commerce.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-xl mx-auto relative">
                        <div className="relative flex items-center">
                            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search articles by keyword, policy, or tag (e.g. CITA 23, NGO cohort, POS)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xl"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 text-xs text-slate-400 hover:text-white"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Category Navigation Bar */}
            <div className="bg-white border-b border-slate-200 sticky top-[57px] z-40 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 min-w-max">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-2">
                            <Filter className="w-3.5 h-3.5" /> Topic:
                        </span>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    selectedCategory === cat
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {/* Featured Post Card (Visible when 'All' is selected and no search filter) */}
                {selectedCategory === 'All' && !searchQuery && featuredPost && (
                    <div className="mb-14">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Cornerstone Partnership Feature</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-md hover:shadow-xl transition-all overflow-hidden grid grid-cols-1 lg:grid-cols-12 group">
                            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                            {featuredPost.category}
                                        </span>
                                        <span className="text-slate-400 text-xs flex items-center gap-1 font-medium">
                                            <Clock className="w-3.5 h-3.5" /> {featuredPost.readTime}
                                        </span>
                                        <span className="text-slate-400 text-xs flex items-center gap-1 font-medium">
                                            <Calendar className="w-3.5 h-3.5" /> {new Date(featuredPost.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>

                                    <h2 
                                        onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                                        className="text-2xl sm:text-3xl font-black font-heading text-slate-900 group-hover:text-emerald-700 transition-colors cursor-pointer leading-snug mb-4"
                                    >
                                        {featuredPost.title}
                                    </h2>

                                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6 line-clamp-3">
                                        {featuredPost.excerpt}
                                    </p>

                                    {/* Executive TL;DR Snippet Preview */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                                        <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Institutional Takeaways:
                                        </div>
                                        <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                                            {featuredPost.summaryTldr.slice(0, 3).map((item, idx) => (
                                                <li key={idx} className="line-clamp-1">{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={featuredPost.author.avatar} 
                                            alt={featuredPost.author.name}
                                            className="w-9 h-9 rounded-full object-cover border border-emerald-300"
                                        />
                                        <div>
                                            <div className="text-xs font-bold text-slate-800">{featuredPost.author.name}</div>
                                            <div className="text-[10px] text-slate-500">{featuredPost.author.role}</div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md group-hover:translate-x-1"
                                    >
                                        Read Full Analysis <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div 
                                onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                                className="lg:col-span-5 relative min-h-[260px] lg:min-h-full cursor-pointer overflow-hidden bg-slate-900"
                            >
                                <img 
                                    src={featuredPost.bannerImage} 
                                    alt={featuredPost.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                                    <span className="text-white text-xs font-semibold backdrop-blur-md bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/20">
                                        Featured Case Study & Technical Playbook
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Articles List / Grid */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black font-heading text-slate-900">
                            {searchQuery ? `Search Results (${filteredPosts.length})` : selectedCategory === 'All' ? 'Latest Publications' : `${selectedCategory} (${filteredPosts.length})`}
                        </h2>
                    </div>

                    {filteredPosts.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                            <p className="text-slate-500 text-base font-semibold mb-2">No articles found matching your query.</p>
                            <p className="text-slate-400 text-xs mb-6">Try searching with a broader keyword or select "All" categories.</p>
                            <button
                                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                                className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPosts.map((post) => (
                                <article
                                    key={post.id}
                                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group hover:-translate-y-1"
                                >
                                    <div>
                                        <div 
                                            className="relative h-48 w-full overflow-hidden bg-slate-100 cursor-pointer"
                                            onClick={() => navigate(`/blog/${post.slug}`)}
                                        >
                                            <img
                                                src={post.bannerImage}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                            <div className="absolute top-3 left-3">
                                                <span className="bg-white/95 backdrop-blur-md text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wide">
                                                    {post.category}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="flex items-center gap-3 text-slate-400 text-xs mb-3 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {post.readTime}
                                                </span>
                                            </div>

                                            <h3 
                                                onClick={() => navigate(`/blog/${post.slug}`)}
                                                className="text-lg font-bold font-heading text-slate-900 group-hover:text-emerald-700 transition-colors cursor-pointer leading-snug mb-3 line-clamp-2"
                                            >
                                                {post.title}
                                            </h3>

                                            <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 mb-4">
                                                {post.excerpt}
                                            </p>

                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {post.tags.slice(0, 3).map((tag) => (
                                                    <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <img 
                                                src={post.author.avatar} 
                                                alt={post.author.name}
                                                className="w-7 h-7 rounded-full object-cover"
                                            />
                                            <span className="text-xs font-semibold text-slate-700">{post.author.name}</span>
                                        </div>

                                        <button
                                            onClick={() => navigate(`/blog/${post.slug}`)}
                                            className="text-xs font-bold text-emerald-700 group-hover:text-emerald-600 flex items-center gap-1"
                                        >
                                            Read <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                {/* Institutional Cohort Lead Capture Banner */}
                <section id="cohort-lead-box" className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-emerald-500/20 shadow-2xl relative overflow-hidden">
                    <div className="max-w-4xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7">
                            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full mb-4">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>Institutional & Donor Partnership Desk</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black font-heading mb-4 leading-tight">
                                Want to Onboard a Cohort of 100 to 10,000 Micro-Merchants?
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                We partner with NGOs, SMEDAN Desks, Donor Initiatives (World Bank / GIZ / USAID projects), and Microfinance Banks to deliver zero-hardware digital day-books, automated debt recovery, and real-time aggregate economic impact telemetry.
                            </p>
                            <div className="space-y-2 text-xs text-slate-300 mb-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Zero proprietary POS hardware capex — runs on merchants' existing phones</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>100% Open Market Offline PWA resilience for zero-connectivity hubs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Verifiable anonymized cohort telemetry dashboard for board reporting</span>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15">
                            {cohortFormSubmitted ? (
                                <div className="text-center py-6">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                    <h4 className="text-base font-bold text-white mb-2">Inquiry Dispatched!</h4>
                                    <p className="text-xs text-slate-300 mb-4">
                                        Your request has opened directly in WhatsApp. Our Partnership Director will also review your details within 4 business hours.
                                    </p>
                                    <button
                                        onClick={() => setCohortFormSubmitted(false)}
                                        className="text-xs text-emerald-300 underline font-semibold"
                                    >
                                        Submit another inquiry
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCohortSubmit} className="space-y-3.5">
                                    <h3 className="text-sm font-bold text-white mb-1">
                                        Request Cohort Pilot Demo
                                    </h3>
                                    <div>
                                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">Organization / Agency Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Hope Foundation / SMEDAN Desk"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">Official Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="director@partner-org.org"
                                            value={orgEmail}
                                            onChange={(e) => setOrgEmail(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">Estimated Target Cohort Size</label>
                                        <select
                                            value={cohortSize}
                                            onChange={(e) => setCohortSize(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                        >
                                            <option value="100 - 500 MSMEs">100 - 500 Micro-Merchants</option>
                                            <option value="500 - 2,000 MSMEs">500 - 2,000 Micro-Merchants</option>
                                            <option value="2,000 - 10,000 MSMEs">2,000 - 10,000 Micro-Merchants</option>
                                            <option value="10,000+ Nationwide">10,000+ Nationwide Scope</option>
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" /> Connect on WhatsApp Partner Desk
                                    </button>
                                    <div className="pt-2 text-[10px] text-slate-300 space-y-1 text-center">
                                        <div>Official Partnership Hotlines: <span className="text-emerald-300 font-bold">09064556107</span></div>
                                        <div className="text-slate-400 flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5">
                                            <span>🤝 <a href="mailto:partners@smartbizcoach.com.ng" className="text-emerald-300 hover:underline">partners@smartbizcoach.com.ng</a></span>
                                            <span>•</span>
                                            <span>🛟 <a href="mailto:support@smartbizcoach.com.ng" className="text-emerald-300 hover:underline">support@smartbizcoach.com.ng</a></span>
                                            <span>•</span>
                                            <span>⚙️ <a href="mailto:admin@smartbiz.com.ng" className="text-emerald-300 hover:underline">admin@smartbiz.com.ng</a></span>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 mt-16 text-xs">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-black text-white text-base">SmartBiz<span className="text-emerald-500">Coach</span></span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">Nigeria #1 AI MSME OS</span>
                        </div>
                        <p className="text-slate-500 max-w-sm">
                            Empowering Nigerian MSMEs with zero-hardware daily POS, Section 23 CITA tax defense, and nationwide trade.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <button onClick={() => navigate('/')} className="hover:text-emerald-400 transition-colors">Home</button>
                        <button onClick={() => navigate('/about')} className="hover:text-emerald-400 transition-colors">About</button>
                        <button onClick={() => navigate('/grants-guide')} className="hover:text-emerald-400 transition-colors">Grants Guide</button>
                        <button onClick={() => navigate('/cac-checklist')} className="hover:text-emerald-400 transition-colors">CAC Guide</button>
                        <button onClick={() => navigate('/privacy')} className="hover:text-emerald-400 transition-colors">Privacy (NDPR)</button>
                        <button onClick={() => navigate('/terms')} className="hover:text-emerald-400 transition-colors">Terms</button>
                    </div>

                    <div className="text-slate-500 text-center md:text-right">
                        © {new Date().getFullYear()} SmartBiz Coach. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default BlogIndex;
