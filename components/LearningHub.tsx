import React, { useState } from 'react';
import { AppView } from '../types';
import { Award, CheckCircle, ArrowRight, Compass, ExternalLink, Search, Check } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  category: 'ALL' | 'PAYOUTS' | 'COMPLIANCE' | 'STOREFRONT' | 'BRANDING' | 'FUNDING';
  description: string;
  duration: string;
  icon: string;
  color: string;
  targetView: AppView;
  actionText: string;
  takeaways: string[];
  content: string[];
}

interface LearningHubProps {
  onNavigate: (view: AppView) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Modules', icon: '📚' },
  { id: 'PAYOUTS', label: 'Bank Payouts', icon: '🏦' },
  { id: 'COMPLIANCE', label: 'Government CAC', icon: '🏛️' },
  { id: 'STOREFRONT', label: 'Storefront & Sales', icon: '🛍️' },
  { id: 'BRANDING', label: 'Brand & AI Tools', icon: '✨' },
  { id: 'FUNDING', label: 'Grants & Loans', icon: '💰' },
];

const LearningHub: React.FC<LearningHubProps> = ({ onNavigate }) => {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sb_academy_completed_modules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleModuleCompletion = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedModuleIds(prev => {
      const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('sb_academy_completed_modules', JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save academy progress", err);
      }
      return updated;
    });
  };

  const lessons: Lesson[] = [
    {
      id: 'payouts',
      title: 'Automated Paystack Bank Payouts & Subaccounts',
      category: 'PAYOUTS',
      description: 'Link your Nigerian bank account in Settings & Wallet to receive direct customer payments with zero platform fees.',
      duration: '5 mins read',
      icon: '🏦',
      color: 'from-emerald-600 to-teal-700',
      targetView: AppView.SETTINGS,
      actionText: 'Setup Bank Payouts',
      takeaways: [
        'Direct settlement to your Nigerian bank account with 0% platform fee.',
        'Live NUBAN account name resolution for GTBank, Zenith, Access, Kuda, Moniepoint, OPay, PalmPay & 50+ banks.',
        'Paystack checkout popup automatically routes customer payment to your subaccount code.'
      ],
      content: [
        'Managing customer payments manually via bank transfer screenshots can lead to fake alert scams and delayed order fulfillment. SmartBiz Coach solves this with automated Paystack Direct Bank Subaccounts.',
        'Navigate to Settings & Wallet (/dashboard/settings) and tap the 🏦 Bank Payouts tab. Select your commercial or microfinance bank, enter your 10-digit NUBAN account number, and click Verify Account.',
        'Once verified, your Paystack Subaccount Code is linked to your public storefront. When customers pay online, money is credited directly to your bank account with zero platform interference.'
      ]
    },
    {
      id: 'cac_compliance',
      title: 'Government CAC & Tax ID (TIN) Verification',
      category: 'COMPLIANCE',
      description: 'Verify your CAC RC/BN registration status in real-time or connect with accredited agents for fast-track business filing.',
      duration: '7 mins read',
      icon: '🏛️',
      color: 'from-slate-800 to-emerald-900',
      targetView: AppView.COMPLIANCE,
      actionText: 'Verify Business CAC',
      takeaways: [
        'Real-life live government database verification for RC/BN numbers and Tax IDs.',
        'Fast-track business registration concierge via WhatsApp with platform owner Meshach Zachariah.',
        'Links to official government portals (CAC Portal, FIRS TIN, SCUML EFCC).'
      ],
      content: [
        'Operating a business without legal registration limits your ability to open corporate bank accounts, apply for government grants, or list on corporate marketplaces.',
        'Open Compliance & Registration (/dashboard/compliance). Enter your CAC RC or BN Number in the Live Verification Engine to query official records and display active status.',
        'Need help registering your business name or Ltd company? Tap the Direct WhatsApp Concierge button to connect directly with accredited platform agents.'
      ]
    },
    {
      id: 'storefront',
      title: '24/7 Digital Public Storefront & Orders',
      category: 'STOREFRONT',
      description: 'Turn your inventory into an online catalog with verified Paystack checkout and automatic lead logging.',
      duration: '8 mins read',
      icon: '🛍️',
      color: 'from-teal-600 to-emerald-700',
      targetView: AppView.PRODUCT_MANAGER,
      actionText: 'Manage Catalog',
      takeaways: [
        'Turn inventory items into an online storefront (smartbizcoach.com.ng/store/:slug).',
        'Verified Paystack online checkout updates lead status to PAID (Paystack Verified).',
        'Customer inquiries automatically appear in your Lead Inbox.'
      ],
      content: [
        'Answering "How much is this?" repeatedly on WhatsApp consumes valuable time. SmartBiz compiles your products into a sleek, mobile-responsive web catalog.',
        'Go to Inventory & Products (/dashboard/inventory). Upload product images, set prices, and write descriptions. Your catalog updates live instantly.',
        'Copy your storefront URL and place it in your Instagram and TikTok bio. When customers checkout, verified payments log automatically in your Lead Inbox.'
      ]
    },
    {
      id: 'brand_logo',
      title: 'AI Brand Voice & Auto Logo Synchronization',
      category: 'BRANDING',
      description: 'Generate a cohesive brand identity and upload logos that automatically sync across storefronts, invoices, and receipts.',
      duration: '6 mins read',
      icon: '✨',
      color: 'from-indigo-600 to-purple-700',
      targetView: AppView.BRAND_BUILDER,
      actionText: 'Build Brand Identity',
      takeaways: [
        'Define custom brand voice, target audience, color palettes, and slogans.',
        'Changing profile avatar automatically resizes & syncs logo to your storefront, PDF invoices, and marketplace listings.',
        'Stand out with a cohesive brand presence across social media.'
      ],
      content: [
        'A consistent brand identity builds consumer trust. The Brand Builder generates a tailored brand persona, elevator pitch, and color scheme.',
        'Go to Settings -> Profile and click the 📷 camera icon over your avatar circle. Select your business logo image. The system auto-compresses it and syncs it everywhere.',
        'Your logo will immediately display on your Public Storefront header, generated PDF receipts, Order Generator slips, and Marketplace listings.'
      ]
    },
    {
      id: 'invoicing',
      title: 'Professional Invoicing & Gbege Debt Book',
      category: 'STOREFRONT',
      description: 'Issue PDF receipts in seconds, track unpaid debts, and send automated polite WhatsApp debt reminders.',
      duration: '8 mins read',
      icon: '🧾',
      color: 'from-emerald-700 to-teal-800',
      targetView: AppView.INVOICE_GENERATOR,
      actionText: 'Issue Invoice',
      takeaways: [
        'Generate branded PDF invoices and payment receipts in seconds.',
        'Track customer credit and pending payments in Gbege Book.',
        '1-tap automated polite WhatsApp payment reminder templates.'
      ],
      content: [
        'Verbal payment agreements often lead to uncollected debts. Issuing formal receipts establishes professional record-keeping.',
        'Use the Invoice Generator to add items, client details, and tax rates. Instantly download the PDF or send a direct receipt link.',
        'If a customer owes money, log it in Gbege Book (Debtor Book). Track repayment due dates and send polite WhatsApp reminders with one tap.'
      ]
    },
    {
      id: 'copywriting',
      title: 'AI Social Media Copywriting & WhatsApp Studio',
      category: 'BRANDING',
      description: 'Generate high-converting captions for WhatsApp Status, TikTok, and Instagram tailored to your target audience.',
      duration: '7 mins read',
      icon: '✍️',
      color: 'from-green-600 to-emerald-700',
      targetView: AppView.CONTENT_GENERATOR,
      actionText: 'Open Content Studio',
      takeaways: [
        'Generate high-converting captions for WhatsApp Status, TikTok, and Instagram.',
        'Tailor tone from Energetic to Problem-Solving and Urgent Promo.',
        'Pre-configured WhatsApp quick-reply templates for buyer inquiries.'
      ],
      content: [
        'Social media posts without strong copy fail to generate sales inquiries. Captions need strong hooks, benefit highlights, and clear calls-to-action.',
        'Open Content Studio (/dashboard/content). Select your platform and campaign objective. The AI writes engaging copy incorporating your brand voice.',
        'Copy the generated captions directly into your WhatsApp updates or social posts to turn passive viewers into active buyers.'
      ]
    },
    {
      id: 'grants',
      title: 'iDICE Funding & TEF Grant Business Plans',
      category: 'FUNDING',
      description: 'Structure AI business plans and discover active funding opportunities from TEF, BoI, LSETF, and government cohorts.',
      duration: '10 mins read',
      icon: '💰',
      color: 'from-amber-600 to-emerald-800',
      targetView: AppView.GRANT_MATCHER,
      actionText: 'Find Grant Opportunities',
      takeaways: [
        'Generate structured AI business plans required by investors and grant panels.',
        'Explore government funding opportunities including iDICE, TEF, BoI, and LSETF.',
        'Calculate grant readiness scores to identify compliance gaps.'
      ],
      content: [
        'Securing funding from programs like iDICE or the Tony Elumelu Foundation requires a comprehensive, data-backed business plan.',
        'Use the Business Plan Generator (/dashboard/business-plan) to structure financial projections, target market analysis, and growth roadmaps.',
        'Visit Find Funding (/dashboard/find-funding) to review active grant cohorts, application deadlines, and eligibility criteria.'
      ]
    },
    {
      id: 'admin_traction',
      title: 'Platform Navigation, Traction & Admin Oversight',
      category: 'STOREFRONT',
      description: 'Master daily operational tools, AI BizCredit wallet management, and executive financial ledgers.',
      duration: '6 mins read',
      icon: '⚙️',
      color: 'from-slate-900 to-indigo-950',
      targetView: AppView.SETTINGS,
      actionText: 'Explore Settings & Admin',
      takeaways: [
        'Understand Traction Mode for focused daily business operations.',
        'Manage AI BizCredits balance for content generation and business plan tools.',
        'Executive Admin Ledger for platform GMV revenue and financial audit CSV export.'
      ],
      content: [
        'SmartBiz Coach is designed for daily operational efficiency. Toggle Traction Mode on top of your header to focus on critical daily tasks.',
        'Manage your AI BizCredits wallet under Settings -> Credit Wallet to top up credits for high-value AI generation tools.',
        'Platform admins (meshachzax@gmail.com) can access the Admin Ledger under Settings to inspect storefront GMV, verified transactions, and export CSV audit logs.'
      ]
    }
  ];

  const filteredLessons = lessons.filter(lesson => {
    const matchesCategory = selectedCategory === 'ALL' || lesson.category === selectedCategory;
    const matchesQuery = !searchQuery.trim() || 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const completionPercentage = Math.round((completedModuleIds.length / lessons.length) * 100);

  if (activeLesson) {
    const isCompleted = completedModuleIds.includes(activeLesson.id);
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveLesson(null)}
            className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <span>&larr;</span> Back to Academy
          </button>
          
          <button
            onClick={(e) => toggleModuleCompletion(activeLesson.id, e)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
              isCompleted 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {isCompleted ? <Check className="w-4 h-4 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400" />}
            <span>{isCompleted ? 'Module Completed' : 'Mark as Completed'}</span>
          </button>
        </div>

        <div className={`p-8 rounded-[32px] bg-gradient-to-br ${activeLesson.color} text-white shadow-xl relative overflow-hidden`}>
          <div className="absolute right-6 top-6 text-7xl opacity-15">{activeLesson.icon}</div>
          <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {activeLesson.duration}
          </span>
          <h2 className="text-2xl md:text-3xl font-black mt-4 leading-tight">{activeLesson.title}</h2>
          <p className="text-white/80 text-sm mt-2 max-w-xl">{activeLesson.description}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-6 md:p-8 space-y-6 shadow-sm">
          {/* Main Content paragraphs */}
          <div className="space-y-4">
            {activeLesson.content.map((paragraph, idx) => (
              <p key={idx} className="text-slate-700 text-sm leading-relaxed font-medium">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Key Takeaways */}
          <div className="bg-emerald-50/50 border border-emerald-100/60 p-5 rounded-2xl">
            <h3 className="font-extrabold text-emerald-900 text-sm mb-3 flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-emerald-600" />
              <span>Key Practical Rules & Platform Flow</span>
            </h3>
            <ul className="space-y-2.5">
              {activeLesson.takeaways.map((takeaway, idx) => (
                <li key={idx} className="text-xs text-emerald-800 flex items-start gap-2 leading-relaxed">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Call to Action to Launch Tool */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready to practice live?</p>
              <p className="text-xs text-slate-650 mt-1 font-medium">Launch the built-in SmartBiz tool now to execute this feature.</p>
            </div>
            <button
              onClick={() => onNavigate(activeLesson.targetView)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 active:scale-95 border-0 cursor-pointer"
            >
              <span>{activeLesson.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      
      {/* Header & Progress Card */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-[32px] relative overflow-hidden border border-slate-800 shadow-xl space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
                SmartBiz Academy
              </h2>
              <span className="text-2xl">🎓</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Master every tool on SmartBiz Coach. Learn how to automate payouts, verify CAC records, launch storefronts, and secure grants.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 text-center sm:text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 block">Mastery Progress</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{completionPercentage}%</span>
            <p className="text-[10px] text-slate-300 mt-0.5">{completedModuleIds.length} of {lessons.length} Modules Completed</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search academy modules (e.g. Bank Payouts, CAC, Storefront, Invoices)..."
              className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs font-bold pl-11 pr-4 py-3.5 rounded-2xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex border-b border-slate-200/80 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1.5 flex-nowrap shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap cursor-pointer border-0 bg-transparent flex items-center gap-1.5 shrink-0 ${
              selectedCategory === cat.id 
                ? 'border-b-2 border-emerald-600 text-emerald-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Lessons Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLessons.map(lesson => {
          const isDone = completedModuleIds.includes(lesson.id);
          return (
            <div 
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              className={`bg-white rounded-[24px] border shadow-sm overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between relative ${
                isDone ? 'border-emerald-300 ring-1 ring-emerald-300/40' : 'border-slate-200/90'
              }`}
            >
              {isDone && (
                <div className="absolute top-3 left-3 z-20 bg-emerald-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3" />
                  <span>Completed</span>
                </div>
              )}

              <div>
                <div className={`h-32 bg-gradient-to-br ${lesson.color} relative flex items-center justify-center`}>
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{lesson.icon}</span>
                  <span className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                    {lesson.duration}
                  </span>
                </div>
                
                <div className="p-5 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 inline-block">
                    {lesson.category}
                  </span>
                  <h3 className="font-extrabold text-slate-900 leading-tight text-sm group-hover:text-emerald-600 transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {lesson.description}
                  </p>
                </div>
              </div>
              
              <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100/60 mt-3 pt-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-650 group-hover:gap-2.5 transition-all">
                  <span>Start Learning</span>
                  <span>&rarr;</span>
                </div>

                <button
                  onClick={(e) => toggleModuleCompletion(lesson.id, e)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                  title={isDone ? "Mark as uncompleted" : "Mark as completed"}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLessons.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 space-y-3">
          <span className="text-4xl">🔍</span>
          <h4 className="font-bold text-slate-800 text-sm">No Academy Modules Found</h4>
          <p className="text-xs text-slate-500">Try searching for different keywords or select "All Modules".</p>
        </div>
      )}
      
      {/* Academy Mentorship Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-[28px] border border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 pointer-events-none">🎓</div>
        <div className="space-y-1 relative z-10 text-center sm:text-left">
          <h3 className="font-extrabold text-base flex items-center justify-center sm:justify-start gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span>Need personalized business mentoring or platform guidance?</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-xl">
            Connect directly with Meshach Zachariah (Platform Creator & CAC Concierge) via WhatsApp for 1-on-1 strategy sessions.
          </p>
        </div>
        <button 
          onClick={() => window.open('https://wa.me/234906456107?text=Hello%20Meshach,%20I%20am%20learning%20on%20SmartBiz%20Academy%20and%20need%20personal%20mentoring.', '_blank')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 whitespace-nowrap active:scale-95 border-0 cursor-pointer relative z-10 shrink-0"
        >
          <span>Connect via WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default LearningHub;