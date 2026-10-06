import React, { useState, useEffect, useRef } from 'react';
import { BrandIdentity } from '../types';
import { generateBrandIdentity, generateBrandLogo } from '../services/geminiService';
import ShareActions from './ShareActions';
import { usageLimiter } from '../utils/usageLimiter';
import { billingService } from '../services/billingService';
import CreditPromptModal from './CreditPromptModal';
import { toast } from 'react-hot-toast';
import { mapDbToBrand } from '../services/brandService';

interface BrandBuilderProps {
  savedBrand: BrandIdentity | null;
  onSave: (brand: BrandIdentity) => void;
  credits: number;
  onUpdateCredits: (credits: number) => void;
  user?: any;
}

const BrandBuilder: React.FC<BrandBuilderProps> = ({ savedBrand, onSave, credits, onUpdateCredits, user }) => {
  const [step, setStep] = useState<'INPUT' | 'LOADING' | 'RESULT'>('INPUT');
  const [formData, setFormData] = useState({ name: '', niche: '', vibe: '', description: '', tone: 'Corporate' });
  const [localBrandData, setLocalBrandData] = useState<BrandIdentity | null>(null);
  const [error, setError] = useState<string>('');

  // Credit limits modal state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [deductOnConfirm, setDeductOnConfirm] = useState<(() => Promise<void>) | null>(null);

  // New States for upgraded features
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'BANK_SUITE' | 'TRUST' | 'WHATSAPP' | 'PACKAGING' | 'MOCKUP'>('IDENTITY');
  const [activeMockup, setActiveMockup] = useState<'PACKAGING' | 'RECEIPT' | 'FLYER' | 'CARD' | 'LETTERHEAD' | 'PROFILE' | 'INSTAGRAM' | 'WHATSAPP' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE'>('PACKAGING');
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [customShareText, setCustomShareText] = useState('');
  const [customNiche, setCustomNiche] = useState('');

  // WhatsApp Link Generator State
  const [waLinkPhone, setWaLinkPhone] = useState('');
  const [waLinkMessage, setWaLinkMessage] = useState('');

  // Printable Document Refs
  const mockupRef = useRef<HTMLDivElement>(null);
  const letterheadRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Editable Letterhead Custom State
  const [letterSubject, setLetterSubject] = useState('RE: EXPRESSION OF COMMERCIAL CAPABILITY & BANKING ONBOARDING');
  const [letterRecipient, setLetterRecipient] = useState('To: The Branch Credit Committee / Tender Evaluation Board\nCommercial Operations Directorate');
  const [letterBody, setLetterBody] = useState('');
  const [bankSubView, setBankSubView] = useState<'LETTERHEAD' | 'PROFILE' | 'CREDENTIALS' | 'GOVERNANCE'>('LETTERHEAD');

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);

  // Helper to update top-level fields on localBrandData
  const updateField = (field: string, value: any) => {
    setLocalBrandData((prev: any) => prev ? { ...prev, [field]: value } : prev);
  };

  // Helper to update nested object fields (e.g. policies.payment, whatsappContent.stickerIdeas)
  const updateNestedField = (parent: string, field: string, value: any) => {
    setLocalBrandData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, [parent]: { ...(prev[parent] || {}), [field]: value } };
    });
  };

  // Inline editable text component
  const EditableText = ({
    value, onChange, multiline = false, className = ''
  }: { value: string; onChange: (v: string) => void; multiline?: boolean; className?: string }) => {
    if (!isEditing) {
      return <span className={className}>{value || <span className="italic text-gray-400">(empty)</span>}</span>;
    }
    if (multiline) {
      return (
        <textarea
          className={`w-full border border-blue-300 rounded px-2 py-1 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${className}`}
          value={value || ''}
          rows={3}
          onChange={e => onChange(e.target.value)}
        />
      );
    }
    return (
      <input
        type="text"
        className={`w-full border border-blue-300 rounded px-2 py-1 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    );
  };

  // Brand Archetypes for Richer Input
  const brandArchetypes = [
    { id: 'Authority', label: 'The Authority', desc: 'Professional, Trustworthy, Expert', icon: '👔' },
    { id: 'Bestie', label: 'The Bestie', desc: 'Friendly, Fun, Relatable', icon: '👯' },
    { id: 'Luxury', label: 'The Luxury', desc: 'Premium, Exclusive, Elegant', icon: '💎' },
    { id: 'Caregiver', label: 'The Caregiver', desc: 'Warm, Helpful, Safe', icon: '🤲' },
    { id: 'Innovator', label: 'The Innovator', desc: 'Modern, Smart, Tech-savvy', icon: '🚀' },
    { id: 'Hype', label: 'The Hype', desc: 'Energetic, Bold, Street-smart', icon: '🔥' },
  ];

  // Initialize with saved data or user defaults
  useEffect(() => {
    if (savedBrand) {
      // Ensure owner's phone/email/location are seamlessly available
      const enrichedBrand: BrandIdentity = {
        ...savedBrand,
        phone: savedBrand.phone || user?.phone || '',
        email: savedBrand.email || user?.email || '',
        location: savedBrand.location || user?.location || '',
        address: savedBrand.address || savedBrand.location || user?.location || '',
      };
      setLocalBrandData(enrichedBrand);
      setStep('RESULT');
      setFormData({
        name: enrichedBrand.businessName,
        niche: enrichedBrand.niche,
        vibe: enrichedBrand.vibe,
        description: '',
        tone: 'Corporate' // Default fall back
      });
      // Set default WA Message & Phone
      setWaLinkMessage(`Hello ${enrichedBrand.businessName}, I would like to make an enquiry.`);
      setWaLinkPhone(enrichedBrand.phone || user?.phone || '');
    } else if (user) {
      if (user.phone) setWaLinkPhone(user.phone);
      if (user.businessName || user.business_name) {
        setFormData(prev => ({
          ...prev,
          name: prev.name || user.businessName || user.business_name || ''
        }));
      }
    }
  }, [savedBrand, user]);

  const executeBrandGenerate = async () => {
    setStep('LOADING');
    setError('');
    setShowCreditPrompt(false);
    const token = localStorage.getItem('sb_auth_token');
    if (!token) {
      setError("You must be logged in to generate a brand.");
      setStep('INPUT');
      return;
    }
    const finalNiche = formData.niche === 'Other' ? customNiche : formData.niche;
    try {
      const extraPayload = {
        phone: user?.phone || '',
        email: user?.email || '',
        address: user?.location || '',
        location: user?.location || ''
      };
      const resultRaw = await generateBrandIdentity(formData.name, finalNiche, formData.vibe, token, formData.description, formData.tone, extraPayload);
      const result = mapDbToBrand(resultRaw);
      
      // Merge user phone/email if missing
      if (!result.phone && user?.phone) result.phone = user.phone;
      if (!result.email && user?.email) result.email = user.email;
      if (!result.address && user?.location) result.address = user.location;
      
      // Only deduct credits if generation successfully completed
      const billingResponse = await billingService.deductCredits(100, "Full Corporate Brand Identity Kit");
      onUpdateCredits(billingResponse.credits);

      setLocalBrandData(result);
      onSave(result);
      setStep('RESULT');
      setActiveTab('IDENTITY');
      setWaLinkMessage(`Hello ${result.businessName}, I would like to make an enquiry.`);
      setWaLinkPhone(result.phone || user?.phone || '');
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to generate brand. Please try again.");
      setStep('INPUT');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNiche = formData.niche === 'Other' ? customNiche : formData.niche;
    if (!formData.name || !finalNiche || !formData.vibe) return;

    const brandCost = 100;
    if (credits < brandCost) {
      setDeductOnConfirm(null);
      setShowCreditPrompt(true);
      return;
    }

    setDeductOnConfirm(() => async () => {
      await executeBrandGenerate();
    });
    setShowCreditPrompt(true);
  };

  const handleGenerateLogo = async () => {
    if (!localBrandData) return;
    const logoCost = 2;
    if (credits < logoCost) {
      toast.error(`Insufficient credits. Generating an AI logo requires ${logoCost} BizCredits.`);
      return;
    }

    if (!confirm(`Generate a custom AI logo vector? This will deduct ${logoCost} BizCredits from your wallet.`)) {
      return;
    }

    const prompt = localBrandData.logoPrompt || `A minimalist, professional logo icon for ${localBrandData.businessName || 'a business'} (${localBrandData.niche || 'retail'}), vector style, clean shapes, branding accent`;
    setIsGeneratingLogo(true);
    try {
      const logoUrl = await generateBrandLogo(prompt);
      const updatedBrand = mapDbToBrand({ ...localBrandData, logoUrl });

      // Only deduct credits if logo successfully generated
      const billingResponse = await billingService.deductCredits(logoCost, "AI Logo Generation");
      onUpdateCredits(billingResponse.credits);

      setLocalBrandData(updatedBrand);
      onSave(updatedBrand);
      toast.success(`AI Logo generated! (${logoCost} credits debited)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to generate logo. Try again.");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleCreateNew = () => {
    setStep('INPUT');
    setLocalBrandData(null);
    setFormData({ name: '', niche: '', vibe: '', description: '', tone: 'Corporate' });
  };

  // Download the brand kit as a beautiful interactive HTML page so users can view it easily offline
  const handleDownloadKit = () => {
    if (!localBrandData) return;
    
    const logoImg = getLogoUrl(localBrandData);
    const primaryColor = localBrandData.colors?.primary || '#10b981';
    const secondaryColor = localBrandData.colors?.secondary || '#0f766e';
    const accentColor = localBrandData.colors?.accent || '#f59e0b';
    const fontsPrimary = localBrandData.fonts?.primary || 'Montserrat';
    const fontsSecondary = localBrandData.fonts?.secondary || 'Inter';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${localBrandData.businessName} - Official Brand Kit</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@700;900&family=Outfit:wght@600;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --accent: ${accentColor};
    }
    body {
      font-family: '${fontsSecondary}', 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #1e293b;
    }
    header {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      text-align: center;
      padding: 60px 20px;
      position: relative;
    }
    .logo-container {
      width: 120px;
      height: 120px;
      background: white;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      overflow: hidden;
      border: 3px solid white;
    }
    .logo-img {
      width: 110px;
      height: 110px;
      object-fit: contain;
    }
    h1 {
      font-family: '${fontsPrimary}', 'Montserrat', sans-serif;
      font-size: 36px;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .tagline-sub {
      font-size: 18px;
      opacity: 0.9;
      margin: 10px 0 0;
      font-style: italic;
    }
    .container {
      max-width: 1000px;
      margin: -40px auto 60px;
      padding: 0 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      padding: 30px;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
    }
    .card-title {
      font-family: '${fontsPrimary}', 'Montserrat', sans-serif;
      font-size: 20px;
      color: #0f172a;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 12px;
      margin-top: 0;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    @media (min-width: 768px) {
      .grid-2 { grid-template-columns: 1fr 1fr; gap: 30px; }
    }
    .color-swatch {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }
    .swatch-circle {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .swatch-label {
      font-weight: 700;
      font-size: 14px;
    }
    .swatch-hex {
      font-family: monospace;
      color: #64748b;
    }
    .tagline-item {
      padding: 12px 16px;
      background: #f8fafc;
      border-left: 4px solid var(--accent);
      border-radius: 0 8px 8px 0;
      margin-bottom: 10px;
      font-style: italic;
    }
    .policy-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .whatsapp-bubble {
      background: #e7f8f2;
      border: 1px solid #c2ecd9;
      padding: 15px;
      border-radius: 12px;
      margin-bottom: 15px;
      font-size: 14px;
    }
    footer {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo-container">
      <img src="${logoImg}" class="logo-img" alt="Logo" />
    </div>
    <h1>${localBrandData.businessName}</h1>
    <p class="tagline-sub">${localBrandData.niche} • ${localBrandData.vibe}</p>
  </header>

  <div class="container">
    <div class="card">
      <div class="card-title">🎨 Brand Assets & Palette</div>
      <div class="grid-2">
        <div>
          <h3>Color Swatches</h3>
          <div class="color-swatch">
            <div class="swatch-circle" style="background-color: var(--primary)"></div>
            <div>
              <div class="swatch-label">Primary Color</div>
              <div class="swatch-hex">${primaryColor}</div>
            </div>
          </div>
          <div class="color-swatch">
            <div class="swatch-circle" style="background-color: var(--secondary)"></div>
            <div>
              <div class="swatch-label">Secondary Color</div>
              <div class="swatch-hex">${secondaryColor}</div>
            </div>
          </div>
          <div class="color-swatch">
            <div class="swatch-circle" style="background-color: var(--accent)"></div>
            <div>
              <div class="swatch-label">Accent Color</div>
              <div class="swatch-hex">${accentColor}</div>
            </div>
          </div>
        </div>
        <div>
          <h3>Typography & Strategy</h3>
          <p><strong>Headlines Font:</strong> ${fontsPrimary}</p>
          <p><strong>Body Text Font:</strong> ${fontsSecondary}</p>
          <p><strong>Brand Voice:</strong> ${localBrandData.brandVoice || ''}</p>
          <p><strong>Elevator Pitch:</strong><br><span style="color:#475569; font-style:italic;">"${localBrandData.elevatorPitch || ''}"</span></p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📢 Strategic Messaging & Taglines</div>
      <div>
        <h3>Key Taglines</h3>
        ${(localBrandData.taglines || []).map(t => `<div class="tagline-item">"${t}"</div>`).join('')}
      </div>
      <div style="margin-top: 20px;">
        <h3>Social Media Bio</h3>
        <p style="background: #f8fafc; padding: 15px; border-radius: 8px; color: #475569; white-space: pre-line;">${localBrandData.socialBio || ''}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🛡️ Trust & Policies</div>
      <div class="policy-box">
        <strong>💳 Payment Policy:</strong><br>${localBrandData.policies?.payment || ''}
      </div>
      <div class="policy-box" style="background: #f0f9ff; border-color: #bae6fd;">
        <strong>🚚 Delivery Terms:</strong><br>${localBrandData.policies?.delivery || ''}
      </div>
      <div class="policy-box" style="background: #fef2f2; border-color: #fecaca;">
        <strong>🔄 Refund/Return Policy:</strong><br>${localBrandData.policies?.refund || ''}
      </div>
    </div>

    <div class="card">
      <div class="card-title">💬 WhatsApp Business Templates</div>
      <h3>Auto Greeting</h3>
      <div class="whatsapp-bubble">
        ${localBrandData.whatsappGreeting || ''}
      </div>
      
      ${localBrandData.whatsappContent?.broadcastMessages?.length ? `
        <h3>Broadcast Message</h3>
        <div class="whatsapp-bubble" style="background: #fffbeb; border-color: #fde68a;">
          <strong>${localBrandData.whatsappContent.broadcastMessages[0].title}:</strong><br>
          ${localBrandData.whatsappContent.broadcastMessages[0].message}
        </div>
      ` : ''}
    </div>
  </div>

  <footer>
    <p>Generated by SmartBiz Coach AI. Double-click this file anytime to view your Brand Kit.</p>
  </footer>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const businessName = localBrandData.businessName || 'MyBrand';
    a.download = `${businessName.replace(/\s+/g, '_')}_BrandKit.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Interactive HTML Brand Kit downloaded!');
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

    const logoImg = getLogoUrl(localBrandData);

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
            .logo { width: 150px; height: 150px; border-radius: 20px; object-fit: contain; margin-bottom: 20px; border: 1px solid #eee; box-shadow: 0 4px 10px rgba(0,0,0,0.1); background: white; }
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
            <img src="${logoImg}" class="logo" alt="Logo" />
            <h1>${localBrandData.businessName}</h1>
            <h2>${localBrandData.niche}</h2>
            <p style="font-size: 20px; color: #555; font-style: italic; margin-top: 10px;">"${localBrandData.elevatorPitch}"</p>
            <div style="font-size: 13px; color: #555; margin-top: 12px; font-family: monospace;">
              ${[
                localBrandData.phone || user?.phone ? `Tel: ${localBrandData.phone || user?.phone}` : '',
                localBrandData.email || user?.email ? `Email: ${localBrandData.email || user?.email}` : '',
                localBrandData.cacNumber ? `RC/BN: ${localBrandData.cacNumber}` : '',
                localBrandData.tinNumber || localBrandData.tin ? `TIN: ${localBrandData.tinNumber || localBrandData.tin}` : '',
                localBrandData.smedanNumber ? `SUIN: ${localBrandData.smedanNumber}` : ''
              ].filter(Boolean).join(' • ')}
            </div>
            <p style="font-size: 12px; color: #777; margin-top: 5px;">${localBrandData.address || localBrandData.location || user?.location || 'Lagos, Nigeria'}</p>
          </div>

          <div class="section">
            <div class="section-title">Institutional Coordinates & Governance</div>
            <div style="font-size: 13px; line-height: 1.8; margin-bottom: 10px;">
              <div><strong>Corporate Entity:</strong> ${localBrandData.corporateEntityType || 'Sole Proprietorship / BN'}</div>
              <div><strong>Registered Office:</strong> ${localBrandData.address || localBrandData.location || user?.location || 'Lagos, Nigeria'}</div>
              ${localBrandData.mission ? `<div><strong>Mission:</strong> ${localBrandData.mission}</div>` : ''}
              ${localBrandData.vision ? `<div><strong>Vision:</strong> ${localBrandData.vision}</div>` : ''}
              ${localBrandData.slaPolicy ? `<div><strong>Service Level Agreement (SLA):</strong> ${localBrandData.slaPolicy}</div>` : ''}
              ${localBrandData.ndprCompliance ? `<div><strong>Data Protection (NDPR):</strong> ${localBrandData.ndprCompliance}</div>` : ''}
            </div>
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
              <p style="font-size: 24px; font-weight: bold;">${localBrandData?.fonts?.primary || 'sans-serif'} (Headings)</p>
              <p style="font-size: 16px;">${localBrandData?.fonts?.secondary || 'sans-serif'} (Body Text)</p>
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
              ${(localBrandData?.taglines || []).map(t => `<div class="tagline">${t}</div>`).join('')}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Trust & Policies</div>
             <div class="policy-box"><strong>Payment:</strong> ${localBrandData.policies?.payment}</div>
             <div class="policy-box"><strong>Delivery:</strong> ${localBrandData.policies?.delivery}</div>
             <div class="policy-box"><strong>Returns:</strong> ${localBrandData.policies?.refund}</div>
          </div>

          <div style="text-align: center; margin-top: 80px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
            Generated by SmartBiz Coach AI • Institutional SME Standard
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

  const handlePrintLetterhead = () => {
    if (!letterheadRef.current) return;
    const win = window.open('', '', 'height=900,width=850');
    if (!win) {
      alert("Please allow pop-ups to print or export the letterhead.");
      return;
    }
    win.document.write('<html><head><title>Corporate Letterhead - ' + (localBrandData?.businessName || 'SME') + '</title>');
    win.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    win.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0 !important; } @page { size: A4; margin: 10mm; } }</style>');
    win.document.write('</head><body class="bg-white p-4 flex justify-center">');
    win.document.write(letterheadRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 1200);
  };

  const handlePrintProfile = () => {
    if (!profileRef.current) return;
    const win = window.open('', '', 'height=900,width=850');
    if (!win) {
      alert("Please allow pop-ups to print or export the company profile.");
      return;
    }
    win.document.write('<html><head><title>Executive Company Profile - ' + (localBrandData?.businessName || 'SME') + '</title>');
    win.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    win.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0 !important; } @page { size: A4; margin: 10mm; } }</style>');
    win.document.write('</head><body class="bg-white p-4 flex justify-center">');
    win.document.write(profileRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 1200);
  };

  const openShareMockup = () => {
    if (!localBrandData) return;

    // Generate context-specific share text
    let text = `Check out my new ${localBrandData.businessName || 'business'} brand asset!`;

    if (activeMockup === 'RECEIPT') {
      text = `Official Receipt from ${localBrandData.businessName || 'our business'}.\n\nThank you for your patronage!`;
    } else if (activeMockup === 'FLYER') {
      text = `📢 BIG SALES ALERT!\n\n${localBrandData.businessName || 'We'} are giving you the best deals.\n\n${localBrandData?.taglines?.[0] || ''}`;
    } else if (activeMockup === 'CARD') {
      text = `Connect with us!\n\n${localBrandData.businessName || ''}\n${localBrandData.niche || ''}\n\n${localBrandData.elevatorPitch || ''}`;
    }

    setCustomShareText(text);
    setShowShareModal(true);
  };

  const getShareText = () => {
    if (customShareText) return customShareText;
    if (!localBrandData) return '';
    return `Check out my new brand identity generated by SmartBiz Coach! 🚀\n\nBusiness Name: ${localBrandData.businessName || ''}\nNiche: ${localBrandData.niche || ''}\nTagline: ${localBrandData?.taglines?.[0] || ''}\n\nCreate yours now!`;
  };

  const getNicheImage = (niche: string) => {
    const n = (niche || '').toLowerCase();
    if (n.includes('food') || n.includes('catering') || n.includes('restaurant') || n.includes('mama put')) {
      return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80';
    }
    if (n.includes('fashion') || n.includes('tailor') || n.includes('boutique') || n.includes('clothing')) {
      return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
    }
    if (n.includes('beauty') || n.includes('skincare') || n.includes('cosmetic') || n.includes('salon')) {
      return 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80';
    }
    if (n.includes('barber') || n.includes('hair')) {
      return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80';
    }
    if (n.includes('laundry') || n.includes('dryclean')) {
      return 'https://images.unsplash.com/photo-1545173168-9f1947e80154?auto=format&fit=crop&w=800&q=80';
    }
    if (n.includes('tech') || n.includes('computer') || n.includes('repair') || n.includes('phone')) {
      return 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80';
    }
    if (n.includes('agriculture') || n.includes('farm') || n.includes('poultry')) {
      return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80';
    }
    if (n.includes('carpenter') || n.includes('wood') || n.includes('furniture')) {
      return 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
  };

  const getLogoUrl = (brand: BrandIdentity) => {
    if (brand.logoUrl) return brand.logoUrl;
    const firstLetter = (brand.businessName || '?').charAt(0).toUpperCase();
    const primaryColor = brand.colors?.primary || '#10b981';
    const secondaryColor = brand.colors?.secondary || '#0f766e';
    const accentColor = brand.colors?.accent || '#f59e0b';
    const svg = `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${primaryColor}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="85" fill="url(#logo-grad)" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="${accentColor}" stroke-width="4" stroke-dasharray="8 6" opacity="0.8" />
        <text x="50%" y="54%" font-family="'Montserrat', 'Outfit', sans-serif" font-weight="900" font-size="76" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${firstLetter}</text>
      </svg>
    `;
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
  };

  // --- Mockup Components ---

  const ReceiptPreview = ({ brand }: { brand: BrandIdentity }) => {
    const contactPhone = brand?.phone || user?.phone || '0800 000 0000';
    const regAddress = brand?.address || brand?.location || user?.location || 'Lagos, Nigeria';
    const cacLine = brand?.cacNumber ? `RC/BN: ${brand.cacNumber}` : '';
    const tinLine = brand?.tinNumber || brand?.tin ? `TIN: ${brand.tinNumber || brand.tin}` : '';

    return (
      <div className="w-full max-w-xs mx-auto bg-white shadow-md border border-gray-200 p-4 font-mono text-sm relative">
        {/* Torn edge effect */}
        <div className="absolute -bottom-2 left-0 right-0 h-4 bg-transparent bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:10px_10px] rotate-180"></div>

        <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4">
          <img src={getLogoUrl(brand)} className="w-12 h-12 mx-auto mb-2 object-contain rounded-full" alt="Logo" />
          <div className="uppercase font-bold text-lg leading-none mb-1">{brand?.businessName || ''}</div>
          <p className="text-[10px] text-gray-500">{(brand?.elevatorPitch || '').substring(0, 50)}...</p>
          <p className="text-[10px] text-gray-800 font-bold mt-1">Tel: {contactPhone}</p>
          <p className="text-[9px] text-gray-400">{regAddress}</p>
          {(cacLine || tinLine) && (
            <p className="text-[9px] text-gray-500 font-mono mt-0.5">
              {[cacLine, tinLine].filter(Boolean).join(' • ')}
            </p>
          )}
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
          <p className="italic text-[10px] mb-2">"{brand?.taglines?.[0] || ''}"</p>
          <div className="border border-gray-300 p-1 rounded text-[9px] text-gray-500">
            {brand.policies?.payment || "No Refunds after payment."}
          </div>
        </div>
      </div>
    );
  };

  const PackagingPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-sm mx-auto flex items-center justify-center p-10 perspective-1000 min-h-[300px]">
      {/* Shopping Bag Mockup */}
      <div className="relative w-40 h-56 bg-white shadow-2xl transform rotate-y-12 transition-transform hover:rotate-y-0" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
        {/* Bag Handle */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-12 border-4 border-gray-800 rounded-t-full"></div>

        {/* Bag Content */}
        <div className="h-full flex flex-col items-center justify-center p-4 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,rgba(255,255,255,0.8)_2px,transparent_2px)] bg-[length:15px_15px]"></div>

          <img src={getLogoUrl(brand)} alt="Logo" className="w-16 h-16 mb-2 rounded-full shadow-md object-contain relative z-10 bg-white" />
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

  const FlyerPreview = ({ brand }: { brand: BrandIdentity }) => {
    const contactPhone = brand?.phone || user?.phone || '0800 123 4567';

    return (
      <div className="w-full max-w-xs mx-auto aspect-[4/5] bg-white shadow-xl relative overflow-hidden flex flex-col border border-gray-200">
        {/* Header Image Area */}
        <div className="h-1/2 bg-gray-200 relative overflow-hidden">
          <img src={getNicheImage(brand?.niche)} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black opacity-60"></div>
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <h2 className="text-white text-3xl font-black uppercase text-center px-4 leading-none drop-shadow-md transform -rotate-2">
              Grand<br /><span className="text-yellow-400">Opening</span><br />Sale
            </h2>
          </div>
          <div className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full overflow-hidden bg-white shadow p-0.5">
            <img src={getLogoUrl(brand)} className="w-full h-full object-contain rounded-full" alt="Logo" />
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
            <p className="text-[10px] text-gray-300">{contactPhone} • @{brand?.businessName ? brand.businessName.replace(/\s/g, '').toLowerCase() : 'business'}</p>
          </div>
        </div>
      </div>
    );
  };

  const BusinessCardPreview = ({ brand }: { brand: BrandIdentity }) => {
    const contactPhone = brand?.phone || user?.phone || '0800 000 0000';
    const contactEmail = brand?.email || user?.email || `${(brand?.businessName || 'info').replace(/\s+/g, '').toLowerCase()}@gmail.com`;
    const regAddress = brand?.address || brand?.location || user?.location || 'Lagos, Nigeria';

    return (
      <div className="w-full max-w-sm mx-auto perspective-1000">
        {/* Front */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-4 relative h-56 border border-gray-200">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-20" style={{ backgroundColor: brand?.colors?.secondary || '#ccc' }}></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-tr-full opacity-20" style={{ backgroundColor: brand?.colors?.accent || '#eee' }}></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <img src={getLogoUrl(brand)} alt="Logo" className="w-16 h-16 mb-2 rounded-full shadow-md object-contain bg-white p-0.5" />
            <h3 className="font-bold text-xl text-gray-900" style={{ fontFamily: 'serif' }}>{brand?.businessName}</h3>
            <p className="text-xs uppercase tracking-widest mt-1 text-gray-500">{brand?.niche}</p>
            {brand?.cacNumber && (
              <span className="mt-2 text-[10px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                RC/BN: {brand.cacNumber}
              </span>
            )}
          </div>
        </div>

        {/* Back */}
        <div className="rounded-xl shadow-xl overflow-hidden h-56 relative flex flex-col justify-center px-8" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
          <p className="text-white/80 text-[10px] uppercase font-bold tracking-wider">Direct Line</p>
          <p className="text-white font-bold text-base mb-2">{contactPhone}</p>

          <p className="text-white/80 text-[10px] uppercase font-bold tracking-wider">Email & Coordinates</p>
          <p className="text-white text-xs mb-1 truncate">{contactEmail}</p>
          <p className="text-white/70 text-[11px] mb-2 truncate">{regAddress}</p>

          <div className="flex justify-between items-center pt-2 border-t border-white/20">
            <span className="text-white font-medium text-xs">@{brand?.businessName ? brand.businessName.replace(/\s+/g, '').toLowerCase() : 'business'}</span>
            <span className="text-white/60 text-[9px] uppercase tracking-wider">{brand?.corporateEntityType || 'Registered SME'}</span>
          </div>
        </div>
      </div>
    );
  };

  const LetterheadPreview = ({ brand }: { brand: BrandIdentity }) => {
    const contactPhone = brand?.phone || user?.phone || '0800 000 0000';
    const contactEmail = brand?.email || user?.email || 'contact@business.com';
    const regAddress = brand?.address || brand?.location || user?.location || 'Plot 12 Commercial Boulevard, Lagos, Nigeria';
    const primaryColor = brand?.colors?.primary || '#0f766e';
    const secondaryColor = brand?.colors?.secondary || '#047857';

    return (
      <div className="w-full max-w-2xl mx-auto bg-white border border-gray-300 shadow-2xl p-6 sm:p-10 relative text-gray-800 font-sans min-h-[780px] flex flex-col justify-between">
        {/* Subtle Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <img src={getLogoUrl(brand)} alt="Watermark" className="w-96 h-96 object-contain" />
        </div>

        {/* Top Letterhead Header */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2" style={{ borderColor: primaryColor }}>
            <div className="flex items-center gap-4">
              <img src={getLogoUrl(brand)} alt="Logo" className="w-16 h-16 rounded-xl object-contain border shadow-sm bg-white p-1" />
              <div>
                <h1 className="text-2xl font-black tracking-tight uppercase" style={{ color: primaryColor }}>
                  {brand?.businessName || 'Your Business Name'}
                </h1>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{brand?.niche || 'Enterprise'}</p>
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-600 font-mono mt-1">
                  <span>RC/BN: <strong>{brand?.cacNumber || 'CAC-Pending'}</strong></span>
                  <span>•</span>
                  <span>TIN: <strong>{brand?.tinNumber || brand?.tin || 'TIN-Pending'}</strong></span>
                  {brand?.smedanNumber && (
                    <>
                      <span>•</span>
                      <span>SUIN: <strong>{brand.smedanNumber}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-gray-600 space-y-0.5 font-medium">
              <p className="flex sm:justify-end items-center gap-1.5">
                <span>📞</span> {contactPhone}
              </p>
              <p className="flex sm:justify-end items-center gap-1.5">
                <span>✉️</span> {contactEmail}
              </p>
              <p className="flex sm:justify-end items-center gap-1.5 max-w-xs text-[11px]">
                <span>📍</span> {regAddress}
              </p>
            </div>
          </div>
          {/* Dual Color accent line */}
          <div className="h-1 w-full flex mt-0.5 mb-6">
            <div className="h-full w-2/3" style={{ backgroundColor: primaryColor }} />
            <div className="h-full w-1/3" style={{ backgroundColor: secondaryColor }} />
          </div>

          {/* Letter Meta */}
          <div className="flex justify-between items-center text-xs text-gray-500 mb-6 font-mono">
            <div>REF: <span className="text-gray-800 font-bold">SB/CORP/{new Date().getFullYear()}/089</span></div>
            <div>DATE: <span className="text-gray-800 font-bold">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          </div>

          {/* Recipient */}
          <div className="mb-4 text-xs font-semibold text-gray-700 whitespace-pre-line leading-relaxed">
            {letterRecipient}
          </div>

          {/* Subject */}
          <div className="mb-6 pb-1 border-b border-gray-300">
            <p className="text-sm font-black uppercase text-gray-900 tracking-wide">
              {letterSubject}
            </p>
          </div>

          {/* Letter Body */}
          <div className="text-xs sm:text-sm text-gray-700 leading-relaxed space-y-4">
            <p>
              We write on behalf of the Executive Directorate of <strong>{brand?.businessName}</strong>, a registered commercial entity ({brand?.cacNumber ? `RC/BN: ${brand.cacNumber}` : 'CAC Certified'}), operating within the <strong>{brand?.niche}</strong> sector.
            </p>
            <p>
              {letterBody || (
                brand?.mission
                  ? `Our commercial mandate is rooted in our mission: "${brand.mission}". Guided by our core commitment to operational excellence and customer trust, we ensure stringent Service Level Agreements (SLA), transparent financial accounting, and regulatory compliance under the Nigerian Data Protection Regulation (NDPR).`
                  : `This official instrument confirms our institutional capability for credit assessment, corporate banking onboarding, statutory vendor pre-qualification, and institutional partnership.`
              )}
            </p>
            <p>
              For corporate verification, please contact the undersigned promoter or our compliance desk at <strong>{contactPhone}</strong> or <strong>{contactEmail}</strong>.
            </p>
          </div>
        </div>

        {/* Footer / Signature */}
        <div className="pt-8 mt-8 border-t border-gray-200">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-500 italic mb-2">Yours faithfully,</p>
              <div className="h-10 border-b border-gray-400 w-44 mb-1 flex items-end">
                <span className="font-serif italic text-sm text-gray-700 font-bold">Authorized Signatory</span>
              </div>
              <p className="text-xs font-bold text-gray-900">{user?.name || brand?.businessName + ' Promoter'}</p>
              <p className="text-[11px] text-gray-500">Executive Director / Managing Partner</p>
            </div>

            <div className="text-center p-3 border-2 border-dashed border-gray-300 rounded-lg">
              <span className="text-xl">🏛️</span>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Official SME Seal</p>
              <p className="text-[8px] font-mono text-gray-400">SMEDAN • CAC • FIRS</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-400 mt-6 pt-2 border-t border-gray-100 flex justify-between">
            <span>Corporate Entity: {brand?.corporateEntityType || 'Sole Proprietorship / BN'}</span>
            <span>Generated via SmartBiz Coach Institutional Suite</span>
          </div>
        </div>
      </div>
    );
  };

  const ExecutiveProfilePreview = ({ brand }: { brand: BrandIdentity }) => {
    const contactPhone = brand?.phone || user?.phone || '0800 000 0000';
    const contactEmail = brand?.email || user?.email || 'contact@business.com';
    const regAddress = brand?.address || brand?.location || user?.location || 'Plot 12 Commercial Way, Lagos, Nigeria';
    const primaryColor = brand?.colors?.primary || '#1e3a8a';

    return (
      <div className="w-full max-w-2xl mx-auto bg-white border border-gray-300 shadow-2xl p-6 sm:p-10 text-gray-800 font-sans min-h-[780px] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b-2" style={{ borderColor: primaryColor }}>
            <div className="flex items-center gap-3">
              <img src={getLogoUrl(brand)} alt="Logo" className="w-14 h-14 rounded-xl object-contain border bg-white p-1" />
              <div>
                <h1 className="text-2xl font-black uppercase text-gray-950 tracking-tight">{brand?.businessName}</h1>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">{brand?.niche} • EXECUTIVE 1-PAGER PROFILE</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                ✓ Bank Pre-Qualified
              </span>
              <p className="text-[10px] text-gray-400 mt-1 font-mono">KYC Grade: Tier-1 SME</p>
            </div>
          </div>

          {/* 1. Promoter & Overview */}
          <div className="my-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
              <span>👤</span> Executive Promoter & Business Overview
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {brand?.executiveBio || `${brand?.businessName} is a high-growth commercial enterprise founded and managed by experienced industry promoters. The enterprise delivers competitive ${brand?.niche} solutions with disciplined operational management and robust cashflow standards.`}
            </p>
          </div>

          {/* 2. Structured Institutional Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Box A: Regulatory Matrix */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-1.5">
                <span>🏛️</span> Regulatory Coordinates
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Legal Structure:</span><strong className="text-gray-800">{brand?.corporateEntityType || 'Sole Proprietorship / BN'}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">CAC Reg No:</span><strong className="font-mono text-gray-900">{brand?.cacNumber || 'RC-Pending'}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">FIRS TIN:</span><strong className="font-mono text-gray-900">{brand?.tinNumber || brand?.tin || 'TIN-Pending'}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">SMEDAN SUIN:</span><strong className="font-mono text-gray-900">{brand?.smedanNumber || 'SUIN-Pending'}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">Official Line:</span><strong className="text-gray-900">{contactPhone}</strong></div>
                <div className="flex justify-between"><span className="text-gray-500">Email:</span><strong className="text-gray-900 truncate max-w-[140px]">{contactEmail}</strong></div>
              </div>
            </div>

            {/* Box B: Mission & Vision */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-1.5">
                <span>🎯</span> Strategic Mandate
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Mission</span>
                  <p className="text-gray-700 italic">"{brand?.mission || 'To deliver reliable, high-value solutions that exceed customer expectations.'}"</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Vision</span>
                  <p className="text-gray-700 italic">"{brand?.vision || 'To become the preeminent trusted market leader in Nigeria and across West Africa.'}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Core Values & Operational SLA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Core Values */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2 flex items-center gap-1.5">
                <span>💎</span> Institutional Values
              </h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(brand?.coreValues && brand.coreValues.length > 0 ? brand.coreValues : ['Integrity', 'Excellence', 'Reliability', 'Agility', 'Accountability']).map((val, idx) => (
                  <span key={idx} className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200">
                    {val}
                  </span>
                ))}
              </div>
            </div>

            {/* SLA & NDPR Compliance */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2 flex items-center gap-1.5">
                <span>🛡️</span> Compliance & SLA Policy
              </h4>
              <p className="text-[11px] text-gray-600 line-clamp-3">
                <strong>SLA:</strong> {brand?.slaPolicy || brand?.policies?.delivery || 'Standard turnaround within 24–48 hours with verified quality assurance.'}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                <strong>NDPR:</strong> {brand?.ndprCompliance || 'Adheres strictly to Nigeria Data Protection Regulation (NDPR 2023) standards.'}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <div>
            <p className="font-bold text-gray-800">{regAddress}</p>
            <p className="text-[10px] text-gray-400">Verified for Commercial Banking, Bank of Industry (BOI), SMEDAN & TEF Applications</p>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-gray-900 text-sm">₦ CREDIT READY</span>
          </div>
        </div>
      </div>
    );
  };

  const InstagramPostPreview = ({ brand }: { brand: BrandIdentity }) => (
    <div className="w-full max-w-sm mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center overflow-hidden">
          <img src={getLogoUrl(brand)} className="w-full h-full object-contain" alt="Avatar" />
        </div>
        <span className="text-xs font-bold text-gray-900">{brand?.businessName ? brand.businessName.replace(/\s+/g, '').toLowerCase() : 'business'}</span>
      </div>
      <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
        <img src={getNicheImage(brand?.niche)} className="absolute inset-0 w-full h-full object-cover" alt="Post Background" />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 bg-white/95 backdrop-blur p-6 shadow-xl rounded-xl max-w-[85%] text-center border border-white/20">
          <p className="font-bold text-lg leading-tight text-gray-900">"{brand?.taglines?.[0] || 'Tagline Placeholder'}"</p>
          <div className="mt-4 w-10 h-10 rounded-full mx-auto bg-white p-0.5 shadow">
            <img src={getLogoUrl(brand)} className="w-full h-full object-contain rounded-full" alt="Mini Logo" />
          </div>
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
      <div className="relative h-48 w-full overflow-hidden">
        <img src={getNicheImage(brand?.niche)} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
        <div className="absolute inset-0 bg-black/45"></div>
        <div className="absolute bottom-4 right-6 text-right z-10">
          <h1 className="text-white font-bold text-2xl drop-shadow-md">{brand?.businessName}</h1>
          <p className="text-white/90 text-sm italic">{brand?.taglines?.[0] || 'Tagline'}</p>
        </div>
      </div>
      {/* Profile Section */}
      <div className="px-6 pb-4 relative">
        <div className="absolute -top-12 left-6 w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center p-1">
          <img src={getLogoUrl(brand)} className="w-full h-full object-contain rounded-full" alt="Logo" />
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
      <div className="h-32 w-full relative overflow-hidden flex items-center justify-center">
        <img src={getNicheImage(brand?.niche)} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
        <div className="absolute inset-0 bg-black/50"></div>
        <h2 className="relative z-10 font-bold text-2xl opacity-70 tracking-widest uppercase">{brand?.niche}</h2>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 relative">
        <div className="flex justify-between items-start">
          <div className="-mt-8 w-16 h-16 rounded-full border-2 border-black bg-white overflow-hidden flex items-center justify-center p-0.5 z-10">
            <img src={getLogoUrl(brand)} className="w-full h-full object-contain rounded-full" alt="Logo" />
          </div>
          <button className="mt-2 border border-gray-600 rounded-full px-4 py-1 text-sm font-bold hover:bg-gray-900">Follow</button>
        </div>
        <div className="mt-2">
          <h3 className="font-bold text-lg leading-tight">{brand?.businessName}</h3>
          <p className="text-gray-500 text-sm">@{brand?.businessName ? brand.businessName.replace(/\s+/g, '') : 'business'}</p>
          <p className="mt-2 text-sm text-gray-300">{brand?.socialBio}</p>
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
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50 bg-white p-0.5">
          <img src={getLogoUrl(brand)} className="w-full h-full object-contain rounded-full" alt="Logo" />
        </div>
        <div>
          <p className="text-white text-sm font-bold shadow-sm">{brand?.businessName}</p>
          <p className="text-white/70 text-xs">Just now</p>
        </div>
      </div>

      <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 relative overflow-hidden" style={{ backgroundColor: brand?.colors?.primary || '#333' }}>
        <img src={getNicheImage(brand?.niche)} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Background" />
        <h2 className="relative z-10 text-white font-bold text-3xl mb-4" style={{ fontFamily: brand?.fonts?.primary || 'sans-serif' }}>BIG SALES!</h2>
        <div className="relative z-10 bg-white text-black p-4 rounded-lg shadow-lg rotate-2 mb-8">
          <p className="font-bold text-xl">{brand?.taglines?.[0] || 'Quality Products'}</p>
        </div>
        <p className="relative z-10 text-white/90 text-sm">Don't miss out on our new arrivals.</p>
        <div className="absolute bottom-20 animate-bounce z-10">
          <p className="text-white text-xs font-bold">Swipe up to chat</p>
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
      <div className="h-28 w-full relative flex items-center pl-8 overflow-hidden">
        <img src={getNicheImage(brand?.niche)} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
        <div className="absolute inset-0 bg-black/45"></div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">{brand?.businessName}</h2>
          <p className="text-xs text-white/90">{brand?.elevatorPitch}</p>
        </div>
      </div>
      <div className="px-6 pb-6 relative">
        <div className="absolute -top-10 left-6 w-20 h-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center p-1">
          <img src={getLogoUrl(brand)} className="w-full h-full object-contain rounded-full" alt="Logo" />
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
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCreateNew} className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium text-gray-600">New Brand</button>
            <button
              onClick={() => {
                if (isEditing && localBrandData) { onSave(localBrandData); toast.success('Changes saved!'); }
                setIsEditing(e => !e);
              }}
              className={`text-sm px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
            >
              <span>{isEditing ? '💾' : '✏️'}</span> {isEditing ? 'Save Edits' : 'Edit Kit'}
            </button>
            <button
              onClick={handleDownloadKit}
              className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
              title="Download your brand kit as a backup file"
            >
              <span>⬇️</span> Download Kit
            </button>
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
            { id: 'BANK_SUITE', label: '🏛️ Bank & Corporate Suite' },
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
            {isEditing && (
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 text-sm text-blue-700 font-medium flex items-center gap-2">
                ✏️ Editing Mode — Click any field to change it, then press <strong>Save Edits</strong> above.
              </div>
            )}
            {/* Logo Section */}
            <div className="p-8 border-b border-gray-100 bg-gray-50 text-center flex flex-col items-center">
              {localBrandData.logoUrl ? (
                <div className="flex flex-col items-center animate-in zoom-in">
                  <img src={localBrandData.logoUrl} alt="Generated Logo" className="w-32 h-32 rounded-full shadow-lg object-contain mb-4 border-4 border-white bg-white" />
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
                  <img src={getLogoUrl(localBrandData)} alt="Dynamic Logo Placeholder" className="w-32 h-32 rounded-full shadow-lg object-contain mb-4 border-4 border-white bg-white" />
                  <p className="text-amber-700 font-bold text-xs bg-amber-50 px-3 py-1 rounded-full mb-4">Auto-Generated Vector Logo Placeholder</p>
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

              {isEditing && (
                <div className="w-full max-w-sm mt-5 p-4 bg-white rounded-xl border border-gray-200 text-left shadow-sm">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wide block mb-1">Or Add Custom Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={localBrandData.logoUrl || ''}
                    onChange={e => updateField('logoUrl', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Paste any logo image URL to update your brand kit identity instantly.</p>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2 text-gray-900">
                  <EditableText value={localBrandData.businessName} onChange={v => updateField('businessName', v)} className="text-4xl font-bold" />
                </h1>
                <p className="text-sm uppercase tracking-wider text-gray-500">
                  <EditableText value={localBrandData.niche} onChange={v => updateField('niche', v)} />
                </p>
                {localBrandData.elevatorPitch && (
                  <p className="text-gray-600 italic mt-2 text-sm max-w-lg mx-auto">
                    <EditableText value={localBrandData.elevatorPitch} onChange={v => updateField('elevatorPitch', v)} multiline className="text-sm" />
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Colors */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Color Palette</h3>
                  <div className="flex gap-4">
                    {[
                      { label: 'Primary', color: localBrandData?.colors?.primary || '#10b981', key: 'primary' },
                      { label: 'Secondary', color: localBrandData?.colors?.secondary || '#0f766e', key: 'secondary' },
                      { label: 'Accent', color: localBrandData?.colors?.accent || '#f59e0b', key: 'accent' }
                    ].map((c) => (
                      <div key={c.label} className="group cursor-pointer">
                        <div
                          className="w-16 h-16 rounded-2xl shadow-md border border-gray-100 group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: c.color }}
                        ></div>
                        {isEditing ? (
                          <input
                            type="color"
                            className="mt-1 w-16 h-6 rounded cursor-pointer border-0"
                            value={c.color}
                            onChange={e => updateNestedField('colors', c.key, e.target.value)}
                          />
                        ) : (
                          <p className="text-center text-xs mt-1 font-mono text-gray-600">{c.color}</p>
                        )}
                        <p className="text-center text-xs text-gray-400">{c.label}</p>
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
                      <EditableText value={localBrandData?.fonts?.primary || 'Montserrat'} onChange={v => updateNestedField('fonts', 'primary', v)} className="text-xl font-bold text-gray-800" />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">Body Text</span>
                      <EditableText value={localBrandData?.fonts?.secondary || 'Inter'} onChange={v => updateNestedField('fonts', 'secondary', v)} className="text-base text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Brand Voice</h3>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <EditableText value={localBrandData?.brandVoice || ''} onChange={v => updateField('brandVoice', v)} multiline className="text-sm text-gray-700" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Target Audience</h3>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <EditableText value={localBrandData?.targetAudience || ''} onChange={v => updateField('targetAudience', v)} multiline className="text-sm text-gray-700" />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Social Bio</h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <EditableText value={localBrandData?.socialBio || ''} onChange={v => updateField('socialBio', v)} multiline className="text-sm text-gray-700" />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">WhatsApp Greeting</h3>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <EditableText value={localBrandData?.whatsappGreeting || ''} onChange={v => updateField('whatsappGreeting', v)} multiline className="text-sm text-gray-700" />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Taglines</h3>
                <div className="space-y-2">
                  {(localBrandData?.taglines || []).map((tag, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                      <span className="text-green-500 font-bold">✓</span>
                      {isEditing ? (
                        <input
                          className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm bg-blue-50 focus:outline-none"
                          value={tag}
                          onChange={e => {
                            const updated = [...(localBrandData.taglines || [])];
                            updated[i] = e.target.value;
                            updateField('taglines', updated);
                          }}
                        />
                      ) : (
                        <span className="text-gray-700 italic">"{tag}"</span>
                      )}
                    </div>
                  ))}
                  {(localBrandData?.taglines || []).length === 0 && (
                    <p className="text-gray-400 text-sm italic">No taglines generated. Try regenerating your brand kit.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BANK & CORPORATE SUITE TAB */}
        {activeTab === 'BANK_SUITE' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            {/* Executive Badge Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🏛️</span>
                    <h3 className="text-xl font-black tracking-tight">Institutional Bank & Funding Suite</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                      Tier-1 SME Verified
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
                    Designed to meet statutory standards for Commercial Bank Accounts & Overdrafts, Bank of Industry (BOI), SMEDAN Grants, Tony Elumelu Foundation, Federal Tenders, CAC & FIRS compliance.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={handlePrintLetterhead}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <span>🖨️</span> Print Letterhead
                  </button>
                  <button
                    onClick={handlePrintProfile}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <span>📑</span> Print 1-Pager
                  </button>
                </div>
              </div>

              {/* Sub-navigation inside Bank Suite */}
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-indigo-800/60">
                {[
                  { id: 'LETTERHEAD', label: '📜 Corporate Letterhead', icon: '📜' },
                  { id: 'PROFILE', label: '📑 1-Pager Executive Profile', icon: '📑' },
                  { id: 'CREDENTIALS', label: '🏛️ CAC, TIN & Coordinates', icon: '🏛️' },
                  { id: 'GOVERNANCE', label: '⚖️ Governance & SLA Policy', icon: '⚖️' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setBankSubView(sub.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bankSubView === sub.id
                        ? 'bg-white text-slate-900 shadow-md scale-105'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SUB-VIEW: CORPORATE LETTERHEAD */}
            {bankSubView === 'LETTERHEAD' && (
              <div className="space-y-6">
                {/* Customizer controls */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>✏️</span> Customize Letter Details
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Addressed Recipient</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={letterRecipient}
                        onChange={(e) => setLetterRecipient(e.target.value)}
                        placeholder="To: The Credit Committee, First Bank Nigeria"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Letter Subject Line</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-400 outline-none font-bold"
                        value={letterSubject}
                        onChange={(e) => setLetterSubject(e.target.value)}
                        placeholder="RE: APPLICATION FOR COMMERCIAL WORKING CAPITAL"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-bold mb-1">Custom Paragraph / Mandate Note (Optional)</label>
                      <textarea
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
                        value={letterBody}
                        onChange={(e) => setLetterBody(e.target.value)}
                        placeholder="Leave blank to use auto-generated mission, SLA, and corporate governance text..."
                      />
                    </div>
                  </div>
                </div>

                {/* Live Letterhead Preview */}
                <div className="bg-gray-100 p-4 sm:p-8 rounded-2xl border border-gray-200 flex justify-center">
                  <div ref={letterheadRef} className="w-full">
                    <LetterheadPreview brand={localBrandData} />
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handlePrintLetterhead}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm transition-transform active:scale-95"
                  >
                    <span>🖨️</span> Print / Save Letterhead (PDF)
                  </button>
                  <button
                    onClick={() => {
                      const text = `${localBrandData.businessName}\n${localBrandData.address || localBrandData.location}\nTel: ${localBrandData.phone || user?.phone}\n\n${letterSubject}\n\n${letterRecipient}`;
                      navigator.clipboard.writeText(text);
                      toast.success("Letterhead header copied to clipboard!");
                    }}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2.5 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm transition-transform active:scale-95"
                  >
                    <span>📋</span> Copy Text
                  </button>
                </div>
              </div>
            )}

            {/* SUB-VIEW: 1-PAGER EXECUTIVE COMPANY PROFILE */}
            {bankSubView === 'PROFILE' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 flex justify-between items-center">
                  <div>
                    <span className="font-bold">Institutional Standard:</span> Standard single-page profile format required for Bank Account Opening, BOI Loans, and Procurement Bids.
                  </div>
                  <button
                    onClick={handlePrintProfile}
                    className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-1.5 rounded-lg text-xs shrink-0 ml-3"
                  >
                    Print Profile
                  </button>
                </div>

                {/* Live Profile Preview */}
                <div className="bg-gray-100 p-4 sm:p-8 rounded-2xl border border-gray-200 flex justify-center">
                  <div ref={profileRef} className="w-full">
                    <ExecutiveProfilePreview brand={localBrandData} />
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handlePrintProfile}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm transition-transform active:scale-95"
                  >
                    <span>🖨️</span> Print / Save 1-Pager Profile (PDF)
                  </button>
                </div>
              </div>
            )}

            {/* SUB-VIEW: CREDENTIALS & COORDINATES */}
            {bankSubView === 'CREDENTIALS' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>🏛️</span> Institutional Coordinates & Statutory Identifiers
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    These credentials automatically populate your receipts, letters, company profiles, invoices, and bank documentation.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Official Contact Phone <span className="text-emerald-600 font-semibold">(Dynamic Owner Line)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      value={localBrandData.phone || user?.phone || ''}
                      onChange={(e) => {
                        updateField('phone', e.target.value);
                        setWaLinkPhone(e.target.value);
                      }}
                      placeholder="e.g. +234 803 123 4567"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Replaces any static mock number across all preview templates.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Official Business Email
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      value={localBrandData.email || user?.email || ''}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="e.g. contact@business.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Registered Operating Address
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      value={localBrandData.address || localBrandData.location || user?.location || ''}
                      onChange={(e) => {
                        updateField('address', e.target.value);
                        updateField('location', e.target.value);
                      }}
                      placeholder="e.g. Suite 4B, Commercial Way, Victoria Island, Lagos"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Corporate Legal Entity Type
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                      value={localBrandData.corporateEntityType || 'Sole Proprietorship / BN'}
                      onChange={(e) => updateField('corporateEntityType', e.target.value)}
                    >
                      <option value="Sole Proprietorship / BN">Sole Proprietorship / Business Name (BN)</option>
                      <option value="Private Limited Company (Ltd / LLC)">Private Limited Company (Ltd / LLC)</option>
                      <option value="Enterprise / Venture">Enterprise / Commercial Venture</option>
                      <option value="General Partnership">General Partnership</option>
                      <option value="Cooperative Society">Cooperative Society</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      CAC Registration Number (RC / BN)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                      value={localBrandData.cacNumber || ''}
                      onChange={(e) => updateField('cacNumber', e.target.value)}
                      placeholder="e.g. BN-3928104 or RC-1948201"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      FIRS Tax Identification Number (TIN)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                      value={localBrandData.tinNumber || localBrandData.tin || ''}
                      onChange={(e) => {
                        updateField('tinNumber', e.target.value);
                        updateField('tin', e.target.value);
                      }}
                      placeholder="e.g. 24891048-0001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      SMEDAN Unique ID (SUIN)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-400 outline-none"
                      value={localBrandData.smedanNumber || ''}
                      onChange={(e) => updateField('smedanNumber', e.target.value)}
                      placeholder="e.g. SUIN-2024-91823"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={() => {
                      onSave(localBrandData);
                      toast.success("Institutional coordinates successfully saved!");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl text-sm shadow-md transition-all active:scale-95"
                  >
                    💾 Save Coordinates
                  </button>
                </div>
              </div>
            )}

            {/* SUB-VIEW: GOVERNANCE, MISSION & SLA */}
            {bankSubView === 'GOVERNANCE' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>⚖️</span> Corporate Governance, Strategic Architecture & SLA
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Formal statements required for bank credit appraisal committees, BOI and international grant donors.
                  </p>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Corporate Mission</label>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                      value={localBrandData.mission || ''}
                      onChange={(e) => updateField('mission', e.target.value)}
                      placeholder="Enter company mission statement..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Strategic Vision</label>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                      value={localBrandData.vision || ''}
                      onChange={(e) => updateField('vision', e.target.value)}
                      placeholder="Enter company strategic vision..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Executive Promoter Profile / Bio</label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                      value={localBrandData.executiveBio || ''}
                      onChange={(e) => updateField('executiveBio', e.target.value)}
                      placeholder="Executive biography of the founders, track record, leadership qualifications..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Service Level Agreement (SLA)</label>
                      <textarea
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                        value={localBrandData.slaPolicy || ''}
                        onChange={(e) => updateField('slaPolicy', e.target.value)}
                        placeholder="Service delivery standards, turnaround time guarantee..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">NDPR / Data Privacy Clause</label>
                      <textarea
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"
                        value={localBrandData.ndprCompliance || ''}
                        onChange={(e) => updateField('ndprCompliance', e.target.value)}
                        placeholder="Customer data privacy protection, NDPR compliance statement..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={() => {
                      onSave(localBrandData);
                      toast.success("Corporate governance policies saved!");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl text-sm shadow-md transition-all active:scale-95"
                  >
                    💾 Save Governance Data
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'TRUST' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            {isEditing && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg text-sm text-blue-700 font-medium">
                ✏️ Editing Mode — update any field then press <strong>Save Edits</strong> above.
              </div>
            )}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                  🛡️
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">Trust Badge</h3>
                  <p className="text-blue-100 text-sm">Use this text on your profile to build confidence.</p>
                  <div className="mt-2 bg-white/20 px-4 py-2 rounded-lg font-mono font-bold inline-block border border-white/30 w-full">
                    <EditableText value={localBrandData?.trustBadgeText || '100% Verified Quality & Nationwide Delivery'} onChange={v => updateField('trustBadgeText', v)} className="text-white font-bold" />
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
                    <div className="text-gray-700 bg-gray-50 p-3 rounded mt-1 text-sm">
                      <EditableText value={localBrandData?.policies?.payment || 'Full payment required before order processing.'} onChange={v => updateNestedField('policies', 'payment', v)} multiline />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase">Delivery</span>
                    <div className="text-gray-700 bg-gray-50 p-3 rounded mt-1 text-sm">
                      <EditableText value={localBrandData?.policies?.delivery || 'Nationwide delivery available. Lagos 24–48 hrs.'} onChange={v => updateNestedField('policies', 'delivery', v)} multiline />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase">Returns & Refunds</span>
                    <div className="text-gray-700 bg-gray-50 p-3 rounded mt-1 text-sm">
                      <EditableText value={localBrandData?.policies?.refund || 'Returns allowed within 3 days if item is unused.'} onChange={v => updateNestedField('policies', 'refund', v)} multiline />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Customer Receipt Preview</h3>
                <div className="border border-dashed border-gray-300 p-4 rounded bg-gray-50 text-center">
                  <p className="font-bold text-gray-900 mb-2">{localBrandData?.businessName}</p>
                  <p className="text-xs text-gray-500 mb-4">Official Receipt</p>
                  <div className="text-left text-xs space-y-1 mb-4">
                    <p>Date: [Date]</p>
                    <p>Item: [Product Name]</p>
                    <p>Amount: ₦[Amount]</p>
                  </div>
                  <p className="text-xs italic text-gray-600">"{localBrandData?.policies?.payment || ''}"</p>
                  <p className="text-xs text-gray-400 mt-2">Thanks for your patronage!</p>
                </div>
                <button onClick={() => alert("Receipt template copied!")} className="w-full mt-4 bg-gray-900 text-white text-xs font-bold py-2 rounded">Copy Template</button>
              </div>
            </div>
          </div>
        )}

        {/* WHATSAPP KIT TAB */}
        {activeTab === 'WHATSAPP' && (
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
                  {(localBrandData?.whatsappContent?.quickReplies || []).map((qr, i) => (
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
                  {(localBrandData?.whatsappContent?.quickReplies || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No quick replies generated yet. Try regenerating your brand kit.</p>
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
                  {(localBrandData?.whatsappContent?.broadcastMessages || []).map((bc, i) => (
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
                  {(localBrandData?.whatsappContent?.broadcastMessages || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No broadcast scripts generated yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Status Templates */}
            <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
              <h3 className="font-bold text-green-900 mb-4">WhatsApp Status Templates</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {(localBrandData?.whatsappContent?.statusTemplates || []).map((tpl, i) => (
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
                {(localBrandData?.whatsappContent?.stickerIdeas || []).map((idea, i) => (
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

        {/* PACKAGING TAB */}
        {activeTab === 'PACKAGING' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            {isEditing && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg text-sm text-blue-700 font-medium">
                ✏️ Editing Mode
              </div>
            )}
            <div className="bg-pink-50 border border-pink-200 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1">
                <h3 className="font-bold text-pink-900 mb-2">Unboxing Experience</h3>
                <p className="text-pink-800 text-sm mb-4">Make your customers say "Wow" when they open their package.</p>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-pink-100">
                  <p className="text-sm font-bold text-gray-800">💡 Pro Tip:</p>
                  <div className="text-sm text-gray-600 mt-1">
                    <EditableText value={localBrandData?.packaging?.unboxingTip || 'Tag us on Instagram when you unbox your order!'} onChange={v => updateNestedField('packaging', 'unboxingTip', v)} multiline />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-64 bg-white p-6 rounded-xl shadow-lg transform rotate-2 border border-gray-200">
                <p className="text-center font-serif text-gray-400 text-xs mb-4">Thank You Card</p>
                <p className="text-center font-bold text-gray-800 mb-2 text-lg">Thank You!</p>
                <p className="text-center text-sm text-gray-600 leading-relaxed italic">
                  <EditableText value={localBrandData?.packaging?.thankYouNote || `Thank you for supporting ${localBrandData?.businessName}!`} onChange={v => updateNestedField('packaging', 'thankYouNote', v)} multiline />
                </p>
                <div className="mt-6 border-t pt-4 text-center">
                  <p className="text-xs font-bold">{localBrandData?.businessName}</p>
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
                { id: 'CARD', label: '📇 Business Card' },
                { id: 'LETTERHEAD', label: '🏛️ Letterhead' },
                { id: 'PROFILE', label: '📑 1-Pager Profile' },
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
                {activeMockup === 'LETTERHEAD' && <LetterheadPreview brand={localBrandData} />}
                {activeMockup === 'PROFILE' && <ExecutiveProfilePreview brand={localBrandData} />}
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

      {savedBrand && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <p className="text-sm font-bold text-amber-900">📦 Saved Brand Found</p>
            <p className="text-xs text-amber-700 mt-0.5">"{savedBrand.businessName}" is saved locally on this device.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setLocalBrandData(savedBrand);
                setStep('RESULT');
              }}
              className="flex-1 sm:flex-none text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              👁️ View Kit
            </button>
            <button
              onClick={handleDownloadKit}
              className="flex-1 sm:flex-none text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              ⬇️ Download Kit
            </button>
          </div>
        </div>
      )}

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
            <option value="Food & Catering">🍳 Food & Catering (Mama Put, Restaurant)</option>
            <option value="Fashion & Tailoring">✂️ Fashion & Tailoring (Designer, Seamstress)</option>
            <option value="Beauty & Skincare">💅 Beauty, Cosmetics & Skincare</option>
            <option value="Barbing Salon & Hairdressing">💈 Barbing Salon & Hairdressing</option>
            <option value="Freelancing & Digital Services">💻 Freelancing & Digital Services (Design, Writing)</option>
            <option value="Dry Cleaning & Laundry">🧺 Dry Cleaning & Laundry</option>
            <option value="POS & Agency Banking">💳 POS & Agency Banking</option>
            <option value="Supermarket & Provision Store">🛒 Supermarket & Provision Store</option>
            <option value="Mini-Importation">📦 Mini-Importation & E-commerce</option>
            <option value="Phone & Laptop Repair">🔧 Phone, Gadget & Laptop Repair</option>
            <option value="Carpentry & Woodwork">🪚 Carpentry, Woodwork & Furniture</option>
            <option value="Welding & Metal Fabrication">⚙️ Welding & Metal Fabrication</option>
            <option value="Plumbing & Electrical">🚰 Plumbing & Electrical Installation</option>
            <option value="Brickmaking & Cement block production">🧱 Brickmaking & Cement Block Industry</option>
            <option value="Transportation & Bolt/Uber driver">🚗 Transportation (Logistics, Bolt/Uber)</option>
            <option value="Agriculture & Farming">🌱 Agriculture, Poultry & Fish Farming</option>
            <option value="Solar & Energy">☀️ Solar Panel & Energy Installation</option>
            <option value="Education & Training">🏫 Education, Creche & Lessons</option>
            <option value="Pharmacy & Chemist">💊 Pharmacy & Local Chemist</option>
            <option value="Gym & Fitness">🏋️ Gym, Sports & Fitness</option>
            <option value="Event Planning">🎉 Event Planning & Decoration</option>
            <option value="Artisan & Crafts">🎨 Artisan, Painting & Crafts</option>
            <option value="Real Estate">🏠 Real Estate & House Agent</option>
            <option value="Consulting">📊 Professional Consulting</option>
            <option value="Logistics">🚚 Logistics & Dispatch Delivery</option>
            <option value="Health & Wellness">❤️ Health & General Wellness</option>
            <option value="Financial Services">💰 Financial Services & Bookkeeping</option>
            <option value="Entertainment">🎵 Music, Video & Entertainment</option>
            <option value="Cleaning Services">🧹 General & Industrial Cleaning</option>
            <option value="Automotive">🚘 Automotive Mechanic & Spare Parts</option>
            <option value="Other">✨ Other (Write your custom category)</option>
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
        featureLabel="Full Corporate Brand Identity Kit"
        creditCost={100}
        currentCredits={credits}
        onConfirm={deductOnConfirm || (() => {})}
        onClose={() => setShowCreditPrompt(false)}
        onCreditsUpdated={onUpdateCredits}
      />
    </div>
  );
};

export default BrandBuilder;