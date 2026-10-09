import React, { useState } from 'react';
import { AppView } from '../types';
import { 
  Award, CheckCircle, ArrowRight, Compass, ExternalLink, Search, Check, 
  BookOpen, Sparkles, ShieldCheck, Banknote, ShoppingBag, TrendingUp, MessageSquare, 
  HelpCircle, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  category: 'PAYOUTS' | 'COMPLIANCE' | 'STOREFRONT' | 'BRANDING' | 'FUNDING' | 'OPS';
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: string;
  color: string;
  targetView: AppView;
  actionText: string;
  takeaways: string[];
  content: string[];
  quickQuiz?: QuizQuestion;
}

interface LearningHubProps {
  onNavigate: (view: AppView) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Modules', icon: '📚' },
  { id: 'PAYOUTS', label: 'Bank Payouts', icon: '🏦' },
  { id: 'COMPLIANCE', label: 'Government CAC & TIN', icon: '🏛️' },
  { id: 'STOREFRONT', label: 'Storefront & Orders', icon: '🛍️' },
  { id: 'OPS', label: 'Daily Till & Cashbook', icon: '📊' },
  { id: 'BRANDING', label: 'Brand & AI Studio', icon: '✨' },
  { id: 'FUNDING', label: 'Grants & Loans', icon: '💰' },
];

const LESSONS: Lesson[] = [
  {
    id: 'payouts',
    title: 'Automated Paystack Bank Payouts & Subaccounts',
    subtitle: 'Receive money straight to your bank with zero deductions',
    category: 'PAYOUTS',
    description: 'Link your commercial or microfinance bank account to receive direct customer payments online with instant NUBAN account name resolution and 0% platform take.',
    duration: '5 mins read',
    difficulty: 'Beginner',
    icon: '🏦',
    color: 'from-emerald-600 to-teal-700',
    targetView: AppView.SETTINGS,
    actionText: 'Setup Bank Payouts',
    takeaways: [
      'Direct settlement to your Nigerian bank account with 0% platform fee.',
      'Live NUBAN account name resolution for GTBank, Zenith, Access, Kuda, Moniepoint, OPay, PalmPay & 50+ banks.',
      'Paystack checkout popup automatically routes customer payments to your subaccount code with automated reconciliation.'
    ],
    content: [
      'Managing customer payments manually via bank transfer screenshots can lead to fake alert scams and delayed order fulfillment. SmartBiz Coach solves this with automated Paystack Direct Bank Subaccounts.',
      'Navigate to Settings & Wallet (/dashboard/settings) and tap the 🏦 Bank Payouts tab. Select your commercial or microfinance bank, enter your 10-digit NUBAN account number, and click Verify Account. The system instantly resolves the registered account owner name to prevent typographical errors.',
      'Once verified, your Paystack Subaccount Code is linked to your public storefront. When customers pay online, money is credited directly to your bank account with zero platform interference or hidden delays.'
    ],
    quickQuiz: {
      question: 'Where does money paid by customers on your Storefront go?',
      options: [
        'Stored on the platform for 30 days before payout',
        'Directly into your linked Nigerian bank account via Paystack Subaccount',
        'Only into a specialized crypto wallet',
        'Directly to customer care for manual clearing'
      ],
      correctIndex: 1,
      explanation: 'SmartBiz Coach uses automated Paystack Subaccounts to settle payments directly to your linked Nigerian bank account with 0% platform take.'
    }
  },
  {
    id: 'cac_compliance',
    title: 'Government CAC & Tax ID (TIN) Verification',
    subtitle: 'Qualify for commercial loans and corporate tenders',
    category: 'COMPLIANCE',
    description: 'Verify your CAC RC/BN registration status in real-time or connect with accredited agents for fast-track business filing to satisfy bank pre-underwriting standards.',
    duration: '7 mins read',
    difficulty: 'Intermediate',
    icon: '🏛️',
    color: 'from-slate-800 to-emerald-900',
    targetView: AppView.COMPLIANCE,
    actionText: 'Verify Business CAC',
    takeaways: [
      'Real-time live government database verification for RC/BN numbers and Tax IDs.',
      'Fast-track business registration concierge via WhatsApp with platform owner Meshach Zachariah.',
      'Access official links to CAC Portal, FIRS TIN Portal, and SCUML EFCC compliance.'
    ],
    content: [
      'Operating a business without legal registration limits your ability to open corporate bank accounts, apply for government grants, or list on corporate marketplaces.',
      'Open Compliance & Registration (/dashboard/compliance). Enter your CAC RC or BN Number in the Live Verification Engine to query official records and display active status.',
      'Need help registering your business name or Ltd company? Tap the Direct WhatsApp Concierge button to connect directly with accredited platform agents for end-to-end filing.'
    ],
    quickQuiz: {
      question: 'Why is CAC registration essential for scaling your business?',
      options: [
        'It is only needed if you have more than 100 staff members',
        'It unlocks corporate bank accounts, government grant eligibility, and consumer trust',
        'It is strictly for companies based outside Nigeria',
        'It prevents you from using WhatsApp'
      ],
      correctIndex: 1,
      explanation: 'CAC formalization is required by commercial banks and grant panels (BOI, TEF) to pass KYC and pre-underwriting checks.'
    }
  },
  {
    id: 'storefront',
    title: '24/7 Digital Public Storefront & WhatsApp Orders',
    subtitle: 'Stop answering "How much is this?" all day long',
    category: 'STOREFRONT',
    description: 'Turn your inventory into an online catalog with verified Paystack checkout, instant lead logging, and 1-tap WhatsApp cart forwarding.',
    duration: '8 mins read',
    difficulty: 'Beginner',
    icon: '🛍️',
    color: 'from-teal-600 to-emerald-700',
    targetView: AppView.PRODUCT_MANAGER,
    actionText: 'Manage Catalog',
    takeaways: [
      'Turn inventory items into an online storefront (smartbizcoach.com.ng/store/:slug).',
      'Verified Paystack online checkout updates lead status to PAID automatically.',
      'Customer cart submissions forward directly to your WhatsApp with product details.'
    ],
    content: [
      'Answering "How much is this?" repeatedly on WhatsApp consumes valuable time. SmartBiz compiles your products into a sleek, mobile-responsive web catalog.',
      'Go to Inventory & Products (/dashboard/inventory). Upload product images, set prices, and write descriptions. Your catalog updates live instantly.',
      'Copy your storefront URL and place it in your Instagram and TikTok bio. When customers checkout, verified payments log automatically in your Lead Inbox.'
    ],
    quickQuiz: {
      question: 'How do customers place orders from your public storefront?',
      options: [
        'They must visit an office in Abuja physically',
        'They can checkout via Paystack or forward their cart directly to your WhatsApp',
        'They have to send a fax to your customer line',
        'They can only order during official banking hours'
      ],
      correctIndex: 1,
      explanation: 'Customers have flexible ordering: direct Paystack card/transfer checkout or direct 1-tap WhatsApp cart forwarding.'
    }
  },
  {
    id: 'daybook_till_audit',
    title: '5-Second Day-Book, Petty Cash & Till Reconciliation',
    subtitle: 'Eliminate end-of-day cash discrepancies forever',
    category: 'OPS',
    description: 'Track daily cash till vs bank transfers, log generator fuel expenses, reconcile till variances, and formally approve daily books with an owner seal.',
    duration: '6 mins read',
    difficulty: 'Intermediate',
    icon: '📊',
    color: 'from-emerald-700 to-teal-900',
    targetView: AppView.DAILY_CASHBOOK,
    actionText: 'Open Daily Cashbook',
    takeaways: [
      '5-Second quick sale logging with cash, bank transfer, and credit customer records.',
      'Automated physical till audit: Morning Float + Cash Sales - Petty Cash = Expected Till Tonight.',
      'Formally calculate operations audit scores and sign off today\'s day-book with an owner approval seal.'
    ],
    content: [
      'End-of-day cash discrepancy is the #1 silent killer of Nigerian small retail stores. When shop attendants or apprentices give incorrect change or take petty cash without logging it, profits vanish.',
      'With the Daily Cashbook (/dashboard/cashbook), enter your morning opening float. Every transaction is logged with its payment method (Cash in Till vs Transfer vs Debt).',
      'At closing time, physically count your paper naira notes. The system instantly highlights any overage or shortage. Navigate to the 4th view (AI Operations Brief) to calculate today\'s audit score and click "Approve & Sign-Off Book" to formally stamp today\'s records.'
    ],
    quickQuiz: {
      question: 'What is the correct physical cash reconciliation formula at closing time?',
      options: [
        'Total Sales multiplied by 2',
        'Morning Float + Cash Sales - Petty Cash = Expected Physical Cash',
        'Bank Balance minus Customer Debt',
        'Total Expenses divided by daily transactions'
      ],
      correctIndex: 1,
      explanation: 'The expected physical cash in your drawer at closing equals: Morning opening float + Cash received - Petty cash cashouts.'
    }
  },
  {
    id: 'sales_assistant_intelligence',
    title: 'Human AI Sales Assistant & Negotiation Strategy',
    subtitle: 'Close tough Nigerian buyers without throwing away profit margins',
    category: 'STOREFRONT',
    description: 'Learn how to utilize the upgraded Sales Assistant to identify buyer psychology (Haggler, Skeptic, Ghoster) and deliver firm, human closing scripts.',
    duration: '6 mins read',
    difficulty: 'Intermediate',
    icon: '🤝',
    color: 'from-indigo-600 to-blue-800',
    targetView: AppView.SALES_ASSISTANT,
    actionText: 'Open Sales Assistant',
    takeaways: [
      'Select buyer personas to counter price hagglers, skeptics, and silent prospects.',
      'Set floor prices to ensure the AI never suggests discounts below your break-even margin.',
      'Practice live in the Negotiation Simulator with dynamic Buyer Trust scoring.'
    ],
    content: [
      'Most deals die because merchants either slash prices aggressively (destroying margin) or respond defensively when customers ask "Last price?".',
      'The AI Sales Assistant analyzes buyer psychology. By setting your listed price and your minimum floor price, the AI devises strategic compromises (such as subsidized dispatch or companion bundle items) rather than cutting your core price.',
      'Use the Live Practice Simulator to test your negotiation tactics against simulated tough buyers and monitor your real-time trust rating before replying in real life.'
    ],
    quickQuiz: {
      question: 'When a buyer asks "What is your last price?", what is the best strategy?',
      options: [
        'Immediately give away your maximum discount',
        'Ignore the customer completely',
        'Anchor value first, and offer concessions like subsidized delivery rather than dropping unit price',
        'Argue with the customer about the economy'
      ],
      correctIndex: 2,
      explanation: 'High-performing sales reps protect margins by maintaining the price anchor and offering sweeteners like delivery subsidies or product bundles.'
    }
  },
  {
    id: 'brand_logo',
    title: 'AI Brand Voice & Auto Logo Synchronization',
    subtitle: 'One upload automatically syncs to storefront, invoices, and receipts',
    category: 'BRANDING',
    description: 'Generate a cohesive brand identity and upload logos that automatically sync across storefronts, invoices, order slips, and marketplace cards.',
    duration: '6 mins read',
    difficulty: 'Beginner',
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
    subtitle: 'Issue branded PDF receipts and recover money politely',
    category: 'OPS',
    description: 'Issue PDF receipts in seconds, track unpaid debts, and send automated polite WhatsApp debt reminders with banking details.',
    duration: '8 mins read',
    difficulty: 'Beginner',
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
    subtitle: 'Convert viewers into buyers with Nigerian hook psychology',
    category: 'BRANDING',
    description: 'Generate high-converting captions for WhatsApp Status, TikTok, and Instagram tailored to your target audience.',
    duration: '7 mins read',
    difficulty: 'Intermediate',
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
    subtitle: 'Qualify for non-dilutive government and private cohorts',
    category: 'FUNDING',
    description: 'Structure AI business plans and discover active funding opportunities from TEF, BoI, LSETF, and government cohorts.',
    duration: '10 mins read',
    difficulty: 'Advanced',
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
    id: 'bizcredits_rewards',
    title: 'SmartBiz Credits: 50 Welcome Bonus & +5 Share Rewards',
    subtitle: 'Understand how credits power generative tools with free daily ops',
    category: 'BRANDING',
    description: 'Understand how BizCredits work: new users get 50 Free Welcome Credits upon sign-up, and earn +5 credits every time you share a product link.',
    duration: '4 mins read',
    difficulty: 'Beginner',
    icon: '⚡',
    color: 'from-amber-600 to-indigo-800',
    targetView: AppView.SETTINGS,
    actionText: 'Check Credit Wallet',
    takeaways: [
      'Every newly registered merchant automatically receives 50 Free Welcome BizCredits.',
      'Earn +5 SmartBiz Credits every time you share a product link to WhatsApp Status or social platforms.',
      'Core daily operating tools (POS scanner, Day-Book, Gbege Book) remain 100% free forever; BizCredits are only used for heavy generative compute.'
    ],
    content: [
      'SmartBiz Coach operates on a fair-use hybrid model. All core operational retail tools — such as the 5-Second POS Cashbook, barcode scanner, apprentice shift lock, petty cash logger, debtor book, and Section 23 tax exemption memo — are completely free with zero credits required.',
      'When you register an account, your wallet is automatically credited with 50 Free Welcome BizCredits. These can be used immediately for generating AI Logos, BOI Business Plans, and tailored marketing copy.',
      'You can also earn +5 BizCredits whenever you share a product link from your Storefront or the Market Square to WhatsApp, Facebook, Twitter, or LinkedIn. Additional packs can be topped up via Paystack starting at just ₦500.'
    ]
  }
];

const LearningHub: React.FC<LearningHubProps> = ({ onNavigate }) => {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

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
    toast.success('Module progress updated!');
  };

  const handleOpenLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setSelectedQuizAnswer(null);
    setQuizSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredLessons = LESSONS.filter(lesson => {
    const matchesCategory = selectedCategory === 'ALL' || lesson.category === selectedCategory;
    const matchesQuery = !searchQuery.trim() || 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lesson.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const completionPercentage = Math.round((completedModuleIds.length / LESSONS.length) * 100);

  // Lesson Detail View
  if (activeLesson) {
    const isCompleted = completedModuleIds.includes(activeLesson.id);
    const quiz = activeLesson.quickQuiz;

    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 space-y-6">
        
        {/* Navigation bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveLesson(null)}
            className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer bg-white shadow-sm"
          >
            <span>&larr;</span> Back to Academy
          </button>
          
          <button
            onClick={(e) => toggleModuleCompletion(activeLesson.id, e)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
              isCompleted 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            {isCompleted ? <Check className="w-4 h-4 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400" />}
            <span>{isCompleted ? 'Module Completed' : 'Mark as Completed'}</span>
          </button>
        </div>

        {/* Hero Header */}
        <div className={`p-8 rounded-[32px] bg-gradient-to-br ${activeLesson.color} text-white shadow-xl relative overflow-hidden`}>
          <div className="absolute right-6 top-6 text-7xl opacity-15">{activeLesson.icon}</div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              {activeLesson.duration}
            </span>
            <span className="bg-black/20 text-white/90 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
              {activeLesson.difficulty}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black mt-4 leading-tight">{activeLesson.title}</h2>
          <p className="text-white/80 text-sm mt-1.5 font-medium">{activeLesson.subtitle}</p>
        </div>

        {/* Lesson Reading Body */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 md:p-8 space-y-6 shadow-sm">
          
          <div className="space-y-4">
            {activeLesson.content.map((paragraph, idx) => (
              <p key={idx} className="text-slate-700 text-sm leading-relaxed font-medium">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Key Takeaways Card */}
          <div className="bg-emerald-50/70 border border-emerald-100 p-5 sm:p-6 rounded-2xl space-y-3">
            <h3 className="font-black text-emerald-900 text-sm flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-emerald-600" />
              <span>Key Operational Rules & Workflows</span>
            </h3>
            <ul className="space-y-2.5">
              {activeLesson.takeaways.map((takeaway, idx) => (
                <li key={idx} className="text-xs text-emerald-800 flex items-start gap-2.5 leading-relaxed font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Knowledge Check Quiz */}
          {quiz && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quick Knowledge Check</span>
                </span>
                {quizSubmitted && selectedQuizAnswer === quiz.correctIndex && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Correct! +10 Mastery
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-800">
                {quiz.question}
              </h4>

              <div className="space-y-2">
                {quiz.options.map((option, idx) => {
                  let optStyle = 'border-slate-200 bg-white hover:border-slate-300 text-slate-700';
                  if (quizSubmitted) {
                    if (idx === quiz.correctIndex) {
                      optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                    } else if (idx === selectedQuizAnswer) {
                      optStyle = 'border-rose-400 bg-rose-50 text-rose-800 line-through';
                    }
                  } else if (selectedQuizAnswer === idx) {
                    optStyle = 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!quizSubmitted) setSelectedQuizAnswer(idx);
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                    >
                      <span>{option}</span>
                      {quizSubmitted && idx === quiz.correctIndex && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {!quizSubmitted ? (
                <button
                  disabled={selectedQuizAnswer === null}
                  onClick={() => {
                    setQuizSubmitted(true);
                    if (selectedQuizAnswer === quiz.correctIndex && !isCompleted) {
                      toggleModuleCompletion(activeLesson.id);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer border-0 ${
                    selectedQuizAnswer !== null 
                      ? 'bg-slate-900 hover:bg-slate-800 text-white' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Verify Answer
                </button>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
                  <span className="font-bold text-slate-800">Explanation: </span>
                  {quiz.explanation}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready to apply this live?</p>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">Launch the built-in SmartBiz tool now to execute this feature in your account.</p>
            </div>
            <button
              onClick={() => onNavigate(activeLesson.targetView)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 active:scale-95 border-0 cursor-pointer shrink-0"
            >
              <span>{activeLesson.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Academy Catalog Index View
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      
      {/* Header & Progress Card */}
      <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-[32px] relative overflow-hidden border border-emerald-950/40 shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-white font-heading">
                SmartBiz Academy
              </h2>
              <span className="text-2xl">🎓</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl font-medium">
              Practical operational mastery for Nigerian entrepreneurs. Learn how to automate payouts, formalize CAC records, balance daily tills, close sales, and win government grants.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 text-center sm:text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Academy Mastery</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{completionPercentage}%</span>
            <p className="text-[10px] text-slate-400 mt-0.5">{completedModuleIds.length} of {LESSONS.length} Modules Completed</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search academy modules (e.g. Bank Payouts, CAC, Storefront, Till Audit, Sales Assistant)..."
              className="w-full bg-slate-900 text-white placeholder-slate-400 text-xs font-bold pl-11 pr-4 py-3.5 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-200/80 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1 flex-nowrap shrink-0">
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

      {/* Modules Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLessons.map(lesson => {
          const isDone = completedModuleIds.includes(lesson.id);
          return (
            <div 
              key={lesson.id}
              onClick={() => handleOpenLesson(lesson)}
              className={`bg-white rounded-[26px] border shadow-sm overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between relative ${
                isDone ? 'border-emerald-300 ring-1 ring-emerald-300/40' : 'border-slate-200/90 hover:border-emerald-300'
              }`}
            >
              {isDone && (
                <div className="absolute top-3 left-3 z-20 bg-emerald-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3" />
                  <span>Mastered</span>
                </div>
              )}

              <div>
                <div className={`h-32 bg-gradient-to-br ${lesson.color} relative flex items-center justify-center`}>
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{lesson.icon}</span>
                  <div className="absolute bottom-3 right-3 flex items-center gap-1">
                    <span className="bg-black/40 backdrop-blur-sm text-white text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                      {lesson.duration}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 inline-block">
                      {lesson.category}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {lesson.difficulty}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 leading-snug text-sm group-hover:text-emerald-600 transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                    {lesson.description}
                  </p>
                </div>
              </div>
              
              <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-3 pt-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-650 group-hover:gap-2 transition-all">
                  <span>Start Module</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>

                <button
                  onClick={(e) => toggleModuleCompletion(lesson.id, e)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                  title={isDone ? "Mark as in-progress" : "Mark as completed"}
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
            Connect directly with Meshach Zachariah (Platform Creator & Accredited CAC Concierge) via WhatsApp for 1-on-1 strategy sessions.
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