import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Calendar, 
    Clock, 
    Share2, 
    Bookmark, 
    CheckCircle2, 
    BookOpen, 
    Scale, 
    Building2, 
    ChevronRight, 
    MessageSquare, 
    Copy, 
    Sparkles, 
    HelpCircle, 
    ArrowRight,
    ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SEO from './SEO';
import { getBlogPostBySlug, getRelatedPosts, BlogPost as IBlogPost } from '../data/blogPosts';

const BlogPost: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const post = slug ? getBlogPostBySlug(slug) : undefined;
    const relatedPosts = slug ? getRelatedPosts(slug) : [];

    const [readingProgress, setReadingProgress] = useState(0);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    // Track scroll for reading progress bar
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const progress = (window.scrollY / totalHeight) * 100;
                setReadingProgress(Math.min(100, Math.max(0, progress)));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top on slug change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [slug]);

    if (!post) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2 font-heading">Publication Not Found</h1>
                <p className="text-slate-500 text-sm mb-6 max-w-md">
                    The requested article could not be located. It may have been archived or moved.
                </p>
                <button
                    onClick={() => navigate('/blog')}
                    className="bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md hover:bg-emerald-500 transition-all flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Return to Blog Intelligence Hub
                </button>
            </div>
        );
    }

    const currentUrl = `https://www.smartbizcoach.com.ng/blog/${post.slug}`;

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(`Read this authoritative analysis: "${post.title}" on SmartBiz Coach: ${currentUrl}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    const handleShareLinkedIn = () => {
        const url = encodeURIComponent(currentUrl);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(currentUrl);
        toast.success('Article link copied to clipboard!');
    };

    // Construct Comprehensive Schema.org JSON-LD (Article + FAQPage + Breadcrumbs)
    const articleSchema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BlogPosting',
                '@id': `${currentUrl}#article`,
                'isPartOf': {
                    '@type': 'Blog',
                    '@id': 'https://www.smartbizcoach.com.ng/blog#blog',
                    'name': 'SmartBiz Coach Impact & Partnership Hub',
                    'publisher': {
                        '@type': 'Organization',
                        'name': 'SmartBiz Coach',
                        'logo': 'https://www.smartbizcoach.com.ng/logo-square.png'
                    }
                },
                'headline': post.title,
                'description': post.metaDescription,
                'url': currentUrl,
                'mainEntityOfPage': currentUrl,
                'datePublished': `${post.publishedAt}T08:00:00+01:00`,
                'dateModified': `${post.updatedAt}T12:00:00+01:00`,
                'image': [post.bannerImage],
                'articleSection': post.category,
                'keywords': post.tags.join(', '),
                'author': {
                    '@type': 'Person',
                    'name': post.author.name,
                    'jobTitle': post.author.role,
                    'sameAs': 'https://www.linkedin.com/in/meshach-zachariah-5a578912a/'
                },
                'publisher': {
                    '@type': 'Organization',
                    'name': 'SmartBiz Coach',
                    'logo': {
                        '@type': 'ImageObject',
                        'url': 'https://www.smartbizcoach.com.ng/logo-square.png'
                    }
                }
            },
            {
                '@type': 'FAQPage',
                '@id': `${currentUrl}#faq`,
                'mainEntity': post.faqs.map(f => ({
                    '@type': 'Question',
                    'name': f.q,
                    'acceptedAnswer': {
                        '@type': 'Answer',
                        'text': f.a
                    }
                }))
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${currentUrl}#breadcrumb`,
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
                        'name': 'Blog & Intelligence',
                        'item': 'https://www.smartbizcoach.com.ng/blog'
                    },
                    {
                        '@type': 'ListItem',
                        'position': 3,
                        'name': post.title,
                        'item': currentUrl
                    }
                ]
            }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-200">
            <SEO
                title={post.seoTitle}
                description={post.metaDescription}
                url={currentUrl}
                image={post.bannerImage}
                type="article"
                keywords={post.tags.join(', ')}
                schema={articleSchema}
            />

            {/* Reading Progress Indicator Bar */}
            <div 
                className="fixed top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 z-50 transition-all duration-150"
                style={{ width: `${readingProgress}%` }}
            />

            {/* Sticky Header */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 py-3 shadow-xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/blog')}
                            className="text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> All Publications
                        </button>
                        <span className="hidden sm:inline text-slate-300">|</span>
                        <span className="hidden sm:inline text-xs font-semibold text-slate-500 truncate max-w-xs md:max-w-md">
                            {post.title}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShareWhatsApp}
                            title="Share on WhatsApp"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleShareLinkedIn}
                            title="Share on LinkedIn"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCopyLink}
                            title="Copy Article Link"
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                        >
                            Start Free →
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Layout */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* Primary Article Column (8 Cols) */}
                    <article className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
                        
                        {/* Meta Tags & Category Header */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                {post.category}
                            </span>
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {post.readTime}
                            </span>
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>

                        {/* Article Title */}
                        <h1 className="text-2xl sm:text-4xl font-black font-heading text-slate-900 leading-tight mb-6">
                            {post.title}
                        </h1>

                        {/* Author Strip */}
                        <div className="flex items-center gap-3.5 pb-6 border-b border-slate-100 mb-8">
                            <img
                                src={post.author.avatar}
                                alt={post.author.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
                            />
                            <div>
                                <div className="text-sm font-bold text-slate-900">{post.author.name}</div>
                                <div className="text-xs text-slate-500">{post.author.role}</div>
                            </div>
                        </div>

                        {/* Banner Image */}
                        <div className="rounded-2xl overflow-hidden mb-8 border border-slate-100">
                            <img
                                src={post.bannerImage}
                                alt={post.title}
                                className="w-full h-[320px] sm:h-[420px] object-cover"
                            />
                            {post.imageCaption && (
                                <p className="text-[11px] text-slate-400 p-2.5 bg-slate-50 border-t border-slate-100 italic text-center">
                                    {post.imageCaption}
                                </p>
                            )}
                        </div>

                        {/* Executive TL;DR Snippet Box (Crucial for AI Engine Citation & C-Suite Readers) */}
                        <section className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300/80 rounded-2xl p-6 mb-10 shadow-xs">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <h2 className="text-sm font-black font-heading uppercase tracking-wider text-emerald-950">
                                    Executive Summary & Policy TL;DR
                                </h2>
                            </div>
                            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                                {post.summaryTldr.map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* Statutory Legal Citations Box (If Applicable) */}
                        {post.statutoryCitations && post.statutoryCitations.length > 0 && (
                            <section className="bg-slate-900 text-white rounded-2xl p-6 mb-10 border border-slate-800">
                                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                                    <Scale className="w-4 h-4" />
                                    <h3 className="text-xs font-black uppercase tracking-wider">
                                        Applicable Nigerian Statutory Framework
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    {post.statutoryCitations.map((item, idx) => (
                                        <div key={idx} className="border-l-2 border-emerald-500 pl-3.5 py-1">
                                            <div className="text-xs font-bold text-emerald-300">{item.title}</div>
                                            <div className="text-[11px] font-semibold text-slate-400 mb-1">{item.section}</div>
                                            <div className="text-xs text-slate-300 leading-relaxed">{item.body}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Content Body Sections */}
                        <div className="space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
                            {post.contentSections.map((sec) => (
                                <section key={sec.id} id={sec.id} className="scroll-mt-20">
                                    <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-900 mb-4">
                                        {sec.heading}
                                    </h2>

                                    <div className="space-y-4 mb-4">
                                        {sec.paragraphs.map((p, pIdx) => (
                                            <p key={pIdx} className="leading-relaxed">
                                                {p}
                                            </p>
                                        ))}
                                    </div>

                                    {/* Callout Box */}
                                    {sec.callout && (
                                        <div className={`p-5 rounded-2xl mb-4 border ${
                                            sec.callout.type === 'statutory' 
                                                ? 'bg-amber-50 border-amber-300 text-amber-950' 
                                                : sec.callout.type === 'pilot_metric'
                                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                                : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                                        }`}>
                                            <div className="text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                {sec.callout.type === 'statutory' && <Scale className="w-3.5 h-3.5 text-amber-700" />}
                                                {sec.callout.type === 'pilot_metric' && <Sparkles className="w-3.5 h-3.5 text-emerald-700" />}
                                                {sec.callout.type === 'case_study' && <BookOpen className="w-3.5 h-3.5 text-indigo-700" />}
                                                <span>{sec.callout.title}</span>
                                            </div>
                                            <p className="text-xs sm:text-sm leading-relaxed">
                                                {sec.callout.text}
                                            </p>
                                        </div>
                                    )}

                                    {/* List */}
                                    {sec.list && (
                                        <ul className="space-y-2.5 my-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            {sec.list.map((item, lIdx) => (
                                                <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Inline Section Image */}
                                    {sec.image && (
                                        <div className="my-6 rounded-2xl overflow-hidden border border-slate-200">
                                            <img
                                                src={sec.image.url}
                                                alt={sec.image.caption}
                                                className="w-full h-64 sm:h-80 object-cover"
                                            />
                                            <p className="text-[11px] text-slate-400 p-2 bg-slate-50 text-center italic">
                                                {sec.image.caption}
                                            </p>
                                        </div>
                                    )}
                                </section>
                            ))}
                        </div>

                        {/* Interactive FAQ Accordion */}
                        <section className="mt-14 pt-8 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-6">
                                <HelpCircle className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-xl font-black font-heading text-slate-900">
                                    Frequently Asked Policy & Operational Questions
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {post.faqs.map((faq, index) => {
                                    const isOpen = openFaqIndex === index;
                                    return (
                                        <div
                                            key={index}
                                            className="border border-slate-200 rounded-2xl overflow-hidden transition-all"
                                        >
                                            <button
                                                onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                                className="w-full px-5 py-4 text-left font-bold text-xs sm:text-sm text-slate-900 flex justify-between items-center hover:bg-slate-50 transition-colors"
                                            >
                                                <span>{faq.q}</span>
                                                <span className={`text-emerald-600 font-extrabold text-base transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                                                    ›
                                                </span>
                                            </button>
                                            {isOpen && (
                                                <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 bg-slate-50/50 leading-relaxed border-t border-slate-100">
                                                    {faq.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Primary Contextual CTA Card */}
                        <section className="mt-12 bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-xl">
                            <h3 className="text-xl sm:text-2xl font-black font-heading mb-2">
                                {post.primaryCta.title}
                            </h3>
                            <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
                                {post.primaryCta.subtitle}
                            </p>
                            {post.primaryCta.actionUrl.startsWith('http') ? (
                                <a
                                    href={post.primaryCta.actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    {post.primaryCta.buttonText}
                                </a>
                            ) : (
                                <button
                                    onClick={() => navigate(post.primaryCta.actionUrl)}
                                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30"
                                >
                                    {post.primaryCta.buttonText}
                                </button>
                            )}
                        </section>

                        {/* Article Tags */}
                        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 mr-1">Filed Under:</span>
                            {post.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </article>

                    {/* Sidebar Column (4 Cols) */}
                    <aside className="lg:col-span-4 space-y-6">
                        
                        {/* Table of Contents Card */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs sticky top-20">
                            <div className="flex items-center gap-2 mb-4 text-slate-900">
                                <BookOpen className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-xs font-black uppercase tracking-wider">
                                    Table of Contents
                                </h3>
                            </div>
                            <nav className="space-y-2 text-xs">
                                {post.contentSections.map((sec) => (
                                    <a
                                        key={sec.id}
                                        href={`#${sec.id}`}
                                        className="block text-slate-600 hover:text-emerald-700 hover:font-bold transition-all py-1 border-l-2 border-transparent hover:border-emerald-600 pl-2"
                                    >
                                        {sec.heading}
                                    </a>
                                ))}
                            </nav>

                            {/* Share & Actions Dock */}
                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Share this Framework
                                </div>
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" /> Share on WhatsApp
                                </button>
                                <button
                                    onClick={handleShareLinkedIn}
                                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-3.5 h-3.5" /> Share on LinkedIn
                                </button>
                            </div>

                            {/* Institutional Fast-Connect Box */}
                            <div className="mt-6 bg-slate-900 text-white rounded-2xl p-4 border border-slate-800">
                                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5" /> NGO / Partner Help Desk
                                </div>
                                <p className="text-[11px] text-slate-300 mb-3">
                                    Speak directly with our technical deployment officers for cohort proposals and custom API integrations.
                                </p>
                                <a
                                    href="https://wa.me/2349064556107?text=Hello%20SmartBiz%20Coach%20Partnership%20Desk%2C%20we%20want%20to%20discuss%20an%20MSME%20digitization%20pilot."
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 rounded-xl transition-all"
                                >
                                    WhatsApp: 09064556107
                                </a>
                            </div>
                        </div>

                        {/* Related Cornerstone Articles */}
                        {relatedPosts.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    Related Publications
                                </h3>
                                <div className="space-y-4">
                                    {relatedPosts.map((rel) => (
                                        <div
                                            key={rel.id}
                                            onClick={() => navigate(`/blog/${rel.slug}`)}
                                            className="group cursor-pointer border-b border-slate-100 last:border-b-0 pb-3 last:pb-0"
                                        >
                                            <div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-1">
                                                {rel.category}
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
                                                {rel.title}
                                            </h4>
                                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                                <span>{rel.readTime}</span>
                                                <span>•</span>
                                                <span>{new Date(rel.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 px-4 sm:px-6 mt-16 text-xs">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-black text-white text-base">SmartBiz<span className="text-emerald-500">Coach</span></span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">Nigeria #1 AI MSME OS</span>
                        </div>
                        <p className="text-slate-500 max-w-sm">
                            Nigeria’s primary digital operating system for informal and growing enterprises.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <button onClick={() => navigate('/blog')} className="hover:text-emerald-400 transition-colors">All Articles</button>
                        <button onClick={() => navigate('/about')} className="hover:text-emerald-400 transition-colors">About Us</button>
                        <button onClick={() => navigate('/grants-guide')} className="hover:text-emerald-400 transition-colors">Grants Guide</button>
                        <button onClick={() => navigate('/cac-checklist')} className="hover:text-emerald-400 transition-colors">CAC Guide</button>
                        <button onClick={() => navigate('/privacy')} className="hover:text-emerald-400 transition-colors">Privacy</button>
                    </div>

                    <div className="text-slate-500 text-center md:text-right">
                        © {new Date().getFullYear()} SmartBiz Coach. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default BlogPost;
