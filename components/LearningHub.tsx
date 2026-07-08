import React, { useState } from 'react';
import { AppView } from '../types';
import { BookOpen, Award, CheckCircle, ArrowRight, Play, Compass, ExternalLink } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
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

const LearningHub: React.FC<LearningHubProps> = ({ onNavigate }) => {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const lessons: Lesson[] = [
    {
      id: 'brand',
      title: 'Crafting a Selling Brand Voice',
      description: 'Learn how to generate a cohesive brand identity and custom logo settings that turn viewers into fans.',
      duration: '8 mins read',
      icon: '✨',
      color: 'from-emerald-500 to-teal-600',
      targetView: AppView.BRAND_BUILDER,
      actionText: 'Build Brand Now',
      takeaways: [
        'How to identify your specific target niche in the Nigerian market.',
        'Choosing colors and font styles that project trust.',
        'Structuring a compelling elevator pitch and slogan.'
      ],
      content: [
        'Your brand is the face of your business. In Nigeria’s busy digital market, trust is the number one currency. A generic business name with zero voice will struggle to gain traction.',
        'First, head to the Brand Builder tool. Input your business niche, target audience, and style preferences. The AI will output a consistent color palette, slogan, and description.',
        'Once generated, use this voice consistently across your WhatsApp Status, TikTok bio, and invoice headers to establish a premium presence.'
      ]
    },
    {
      id: 'content',
      title: 'Viral Social Media Copywriting',
      description: 'How to write engaging WhatsApp updates and TikTok captions that get customers asking "How much?"',
      duration: '10 mins read',
      icon: '✍️',
      color: 'from-green-500 to-emerald-600',
      targetView: AppView.CONTENT_GENERATOR,
      actionText: 'Open Content Studio',
      takeaways: [
        'Structuring WhatsApp posts with strong hooks.',
        'Utilizing trending Nigerian keywords to build trust.',
        'Adding clear call-to-actions that drive direct orders.'
      ],
      content: [
        'Many MSMEs make the mistake of just pasting pictures on their WhatsApp status without captions. Captions are where sales happen.',
        'Open the Content Studio and select your target platform. Pick a style—such as "Energetic" or "Problem-Solving"—and let the AI generate engaging text.',
        'Always include a direct order link or WhatsApp contact at the bottom of your post to minimize the friction for buyer inquiries.'
      ]
    },
    {
      id: 'invoices',
      title: 'Managing Debts & Professional Invoicing',
      description: 'Professionalize your customer interactions. Issue invoices instantly and track debtors without tension.',
      duration: '12 mins read',
      icon: '🧾',
      color: 'from-emerald-600 to-teal-700',
      targetView: AppView.INVOICE_GENERATOR,
      actionText: 'Issue an Invoice',
      takeaways: [
        'How professional receipts discourage customer defaults.',
        'Keeping accurate digital records of customer credit.',
        'Sending automated polite WhatsApp debt reminders.'
      ],
      content: [
        'Loose verbal agreements are the primary source of cash flow problems for small businesses. Always document every transaction with a digital invoice.',
        'Use the Invoice Generator to quickly key in product lists and prices. You can immediately download the receipt as a PDF or share the direct link with the customer.',
        'If a customer owes you money, log it in the Gbege Book (Debtor Book). This helps you keep a visual calendar of pending payments and draft friendly reminders with one tap.'
      ]
    },
    {
      id: 'storefront',
      title: 'Launching Your Public Web Catalog',
      description: 'Set up a digital storefront so customers can browse your products and make orders 24/7.',
      duration: '15 mins read',
      icon: '🔗',
      color: 'from-teal-600 to-emerald-800',
      targetView: AppView.PRODUCT_MANAGER,
      actionText: 'Manage Catalog',
      takeaways: [
        'Setting up products with high-quality descriptions.',
        'Linking your catalog directly to your WhatsApp bio.',
        'Automating order generation via customer links.'
      ],
      content: [
        'Answering the question "How much is this?" fifty times a day is exhausting. The solution is a public storefront.',
        'Go to your Product Manager and upload your current stock items, prices, and images. SmartBiz instantly compiles this into a beautiful mobile-responsive public storefront.',
        'Share your Public Store link on your social media profiles. When customers select items and checkout, an order is generated and directly synced to your Lead Inbox.'
      ]
    },
    {
      id: 'grants',
      title: 'Securing Funding & Grant Writing',
      description: 'How to structure your business plan and pitch to match requirements for grants like iDICE.',
      duration: '18 mins read',
      icon: '💰',
      color: 'from-emerald-705 to-teal-850',
      targetView: AppView.GRANT_MATCHER,
      actionText: 'Find Funding',
      takeaways: [
        'Understanding what Nigerian loan and grant programs look for.',
        'Structuring an executive summary that stands out.',
        'Matching your business profile to active grants.'
      ],
      content: [
        'Applying for startup support requires a solid structure. Investors and grant organizations (like the iDICE program) want to see detailed records of traction, inventory, and long-term plans.',
        'Use the Business Plan Generator to draft a comprehensive plan. It organizes your market opportunities, financial estimates, and target strategy into a standard document.',
        'Once complete, check the Find Funding board to review active government programs, micro-loans, and incubation cohorts matching your business category.'
      ]
    }
  ];

  if (activeLesson) {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <button 
          onClick={() => setActiveLesson(null)}
          className="mb-6 px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5"
        >
          <span>&larr;</span> Back to Academy
        </button>

        <div className={`p-8 rounded-[32px] bg-gradient-to-br ${activeLesson.color} text-white shadow-xl mb-8 relative overflow-hidden`}>
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
              <span>Key Practical Rules</span>
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready to practice?</p>
              <p className="text-xs text-slate-650 mt-1 font-medium">Launch the built-in AI tool to complete this step.</p>
            </div>
            <button
              onClick={() => onNavigate(activeLesson.targetView)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 active:scale-95"
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>SmartBiz Academy</span>
            <span className="text-lg">🎓</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">Short practical guides to master our tools and scale your business.</p>
        </div>
        <div className="bg-white/80 border border-slate-200 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 shrink-0">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700">{lessons.length} Modules Available</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map(lesson => (
          <div 
            key={lesson.id}
            onClick={() => setActiveLesson(lesson)}
            className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className={`h-32 bg-gradient-to-br ${lesson.color} relative flex items-center justify-center`}>
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{lesson.icon}</span>
                <span className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  {lesson.duration}
                </span>
              </div>
              
              <div className="p-5">
                <h3 className="font-extrabold text-slate-900 leading-tight text-sm group-hover:text-emerald-600 transition-colors">
                  {lesson.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {lesson.description}
                </p>
              </div>
            </div>
            
            <div className="p-5 pt-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-650 group-hover:gap-2.5 transition-all">
                <span>Start Learning</span>
                <span>&rarr;</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Academy Premium Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 rounded-[28px] border border-emerald-900/30 text-white flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-lg">
        <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 pointer-events-none">🎓</div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span>Need personalized business mentoring?</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Connect directly with meshach and get advanced coaching to scale your platform pilot today.
          </p>
        </div>
        <button 
          onClick={() => window.open('https://wa.me/2349064556107', '_blank')}
          className="bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-green-600/10 flex items-center gap-1.5 whitespace-nowrap active:scale-95"
        >
          <span>Connect via WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default LearningHub;