import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, CheckCircle, Shield, FileText, HelpCircle, Award, BookOpen, Send } from 'lucide-react';
import SEO from './SEO';

interface StaticPageProps {
  pageType: 'about' | 'contact' | 'privacy' | 'terms' | 'help' | 'grants' | 'cac';
}

const StaticPage: React.FC<StaticPageProps> = ({ pageType }) => {
  const navigate = useNavigate();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 1000);
  };

  const pageMeta = {
    about: { title: "About Us | SmartBiz Coach", desc: "Empowering Nigerian SMEs with AI business planning and growth frameworks." },
    contact: { title: "Contact Us | SmartBiz Coach", desc: "Get in touch with our team. Phone: 09064556107, Email: support@smartbizcoach.com.ng" },
    privacy: { title: "Privacy Policy | SmartBiz Coach", desc: "Learn how we protect your personal and business data safely." },
    terms: { title: "Terms of Service | SmartBiz Coach", desc: "Read our terms of service, credit usage policy, and billing rules." },
    help: { title: "Help Center | SmartBiz Coach", desc: "Find tutorials, guides, and quick answers to how our platform works." },
    grants: { title: "SME Grants & Funding Guide | SmartBiz Coach", desc: "A comprehensive guide to qualifying for bank loans, BOI, TEF, and other SME funding programs." },
    cac: { title: "CAC Registration Checklist | SmartBiz Coach", desc: "The official step-by-step checklist to register your business and get a TIN." },
  };

  const currentMeta = pageMeta[pageType] || { title: "SmartBiz Coach", desc: "AI Business Partner for Nigerian MSMEs" };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-200">
      <SEO title={currentMeta.title} description={currentMeta.desc} />

      {/* Navigation Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-50 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-extrabold shadow-md">S</div>
            <span className="font-extrabold text-lg text-slate-800 font-heading">SmartBiz Coach</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </button>
            <button onClick={() => navigate('/register')} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md">
              Start Free →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 sm:p-12">
          
          {/* ABOUT US PAGE */}
          {pageType === 'about' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
                <h1 className="text-3xl font-extrabold text-slate-900 font-heading">About SmartBiz Coach</h1>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                SmartBiz Coach is a premium AI-powered business development and planning operating system built specifically for Nigerian Micro, Small, and Medium Enterprises (MSMEs). Our platform enables local entrepreneurs to quickly brand, manage, and scale their businesses by automating complex tasks that would otherwise cost thousands of Naira in professional consultancy fees.
              </p>

              <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 font-heading">Our Core Mission</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                To simplify the path to compliance and formalization for African founders. By leveraging next-generation generative AI technologies, we empower small business owners to generate bank-ready business plans, create CAC compliance checklists, match with international and local grants, and launch brand configurations within minutes.
              </p>

              <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 font-heading">How We Help Your Business Grow</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                SmartBiz Coach provides a suite of integrated tools built to solve the daily struggles of SME operations:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm mb-6">
                <li><strong>Brand Builder:</strong> Establish a premium visual identity with tailored logos, font guides, and custom business assets.</li>
                <li><strong>AI Content Studio:</strong> Instantly draft engaging social posts, copy for flyers, and promotional WhatsApp updates to boost sales.</li>
                <li><strong>Invoice & Debtor Book:</strong> Keep track of customer orders, generate invoices, and send friendly WhatsApp payment reminders.</li>
                <li><strong>Business Plan Generator:</strong> Create structured, bank-compliant PDF business plans designed to secure capital.</li>
              </ul>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-8">
                <h3 className="font-bold text-slate-950 mb-2">Want to qualify for grants?</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Create your free account today to immediately build your business plan, check your registration status, and prepare your funding applications.
                </p>
                <button onClick={() => navigate('/register')} className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md">
                  Register Your SME Now →
                </button>
              </div>
            </div>
          )}

          {/* CONTACT PAGE */}
          {pageType === 'contact' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Get in Touch</h1>
              </div>
              <p className="text-slate-600 leading-relaxed mb-8">
                Have questions about billing, credit packages, or need support with your business plan? Our team is active and ready to support you.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Contact Info */}
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600"><Phone className="w-4 h-4" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Phone & WhatsApp Support</h4>
                      <p className="text-sm text-slate-600 mt-1">09064556107</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600"><Mail className="w-4 h-4" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Email Address</h4>
                      <p className="text-sm text-slate-600 mt-1">support@smartbizcoach.com.ng</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600"><MapPin className="w-4 h-4" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Headquarters</h4>
                      <p className="text-sm text-slate-600 mt-1">Lagos, Nigeria</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  {formSubmitted ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">✓</div>
                      <h4 className="font-bold text-slate-950">Message Sent!</h4>
                      <p className="text-xs text-slate-500 mt-2">We will respond to your email or WhatsApp within 24 hours.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                        <input type="text" required className="w-full px-4 py-2.5 border border-slate-350 rounded-xl bg-white text-sm" placeholder="Your Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                        <input type="email" required className="w-full px-4 py-2.5 border border-slate-350 rounded-xl bg-white text-sm" placeholder="you@company.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message</label>
                        <textarea required rows={4} className="w-full px-4 py-2.5 border border-slate-350 rounded-xl bg-white text-sm" placeholder="How can we help your business?"></textarea>
                      </div>
                      <button type="submit" disabled={loading} className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                        {loading ? "Sending..." : <><Send className="w-4 h-4" /> Send Message</>}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY POLICY PAGE */}
          {pageType === 'privacy' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Privacy Policy</h1>
              </div>
              <p className="text-slate-400 text-xs mb-8">Last Updated: July 2026</p>

              <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">1. Information We Collect</h3>
                  <p>
                    We collect details necessary to build your business profiles, including your name, business name, phone number, location, currency choice, and optional brand parameters. This information is saved securely to authorize and customize your business dashboard.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">2. How We Use Your Data</h3>
                  <p>
                    We use your brand details strictly to configure AI prompts when generating business plans, social content, and compliance outlines. Your proprietary business data is never sold, leased, or shared with third-party advertising companies.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">3. Payment & Paystack Integration</h3>
                  <p>
                    All payment processing is handled securely via Paystack. We do not store your credit card details, PINs, or bank account credentials on our servers. Paystack complies with all PCI-DSS standards to ensure your transactional safety.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* TERMS OF SERVICE PAGE */}
          {pageType === 'terms' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Terms of Service</h1>
              </div>
              <p className="text-slate-400 text-xs mb-8">Last Updated: July 2026</p>

              <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">1. Token Purchase & Credits Policy</h3>
                  <p>
                    SmartBiz Coach runs on a pay-as-you-go credit token model. Tokens are purchased in credit packs (e.g. ₦300, ₦1,000, ₦3,000) through Paystack. Purchased credits never expire and are non-refundable. Each AI tool utilizes a predefined cost of credit points per query.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">2. Accuracy of AI Generated Content</h3>
                  <p>
                    Our platform utilizes Google Gemini AI to assist you in creating plans, taglines, and checklist reviews. While the AI is trained on professional business patterns, all generated plans and compliance check reviews should be verified by professional legal consultants or bankers before final financial commitments are made.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* HELP CENTER PAGE */}
          {pageType === 'help' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center"><HelpCircle className="w-5 h-5" /></div>
                <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Help Center & FAQs</h1>
              </div>

              <div className="space-y-6 mt-8">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-950 text-sm mb-2">How many credits do the AI tools cost?</h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li>📄 <strong>Business Plan:</strong> 15 credits per document</li>
                    <li>✨ <strong>Brand Builder:</strong> 6 credits per query</li>
                    <li>✍️ <strong>Content Studio (Social Post):</strong> 2 credits</li>
                    <li>✍️ <strong>Content Studio (Blog Post):</strong> 5 credits</li>
                    <li>📒 <strong>Gbege Book (Firm AI WhatsApp Reminders):</strong> 1 credit</li>
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-950 text-sm mb-2">Why didn't my Paystack payment add credits?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If your bank debited you but credits weren't added, simply wait 2-3 minutes. If they are still missing, take a screenshot of your Paystack receipt and send it to our WhatsApp helpline at **09064556107**. We will resolve it instantly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GRANTS GUIDE PAGE */}
          {pageType === 'grants' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center"><Award className="w-5 h-5" /></div>
                <h1 className="text-3xl font-extrabold text-slate-900 font-heading">SME Grants & Funding Guide</h1>
              </div>

              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <p>
                  To successfully qualify for funding from bank loans, federal grants, or private investments, your business must be properly structured and compliant.
                </p>

                <h3 className="font-bold text-slate-950 text-base mt-6 mb-2">🔑 Key Requirements to Secure Grants & Funding:</h3>
                <ol className="list-decimal list-inside space-y-3">
                  <li>
                    <strong>CAC Business Registration:</strong> Sole proprietorships are rarely funded. You need a Registered Business Name or a Limited Liability Company.
                  </li>
                  <li>
                    <strong>Detailed Business Plan:</strong> You must present a clear, professional plan outlining your SWOT analysis, marketing projections, and competitive advantage.
                  </li>
                  <li>
                    <strong>TIN & Compliance:</strong> A valid Tax Identification Number (TIN) is mandatory to receive disbursements.
                  </li>
                </ol>

                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mt-6">
                  <h4 className="font-bold text-green-950 mb-2">Get Funding Ready in 10 Minutes:</h4>
                  <p className="text-xs text-green-800 mb-4">
                    Use our **CAC Checklist** to register, and the **AI Business Plan Generator** to format your proposal. Click below to begin.
                  </p>
                  <button onClick={() => navigate('/register')} className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md">
                    Start Preparing Now →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CAC CHECKLIST PAGE */}
          {pageType === 'cac' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5" /></div>
                <h1 className="text-3xl font-extrabold text-slate-900 font-heading">CAC Registration Checklist</h1>
              </div>

              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <p>
                  Formalizing your business with the Corporate Affairs Commission (CAC) is the first step to unlocking corporate bank accounts, merchant payments, and federal grant opportunities.
                </p>

                <h3 className="font-bold text-slate-950 text-base mt-6 mb-2">📋 The Step-by-Step Formalization Checklist:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">1.</span>
                    <div>
                      <strong>Proposed Name Search:</strong> Choose 2 unique business names and check them against the CAC database for availability.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">2.</span>
                    <div>
                      <strong>Company Registration:</strong> File your company details, directors information, share capital structure, and identify witnesses to obtain your RC Number.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">3.</span>
                    <div>
                      <strong>TIN Activation:</strong> Once CAC is approved, your Tax Identification Number is auto-generated but must be activated on the JTB portal.
                    </div>
                  </li>
                </ul>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-6">
                  <h4 className="font-bold text-slate-950 mb-2">Stuck? Let us handle it</h4>
                  <p className="text-xs text-slate-600 mb-4">
                    Inside the SmartBiz Coach dashboard, you can hire an accredited CAC agent directly to handle your registry papers for a discounted token fee.
                  </p>
                  <button onClick={() => navigate('/register')} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md">
                    Access Compliance Tool →
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default StaticPage;
