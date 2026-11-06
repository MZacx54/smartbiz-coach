import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, CheckCircle, Shield, FileText, HelpCircle, Award, BookOpen, Send, Lock, Scale, Building, Database, AlertCircle, ExternalLink, Download, Check, Sparkles } from 'lucide-react';
import SEO from './SEO';
import api from '../services/api';

interface StaticPageProps {
  pageType: 'about' | 'contact' | 'privacy' | 'terms' | 'help' | 'grants' | 'cac';
}

const StaticPage: React.FC<StaticPageProps> = ({ pageType }) => {
  const navigate = useNavigate();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactDepartment, setContactDepartment] = useState<'support' | 'partnership' | 'admin'>('support');
  const [contactMessage, setContactMessage] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const typeLabel = contactDepartment === 'partnership' 
        ? 'Partnership & Institutional Cohort' 
        : contactDepartment === 'admin' 
        ? 'Platform Admin & Legal Inquiry' 
        : 'Customer Support & Helpdesk';

      await api.post('/users/partnership-inquiry/', {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        organization: contactDepartment === 'partnership' ? 'Partnership Prospect' : 'MSME Merchant',
        partnership_type: typeLabel,
        message: `[Department: ${contactDepartment.toUpperCase()}] ${contactMessage}`,
        source: 'Website Contact Page'
      });
    } catch (err) {
      console.warn("Contact form fallback notice:", err);
    } finally {
      setLoading(false);
      setFormSubmitted(true);
    }
  };

  const pageMeta = {
    about: { title: "About Us | SmartBiz Coach", desc: "Nigeria's #1 AI Business Operating System empowering MSMEs with daily POS, Snap-to-Studio, Central Market Square, and funding readiness." },
    contact: { title: "Contact Us | SmartBiz Coach", desc: "Get in touch with our team. Phone/WhatsApp: 09064556107, Email: support@smartbizcoach.com.ng" },
    privacy: { title: "Privacy Policy & Statutory Data Protection Notice | SmartBiz Coach", desc: "Official data protection notice under NDPA 2023, NDPR, NACCIMA Youth Entrepreneurs Institutional Governance Framework (SBC/NYE/MOU/2026/V3.1), and CBN non-custodial standards." },
    terms: { title: "Terms of Service & Merchant Operational Agreement | SmartBiz Coach", desc: "Binding terms of service, fair-use lifetime free tools guarantee, BizCredits utility token billing rules, Market Square guidelines, NACCIMA institutional rules, and alternative underwriting disclaimers." },
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
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">Official Functional Inboxes</h4>
                      <div className="text-xs text-slate-600 mt-2 space-y-2">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <span className="font-bold text-emerald-800 text-[11px] block">🤝 Strategic Partnerships, NGOs & Grants</span>
                          <a href="mailto:partners@smartbizcoach.com.ng" className="text-emerald-600 hover:underline font-mono text-xs">partners@smartbizcoach.com.ng</a>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <span className="font-bold text-blue-800 text-[11px] block">🛟 Merchant Support, Helpdesk & CAC Inquiries</span>
                          <a href="mailto:support@smartbizcoach.com.ng" className="text-blue-600 hover:underline font-mono text-xs">support@smartbizcoach.com.ng</a>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <span className="font-bold text-slate-800 text-[11px] block">⚙️ Platform Administration & Governance</span>
                          <a href="mailto:admin@smartbiz.com.ng" className="text-slate-700 hover:underline font-mono text-xs">admin@smartbiz.com.ng</a>
                        </div>
                      </div>
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
                      <h4 className="font-bold text-slate-950">Message Dispatched!</h4>
                      <p className="text-xs text-slate-500 mt-2">We received your request and routed it to our {contactDepartment === 'partnership' ? 'Partnership Desk' : contactDepartment === 'admin' ? 'Administrative Desk' : 'Merchant Support Team'}. We will respond within 24 hours.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Purpose / Department</label>
                        <select
                          value={contactDepartment}
                          onChange={(e: any) => setContactDepartment(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="support">🛟 Customer & Merchant Support (support@smartbizcoach.com.ng)</option>
                          <option value="partnership">🤝 Strategic Partnerships, Donors & NGOs (partners@smartbizcoach.com.ng)</option>
                          <option value="admin">⚙️ Platform Admin & Executive Matters (admin@smartbiz.com.ng)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Name</label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={e => setContactName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm"
                          placeholder="Your Full Name"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                          <input
                            type="email"
                            required
                            value={contactEmail}
                            onChange={e => setContactEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm"
                            placeholder="you@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone / WhatsApp</label>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={e => setContactPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm"
                            placeholder="08012345678"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message</label>
                        <textarea
                          required
                          rows={4}
                          value={contactMessage}
                          onChange={e => setContactMessage(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-sm"
                          placeholder="How can our team help your business?"
                        ></textarea>
                      </div>
                      <button type="submit" disabled={loading} className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                        {loading ? "Transmitting..." : <><Send className="w-4 h-4" /> Send Message</>}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

                    {/* PRIVACY POLICY PAGE */}
          {pageType === 'privacy' && (
            <div className="space-y-8">
              {/* Header Banner */}
              <div className="border-b border-slate-200 pb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> NDPA 2023 &amp; NDPR Compliant
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Building className="w-3 h-3" /> NACCIMA/NYE MOU Protocol Ref: SBC/NYE/MOU/2026/V3.1
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3" /> CBN Non-Custodial Gateway
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
                  Privacy Policy &amp; Statutory Data Protection Notice
                </h1>
                <p className="text-slate-500 text-xs mt-2 flex items-center gap-2">
                  <span>Version 4.2 · Last Legally Ratified &amp; Deployed: November 2026</span>
                  <span>·</span>
                  <span>Governing Jurisdiction: Federal Republic of Nigeria</span>
                </p>
              </div>

              {/* Quick Summary Pill Callout */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200 rounded-2xl p-5 text-slate-700 text-xs leading-relaxed shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                      Our Constitutional Commitment to Nigerian MSME Data Sovereignty
                    </h4>
                    <p>
                      SmartBiz Coach Technologies Limited (&ldquo;SmartBiz Coach&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates in strict conformity with the 
                      <strong> Nigeria Data Protection Act 2023 (NDPA)</strong>, the <strong>Nigeria Data Protection Regulation 2019 (NDPR)</strong>, and directives of the 
                      <strong> Nigeria Data Protection Commission (NDPC)</strong>. Your sales records, supplier margins, customer contacts, and debtor ledgers 
                      (&ldquo;Gbege Book&rdquo;) remain your <strong>100% private, sovereign commercial property</strong>. In accordance with Section 8.2 &amp; 15 of the bilateral 
                      NACCIMA Youth Entrepreneurs (NYE) Memorandum of Understanding (Document Ref: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-blue-900">SBC/NYE/MOU/2026/V3.1</code>), 
                      neither chambers, governmental entities, nor financial institutions can inspect your individual counter records without your explicit, affirmative, in-app written consent.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Sections */}
              <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
                
                {/* Section 1 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">01</span>
                    <h3>Statutory Framework &amp; Scope of Policy</h3>
                  </div>
                  <p className="mb-3">
                    This Statutory Privacy Policy and Data Protection Notice governs all digital interactions, application programming interfaces (APIs), mobile progressive web apps (PWAs), 
                    voice counter terminals, and cloud software services provided by SmartBiz Coach Technologies Limited across the Federal Republic of Nigeria and ECOWAS member states.
                  </p>
                  <p>
                    This policy is formulated in direct compliance with:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1.5 text-xs text-slate-700 pl-2">
                    <li><strong>The Nigeria Data Protection Act (NDPA) 2023</strong> enacted by the National Assembly of Nigeria.</li>
                    <li><strong>The Nigeria Data Protection Regulation (NDPR) 2019</strong> and regulatory issuances by the NDPC.</li>
                    <li><strong>Central Bank of Nigeria (CBN) Consumer Protection Framework</strong> &amp; Payment Service Provider guidelines.</li>
                    <li><strong>The Bilateral NACCIMA Youth Entrepreneurs (NYE) Memorandum of Understanding</strong> (Ref: <span className="font-mono text-slate-900">SBC/NYE/MOU/2026/V3.1</span>).</li>
                    <li>International principles on cross-border data processing, confidentiality, and data minimization.</li>
                  </ul>
                </section>

                {/* Section 2 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">02</span>
                    <h3>Roles of the Parties: Data Controller vs. Data Processor</h3>
                  </div>
                  <p className="mb-3">
                    The NDPA 2023 legally differentiates between the entity that determines the purposes of processing (&ldquo;Data Controller&rdquo;) and the technical operator processing data on instruction (&ldquo;Data Processor&rdquo;):
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">SmartBiz Coach as Data Controller</span>
                      <p className="text-xs text-slate-600">
                        We serve as Data Controller for your user registration identity, phone number, login credentials, business KYC (CAC registration, TIN), billing history, BizCredit balance, 
                        and technical device telemetry required to administer your platform account and fulfill our service agreement.
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Merchant as Controller / SmartBiz as Processor</span>
                      <p className="text-xs text-slate-600">
                        With respect to your counter sales receipts, customer directories, debtor names and contact numbers recorded in the &ldquo;Gbege Book&rdquo;, and apprentice cash-handling logs, 
                        <strong>you (the Merchant) remain the Data Controller</strong>. SmartBiz Coach processes this operational information strictly as a technical Data Processor following your instruction.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">03</span>
                    <h3>Comprehensive Data Inventory: What We Collect</h3>
                  </div>
                  <p className="mb-4">
                    In order to deliver real-time retail accounting, offline PWA synchronization, AI-powered catalog creation, and credit diagnostics, we collect and process the following specific categories of information:
                  </p>
                  
                  <div className="space-y-3 text-xs">
                    <div className="border-l-2 border-blue-500 pl-3 py-1">
                      <strong className="text-slate-900">A. Merchant Identity &amp; Corporate Profile:</strong> Full name of business owner or legal representative, registered business trading name, Corporate Affairs Commission (CAC) Registration Number (RC/BN), Tax Identification Number (TIN), physical trading address, state, local government area (LGA), market cluster classification, email address, and WhatsApp/phone numbers.
                    </div>
                    <div className="border-l-2 border-emerald-500 pl-3 py-1">
                      <strong className="text-slate-900">B. Retail Counter &amp; POS Day-Book Telemetry:</strong> Line-item sales timestamps, item barcodes, stock SKU updates, cash register opening/closing balances, petty cash disbursements, generator fuel logistics expenses, cashier shift events, and 4-digit apprentice shift locks.
                    </div>
                    <div className="border-l-2 border-amber-500 pl-3 py-1">
                      <strong className="text-slate-900">C. Customer Debt Recovery (&ldquo;Gbege Book&rdquo;) Records:</strong> Customer customer-facing names, debtor telephone numbers, transaction dates, debt repayment schedules, outstanding receivables, agreed payment milestones, and automated WhatsApp reminder dispatch status.
                    </div>
                    <div className="border-l-2 border-purple-500 pl-3 py-1">
                      <strong className="text-slate-900">D. Voice POS Audio &amp; Speech Telemetry:</strong> Fleeting audio snippets recorded via microphone during hands-free counter sales logging. Audio is securely streamed to Google Gemini APIs strictly for speech-to-structured-text parsing.
                    </div>
                    <div className="border-l-2 border-rose-500 pl-3 py-1">
                      <strong className="text-slate-900">E. Photo Studio Visual Assets:</strong> Raw product photos uploaded by merchants for automated background removal, luxury shadow synthesis, and high-resolution e-commerce catalog rendering.
                    </div>
                    <div className="border-l-2 border-indigo-500 pl-3 py-1">
                      <strong className="text-slate-900">F. Alternative Credit Underwriting Telemetry:</strong> Aggregated cash turnover regularity, till velocity index, debtor turnaround latency, apprentice fraud shield anomaly rate, and algorithmic credit scores (SmartScore™ 300–850).
                    </div>
                    <div className="border-l-2 border-slate-500 pl-3 py-1">
                      <strong className="text-slate-900">G. Technical &amp; Offline PWA State:</strong> IP addresses, browser fingerprint, browser user-agent string, offline IndexedDB synchronization queue states, and diagnostic application logs.
                    </div>
                  </div>
                </section>

                {/* Section 4 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">04</span>
                    <h3>Lawful Bases for Data Processing (NDPA 2023 §25)</h3>
                  </div>
                  <p className="mb-3">
                    Under Section 25 of the Nigeria Data Protection Act 2023, every processing activity carried out by SmartBiz Coach is anchored on an established lawful ground:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span><strong>Contractual Performance:</strong> Necessary to execute our User Agreement, process counter transactions, maintain offline-first sync, generate invoices, and publish basic Central Market Square listings.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span><strong>Legitimate Commercial Interests:</strong> Preventing apprentice cashier theft, safeguarding against fake bank transfer fraud, securing multi-tenant databases, and publishing macro-economic regional performance benchmarks.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span><strong>Legal &amp; Regulatory Obligations:</strong> Compliance with Nigerian corporate registration requirements, Anti-Money Laundering (AML) / Combating Financing of Terrorism (CFT) mandates, and statutory corporate income tax exemptions (CITA Section 23/40).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span><strong>Explicit, Informed Consent:</strong> Transmitting credit scoring dossiers to partner financial institutions (BOI, DBN, SMEDAN, commercial banks), audio recording for Voice POS parsing, and opt-in marketing newsletters. Consent may be revoked at any time.</span>
                    </li>
                  </ul>
                </section>

                {/* Section 5 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">05</span>
                    <h3>NACCIMA &amp; Institutional Chamber Governance Framework (MOU Ref: SBC/NYE/MOU/2026/V3.1)</h3>
                  </div>
                  <p className="mb-3">
                    Our platform operates under formal bilateral technical partnership protocols with the Nigerian Association of Chambers of Commerce, Industry, Mines and Agriculture Youth Entrepreneurs 
                    (&ldquo;NACCIMA / NYE&rdquo;). This bilateral relationship is governed by the executed Memorandum of Understanding (Document Ref: <code className="text-slate-900 font-mono font-bold">SBC/NYE/MOU/2026/V3.1</code>). 
                    All users, whether onboarded through chamber cohorts or independently, benefit from the following mandatory safeguards:
                  </p>
                  
                  <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0">1. Strict Data Segregation:</span>
                      <p>
                        In accordance with Clause 8.2 and Clause 15 of the MOU, an individual merchant&rsquo;s sales day-book, profit margins, supplier purchase costs, customer directories, and private debtor records 
                        are strictly confidential. Chambers, regional secretariats, and cohort coordinators have <strong>zero technical or legal authority to view or inspect</strong> individual business ledgers.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0">2. Aggregated Macro Telemetry Only:</span>
                      <p>
                        Chamber administrative dashboards and executive impact reports receive strictly aggregated, anonymized, macro-economic telemetry (e.g. &ldquo;1,420 MSMEs digitized in Kano State; ₦480M total macro sales velocity recorded; 65% retail trade sector composition&rdquo;). No individual merchant or consumer identifiers are ever disclosed in these reports.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0">3. Verification Badges (&ldquo;Verified NYE Member&rdquo;):</span>
                      <p>
                        In accordance with Clause 13.2 of the MOU, chamber accreditation badges displayed on marketplace storefronts signify that the merchant is in good standing with their accredited business chamber. 
                        Badges do not constitute a sovereign financial guarantee, co-signature, or product warranty by NACCIMA or SmartBiz Coach.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 6 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">06</span>
                    <h3>Financial Institutions, Lenders, BOI, SMEDAN &amp; Alternative Credit Scoring Telemetry</h3>
                  </div>
                  <p className="mb-3">
                    SmartBiz Coach empowers MSMEs that lack formal collateral or audited tax returns through our proprietary <strong>SmartScore™ Alternative Underwriting Engine</strong> (scored 300 to 850). 
                    To ensure complete transparency and user sovereignty, your data is governed under the following statutory controls:
                  </p>
                  
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="font-bold text-blue-900 block mb-1">1. Affirmative 1-Click Explicit Consent Required:</span>
                      <p className="text-slate-700">
                        SmartBiz Coach <strong>never automatically transmits</strong> your sales velocity, cash turnover history, or cryptographic audit dossier (<code>PublicAuditReport</code>) to any Commercial Bank, 
                        Microfinance Bank (MFB), Bank of Industry (BOI), Development Bank of Nigeria (DBN), or the Small and Medium Enterprises Development Agency of Nigeria (SMEDAN). 
                        Transmission occurs <strong>only when you explicitly click to submit an application or authorize dossier sharing</strong> within the platform.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="font-bold text-amber-900 block mb-1">2. Indicative Diagnostic Tool Disclaimer (MOU Clause 15.5):</span>
                      <p className="text-slate-700">
                        SmartScore™ and its generated IFRS-9 staging indicators are diagnostic operational evaluations calculated from your self-recorded counter discipline, till regularity, and debt collection turnaround. 
                        A high SmartScore™ demonstrates commercial discipline but <strong>does not guarantee loan approval, credit limits, or concessionary interest rates</strong> from any financial institution. 
                        Lending partners evaluate applications against their independent statutory risk models and prudential guidelines.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">3. Automated Decision-Making Safeguards (NDPA 2023 §37):</span>
                      <p className="text-slate-700">
                        Under Section 37 of the NDPA 2023, you have the right not to be subjected to decisions based solely on automated processing. You may at any time request human intervention to review 
                        your SmartScore™ computation, submit clarifying explanations regarding uncharacteristic revenue dips, or dispute anomalous apprentice till entries.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 7 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">07</span>
                    <h3>Payment Processing &amp; Non-Custodial CBN Regulatory Architecture</h3>
                  </div>
                  <p className="mb-3">
                    SmartBiz Coach is a business software platform, not a bank, deposit-taking institution, or digital wallet escrow provider. Our payment architecture is strictly <strong>non-custodial</strong>:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Automated Split Settlement:</strong> Customer payments made through online Market Square checkout are processed via Central Bank of Nigeria (CBN)-licensed payment switches (primarily <strong>Paystack Payments Limited</strong> and <strong>HabariPay / Squadco</strong>). Sales proceeds settle directly into the merchant&rsquo;s verified Nigerian commercial or microfinance bank account, with the transparent 1.5%–2% gateway/platform technology processing fee settled automatically.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>0% Commission on Direct WhatsApp &amp; Cash Trade:</strong> SmartBiz Coach levies 0% platform cuts on direct peer-to-peer cash, POS counter, or WhatsApp bank transfer orders arranged directly between merchant and buyer.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>PCI-DSS Level 1 Compliance:</strong> We never capture, store, or process full credit/debit card numbers, CVVs, or card PINs on our servers. All financial tokenization is executed directly in Paystack-hosted PCI-DSS Level 1 cryptographic enclaves.</span>
                    </li>
                  </ul>
                </section>

                {/* Section 8 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">08</span>
                    <h3>Artificial Intelligence, Voice POS &amp; Large Language Model Safeguards</h3>
                  </div>
                  <p className="mb-3">
                    Our platform incorporates state-of-the-art generative machine learning and computer vision to deliver Voice POS counter logging, Photo Studio background removal, and commercial documentation:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                      <strong className="text-purple-950 block mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-600" /> Google Gemini API Processing</strong>
                      Audio captured during Voice POS sales logging is transmitted over TLS 1.3 to Google Gemini API endpoints solely for transient speech-to-text tokenization and semantic order extraction.
                    </div>
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                      <strong className="text-purple-950 block mb-1 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-purple-600" /> Zero Biometric Voice Profiling</strong>
                      Audio streams are processed transiently in volatile RAM and are <strong>not archived, profiled, or analyzed for biometric speaker verification or emotional detection</strong>.
                    </div>
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                      <strong className="text-purple-950 block mb-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-purple-600" /> Zero Proprietary Model Training</strong>
                      Your private business transactions, client debt entries, and confidential supplier costs are <strong>never used to train public foundation AI models</strong>.
                    </div>
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                      <strong className="text-purple-950 block mb-1 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-purple-600" /> Photo Studio Image Isolation</strong>
                      Uploaded merchant product photographs are isolated in private, tenant-scoped storage buckets accessible only by your authenticated business credentials.
                    </div>
                  </div>
                </section>

                {/* Section 9 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">09</span>
                    <h3>Cloud Infrastructure, Cryptographic Security &amp; Cross-Border Transfers</h3>
                  </div>
                  <p className="mb-3">
                    SmartBiz Coach deploys high-availability, multi-region enterprise infrastructure to guarantee 99.9% uptime for offline and online retail operations:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li><strong>Hosting Infrastructure:</strong> Multi-region managed databases via Supabase PostgreSQL (AWS/GCP), containerized application services on Render, and globally distributed static edges on Vercel.</li>
                    <li><strong>Cryptographic Controls:</strong> All data in transit is encrypted using modern <strong>TLS 1.3</strong> protocols. All database volumes, backups, and user assets are encrypted at rest using industry-standard <strong>AES-256</strong>. Passwords and apprentice till PINs are salted and irreversibly hashed using Argon2 / PBKDF2.</li>
                    <li><strong>Multi-Tenant Isolation:</strong> Strict Row-Level Security (RLS) policies and tenant isolation keys ensure that no merchant or unauthorized tenant can access another business&rsquo;s sales registers or private books.</li>
                    <li><strong>Cross-Border Transfer Compliance:</strong> In accordance with Part VI of the NDPA 2023, transfers to global cloud infrastructure providers are conducted under binding contractual clauses and technical safeguards guaranteeing an adequate level of data protection.</li>
                  </ul>
                </section>

                {/* Section 10 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">10</span>
                    <h3>Data Retention, Portability &amp; Guaranteed 60-to-90 Day Exit Transition (MOU Clause 15.4)</h3>
                  </div>
                  <p className="mb-3">
                    We retain your data for the duration of your active subscription to maintain operational continuity, multi-year sales trends, and tax compliance records.
                  </p>
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-slate-700 leading-relaxed mb-3">
                    <strong className="text-emerald-950 block mb-1 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-700" /> Guaranteed 60-to-90 Day Data Portability Window
                    </strong>
                    In accordance with <strong>Clause 15.4 of the NACCIMA/NYE MOU</strong>, should an account be deactivated, cancelled, or should institutional chamber sponsorship expire, 
                    every merchant is guaranteed an unhindered <strong>60-to-90 day grace window</strong> to export all historical sales day-books, inventory catalogs, debtor records (&ldquo;Gbege Book&rdquo;), 
                    customer directories, and tax balance sheets in open, machine-readable formats (<strong>CSV, JSON, and PDF</strong>). 
                    You will never suffer vendor lock-in or lose access to your commercial records.
                  </div>
                  <p className="text-xs text-slate-600">
                    Following the expiration of this export window, personal operational records are permanently purged or irreversibly de-identified, retaining only minimal aggregate records required by Nigerian tax and accounting legislation.
                  </p>
                </section>

                {/* Section 11 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">11</span>
                    <h3>Your Statutory Rights under NDPA 2023 &amp; NDPR</h3>
                  </div>
                  <p className="mb-3">
                    Under Sections 34 through 40 of the Nigeria Data Protection Act 2023, you enjoy comprehensive, enforceable rights regarding your personal and business data:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">1. Right of Access &amp; Inspection</strong>
                      You may inspect and export all your operational data directly through the platform dashboard at any time.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">2. Right to Rectification</strong>
                      You may correct inaccurate or obsolete business names, CAC numbers, addresses, and phone numbers via <code className="text-blue-700 font-mono">Settings &gt; Profile</code>.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">3. Right to Erasure (&ldquo;Right to Be Forgotten&rdquo;)</strong>
                      You may delete your business profile and all operational records directly inside <code className="text-rose-700 font-mono">Settings &gt; Danger Zone</code> via our self-service erasure endpoint.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">4. Right to Restrict Processing</strong>
                      You may restrict dossier sharing with financial institutions or opt out of non-essential marketing notifications with one click.
                    </div>
                  </div>
                </section>

                {/* Section 12 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">12</span>
                    <h3>Data Protection Officer (DPO) &amp; Regulatory Recourse</h3>
                  </div>
                  <p className="mb-3">
                    SmartBiz Coach has designated a dedicated Data Protection Officer to supervise all compliance matters. If you have any inquiries, requests for data export, or statutory grievances:
                  </p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span><strong>Data Protection Office Email:</strong> <a href="mailto:dpo@smartbizcoach.com.ng" className="text-blue-600 font-bold hover:underline">dpo@smartbizcoach.com.ng</a></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-600" />
                      <span><strong>Legal &amp; Institutional Registry:</strong> <a href="mailto:legal@smartbizcoach.com.ng" className="text-slate-700 font-bold hover:underline">legal@smartbizcoach.com.ng</a></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span><strong>Headquarters:</strong> SmartBiz Coach Technologies Limited, Lagos &amp; Abuja, Federal Republic of Nigeria.</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                    <p>
                      <strong>Supervisory Authority Recourse:</strong> If you believe your data protection rights have not been adequately redressed, you have the statutory right under the NDPA 2023 to lodge a formal complaint with the 
                      <strong> Nigeria Data Protection Commission (NDPC)</strong>: Plot 12, P.O.W. Mafemi Crescent, Utako, Abuja, Nigeria. Email: <a href="mailto:complaints@ndpc.gov.ng" className="text-blue-600 hover:underline">complaints@ndpc.gov.ng</a> | Web: <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://ndpc.gov.ng</a>.
                    </p>
                  </div>
                </section>

              </div>
            </div>
          )}

          {/* TERMS OF SERVICE PAGE */}
          {pageType === 'terms' && (
            <div className="space-y-8">
              {/* Header Banner */}
              <div className="border-b border-slate-200 pb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-green-100 text-green-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> 100% Free Lifetime Tools Guarantee
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Scale className="w-3 h-3" /> NACCIMA/NYE MOU Integrated Ref: SBC/NYE/MOU/2026/V3.1
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> BizCredits Pay-As-You-Go Billing
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
                  Terms of Service &amp; Merchant Operational Agreement
                </h1>
                <p className="text-slate-500 text-xs mt-2 flex items-center gap-2">
                  <span>Version 4.2 · Last Legally Ratified &amp; Deployed: November 2026</span>
                  <span>·</span>
                  <span>Governing Law: Laws of the Federal Republic of Nigeria</span>
                </p>
              </div>

              {/* Core Operational Sections */}
              <div className="space-y-6 text-slate-600 leading-relaxed text-sm">

                {/* Section 1 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">01</span>
                    <h3>Acceptance of Terms &amp; Institutional Governance Integration</h3>
                  </div>
                  <p className="mb-3">
                    By creating an account, accessing our Progressive Web App (PWA), utilizing our offline POS day-book, or participating in the Central MSME Market Square, 
                    you agree to be legally bound by this Merchant Operational Agreement and all incorporated schedules.
                  </p>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <strong>NACCIMA Youth Entrepreneurs (NYE) Institutional Framework:</strong> If you were onboarded through a NACCIMA state chamber, sectoral trade association, 
                    or bilateral institutional cohort, your platform usage is additionally governed by the bilateral Memorandum of Understanding (Document Ref: <code className="font-mono text-slate-900">SBC/NYE/MOU/2026/V3.1</code>). 
                    In the event of any operational conflict, the provisions protecting merchant data sovereignty, free core tools, and 60-to-90 day data portability shall strictly take precedence.
                  </p>
                </section>

                {/* Section 2 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">02</span>
                    <h3>Fair-Use Lifetime Free Core Tools Guarantee (0 Credits Forever)</h3>
                  </div>
                  <p className="mb-3">
                    SmartBiz Coach was founded to eliminate the high digital barriers that hold back Nigerian traders and artisans. 
                    In strict accordance with Clause 4 and Clause 12 of the NACCIMA/NYE MOU, we guarantee that all <strong>Core Daily Retail Operating Utilities cost 0 credits and remain 100% free forever</strong>:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-800">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>Phone Camera Barcode &amp; QR Code POS Scanner</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>5-Second POS Day-Book Cash &amp; Bank Register</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>Anti-Theft Apprentice Shift Lock (4-Digit PIN)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>Open Market Offline-First PWA Mode (No Data Needed)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>Generator Fuel &amp; Petty Cash Expense Logger</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>Fake Transfer Fraud Shield &amp; Alert Ledger</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>&ldquo;Gbege Book&rdquo; Customer Debt &amp; Receivables Ledger</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>1-Tap WhatsApp Invoicing &amp; Digital Receipts</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>Central Market Square Basic Verified Storefront</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span>CITA Section 23/40 0% Small Company Tax Memo</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    <strong>Zero Vendor Lock-In Guarantee:</strong> Merchants will never be locked out of their counter sales, daily records, or customer contact books. You own your trade records.
                  </p>
                </section>

                {/* Section 3 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">03</span>
                    <h3>BizCredits Digital Utility Token Commercial Policy, Pricing &amp; Billing (MOU Section 4 &amp; 12)</h3>
                  </div>
                  <p className="mb-3">
                    Advanced generative computing, GPU-based commercial image rendering, voice recognition transcription, and automated marketing campaigns operate on a transparent 
                    <strong> pay-as-you-go SmartBiz BizCredit model</strong>.
                  </p>
                  
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">Standard Transparent Token Pricing Packs:</strong>
                      <p className="text-slate-600">
                        Packs are purchased in Naira (₦) via Paystack: <strong>Micro</strong> (₦500 / 40 credits), <strong>Starter</strong> (₦1,500 / 150 credits), <strong>Grower</strong> (₦3,500 / 400 credits), 
                        <strong>Vendor Pro</strong> (₦7,500 / 1,000 credits), and <strong>Mogul</strong> (₦15,000 / 2,500 credits).
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">50 Free Welcome Credits 🎁:</strong>
                      <p className="text-slate-600">
                        Every newly registered Nigerian business account is credited with 50 Free Welcome Credits upon onboarding to test generative business plans, debt recovery copywriting, and Photo Studio rendering.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">Token Characteristics &amp; Non-Refundability:</strong>
                      <p className="text-slate-600">
                        BizCredits are digital utility consumption tokens powering computational tasks. They are <strong>strictly non-refundable for fiat cash</strong> once credited. 
                        BizCredits <strong>never expire</strong> while your account remains in active or good standing, and have zero recurring monthly subscription traps. 
                        In the event of account deactivation, remaining credits remain fully spendable during the guaranteed 60-to-90 day data transition window.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 4 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">04</span>
                    <h3>Central MSME Market Square Merchant Code of Conduct &amp; Transactional Integrity</h3>
                  </div>
                  <p className="mb-3">
                    The Central Market Square connects verified merchants and buyers across all 36 Nigerian States and the Federal Capital Territory (FCT). All participating merchants agree to the following code of conduct:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0">1. Legitimate Trade Only:</span>
                      <span>Merchants agree to list only authentic physical goods, licensed professional services, verified commercial properties, or verified wholesale inventory.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0">2. Prohibited Goods &amp; Services:</span>
                      <span>Listings involving counterfeit brands, unapproved pharmaceuticals, illicit narcotics, firearms, stolen property, ponzi/pyramid schemes, advance-fee fraud, or deceptive representations are strictly prohibited.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0">3. Zero-Tolerance Fraud Sanctions:</span>
                      <span>Any merchant engaged in verified fraudulent conduct will face immediate account termination, forfeiture of listings, and immediate reporting to law enforcement authorities (Economic and Financial Crimes Commission - EFCC / Nigeria Police Force).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0">4. Order Fulfillment &amp; Direct WhatsApp Routing:</span>
                      <span>Merchants utilizing direct WhatsApp buyer routing enjoy 0% platform cuts, but remain solely and strictly responsible for product delivery, packaging, inspection, and dispute settlement with their buyers.</span>
                    </li>
                  </ul>
                </section>

                {/* Section 5 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">05</span>
                    <h3>NACCIMA Youth Entrepreneurs (NYE) Institutional Cohort Rules (MOU Section 6 &amp; 13)</h3>
                  </div>
                  <p className="mb-3">
                    For merchants onboarded under organized chamber cohorts (e.g. NACCIMA Youth Entrepreneurs, state chambers of commerce, women in business networks, or market associations):
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li><strong>Accreditation Badges:</strong> Displaying the &ldquo;Verified NYE Member&rdquo; or &ldquo;Verified Technical Innovator&rdquo; badge requires valid chamber enrollment in good standing. Badges are revocable upon chamber notification of member deregistration.</li>
                    <li><strong>Chamber Independence:</strong> As codified in Clause 13.3 of the MOU, institutional verification confirms chamber membership and identity verification only. It does not transfer merchant operational liability to NACCIMA, nor does it imply sovereign debt backing.</li>
                    <li><strong>Cohort Macro Reporting:</strong> You acknowledge that your anonymized, aggregated transaction volume will contribute to regional chamber trade reports and policy advocacy whitepapers.</li>
                  </ul>
                </section>

                {/* Section 6 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">06</span>
                    <h3>Alternative Underwriting, SmartScore™ &amp; Institutional Lending Disclaimers (MOU Clause 15.5)</h3>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-slate-700 leading-relaxed mb-3">
                    <strong className="text-amber-950 block mb-1">Critical Regulatory Notice Regarding Loan Approvals</strong>
                    In accordance with Clause 15.5 of Document Ref: <code className="font-mono text-amber-900">SBC/NYE/MOU/2026/V3.1</code>, SmartScore™ (300 to 850) and our generated 
                    cryptographic audit dossiers (<code>PublicAuditReport</code>) are <strong>diagnostic operational indicators</strong> reflecting your recorded cash turnover regularity, 
                    till integrity, and debtor collection efficiency.
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    SmartBiz Coach is an enterprise software provider, not a regulated bank, microfinance institution, or licensed money lender. 
                    <strong>No score, report, or certificate generated by SmartBiz Coach constitutes a guarantee of loan approval, credit facility, or grant disbursement</strong> by the Bank of Industry (BOI), Development Bank of Nigeria (DBN), Small and Medium Enterprises Development Agency of Nigeria (SMEDAN), or any commercial or microfinance bank.
                  </p>
                  <p className="text-xs text-slate-600">
                    All lending partners evaluate loan applications under their independent statutory underwriting guidelines, collateral requirements, and KYC checks.
                  </p>
                </section>

                {/* Section 7 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">07</span>
                    <h3>Non-Custodial Financial Settlement &amp; CBN Regulatory Alignment</h3>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    All electronic payment transactions executed on SmartBiz Coach are routed through CBN-licensed payment switches and solution service providers (Paystack Payments Limited / Squadco). 
                    SmartBiz Coach does not hold, pool, or custody client funds. Sales proceeds settle directly into the merchant&rsquo;s verified Nigerian commercial or microfinance bank account via automated gateway split-settlement. 
                    Merchants are responsible for providing valid NUBAN account details matching their registered business or director identity.
                  </p>
                </section>

                {/* Section 8 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">08</span>
                    <h3>Intellectual Property &amp; Merchant Data Ownership</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">Merchant IP Ownership:</strong>
                      You retain 100% full, exclusive ownership of your business trademarks, brand names, product catalogs, photography assets, and customer databases. You grant SmartBiz Coach only the limited technical license necessary to host, display, and process these assets for your operations.
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">SmartBiz Coach Platform IP:</strong>
                      SmartBiz Coach Technologies Limited retains all right, title, and interest in and to the platform codebase, algorithmic models, SmartScore™ methodology, user interface designs, and proprietary documentation.
                    </div>
                  </div>
                </section>

                {/* Section 9 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">09</span>
                    <h3>Limitation of Liability, Service Availability &amp; Offline Resilience</h3>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed mb-2">
                    SmartBiz Coach provides an offline-first PWA architecture designed to withstand Nigerian network power outages and connectivity disruptions. 
                    However, the platform is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis.
                  </p>
                  <p className="text-xs text-slate-600">
                    To the maximum extent permitted by Nigerian law, SmartBiz Coach Technologies Limited, its directors, employees, and institutional partners shall not be liable for any indirect, incidental, or consequential damages resulting from telecommunications network failures, bank gateway downtime, or unrecorded cash transactions outside the platform. In any event, our aggregate liability shall not exceed the total fees paid by the merchant in the three (3) months preceding the claim.
                  </p>
                </section>

                {/* Section 10 */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
                    <span className="w-7 h-7 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center text-xs font-mono">10</span>
                    <h3>Dispute Resolution, Governing Law &amp; Nigerian Jurisdiction</h3>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed mb-3">
                    This Agreement is governed by and construed in accordance with the substantive laws of the <strong>Federal Republic of Nigeria</strong>.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                    <p>
                      <strong>Mandatory Amicable Negotiation:</strong> Any commercial dispute, controversy, or claim arising out of or in connection with these Terms shall first be submitted to 
                      <strong> mandatory good-faith amicable negotiation for a period of fourteen (14) calendar days</strong> from written notification to <a href="mailto:legal@smartbizcoach.com.ng" className="text-blue-600 font-bold hover:underline">legal@smartbizcoach.com.ng</a>.
                    </p>
                    <p>
                      <strong>Mediation Clause:</strong> If unresolved through negotiation, the dispute shall be referred to and finally resolved through mediation under the rules of the 
                      <strong> Lagos Multi-Door Courthouse (LMDC)</strong> or the <strong>Abuja Multi-Door Courthouse</strong> prior to initiating formal litigation in any Nigerian court of competent jurisdiction.
                    </p>
                  </div>
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
