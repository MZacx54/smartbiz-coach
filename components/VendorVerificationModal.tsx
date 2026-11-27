import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  X, 
  FileText, 
  Clock, 
  Lock, 
  MapPin, 
  Phone, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { compressImage } from '../utils/imageOptimization';

interface VendorProfile {
  id: number;
  business_name: string;
  business_type: string;
  cac_number?: string;
  nin_number?: string;
  is_verified: boolean;
  verification_tier: 'NONE' | 'TIER_1_ID' | 'TIER_2_CAC' | 'TIER_3_NACCIMA';
  status: 'UNVERIFIED' | 'PENDING_REVIEW' | 'ACTION_REQUIRED' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  id_type?: string;
  id_number?: string;
  id_document_url?: string;
  tin_number?: string;
  cac_document_url?: string;
  proof_of_address_url?: string;
  physical_address?: string;
  operating_state?: string;
  operating_lga?: string;
  naccima_member_id?: string;
  naccima_chamber_name?: string;
  naccima_document_url?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  verified_at?: string;
  badge_info?: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onVerificationUpdated?: (profile: VendorProfile) => void;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
  "Taraba", "Yobe", "Zamfara"
];

const NACCIMA_CHAMBERS = [
  "NACCIMA National Youth & MSME Desk",
  "Lagos Chamber of Commerce and Industry (LCCI)",
  "Abuja Chamber of Commerce and Industry (ACCI)",
  "Kano Chamber of Commerce, Industry, Mines and Agriculture (KACCIMA)",
  "Port Harcourt Chamber of Commerce, Industry, Mines and Agriculture (PHCCIMA)",
  "Enugu Chamber of Commerce, Industry, Mines and Agriculture (ECCIMA)",
  "Kaduna Chamber of Commerce, Industry, Mines and Agriculture (KADCCIMA)",
  "Ibadan Chamber of Commerce and Industry",
  "Ogun State Chamber of Commerce (OGUNCCIMA)",
  "Calabar Chamber of Commerce and Industry (CALCCIMA)",
  "Other Affiliated City / State Chamber"
];

export const VendorVerificationModal: React.FC<Props> = ({ isOpen, onClose, onVerificationUpdated }) => {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<'TIER_1_ID' | 'TIER_2_CAC' | 'TIER_3_NACCIMA'>('TIER_1_ID');

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'Retail',
    whatsapp_number: '',
    id_type: 'NIN',
    id_number: '',
    id_document_url: '',
    cac_number: '',
    tin_number: '',
    cac_document_url: '',
    proof_of_address_url: '',
    physical_address: '',
    operating_state: 'Lagos',
    operating_lga: '',
    naccima_member_id: '',
    naccima_chamber_name: 'NACCIMA National Youth & MSME Desk',
    naccima_document_url: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/marketplace/vendor/verification/');
        const data = res.data;
        setProfile(data);
        if (data.verification_tier && data.verification_tier !== 'NONE') {
          setSelectedTier(data.verification_tier);
        }
        setFormData({
          business_name: data.business_name || '',
          business_type: data.business_type || 'Retail',
          whatsapp_number: data.whatsapp_number || '',
          id_type: data.id_type || 'NIN',
          id_number: data.id_number || data.nin_number || '',
          id_document_url: data.id_document_url || '',
          cac_number: data.cac_number || '',
          tin_number: data.tin_number || '',
          cac_document_url: data.cac_document_url || '',
          proof_of_address_url: data.proof_of_address_url || '',
          physical_address: data.physical_address || '',
          operating_state: data.operating_state || 'Lagos',
          operating_lga: data.operating_lga || '',
          naccima_member_id: data.naccima_member_id || '',
          naccima_chamber_name: data.naccima_chamber_name || 'NACCIMA National Youth & MSME Desk',
          naccima_document_url: data.naccima_document_url || ''
        });
      } catch (err) {
        console.error('Failed to load verification status', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [isOpen]);

  const handleFileUpload = async (field: 'id_document_url' | 'cac_document_url' | 'proof_of_address_url' | 'naccima_document_url', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB. Please upload a smaller image or PDF.');
      return;
    }

    try {
      let targetBlob: Blob = file;
      if (file.type.startsWith('image/')) {
        targetBlob = await compressImage(file, 1400, 0.8);
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setFormData(prev => ({ ...prev, [field]: base64 }));
        toast.success('Document uploaded & optimized successfully!');
      };
      reader.readAsDataURL(targetBlob);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setFormData(prev => ({ ...prev, [field]: base64 }));
        toast.success('Document uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_name.trim()) {
      toast.error('Please enter your business or trading name.');
      return;
    }

    if (selectedTier === 'TIER_1_ID') {
      if (!formData.id_type || !formData.id_number.trim()) {
        toast.error('Please select an ID type and enter your ID number.');
        return;
      }
    } else if (selectedTier === 'TIER_2_CAC') {
      if (!formData.cac_number.trim()) {
        toast.error('CAC Registration Number (RC/BN) is required for Business Verification.');
        return;
      }
    } else if (selectedTier === 'TIER_3_NACCIMA') {
      if (!formData.naccima_member_id.trim()) {
        toast.error('NACCIMA / Chamber Member ID is required for Tier 3 Accreditation.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/marketplace/vendor/verification/apply/', {
        ...formData,
        verification_tier: selectedTier
      });
      const updated = res.data?.vendor;
      if (updated) {
        setProfile(updated);
        if (onVerificationUpdated) onVerificationUpdated(updated);
      }
      toast.success(res.data?.message || 'Verification application submitted for compliance review!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit verification application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 relative flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-base">
              🏛️
            </span>
            <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded-full">
              Official Trust & Compliance Desk
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black">
            MSME Trust & Institutional Verification
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Standard Nigerian business verification powered by <strong>NACCIMA</strong>, CAC records, and federal identity registries. 
            <span className="text-amber-300 font-semibold block mt-0.5">Verification cannot be bought with money or subscriptions; it is strictly earned.</span>
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Checking verification status...</p>
            </div>
          ) : (
            <>
              {/* Status Notice Banner */}
              {profile?.status === 'VERIFIED' && (
                <div className="bg-emerald-50 border-2 border-emerald-400/40 rounded-2xl p-4 flex items-start gap-3.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                      ✅ {profile.badge_info?.label || 'Verified Merchant Profile'}
                    </p>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Your store and marketplace listings display the official verified trust badge. 
                      {profile.verified_at && ` Verified on ${new Date(profile.verified_at).toLocaleDateString()}.`}
                    </p>
                  </div>
                </div>
              )}

              {profile?.status === 'PENDING_REVIEW' && (
                <div className="bg-amber-50 border-2 border-amber-400/50 rounded-2xl p-4 flex items-start gap-3.5">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-amber-900 uppercase tracking-wide">
                      ⏳ Compliance Review In Progress
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Your documentation has been submitted. Our compliance team and the NACCIMA MSME audit desk are reviewing your credentials. Turnaround is typically 24-48 business hours.
                    </p>
                  </div>
                </div>
              )}

              {profile?.status === 'ACTION_REQUIRED' && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-rose-900 uppercase tracking-wide">
                      ⚠️ Action Required from Compliance Desk
                    </p>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      {profile.rejection_reason || 'Please provide updated documentation or clearer image uploads.'}
                    </p>
                  </div>
                </div>
              )}

              {profile?.status === 'SUSPENDED' && (
                <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-start gap-3.5 border border-red-500/50">
                  <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-red-400 uppercase tracking-wide">
                      🔒 Verified Status Suspended
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {profile.rejection_reason || 'Trust badge suspended pending dispute investigation.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tier Selection Cards */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  Select Verification Tier
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Tier 1 */}
                  <div
                    onClick={() => setSelectedTier('TIER_1_ID')}
                    className={`rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      selectedTier === 'TIER_1_ID'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">🛡️</span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Level 1
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">Identity-Verified</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        For sole traders & micro-merchants. Confirms legitimate individual identity via NIN, Driver&apos;s License, or Voter&apos;s Card.
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold text-emerald-700 mt-3 block">
                      ✓ NIMC / Government ID
                    </span>
                  </div>

                  {/* Tier 2 */}
                  <div
                    onClick={() => setSelectedTier('TIER_2_CAC')}
                    className={`rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      selectedTier === 'TIER_2_CAC'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">🏛️</span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          Level 2
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">CAC Registered</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        For formalized businesses. Validates CAC Business Name or RC Number, Tax ID (TIN), and confirmed operating address.
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold text-indigo-700 mt-3 block">
                      ✓ CAC RC/BN + TIN + Address
                    </span>
                  </div>

                  {/* Tier 3 */}
                  <div
                    onClick={() => setSelectedTier('TIER_3_NACCIMA')}
                    className={`rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      selectedTier === 'TIER_3_NACCIMA'
                        ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">🏅</span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          Level 3 (Premier)
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">NACCIMA Certified</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Top institutional tier. Validates accredited membership in NACCIMA or recognized City/State Chambers of Commerce.
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold text-amber-800 mt-3 block">
                      ✓ Official Chamber Accreditation
                    </span>
                  </div>

                </div>
              </div>

              {/* Application Form */}
              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                
                {/* Basic Merchant Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Business & Operating Details</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Business / Trade Name *
                      </label>
                      <input 
                        type="text"
                        required
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        placeholder="e.g. Zax Fabrics Ltd"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Sector / Line of Business *
                      </label>
                      <input 
                        type="text"
                        required
                        value={formData.business_type}
                        onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                        placeholder="e.g. Fashion, Agro-Processing, IT"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Operating State *
                      </label>
                      <select
                        value={formData.operating_state}
                        onChange={(e) => setFormData({ ...formData, operating_state: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        LGA (Local Government Area)
                      </label>
                      <input 
                        type="text"
                        value={formData.operating_lga}
                        onChange={(e) => setFormData({ ...formData, operating_lga: e.target.value })}
                        placeholder="e.g. Ikeja, Yaba, Garki"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        WhatsApp Contact *
                      </label>
                      <input 
                        type="text"
                        required
                        value={formData.whatsapp_number}
                        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                        placeholder="08012345678"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Physical Store or Warehouse Address
                    </label>
                    <input 
                      type="text"
                      value={formData.physical_address}
                      onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                      placeholder="e.g. Suite 14, Balogun Business Complex, Lagos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Level 1: Identity Information */}
                <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>Level 1: Government Identity Validation</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">Required for All Tiers</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Government ID Type *
                      </label>
                      <select
                        value={formData.id_type}
                        onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="NIN">National Identification Number (NIN Slip / vNIN)</option>
                        <option value="DRIVERS_LICENSE">FRSC Driver&apos;s License</option>
                        <option value="PASSPORT">Nigerian International Passport</option>
                        <option value="VOTERS_CARD">INEC Permanent Voter&apos;s Card (PVC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        ID Number (e.g. 11-digit NIN or DL Number) *
                      </label>
                      <input 
                        type="text"
                        required
                        value={formData.id_number}
                        onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                        placeholder="Enter ID Number"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Upload Copy of Government ID (Image / PDF)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{formData.id_document_url ? 'Replace Document' : 'Choose File'}</span>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload('id_document_url', e)}
                          className="hidden" 
                        />
                      </label>
                      {formData.id_document_url && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Document attached
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Level 2: CAC & Formal Registration */}
                {(selectedTier === 'TIER_2_CAC' || selectedTier === 'TIER_3_NACCIMA') && (
                  <div className="bg-indigo-50/50 rounded-2xl p-4.5 border border-indigo-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🏛️</span>
                        <span>Level 2: Corporate Affairs Commission (CAC) & Tax</span>
                      </h4>
                      <span className="text-[10px] font-bold text-indigo-700">Tier 2 & 3 Required</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          CAC Registration Number (RC or BN Number) *
                        </label>
                        <input 
                          type="text"
                          required
                          value={formData.cac_number}
                          onChange={(e) => setFormData({ ...formData, cac_number: e.target.value })}
                          placeholder="e.g. RC-1849201 or BN-2948102"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Tax Identification Number (TIN)
                        </label>
                        <input 
                          type="text"
                          value={formData.tin_number}
                          onChange={(e) => setFormData({ ...formData, tin_number: e.target.value })}
                          placeholder="e.g. 24819204-0001"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Upload CAC Certificate / Status Report
                        </label>
                        <label className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formData.cac_document_url ? 'Replace Certificate' : 'Upload CAC Document'}</span>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload('cac_document_url', e)}
                            className="hidden" 
                          />
                        </label>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Proof of Address (Utility Bill / Tenancy Receipt)
                        </label>
                        <label className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formData.proof_of_address_url ? 'Replace Utility Bill' : 'Upload Proof of Address'}</span>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload('proof_of_address_url', e)}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Level 3: NACCIMA & Chamber Partner Accreditation */}
                {selectedTier === 'TIER_3_NACCIMA' && (
                  <div className="bg-amber-50/70 rounded-2xl p-4.5 border border-amber-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🏅</span>
                        <span>Level 3: NACCIMA Chamber Accreditation</span>
                      </h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        Chamber Partner
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Chamber of Commerce Affiliate *
                        </label>
                        <select
                          value={formData.naccima_chamber_name}
                          onChange={(e) => setFormData({ ...formData, naccima_chamber_name: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {NACCIMA_CHAMBERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          NACCIMA / Chamber Member ID *
                        </label>
                        <input 
                          type="text"
                          required
                          value={formData.naccima_member_id}
                          onChange={(e) => setFormData({ ...formData, naccima_member_id: e.target.value })}
                          placeholder="e.g. NACCIMA-MSME-9284 or LCCI/2026/049"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Upload Chamber Membership Certificate / Letter of Good Standing
                      </label>
                      <label className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5 text-amber-600" />
                        <span>{formData.naccima_document_url ? 'Replace Chamber Certificate' : 'Upload Chamber Document'}</span>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload('naccima_document_url', e)}
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Submit Action Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[10px] text-slate-400 leading-tight">
                    By submitting, you certify that all uploaded credentials are valid and legally registered in Nigeria.
                  </p>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Submitting Application...' : 'Submit for Compliance Audit'}
                    </button>
                  </div>
                </div>

              </form>
            </>
          )}

        </div>

      </div>
    </div>
  );
};

export default VendorVerificationModal;
