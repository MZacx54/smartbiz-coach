import React, { useState, useEffect, useRef } from 'react';
import { BrandIdentity } from '../types';
import { generateBrandIdentity, generateBrandLogo } from '../services/geminiService';
import ShareActions from './ShareActions';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';

interface BrandBuilderProps {
  savedBrand: BrandIdentity | null;
  onSave: (brand: BrandIdentity) => void;
  credits: number;
  onUpdateCredits: (credits: number) => void;
}

const BrandBuilder: React.FC<BrandBuilderProps> = ({ savedBrand, onSave, credits, onUpdateCredits }) => {
  const [step, setStep] = useState<'INPUT' | 'LOADING' | 'RESULT'>('INPUT');
  const [formData, setFormData] = useState({ name: '', niche: '', vibe: '', description: '', tone: 'Corporate' });
  const [localBrandData, setLocalBrandData] = useState<BrandIdentity | null>(null);
  const [error, setError] = useState<string>('');

  // Credit limits modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  // New States for upgraded features
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'TRUST' | 'WHATSAPP' | 'PACKAGING' | 'MOCKUP'>('IDENTITY');
  const [activeMockup, setActiveMockup] = useState<'PACKAGING' | 'RECEIPT' | 'FLYER' | 'CARD' | 'INSTAGRAM' | 'WHATSAPP' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE'>('PACKAGING');
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [customShareText, setCustomShareText] = useState('');
  const [customNiche, setCustomNiche] = useState('');

  // WhatsApp Link Generator State
  const [waLinkPhone, setWaLinkPhone] = useState('');
  const [waLinkMessage, setWaLinkMessage] = useState('');

  // Mockup Ref for Printing
  const mockupRef = useRef<HTMLDivElement>(null);

  // Brand Archetypes for Richer Input
  const brandArchetypes = [
    { id: 'Authority', label: 'The Authority', desc: 'Professional, Trustworthy, Expert', icon: '👔' },
    { id: 'Bestie', label: 'The Bestie', desc: 'Friendly, Fun, Relatable', icon: '👯' },
    { id: 'Luxury', label: 'The Luxury', desc: 'Premium, Exclusive, Elegant', icon: '💎' },
    { id: 'Caregiver', label: 'The Caregiver', desc: 'Warm, Helpful, Safe', icon: '🤲' },
    { id: 'Innovator', label: 'The Innovator', desc: 'Modern, Smart, Tech-savvy', icon: '🚀' },
    { id: 'Hype', label: 'The Hype', desc: 'Energetic, Bold, Street-smart', icon: '🔥' },
  ];

  // Initialize with saved data if available
  useEffect(() => {
    if (savedBrand) {
      setLocalBrandData(savedBrand);
      setStep('RESULT');
      setFormData({
        name: savedBrand.businessName,
        niche: savedBrand.niche,
        vibe: savedBrand.vibe,
        description: '',
        tone: 'Corporate' // Default fall back
      });
      // Set default WA Message
      setWaLinkMessage(`Hello ${savedBrand.businessName}, I would like to make an enquiry.`);
    }
  }, [savedBrand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNiche = formData.niche === 'Other' ? customNiche : formData.niche;
    if (!formData.name || !finalNiche || !formData.vibe) return;

    const usage = usageLimiter.checkUsage('brand_builder', credits);
    if (!usage.allowed) {
      setDeductOnConfirm(null); // Just opens to show "insufficient credits"
      setShowCreditPrompt(true);
      return;
    }

    if (usage.useCredits) {
      setDeductOnConfirm(() => async () => {
        setStep('LOADING');
        setError('');
        setShowCreditPrompt(false);
        const token = localStorage.getItem('sb_auth_token');
        if (!token) {
          setError("You must be logged in to generate a brand.");
          setStep('INPUT');
          return;
        }
        try {
          const billingResponse = await billingService.deductCredits(usage.cost, "AI Brand Identity Builder");
          onUpdateCredits(billingResponse.credits);

          const result = await generateBrandIdentity(formData.name, finalNiche, formData.vibe, token, formData.description, formData.tone);
          setLocalBrandData(result);
          onSave(result);
          setStep('RESULT');
          setActiveTab('IDENTITY');
          setWaLinkMessage(`Hello ${result.businessName}, I would like to make an enquiry.`);
        } catch (err: any) {
          setError(err?.response?.data?.error || "Failed to generate brand. Please try again.");
          setStep('INPUT');
        }
      });
      setShowCreditPrompt(true);
      return;
    }

    // Free Generation
    setStep('LOADING');
    setError('');
    const token = localStorage.getItem('sb_auth_token');
    if (!token) {
      setError("You must be logged in to generate a brand.");
      setStep('INPUT');
      return;
    }
    try {
      const result = await generateBrandIdentity(formData.name, finalNiche, formData.vibe, token, formData.description, formData.tone);
      usageLimiter.incrementUsage('brand_builder');
      setLocalBrandData(result);
      onSave(result);
      setStep('RESULT');
      setActiveTab('IDENTITY');
      setWaLinkMessage(`Hello ${result.businessName}, I would like to make an enquiry.`);
    } catch (err) {
      setError("Failed to generate brand. Please try again.");
      setStep('INPUT');
    }
  };

  const handleGenerateLogo = async () => {
    if (!localBrandData || !localBrandData.logoPrompt) return;
    setIsGeneratingLogo(true);
    try {
      const logoUrl = await generateBrandLogo(localBrandData.logoPrompt);
      const updatedBrand = { ...localBrandData, logoUrl };
      setLocalBrandData(updatedBrand);
      onSave(updatedBrand);
    } catch (e) {
      setError("Failed to generate logo visual. Try again.");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleCreateNew = () => {
    setStep('INPUT');
    setLocalBrandData(null);
    setFormData({ name: '', niche: '', vibe: '', description: '', tone: 'Corporate' });
  };

  const generateWhatsAppLink = () => {
    const phone = waLinkPhone.replace(/[^0-9]/g, ''); // strip non-numeric
    const msg = encodeURIComponent(waLinkMessage);
    const link = `https://wa.me/${phone}?text=${msg}`;
    navigator.clipboard.writeText(link);
    alert("WhatsApp Link Copied! Add this to your Instagram Bio.");
  };

  const handleExport = () => {
    if (!localBrandData) return;

    // Robust Export Function
    const printContent = `
      <html>
        <head>
          <title>${localBrandData.businessName} - Brand Kit</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; -webkit-print-color-adjust: exact; }
            h1 { font-size: 36px; margin-bottom: 5px; color: #111; border-bottom: 4px solid ${localBrandData?.colors?.primary || '#333'}; padding-bottom: 20px; }
            h2 { font-size: 14px; text-transform: uppercase; color: #666; letter-spacing: 2px; margin-top: 0; }
            .section { margin-bottom: 40px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; color: ${localBrandData?.colors?.primary || '#333'}; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
            .color-container { display: flex; gap: 20px; }
            .color-box { width: 100px; height: 100px; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #ddd; }
            .color-info { font-size: 14px; font-weight: bold; font-family: monospace; }
            .logo { width: 150px; height: 150px; border-radius: 20px; object-fit: cover; margin-bottom: 20px; border: 1px solid #eee; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .tagline { font-style: italic; background: #f9f9f9; padding: 15px; border-left: 4px solid ${localBrandData?.colors?.secondary || '#666'}; margin-bottom: 10px; border-radius: 0 8px 8px 0; }
            .policy-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; font-size: 12px; margin-bottom: 10px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 50px;">
            ${localBrandData.logoUrl ? `<img src="${localBrandData.logoUrl}" class="logo" />` : ''}
            <h1>${localBrandData.businessName}</h1>
            <h2>${localBrandData.niche}</h2>
            <p style="font-size: 20px; color: #555; font-style: italic; margin-top: 10px;">"${localBrandData.elevatorPitch}"</p>
          </div>

          <div class="section">
            <div class="section-title">Brand Palette</div>
            <div class="color-container">
              <div>
                <div class="color-box" style="background: ${localBrandData?.colors?.primary || '#333'}"></div>
                <div class="color-info">Primary<br>${localBrandData?.colors?.primary || '#333'}</div>
              </div>
              <div>
                <div class="color-box" style="background: ${localBrandData?.colors?.secondary || '#666'}"></div>
                <div class="color-info">Secondary<br>${localBrandData?.colors?.secondary || '#666'}</div>
              </div>
              <div>
                <div class="color-box" style="background: ${localBrandData?.colors?.accent || '#999'}"></div>
                <div class="color-info">Accent<br>${localBrandData?.colors?.accent || '#999'}</div>
              </div>
            </div>
          </div>

          <div class="grid">
            <div class="section">
              <div class="section-title">Typography</div>
              <p style="font-size: 24px; font-weight: bold;">${localBrandData.fonts.primary} (Headings)</p>
              <p style="font-size: 16px;">${localBrandData.fonts.secondary} (Body Text)</p>
            </div>
            <div class="section">
              <div class="section-title">Brand Voice</div>
              <p style="line-height: 1.6;">${localBrandData.brandVoice}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Strategic Messaging</div>
            <p><strong>Target Audience:</strong> ${localBrandData.targetAudience}</p>
            <div style="margin-top: 20px;">
              <strong>Key Taglines:</strong>
              ${localBrandData.taglines.map(t => `<div class="tagline">${t}</div>`).join('')}
            </div>
          </div>
          
           <div class="section">
            <div class="section-title">Trust & Policies</div>
             <div class="policy-box"><strong>Payment:</strong> ${localBrandData.policies?.payment}</div>
             <div class="policy-box"><strong>Delivery:</strong> ${localBrandData.policies?.delivery}</div>
             <div class="policy-box"><strong>Returns:</strong> ${localBrandData.policies?.refund}</div>
          </div>

          <div style="text-align: center; margin-top: 80px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
            Generated by SmartBiz Coach AI
          </div>
        </body>
      </html>
    `;

    // Use a robust way to open window
    const printWindow = window.open('', 'PRINT_WINDOW', 'height=800,width=1000,scrollbars=yes');

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

      // Delay print to allow images/styles to render
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert("Please allow pop-ups for this website to use the Export feature.");
    }
  };

  const handlePrintMockup = () => {
    if (!mockupRef.current) return;

    // Create a new window for printing the specific mockup
    const win = window.open('', '', 'height=800,width=800');
    if (!win) {
      alert("Please allow pop-ups to download the asset.");
      return;
    }

    win.document.write('<html><head><title>Download Asset</title>');
    // Inject Tailwind for styling in the new window
    win.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    win.document.write('</head><body class="flex items-center justify-center min-h-screen bg-gray-100 p-10">');
    // Add the mockup content
    win.document.write(mockupRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();

    // Wait for Tailwind to initialize before printing
    setTimeout(() => {
      win.print();
      // win.close(); // Optional: Close after print
    }, 1500);
  };

  const openShareMockup = () => {
    if (!localBrandData) return;

    // Generate context-specific share text
    let text = `Check out my new ${localBrandData.businessName} brand asset!`;

    if (activeMockup === 'RECEIPT') {
      text = `Official Receipt from ${localBrandData.businessName}.\n\nThank you for your patronage!`;
    } else if (activeMockup === 'FLYER') {
      text = `📢 BIG SALES ALERT!\n\n${localBrandData.businessName} is giving you the best deals.\n\n${localBrandData.taglines[0]}`;
    } else if (activeMockup === 'CARD') {
      text = `Connect with us!\n\n${localBrandData.businessName}\n${localBrandData.niche}\n\n${localBrandData.elevatorPitch}`;
    }

    setCustomShareText(text);
    setShowShareModal(true);
  };

  const getShareText = () => {
    if (customShareText) return customShareText;
    if (!localBrandData) return '';
    return `Check out my new brand identity generated by SmartBiz Coach! 🚀\n\nBusiness Name: ${localBrandData.businessName}\nNiche: ${localBrandData.niche}\nTagline: ${localBrandData.taglines[0]}\n\nCreate yours now!`;
  };

  // --- Mockup Components ---

  const ReceiptPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-xs mx-auto bg-white shadow-md border border-gray-200 p-4 font-mono text-sm relative">
      {/* Torn edge effect */}
      <div className="absolute -bottom-2 left-0 right-0 h-4 bg-transparent bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:10px_10px] rotate-180"></div>

      <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} className="w-12 h-12 mx-auto mb-2 grayscale object-cover rounded-full" />
        ) : (
          <div className="text-xl font-bold uppercase mb-1">{brand.businessName}</div>
        )}
        <div className="uppercase font-bold text-lg leading-none mb-1">{brand.businessName}</div>
        <p className="text-[10px] text-gray-500">{brand.elevatorPitch.substring(0, 50)}...</p>
        <p className="text-[10px] text-gray-500 mt-1">Tel: +234 906 455 6107</p>
      </div>

      <div className="mb-4 text-xs">
        <div className="flex justify-between mb-1">
          <span>DATE:</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>RECEIPT #:</span>
          <span>001245</span>
        </div>
      </div>

      <table className="w-full text-left mb-4 text-xs">
        <thead>
          <tr className="border-b border-black">
            <th className="pb-1">ITEM</th>
            <th className="text-right pb-1">QTY</th>
            <th className="text-right pb-1">AMT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pt-2">Premium Service</td>
            <td className="text-right pt-2">1</td>
            <td className="text-right pt-2">25,000</td>
          </tr>
          <tr>
            <td className="pt-1">Consultation</td>
            <td className="text-right pt-1">2</td>
            <td className="text-right pt-1">10,000</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t-2 border-black pt-2 mb-6">
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL</span>
          <span>₦35,000</span>
        </div>
      </div>

      <div className="text-center text-xs">
        <p className="font-bold mb-1">THANK YOU!</p>
        <p className="italic text-[10px] mb-2">"{brand.taglines[0]}"</p>
        <div className="border border-gray-300 p-1 rounded text-[9px] text-gray-500">
          {brand.policies?.payment || "No Refunds after payment."}
        </div>
      </div>
    </div>
  );

  const PackagingPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-sm mx-auto flex items-center justify-center p-10 perspective-1000 min-h-[300px]">
      {/* Shopping Bag Mockup */}
      <div className="relative w-40 h-56 bg-white shadow-2xl transform rotate-y-12 transition-transform hover:rotate-y-0" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
        {/* Bag Handle */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-12 border-4 border-gray-800 rounded-t-full"></div>

        {/* Bag Content */}
        <div className="h-full flex flex-col items-center justify-center p-4 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,rgba(255,255,255,0.8)_2px,transparent_2px)] bg-[length:15px_15px]"></div>

          {brand?.logoUrl ? (
            <img src={brand.logoUrl} alt="Logo" className="w-16 h-16 mb-2 rounded-full shadow-md object-cover relative z-10" />
          ) : (
            <div className="text-4xl font-bold mb-2 border-4 border-white p-2 z-10">{brand?.businessName?.charAt(0) || '?'}</div>
          )}
          <h3 className="text-lg font-bold uppercase tracking-wider z-10 leading-tight">{brand?.businessName}</h3>
          <p className="text-[10px] mt-2 opacity-90 z-10">{brand?.niche}</p>
        </div>

        {/* Side Fold effect */}
        <div className="absolute top-0 right-0 w-6 h-full bg-black/20 origin-left skew-y-12 translate-x-full"></div>
      </div>

      {/* Box Mockup */}
      <div className="relative w-32 h-24 -ml-8 mt-24 transform rotate-[-5deg] z-20">
        <div className="absolute inset-0 bg-white shadow-xl flex items-center justify-center border border-gray-200" style={{ borderTop: brand?.colors?.secondary ? `8px solid ${brand?.colors?.secondary}` : '8px solid #ccc' }}>
          <div className="text-center p-1 overflow-hidden">
            <p className="font-bold text-gray-800 text-[10px] line-clamp-2">{brand?.taglines?.[0] || 'Tagline Placeholder'}</p>
            <p className="text-[8px] text-gray-400 mt-1">{brand?.businessName ? brand.businessName.split(' ')[0] : 'business'}.com</p>
          </div>
        </div>
        {/* Box Top */}
        <div className="absolute -top-8 left-0 w-full h-8 bg-gray-100 origin-bottom transform skew-x-12 border border-gray-200"></div>
        {/* Box Side */}
        <div className="absolute top-0 -right-3 w-3 h-full bg-gray-300 origin-left transform skew-y-12"></div>
      </div>
    </div>
  );

  const FlyerPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-xs mx-auto aspect-[4/5] bg-white shadow-xl relative overflow-hidden flex flex-col border border-gray-200">
      {/* Header Image Area */}
      <div className="h-1/2 bg-gray-200 relative">
        {brand?.logoUrl && <img src={brand.logoUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black opacity-60"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <h2 className="text-white text-3xl font-black uppercase text-center px-4 leading-none drop-shadow-md transform -rotate-2">
            Grand<br /><span className="text-yellow-400">Opening</span><br />Sale
          </h2>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-white transform -skew-y-3 origin-bottom-left scale-110"></div>
      </div>

      {/* Body */}
      <div className="flex-1 bg-white p-5 relative flex flex-col">
        <div className="absolute -top-12 right-4 w-16 h-16 rounded-full flex items-center justify-center shadow-lg text-white font-bold text-center leading-none transform rotate-12 border-2 border-white" style={{ backgroundColor: brand?.colors?.accent || '#ccc' }}>
          <span className="text-[10px]">UP TO<br /><span className="text-lg">50%</span><br />OFF</span>
        </div>

        <h3 className="text-xl font-bold mb-1 leading-tight" style={{ color: brand?.colors?.primary || '#333' }}>{brand?.businessName}</h3>
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">{brand?.elevatorPitch}</p>

        <div className="space-y-1 mb-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold text-xs">✓</span>
            <span className="text-xs font-bold text-gray-800">Quality Products</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold text-xs">✓</span>
            <span className="text-xs font-bold text-gray-800">Affordable Prices</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold text-xs">✓</span>
            <span className="text-xs font-bold text-gray-800">Nationwide Delivery</span>
          </div>
        </div>

        <div className="mt-auto bg-gray-900 text-white p-2 rounded text-center">
          <p className="font-bold text-sm">ORDER NOW</p>
          <p className="text-[10px] text-gray-300">0800 123 4567 • @{brand?.businessName ? brand.businessName.replace(/\s/g, '').toLowerCase() : 'business'}</p>
        </div>
      </div>
    </div>
  );

  const BusinessCardPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-sm mx-auto perspective-1000">
      {/* Front */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-4 relative h-56 border border-gray-200">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-20" style={{ backgroundColor: brand?.colors?.secondary || '#ccc' }}></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-tr-full opacity-20" style={{ backgroundColor: brand?.colors?.accent || '#eee' }}></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} alt="Logo" className="w-16 h-16 mb-2 rounded-full shadow-md object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2 shadow-md" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
              {brand?.businessName?.charAt(0) || '?'}
            </div>
          )}
          <h3 className="font-bold text-xl text-gray-900" style={{ fontFamily: 'serif' }}>{brand?.businessName}</h3>
          <p className="text-xs uppercase tracking-widest mt-1 text-gray-500">{brand?.niche}</p>
        </div>
      </div>

      {/* Back */}
      <div className="rounded-xl shadow-xl overflow-hidden h-56 relative flex flex-col justify-center px-8" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
        <p className="text-white/80 text-xs mb-1">Contact</p>
        <p className="text-white font-bold text-lg mb-4">+234 906 455 6107</p>

        <p className="text-white/80 text-xs mb-1">Social</p>
        <p className="text-white font-bold text-sm mb-4">@{brand?.businessName ? brand.businessName.replace(/\s+/g, '').toLowerCase() : 'business'}</p>

        <div className="absolute bottom-4 right-4">
          <p className="text-white/40 text-[10px]">{brand?.elevatorPitch}</p>
        </div>
      </div>
    </div>
  );

  const InstagramPostPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-sm mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {brand?.logoUrl ? <img src={brand.logoUrl} className="w-full h-full object-cover" /> : brand?.businessName?.charAt(0) || '?'}
        </div>
        <span className="text-xs font-bold text-gray-900">{brand?.businessName ? brand.businessName.replace(/\s+/g, '').toLowerCase() : 'business'}</span>
      </div>
      <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-50" style={{ backgroundColor: brand?.colors?.secondary || '#ccc' }}></div>
        <div className="relative z-10 bg-white p-6 shadow-lg rounded-lg max-w-[80%] text-center">
          <p className="font-bold text-xl" style={{ color: brand?.colors?.primary || '#333' }}>"{brand?.taglines?.[0] || 'Tagline Placeholder'}"</p>
        </div>
      </div>
      <div className="p-3">
        <div className="flex gap-3 mb-2">
          <span>❤️</span><span>💬</span><span>🚀</span>
        </div>
        <p className="text-xs text-gray-800"><span className="font-bold">liked by others</span> and <span className="font-bold">234 others</span></p>
        <p className="text-xs text-gray-600 mt-1"><span className="font-bold text-gray-900">{brand?.businessName}</span> We are open for business! Check out our new collection. #NaijaBusiness #{brand?.niche ? brand.niche.replace(/\s+/g, '') : 'business'}</p>
      </div>
    </div>
  );

  const FacebookCoverPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-lg mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gray-100 p-2 border-b">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
        </div>
      </div>
      {/* Cover Area */}
      <div className="relative h-48 w-full overflow-hidden" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: brand?.colors?.secondary ? `repeating-linear-gradient(45deg, ${brand?.colors?.secondary} 0, ${brand?.colors?.secondary} 10px, transparent 0, transparent 50%)` : 'none' }}></div>
        <div className="absolute bottom-4 right-6 text-right">
          <h1 className="text-white font-bold text-2xl shadow-sm">{brand?.businessName}</h1>
          <p className="text-white/90 text-sm">{brand?.taglines?.[0] || 'Tagline'}</p>
        </div>
      </div>
      {/* Profile Section */}
      <div className="px-6 pb-4 relative">
        <div className="absolute -top-12 left-6 w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ backgroundColor: brand?.colors?.accent || '#ccc', color: '#fff' }}>
              {brand?.businessName?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <div className="pl-28 pt-2">
          <h2 className="font-bold text-lg text-gray-900">{brand?.businessName}</h2>
          <p className="text-xs text-gray-500">{brand?.elevatorPitch}</p>
        </div>
      </div>
    </div>
  );

  const TwitterHeaderPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-lg mx-auto bg-black border border-gray-800 rounded-xl shadow-sm overflow-hidden text-white">
      {/* Header */}
      <div className="h-32 w-full relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: brand?.colors?.secondary || '#333' }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundColor: brand?.colors?.primary || '#000' }}></div>
        <h2 className="relative z-10 font-bold text-2xl opacity-50 tracking-widest uppercase">{brand?.niche}</h2>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 relative">
        <div className="flex justify-between items-start">
          <div className="-mt-8 w-16 h-16 rounded-full border-2 border-black bg-gray-900 overflow-hidden flex items-center justify-center">
            {brand?.logoUrl ? (
              <img src={brand.logoUrl} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold">{brand?.businessName?.charAt(0) || '?'}</span>
            )}
          </div>
          <button className="mt-2 border border-gray-600 rounded-full px-4 py-1 text-sm font-bold hover:bg-gray-900">Follow</button>
        </div>
        <div className="mt-2">
          <h3 className="font-bold text-lg leading-tight">{brand?.businessName}</h3>
          <p className="text-gray-500 text-sm">@{brand?.businessName ? brand.businessName.replace(/\s+/g, '') : 'business'}</p>
          <p className="mt-2 text-sm">{brand?.socialBio}</p>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>📍 Nigeria</span>
            <span>🔗 {brand?.businessName ? brand.businessName.replace(/\s+/g, '').toLowerCase() : 'business'}.com</span>
          </div>
        </div>
      </div>
    </div>
  );

  const WhatsAppStatusPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-xs mx-auto bg-gray-900 h-[500px] rounded-2xl overflow-hidden relative shadow-2xl border-4 border-gray-800">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700 flex gap-1 p-1 z-20">
        <div className="flex-1 h-full bg-white rounded-full"></div>
        <div className="flex-1 h-full bg-white/30 rounded-full"></div>
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50">
          {brand?.logoUrl ? <img src={brand.logoUrl} className="w-full h-full object-cover" /> : <div className="bg-green-500 w-full h-full"></div>}
        </div>
        <div>
          <p className="text-white text-sm font-bold shadow-sm">{brand?.businessName}</p>
          <p className="text-white/70 text-xs">Just now</p>
        </div>
      </div>

      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
        <h2 className="text-white font-bold text-3xl mb-4" style={{ fontFamily: brand?.fonts?.primary || 'sans-serif' }}>BIG SALES!</h2>
        <div className="bg-white text-black p-4 rounded-lg shadow-lg rotate-2 mb-8">
          <p className="font-bold text-xl">{brand?.taglines?.[0] || 'Quality Products'}</p>
        </div>
        <p className="text-white/90 text-sm">Don't miss out on our new arrivals.</p>
        <div className="absolute bottom-20 animate-bounce">
          <p className="text-white text-xs">Swipe up to chat</p>
          <p className="text-white">^</p>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center z-20">
        <p className="text-white/50 text-xs">Reply...</p>
      </div>
    </div>
  );

  const LinkedInBannerPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-lg mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* LinkedIn Banner */}
      <div className="h-28 w-full relative flex items-center pl-8" style={{ backgroundColor: brand?.colors?.secondary || '#333' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: brand?.colors?.primary ? `radial-gradient(${brand?.colors?.primary} 10%, transparent 10%)` : 'none', backgroundSize: '10px 10px' }}></div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">{brand?.businessName}</h2>
          <p className="text-xs text-white/90">{brand?.elevatorPitch}</p>
        </div>
      </div>
      <div className="px-6 pb-6 relative">
        <div className="absolute -top-10 left-6 w-20 h-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl font-bold">{brand?.businessName?.charAt(0) || '?'}</div>
          )}
        </div>
        <div className="pt-12">
          <h3 className="font-bold text-lg text-gray-900">{brand?.businessName}</h3>
          <p className="text-sm text-gray-600">{brand?.niche} • {brand?.taglines?.[0] || 'Quality'}</p>
          <p className="text-xs text-gray-500 mt-2">Lagos, Nigeria • <span className="text-blue-600 font-bold">Contact info</span></p>
          <div className="flex gap-2 mt-3">
            <button className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">Connect</button>
            <button className="border border-gray-400 text-gray-600 px-4 py-1 rounded-full text-sm font-bold">Message</button>
          </div>
        </div>
      </div>
    </div>
  );

  const YouTubeChannelPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-lg mx-auto bg-[#0f0f0f] border border-gray-800 rounded-xl shadow-sm overflow-hidden text-white">
      {/* Channel Art */}
      <div className="h-32 w-full relative flex flex-col items-center justify-center text-center p-4 overflow-hidden" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundColor: brand?.colors?.accent || '#000', transform: 'skewY(-5deg) scale(1.5)' }}></div>
        <h1 className="relative z-10 font-bold text-3xl text-white drop-shadow-lg">{brand?.businessName} TV</h1>
        <p className="relative z-10 text-white/90 text-sm font-medium mt-1">New Videos Every Week!</p>
        <button className="relative z-10 mt-2 bg-red-600 text-white px-4 py-1 rounded text-xs font-bold uppercase tracking-wider">Subscribe</button>
      </div>
      {/* Channel Info */}
      <div className="p-4 flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
          {brand?.logoUrl ? <img src={brand.logoUrl} className="w-full h-full object-cover" /> : <span className="text-xl font-bold">{brand?.businessName?.charAt(0) || '?'}</span>}
        </div>
        <div>
          <h3 className="font-bold text-lg">{brand?.businessName}</h3>
          <p className="text-gray-400 text-xs">@{brand?.businessName ? brand.businessName.replace(/\s+/g, '').toLowerCase() : 'business'} • 1.2K subscribers • 45 videos</p>
          <p className="text-gray-300 text-sm mt-1 line-clamp-2">{brand?.elevatorPitch} Subscribe for tips on {brand?.niche}!</p>
        </div>
      </div>
    </div>
  );

  // --- Main Render ---

  if (step === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="text-gray-600 font-medium animate-pulse">Building your Corporate Kit...</p>
      </div>
    );
  }

  if (step === 'RESULT' && localBrandData) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Share Brand Kit</h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-gray-800">✕</button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Show off your new business identity to the world!</p>
              <ShareActions text={getShareText()} title={`Brand: ${localBrandData.businessName}`} />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Brand Studio</h2>
            <p className="text-gray-500 text-sm">Your Identity, Strategy, and Assets.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateNew} className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium text-gray-600">New Brand</button>
            <button
              onClick={() => { setCustomShareText(''); setShowShareModal(true); }}
              className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              <span>🔗</span> Share Brand Kit
            </button>
            <button
              onClick={handleExport}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold text-white shadow-sm flex items-center gap-2"
            >
              <span>📄</span> Export PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'IDENTITY', label: '🎨 Identity' },
            { id: 'TRUST', label: '🛡️ Trust & Policies' },
            { id: 'WHATSAPP', label: '💬 WhatsApp Kit' },
            { id: 'PACKAGING', label: '📦 Packaging' },
            { id: 'MOCKUP', label: '📱 Live Previews' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* IDENTITY TAB */}
        {activeTab === 'IDENTITY' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {/* Logo Section */}
            <div className="p-8 border-b border-gray-100 bg-gray-50 text-center">
              {localBrandData.logoUrl ? (
                <div className="flex flex-col items-center animate-in zoom-in">
                  <img src={localBrandData.logoUrl} alt="Generated Logo" className="w-32 h-32 rounded-full shadow-lg object-cover mb-4 border-4 border-white" />
                  <p className="text-green-700 font-bold text-sm bg-green-100 px-3 py-1 rounded-full">AI Logo Generated</p>
                  <button
                    onClick={handleGenerateLogo}
                    disabled={isGeneratingLogo}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Regenerate
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mb-4 text-4xl text-gray-400 shadow-inner">
                    ?
                  </div>
                  <button
                    onClick={handleGenerateLogo}
                    disabled={isGeneratingLogo}
                    className="bg-black text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isGeneratingLogo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Designing...
                      </>
                    ) : (
                      <>✨ Generate AI Logo</>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 max-w-xs">Uses Gemini Image Model to create a unique vector icon based on your brand vibe.</p>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2 text-gray-900">{localBrandData.businessName}</h1>
                <p className="text-sm uppercase tracking-wider text-gray-500">{localBrandData.niche}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Colors */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Color Palette</h3>
                  <div className="flex gap-4">
                    {[
                      { label: 'Primary', color: localBrandData?.colors?.primary || '#333' },
                      { label: 'Secondary', color: localBrandData?.colors?.secondary || '#666' },
                      { label: 'Accent', color: localBrandData?.colors?.accent || '#999' }
                    ].map((c) => (
                      <div key={c.label} className="group cursor-pointer">
                        <div
                          className="w-16 h-16 rounded-2xl shadow-md border border-gray-100 group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: c.color }}
                        ></div>
                        <p className="text-center text-xs mt-1 font-mono text-gray-600">{c.color}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Typography</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">Headlines</span>
                      <span className="text-xl font-bold text-gray-800">{localBrandData.fonts.primary}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">Body Text</span>
                      <span className="text-base text-gray-600">{localBrandData.fonts.secondary}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Taglines</h3>
                <div className="space-y-2">
                  {localBrandData.taglines.map((tag, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="text-gray-700 italic">"{tag}"</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRUST TAB (NEW) */}
        {activeTab === 'TRUST' && localBrandData.policies && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                  🛡️
                </div>
                <div>
                  <h3 className="font-bold text-lg">Trust Badge</h3>
                  <p className="text-blue-100 text-sm">Use this text on your profile to build confidence.</p>
                  <div className="mt-2 bg-white/20 px-4 py-2 rounded-lg font-mono font-bold inline-block border border-white/30">
                    {localBrandData.trustBadgeText}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Business Policies</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase">Payment Terms</span>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded mt-1 text-sm">{localBrandData.policies.payment}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase">Delivery</span>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded mt-1 text-sm">{localBrandData.policies.delivery}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase">Returns & Refunds</span>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded mt-1 text-sm">{localBrandData.policies.refund}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Customer Receipts</h3>
                <div className="border border-dashed border-gray-300 p-4 rounded bg-gray-50 text-center">
                  <p className="font-bold text-gray-900 mb-2">{localBrandData.businessName}</p>
                  <p className="text-xs text-gray-500 mb-4">Official Receipt</p>
                  <div className="text-left text-xs space-y-1 mb-4">
                    <p>Date: [Date]</p>
                    <p>Item: [Product Name]</p>
                    <p>Amount: ₦[Amount]</p>
                  </div>
                  <p className="text-xs italic text-gray-600">"{localBrandData.policies.payment}"</p>
                  <p className="text-xs text-gray-400 mt-2">Thanks for your patronage!</p>
                </div>
                <button onClick={() => alert("Receipt template copied!")} className="w-full mt-4 bg-gray-900 text-white text-xs font-bold py-2 rounded">Copy Template</button>
              </div>
            </div>
          </div>
        )}

        {/* WHATSAPP KIT TAB (UPDATED) */}
        {activeTab === 'WHATSAPP' && localBrandData.whatsappContent && (
          <div className="space-y-6 animate-in slide-in-from-right">
            {/* Quick Actions Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Replies */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>⚡</span> Business Quick Replies
                </h3>
                <p className="text-xs text-gray-500 mb-4">Set these as shortcuts in WhatsApp Business settings.</p>

                <div className="space-y-3">
                  {localBrandData.whatsappContent.quickReplies?.map((qr, i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group">
                      <p className="font-mono text-xs text-indigo-600 font-bold mb-1">{qr.shortcut}</p>
                      <p className="text-sm text-gray-700 leading-snug">{qr.message}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(qr.message)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-white border border-gray-300 px-2 py-1 rounded shadow-sm hover:bg-gray-100"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                  {(!localBrandData.whatsappContent.quickReplies || localBrandData.whatsappContent.quickReplies.length === 0) && (
                    <p className="text-xs text-gray-400 italic">Generate a new brand kit to see quick replies.</p>
                  )}
                </div>
              </div>

              {/* Broadcast Scripts */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📢</span> Broadcast Scripts
                </h3>
                <p className="text-xs text-gray-500 mb-4">Copy these to your Broadcast Lists (don't spam!).</p>

                <div className="space-y-3">
                  {localBrandData.whatsappContent.broadcastMessages?.map((bc, i) => (
                    <div key={i} className="bg-orange-50 p-3 rounded-lg border border-orange-100 relative group">
                      <p className="text-xs font-bold text-orange-800 mb-1 uppercase">{bc.title}</p>
                      <p className="text-sm text-gray-700 leading-snug">{bc.message}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(bc.message)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-white border border-gray-300 px-2 py-1 rounded shadow-sm hover:bg-gray-100"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                  {(!localBrandData.whatsappContent.broadcastMessages || localBrandData.whatsappContent.broadcastMessages.length === 0) && (
                    <p className="text-xs text-gray-400 italic">Generate a new brand kit to see broadcast scripts.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Status Templates */}
            <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
              <h3 className="font-bold text-green-900 mb-4">WhatsApp Status Templates</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {localBrandData.whatsappContent.statusTemplates.map((tpl, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-green-100 relative">
                    <p className="text-sm text-gray-800">{tpl}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(tpl)}
                      className="absolute bottom-2 right-2 text-xs text-green-600 font-bold hover:bg-green-50 p-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticker Ideas */}
            <div className="bg-white border border-gray-200 p-6 rounded-xl">
              <h3 className="font-bold text-gray-800 mb-4">Sticker Pack Ideas</h3>
              <div className="space-y-3">
                {localBrandData.whatsappContent.stickerIdeas.map((idea, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{i + 1}</div>
                    <p className="text-gray-700 text-sm">{idea}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp Link Generator Tool */}
            <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg mt-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <span>🔗</span> WhatsApp Link Generator
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">Create a custom link for your Instagram Bio.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Your WhatsApp Number</label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-green-500"
                    placeholder="e.g. 2348012345678"
                    value={waLinkPhone}
                    onChange={(e) => setWaLinkPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pre-filled Message</label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-green-500"
                    placeholder="e.g. Hello, I want to order."
                    value={waLinkMessage}
                    onChange={(e) => setWaLinkMessage(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={generateWhatsAppLink}
                disabled={!waLinkPhone}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate & Copy Link
              </button>
            </div>
          </div>
        )}

        {/* PACKAGING TAB (NEW) */}
        {activeTab === 'PACKAGING' && localBrandData.packaging && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-pink-50 border border-pink-200 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1">
                <h3 className="font-bold text-pink-900 mb-2">Unboxing Experience</h3>
                <p className="text-pink-800 text-sm mb-4">Make your customers say "Wow" when they open their package.</p>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-pink-100">
                  <p className="text-sm font-bold text-gray-800">💡 Pro Tip:</p>
                  <p className="text-sm text-gray-600 mt-1">{localBrandData.packaging.unboxingTip}</p>
                </div>
              </div>
              <div className="w-full md:w-64 bg-white p-6 rounded-xl shadow-lg transform rotate-2 border border-gray-200">
                <p className="text-center font-serif text-gray-400 text-xs mb-4">Thank You Card</p>
                <p className="text-center font-bold text-gray-800 mb-2 text-lg">Thank You!</p>
                <p className="text-center text-sm text-gray-600 leading-relaxed italic">
                  "{localBrandData.packaging.thankYouNote}"
                </p>
                <div className="mt-6 border-t pt-4 text-center">
                  <p className="text-xs font-bold">{localBrandData.businessName}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MOCKUP TAB */}
        {activeTab === 'MOCKUP' && (
          <div className="space-y-6">
            <div className="flex gap-2 justify-center flex-wrap">
              {[
                { id: 'PACKAGING', label: '📦 Packaging' },
                { id: 'RECEIPT', label: '🧾 Receipt' },
                { id: 'FLYER', label: '📢 Flyer' },
                { id: 'CARD', label: 'Business Card' },
                { id: 'INSTAGRAM', label: 'Instagram' },
                { id: 'WHATSAPP', label: 'WhatsApp' },
                { id: 'FACEBOOK', label: 'Facebook' },
                { id: 'TWITTER', label: 'Twitter' },
                { id: 'LINKEDIN', label: 'LinkedIn' },
                { id: 'YOUTUBE', label: 'YouTube' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setActiveMockup(m.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${activeMockup === m.id ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <div ref={mockupRef} className="min-h-[400px] flex items-center justify-center bg-gray-100 p-8 rounded-xl border border-gray-200">
                {activeMockup === 'PACKAGING' && <PackagingPreview brand={localBrandData} />}
                {activeMockup === 'RECEIPT' && <ReceiptPreview brand={localBrandData} />}
                {activeMockup === 'FLYER' && <FlyerPreview brand={localBrandData} />}
                {activeMockup === 'CARD' && <BusinessCardPreview brand={localBrandData} />}
                {activeMockup === 'INSTAGRAM' && <InstagramPostPreview brand={localBrandData} />}
                {activeMockup === 'FACEBOOK' && <FacebookCoverPreview brand={localBrandData} />}
                {activeMockup === 'TWITTER' && <TwitterHeaderPreview brand={localBrandData} />}
                {activeMockup === 'WHATSAPP' && <WhatsAppStatusPreview brand={localBrandData} />}
                {activeMockup === 'LINKEDIN' && <LinkedInBannerPreview brand={localBrandData} />}
                {activeMockup === 'YOUTUBE' && <YouTubeChannelPreview brand={localBrandData} />}
              </div>

              {/* Toolbar for Download / Share */}
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={handlePrintMockup}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm transition-transform active:scale-95"
                >
                  <span>🖨️</span> Download / Print
                </button>
                <button
                  onClick={openShareMockup}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm transition-transform active:scale-95"
                >
                  <span>🔗</span> Share This
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- Input Form ---

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">AI Brand Studio 🎨</h2>
        <p className="text-gray-600 text-sm mt-2">Create a premium identity, logo, and strategy in seconds.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            placeholder="e.g. Mama Nkechi Kitchen"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Niche / Category</label>
          <select
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none bg-white"
            value={formData.niche}
            onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
          >
            <option value="">Select a Niche</option>
            <option value="Food & Catering">Food & Catering</option>
            <option value="Fashion & Tailoring">Fashion & Tailoring</option>
            <option value="Beauty & Skincare">Beauty & Skincare</option>
            <option value="Tech & Gadgets">Tech & Gadgets</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Consulting">Consulting</option>
            <option value="Logistics">Logistics & Delivery</option>
            <option value="Agriculture & Farming">Agriculture & Farming</option>
            <option value="Education & Training">Education & Training</option>
            <option value="Health & Wellness">Health & Wellness</option>
            <option value="Event Planning">Event Planning</option>
            <option value="Artisan & Crafts">Artisan & Crafts</option>
            <option value="Financial Services">Financial Services</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Cleaning Services">Cleaning Services</option>
            <option value="Automotive">Automotive</option>
            <option value="Solar & Energy">Solar & Energy</option>
            <option value="POS & Agency Banking">POS & Agency Banking</option>
            <option value="Mini-Importation">Mini-Importation</option>
            <option value="Gym & Fitness">Gym & Fitness</option>
            <option value="Pharmacy & Chemist">Pharmacy & Chemist</option>
            <option value="Phone & Laptop Repair">Phone & Laptop Repair</option>
            <option value="Other">Other</option>
          </select>
          {formData.niche === 'Other' && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Specify Your Custom Category</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Ice Cream Shop, Cement Block Industry"
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Tone & Dialect</label>
          <select
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none bg-white"
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
          >
            <option value="Corporate">Corporate (Professional & Formal)</option>
            <option value="Warm">Warm (Friendly & Customer-Centric)</option>
            <option value="Street">Street (Pidgin & Energetic)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">This affects how your policies and taglines are written.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Description (Optional)</label>
          <textarea
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none"
            placeholder="Briefly describe what you do to get better results..."
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Brand Archetype</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {brandArchetypes.map((type) => (
              <div
                key={type.id}
                onClick={() => setFormData({ ...formData, vibe: type.label })}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${formData.vibe === type.label
                  ? 'bg-green-50 border-green-500 ring-1 ring-green-500 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm'
                  }`}
              >
                <div className="text-2xl">{type.icon}</div>
                <div>
                  <div className={`font-bold text-sm ${formData.vibe === type.label ? 'text-green-900' : 'text-gray-900'}`}>{type.label}</div>
                  <div className="text-xs text-gray-500 leading-tight">{type.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
            placeholder="Or describe your specific vibe (e.g. Traditional yet modern...)"
            value={formData.vibe}
            onChange={(e) => setFormData({ ...formData, vibe: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-all shadow-lg transform active:scale-95"
        >
          Generate Full Brand Kit ✨
        </button>
      </form>

      <CreditPromptModal
        isOpen={showCreditPrompt}
        featureLabel="AI Brand Builder"
        creditCost={5}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
      />
    </div>
  );
};

export default BrandBuilder;