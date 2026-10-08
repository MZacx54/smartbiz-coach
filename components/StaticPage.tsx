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
    about: { title: "About Us | SmartBiz Coach", desc: "Nigeria's #1 AI Business Operating System empowering MSMEs with daily POS, Snap-to-Studio, Central Market Square, and funding readiness." },
    contact: { title: "Contact Us | SmartBiz Coach", desc: "Get in touch with our team. Phone/WhatsApp: 09064556107, Email: support@smartbizcoach.com.ng" },
    privacy: { title: "Privacy Policy | SmartBiz Coach", desc: "Learn how we protect your personal and business data safely under NDPR compliance." },
    terms: { title: "Terms of Service | SmartBiz Coach", desc: "Read our terms of service, fair-use policy, and Paystack credit token billing rules." },
    help: { title: "Help Center & FAQs | SmartBiz Coach", desc: "Find tutorials, credit costs, fair-use guarantees, and quick answers to how our platform works." },
    grants: { title: "SME Grants & Funding Guide | SmartBiz Coach", desc: "Master guide to qualifying for BOI loans, SMEDAN grants, TEF, and bank financing in Nigeria." },
    cac: { title: "CAC Registration & Compliance Guide | SmartBiz Coach", desc: "The official step-by-step checklist to register your business, get a TIN, SCUML, and Section 23 CITA tax shield." },
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
                SmartBiz Coach is Nigeria's #1 AI-powered Business Operating System built specifically for Micro, Small, and Medium Enterprises (MSMEs). Our platform delivers essential digital infrastructure that protects counter cashflow from leakages, elevates raw product photos into luxury commercial visual assets, automates debt collection, connects merchants with buyers nationwide on Central Market Square, and prepares businesses for bank loans and government grants.
              </p>

              <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 font-heading">Our Core Mission</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                To simplify and formalize everyday trade for African entrepreneurs. In Nigeria, over 90% of business failures stem from unrecorded cash leakage, attendant theft, uncollected customer debt, and lack of bankable documentation. SmartBiz Coach solves these operational bottlenecks with zero-hardware phone tools, offline-first PWA resilience, and fair-use access where core daily tools remain 100% free forever.
              </p>

              <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 font-heading">The 4 Operating Pillars Powering Every Merchant</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-emerald-700 font-bold text-sm mb-1">⚡ Pillar 1: Daily Retail & Operations</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Phone camera barcode & QR POS scanner (zero hardware cost), 5-second multi-tender day-book, 4-digit apprentice shift PIN lock, generator fuel & petty cash tracker, and 100% offline-first open market PWA mode.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-purple-700 font-bold text-sm mb-1">📸 Pillar 2: AI Creative & Commercial Studio</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Snap-to-Studio 2.0 (raw bedsheet photos transformed into 16 luxury commercial 4K sets with reflections and shadows), AI Brand Kit builder, viral WhatsApp Status copywriters, and video teleprompter suite.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-blue-700 font-bold text-sm mb-1">🏪 Pillar 3: Central Market Square & Debt Recovery</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Central MSME Market Square showcasing products across 36 Nigerian states with CAC/SMEDAN badges, Gbege Book debt recovery ledger with automated WhatsApp Paystack payment links, and 1-tap itemized WhatsApp invoicing.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-amber-700 font-bold text-sm mb-1">⚖️ Pillar 4: Governance, Tax & Capital</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Section 23 CITA 0% tax exemption memo generator (turnover &lt; ₦25M), accredited Done-For-You CAC registration desk, BOI-compliant 5-year bankable business plan generator, and SME grant matching engine.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mt-8">
                <h3 className="font-bold text-emerald-950 mb-2">Claim 50 Free Welcome Credits Today</h3>
                <p className="text-xs text-emerald-800 mb-4">
                  Sign up for free in 60 seconds with zero credit card required. Instantly receive 50 welcome credits and lifetime free access to core POS, barcode scanning, offline mode, and debt tracking.
                </p>
                <button onClick={() => navigate('/register')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md">
                  Create Your Free Account →
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
                      <h4 className="font-bold text-slate-900 text-sm">Official Inboxes</h4>
                      <p className="text-xs text-slate-600 mt-1 space-y-0.5">
                        <a href="mailto:partners@smartbizcoach.com.ng" className="text-emerald-700 hover:underline block font-semibold">partners@smartbizcoach.com.ng</a>
                        <a href="mailto:admin@smartbiz.com.ng" className="text-emerald-700 hover:underline block font-semibold">admin@smartbiz.com.ng</a>
                        <a href="mailto:info@smartbizcoach.com.ng" className="text-emerald-700 hover:underline block font-semibold">info@smartbizcoach.com.ng</a>
                      </p>
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
              <p className="text-slate-400 text-xs mb-8">Last Updated: October 2026</p>

              <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">1. Fair-Use Free Tools Guarantee</h3>
                  <p>
                    SmartBiz Coach is committed to Nigerian MSME empowerment. Core daily retail operating tools — including the Phone Camera Barcode & QR Code POS Scanner, 5-Second POS Day-Book, Anti-Theft Apprentice Shift Lock (4-digit PIN), Open Market Offline-First PWA Mode, Generator Fuel & Petty Cash Logger, Fake Transfer Fraud Shield, Gbege Book Debt Ledger, 1-Tap WhatsApp Invoicing, Central MSME Market Square basic storefront listing, and the Section 23 CITA 0% Tax Exemption Memo — cost <strong>0 credits and remain 100% free forever</strong>. Merchants will never be locked out of their counter sales or customer records.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">2. Token Purchase & BizCredits Policy</h3>
                  <p>
                    Advanced generative compute, commercial studio rendering, and marketplace promotional boosts run on a pay-as-you-go SmartBiz BizCredit model. Credits are purchased in transparent packs (Micro ₦500 / 40 credits, Starter ₦1,500 / 150 credits, Grower ₦3,500 / 400 credits, Vendor Pro ₦7,500 / 1,000 credits, Mogul ₦15,000 / 2,500 credits) via Paystack. Every new registered merchant receives 50 Free Welcome Credits upon sign-up. BizCredits never expire, have zero recurring monthly subscription traps, and are non-refundable once consumed.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">3. Central MSME Market Square Commercial Guidelines</h3>
                  <p>
                    The Central Market Square connects verified merchants and buyers across all 36 Nigerian states and the FCT. Merchants agree to list only genuine physical goods, licensed professional services, verified commercial real estate, or legitimate wholesale inventory. Prohibited items, illegal contraband, and deceptive listings will be terminated immediately. Direct WhatsApp buyer routing is provided with 0% platform cuts, but merchants remain solely responsible for order fulfillment and dispute resolution.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-950 text-base mb-2">4. AI Intelligence & Compliance Disclaimers</h3>
                  <p>
                    Our platform utilizes Google Gemini AI to assist you in creating bank-grade business plans, branding assets, debt recovery copy, and compliance reviews. While generated financial models align with Bank of Industry (BOI) standards and statutory frameworks (such as CITA 2020), entrepreneurs should review their formal documents prior to executing binding commercial loan contracts.
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
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 font-heading">Help Center & FAQs</h1>
                  <p className="text-xs text-slate-500 mt-1">Everything you need to know about SmartBiz Coach tools, credits, POS scanning, and payments.</p>
                </div>
              </div>

              <div className="space-y-6 mt-8">
                {/* Credit Cost Matrix */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-950 text-base flex items-center gap-2">
                      <span>🪙</span> How many credits do the AI & Growth tools cost?
                    </h3>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Pay-As-You-Go</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-4">
                    Credits are only consumed when you use heavy AI compute or premium marketplace promotion. Every new business receives <strong>50 Free Welcome Credits 🎁</strong> upon sign-up.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">📄</span>
                      <div>
                        <strong>BOI 5-Year Business Plan:</strong> 200 credits
                        <p className="text-[11px] text-slate-500 mt-0.5">Bank-grade financial modeling & institutional PDF export.</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">✨</span>
                      <div>
                        <strong>AI Brand Builder:</strong> 100 credits
                        <p className="text-[11px] text-slate-500 mt-0.5">Complete brand identity, logos, palettes & typography.</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">🚀</span>
                      <div>
                        <strong>Market Square 7-Day Boost:</strong> 50 credits
                        <p className="text-[11px] text-slate-500 mt-0.5">Featured placement on nationwide 36 states trade directory.</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">💰</span>
                      <div>
                        <strong>Grant & Loan Matcher Scan:</strong> 50 credits
                        <p className="text-[11px] text-slate-500 mt-0.5">Auto-matches against BOI, SMEDAN & TEF funding programs.</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">🎥</span>
                      <div>
                        <strong>Video Teleprompter Script:</strong> 30 credits
                        <p className="text-[11px] text-slate-500 mt-0.5">Scrolling teleprompter overlay & high-converting product demo reel.</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">📢</span>
                      <div>
                        <strong>Gbege Debt Legal Notice:</strong> 25 credits
                        <p className="text-[11px] text-slate-500 mt-0.5">Tier-3 formal legal debt recovery escalation with Paystack link.</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">🏷️</span>
                      <div>
                        <strong>Pricing & Margin Audit:</strong> 20 credits
                        <p className="text-[11px] text-slate-500 mt-0.5">Naija inflation stress-test & retail markup optimizer.</p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="text-base">📸</span>
                      <div>
                        <strong>Snap-to-Studio 2.0:</strong> 5 credits per set
                        <p className="text-[11px] text-slate-500 mt-0.5">Raw bedsheet photo ➔ 16 luxury commercial 4K studio backdrops.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Free Core Tools Guarantee */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-emerald-950 text-base flex items-center gap-2">
                      <span>🔒</span> Which tools are 100% FREE FOREVER (0 Credits)?
                    </h3>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Zero Surprises</span>
                  </div>
                  <p className="text-xs text-emerald-800 mb-4">
                    We will never lock you out of your shop operations or sales records. The following core tools cost <strong>0 credits</strong> for life:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900">
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Phone Camera Barcode & QR Scanner</strong> (Audio beep POS)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>5-Second Rapid POS Day-Book</strong> (Cash, Card, Transfer, Debt)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Apprentice Shift Lock</strong> (4-Digit PIN theft defense)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Open Market Offline PWA Mode</strong> (0% data resilience)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Generator Fuel & Petty Cash Logger</strong> (Daily net profit)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Fake Transfer Fraud Shield</strong> (Verification checklists)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Gbege Debt Recovery Ledger</strong> (Who owes me & who I owe)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>1-Tap WhatsApp Invoicing</strong> (Instant customer receipts)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Central Market Square Storefront</strong> (Public directory listing)</div>
                    <div className="flex items-center gap-2"><span>✓</span> <strong>Section 23 CITA Tax Exemption Memo</strong> (0% tax legal shield)</div>
                  </div>
                </div>

                {/* Credit Packs */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-950 text-base mb-2">What are the 5 SmartBiz Credit Top-Up Packs?</h3>
                  <p className="text-xs text-slate-600 mb-4">
                    Top-ups are processed instantly through Paystack (debit cards, bank transfers, USSD). Credits never expire, and there is no monthly recurring billing:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-slate-500 font-bold text-[10px]">MICRO</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">₦500</div>
                      <div className="text-emerald-600 font-bold text-[11px] mt-1">40 Credits</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-slate-500 font-bold text-[10px]">STARTER</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">₦1,500</div>
                      <div className="text-blue-600 font-bold text-[11px] mt-1">150 Credits</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border-2 border-green-500 shadow-sm relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Popular</span>
                      <div className="text-slate-500 font-bold text-[10px]">GROWER</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">₦3,500</div>
                      <div className="text-green-600 font-bold text-[11px] mt-1">400 Credits</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-slate-500 font-bold text-[10px]">VENDOR PRO</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">₦7,500</div>
                      <div className="text-purple-600 font-bold text-[11px] mt-1">1,000 Credits</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="text-slate-500 font-bold text-[10px]">MOGUL</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">₦15,000</div>
                      <div className="text-amber-600 font-bold text-[11px] mt-1">2,500 Credits</div>
                    </div>
                  </div>
                </div>

                {/* Feature FAQs */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-950 text-sm mb-2">How does the Phone Camera Barcode Scanner work?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You do not need to buy an expensive barcode terminal or handheld laser scanner. In your POS checkout screen, tap <strong>Scan Barcode</strong>. SmartBiz Coach activates your phone camera with an audio confirmation beep. Simply point your camera at any retail barcode or QR code; the scanner detects it in milliseconds, updates your day-book total, and deducts inventory stock automatically.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-950 text-sm mb-2">Does the POS Day-Book work when there is no network in the market?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Yes! SmartBiz Coach features an <strong>Open Market Offline PWA Mode</strong> built for crowded markets like Alaba International, Balogun, and Computer Village where cellular networks frequently stall. You can check out customers, scan barcodes, log cash/transfers, and lock apprentice shifts with zero data. When your phone reconnects, transactions sync to the secure cloud automatically.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-950 text-sm mb-2">How do I showcase and sell on the Central MSME Market Square?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Inside your Product Manager, toggle <strong>Showcase on Market Square</strong>. Your listing is broadcast across all 36 Nigerian states and Abuja in the Central Trade Directory. You can link your CAC registration and SMEDAN number for an official <strong>Verified Merchant Trust Badge</strong>, share pre-designed product cards directly to your WhatsApp Status, and receive inbound buyer inquiries straight to your WhatsApp with zero middleman deductions.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-950 text-sm mb-2">Why didn't my Paystack payment add credits?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Paystack payments normally credit within 5 seconds. In rare cases where your bank network delays the webhook notification, simply wait 2-3 minutes and refresh your dashboard.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If credits are still missing, take a screenshot of your bank debit or Paystack receipt and WhatsApp our 24/7 Merchant Support Desk at <strong>09064556107</strong>. We verify the transaction reference and credit your account immediately.
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
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 font-heading">SME Grants & Funding Guide</h1>
                  <p className="text-xs text-slate-500 mt-1">The master playbook for securing BOI loans, SMEDAN grants, TEF, and commercial bank funding in Nigeria.</p>
                </div>
              </div>

              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <p>
                  Over ₦500 Billion in federal grants, intervention funds, and concessionary bank loans are disbursed to Nigerian businesses annually. Yet, more than 85% of applicants are disqualified before review due to basic structural deficiencies — such as lack of formal incorporation, absence of 5-year financial models, or unverified bookkeeping.
                </p>

                <h3 className="font-bold text-slate-950 text-base mt-6 mb-2">🔑 The 5 Structural Requirements to Secure Grants & Loans:</h3>
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                      <div>
                        <strong className="text-slate-900 text-sm">CAC Formalization & Corporate Bank Account:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Unregistered businesses and sole proprietors operating personal bank accounts are almost universally disqualified. You need an active Corporate Affairs Commission (CAC) Registered Business Name (BN) or Limited Liability Company (Ltd) with an active Corporate Account and Tax Identification Number (TIN).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                      <div>
                        <strong className="text-slate-900 text-sm">Bank-Grade 5-Year Business Plan & Financial Model:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Institutional lenders (BOI, DBN, Commercial Banks) reject casual pitch decks. You must submit a structured plan with Executive Summary, Market Opportunity, SWOT analysis, CapEx breakdowns, 5-Year Cashflow Projections, Break-Even analysis, and debt service coverage ratio (DSCR).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                      <div>
                        <strong className="text-slate-900 text-sm">Section 23 CITA Tax Exemption Shield & Valid TIN:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Under Sections 23 and 40 of the Companies Income Tax Act (CITA), Nigerian MSMEs with annual gross turnover under ₦25,000,000 are legally subject to a 0% corporate tax rate. SmartBiz Coach generates an official legal exemption memo to present alongside your Tax Identification Number (TIN).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
                      <div>
                        <strong className="text-slate-900 text-sm">Verifiable Daily Retail Sales Day-Book & POS Records:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Grant donors look for authentic transaction traction. By running your daily counter checkout on SmartBiz Coach's 5-Second POS and issuing 1-Tap WhatsApp Invoices, your transactions build an audit-proof operational record that verifies turnover to loan committees.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">5</span>
                      <div>
                        <strong className="text-slate-900 text-sm">Digital Commercial Presence & Verified Market Standing:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Evaluators visit your storefront or digital footprint. Having luxury 4K studio product photography (Snap-to-Studio 2.0) and a verified listing on the Central MSME Market Square proves you are actively selling in the real economy.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-slate-950 text-base mt-8 mb-3">🏛️ Major Nigerian Funding Programs Supported:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-900 text-sm">Bank of Industry (BOI) MSME Fund</div>
                    <div className="text-emerald-700 font-semibold mt-0.5">Up to ₦10M+ • Single-Digit Interest</div>
                    <p className="text-slate-500 mt-1">Concessionary facilities for production, processing, tech, and light manufacturing enterprises.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-900 text-sm">SMEDAN Conditional Grant Scheme</div>
                    <div className="text-blue-700 font-semibold mt-0.5">Non-Repayable Grants + Training</div>
                    <p className="text-slate-500 mt-1">Federal capacity development and micro-grant disbursements targeted at formalizing informal traders.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-900 text-sm">Tony Elumelu Foundation (TEF)</div>
                    <div className="text-purple-700 font-semibold mt-0.5">$5,000 Seed Capital Grant</div>
                    <p className="text-slate-500 mt-1">Annual non-refundable funding, world-class business training, and Pan-African network mentorship.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-900 text-sm">Development Bank of Nigeria (DBN)</div>
                    <div className="text-amber-700 font-semibold mt-0.5">Up to 10-Year Loan Facilities</div>
                    <p className="text-slate-500 mt-1">Wholesale low-cost refinancing channeled through commercial and microfinance banks.</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-3xl p-6 sm:p-8 mt-8 shadow-xl">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300 mb-2">
                    <span>🚀 Fast-Track Execution</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-extrabold mb-3">Get Funding-Ready in 10 Minutes with SmartBiz Coach</h4>
                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed mb-6">
                    Our AI platform generates your institutional 5-year business plan, matches your sector to active grant programs, and provides the statutory CAC registration checklist to guarantee approval.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => navigate('/register')} className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold px-6 py-3 rounded-xl text-xs transition-all shadow-lg hover:-translate-y-0.5">
                      Generate Business Plan (PDF) →
                    </button>
                    <button onClick={() => navigate('/register')} className="bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all border border-emerald-500/40">
                      Scan Active Grants with AI →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CAC CHECKLIST PAGE */}
          {pageType === 'cac' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5" /></div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 font-heading">CAC Registration & Compliance Guide</h1>
                  <p className="text-xs text-slate-500 mt-1">Step-by-step roadmap to formalizing your Nigerian enterprise, opening corporate accounts, and securing statutory tax exemption.</p>
                </div>
              </div>

              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <p>
                  Registering your business with the Corporate Affairs Commission (CAC) is the foundation of enterprise growth in Nigeria. It legalizes your trade name, protects your brand ownership, unlocks corporate commercial bank accounts, and allows you to access federal grants and BOI loans.
                </p>

                <h3 className="font-bold text-slate-950 text-base mt-6 mb-2">📋 The Official 5-Step Formalization Roadmap:</h3>
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                      <div>
                        <strong className="text-slate-900 text-sm">Proposed Business Name Availability Search:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Submit two unique business name options on the CAC portal. Avoid generic names, trademarks, or restricted terms like "Federal", "National", or "Consulting" unless licensed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                      <div>
                        <strong className="text-slate-900 text-sm">Entity Classification & Director Filing:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Choose between a <strong>Registered Business Name (Sole Proprietorship / Partnership)</strong> or a <strong>Private Limited Liability Company (Ltd)</strong>. Prepare valid government IDs (NIN, Voter's Card, or Passport), verified signatures, and passport photographs.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                      <div>
                        <strong className="text-slate-900 text-sm">Certificate Issuance & Status Report:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Upon CAC approval, your official electronic Certificate of Incorporation and Status Report containing your BN/RC Number are issued with verifiable QR codes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
                      <div>
                        <strong className="text-slate-900 text-sm">TIN Activation & Section 23 CITA Tax Shield:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Your Tax Identification Number (TIN) is generated via the Joint Tax Board (JTB). Use SmartBiz Coach's <strong>Section 23 CITA Exemption Memo Generator</strong> to legally claim your 0% corporate tax rate (valid for turnover under ₦25,000,000) and avoid illegal local harassment.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">5</span>
                      <div>
                        <strong className="text-slate-900 text-sm">SCUML Registration & Corporate Bank Account Opening:</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          Certain commercial sectors (consulting, real estate, precious metals, logistics) require a Special Control Unit Against Money Laundering (SCUML) certificate from the EFCC prior to bank activation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🏛️</span>
                    <h4 className="font-bold text-slate-950 text-base">Accredited Done-For-You Registration Desk</h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-6">
                    Skip registry rejections and long queues. Our accredited CAC agents manage your full registration from name reservation to certificate dispatch:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-6">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900">Business Name (BN)</div>
                      <div className="text-emerald-600 font-extrabold text-sm mt-0.5">₦27,500</div>
                      <p className="text-[11px] text-slate-500 mt-1">Completed in 3-5 working days. Includes official Status Report & Certificate.</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900">Private Limited Company (Ltd)</div>
                      <div className="text-blue-600 font-extrabold text-sm mt-0.5">₦68,000</div>
                      <p className="text-[11px] text-slate-500 mt-1">1 Million share capital, MEMART, Certificate & official Status Report.</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900">Incorporated Trustee (NGO/Church)</div>
                      <div className="text-purple-600 font-extrabold text-sm mt-0.5">₦135,000</div>
                      <p className="text-[11px] text-slate-500 mt-1">Complete trustee newspaper publication and statutory constitution.</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900">SCUML Anti-Money Laundering Certificate</div>
                      <div className="text-amber-600 font-extrabold text-sm mt-0.5">₦35,000</div>
                      <p className="text-[11px] text-slate-500 mt-1">Fast-track processing for corporate bank account compliance.</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/register')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl text-xs transition-all shadow-md">
                    Start Your Registration With Accredited Desk →
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
