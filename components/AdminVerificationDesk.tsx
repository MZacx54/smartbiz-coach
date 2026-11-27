import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  ExternalLink, 
  Search, 
  Filter, 
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Lock,
  Eye,
  Check,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const getSafeExternalUrl = (url?: string | null): string => {
  if (!url) return '#';
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Reject malformed or non-HTTP(S) URLs
  }
  return '#';
};

interface VerificationRequest {
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
  whatsapp_number?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  badge_info?: any;
  created_at: string;
  updated_at: string;
}

export const AdminVerificationDesk: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [counts, setCounts] = useState({ pending: 0, verified: 0, action_required: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inspection modal state
  const [inspectedReq, setInspectedReq] = useState<VerificationRequest | null>(null);
  const [actionNote, setActionNote] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [activeActionModal, setActiveActionModal] = useState<'REQUEST_ACTION' | 'REJECT' | 'SUSPEND' | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/marketplace/admin/verification-requests/', {
        params: {
          status: statusFilter,
          tier: tierFilter
        }
      });
      setRequests(res.data?.requests || []);
      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, tierFilter]);

  const handleAction = async (id: number, action: 'APPROVE' | 'REQUEST_ACTION' | 'REJECT' | 'SUSPEND', note?: string) => {
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/api/marketplace/admin/verification-requests/${id}/action/`, {
        action,
        note: note || actionNote,
        verification_tier: inspectedReq?.verification_tier || 'TIER_1_ID'
      });
      toast.success(res.data?.message || 'Action executed successfully!');
      setActiveActionModal(null);
      setActionNote('');
      setInspectedReq(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Action failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.business_name?.toLowerCase().includes(q) ||
      r.whatsapp_number?.toLowerCase().includes(q) ||
      r.operating_state?.toLowerCase().includes(q) ||
      r.cac_number?.toLowerCase().includes(q) ||
      r.naccima_member_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header & National Desk Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">🏛️</span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
              NACCIMA & Institutional Verification Terminal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            MSME Trust & Compliance Review Desk
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Authoritative regulatory review desk. Audit government identity, CAC certificates, and NACCIMA Chamber memberships. 
            <span className="text-amber-300 font-semibold block mt-0.5">Verification is merit-based only. Paid subscriptions cannot grant badges.</span>
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('PENDING_REVIEW')}
          className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer ${
            statusFilter === 'PENDING_REVIEW'
              ? 'bg-amber-50/80 border-amber-400 shadow-sm'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Pending Audit</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{counts.pending}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting compliance review</p>
        </div>

        <div 
          onClick={() => setStatusFilter('VERIFIED')}
          className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer ${
            statusFilter === 'VERIFIED'
              ? 'bg-emerald-50/80 border-emerald-400 shadow-sm'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Approved MSMEs</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{counts.verified}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Badged on Market Square</p>
        </div>

        <div 
          onClick={() => setStatusFilter('ACTION_REQUIRED')}
          className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer ${
            statusFilter === 'ACTION_REQUIRED'
              ? 'bg-rose-50/80 border-rose-400 shadow-sm'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Action Required</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{counts.action_required}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Clarification requested</p>
        </div>

        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-indigo-50/80 border-indigo-400 shadow-sm'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">Total Merchants</span>
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{counts.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total profiles registered</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {['PENDING_REVIEW', 'VERIFIED', 'ACTION_REQUIRED', 'SUSPENDED', 'ALL'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setStatusFilter(statusKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === statusKey
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {statusKey === 'PENDING_REVIEW' && '⏳ Pending'}
              {statusKey === 'VERIFIED' && '✅ Verified'}
              {statusKey === 'ACTION_REQUIRED' && '⚠️ Action Required'}
              {statusKey === 'SUSPENDED' && '🔒 Suspended'}
              {statusKey === 'ALL' && 'All Records'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Tiers</option>
            <option value="TIER_1_ID">Tier 1: Identity Verified</option>
            <option value="TIER_2_CAC">Tier 2: CAC Registered</option>
            <option value="TIER_3_NACCIMA">Tier 3: NACCIMA Partner</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, state, phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Verification Queue List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading verification applications...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-black text-slate-700">No applications in this view</h4>
            <p className="text-xs text-slate-400">All submitted applications for this filter have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <div 
                key={req.id} 
                className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
              >
                {/* Left: Merchant Info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900">{req.business_name}</h3>
                    
                    {/* Tier Tag */}
                    {req.verification_tier === 'TIER_3_NACCIMA' && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <span>🏅</span> NACCIMA Partner
                      </span>
                    )}
                    {req.verification_tier === 'TIER_2_CAC' && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                        <span>🏛️</span> CAC Registered
                      </span>
                    )}
                    {(req.verification_tier === 'TIER_1_ID' || req.verification_tier === 'NONE') && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <span>🛡️</span> Identity Verified
                      </span>
                    )}

                    {/* Status Badge */}
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                      req.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                      req.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-900 animate-pulse' :
                      req.status === 'ACTION_REQUIRED' ? 'bg-orange-100 text-orange-900' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> {req.business_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {req.operating_state || 'Nigeria'}
                    </span>
                    {req.whatsapp_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {req.whatsapp_number}
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px]">
                      Applied: {new Date(req.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Summary of submitted credentials */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 flex-wrap">
                    {req.id_type && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                        ID: {req.id_type} {req.id_number ? `(***${req.id_number.slice(-4)})` : ''}
                      </span>
                    )}
                    {req.cac_number && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-indigo-700">
                        CAC: {req.cac_number}
                      </span>
                    )}
                    {req.naccima_member_id && (
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono">
                        Chamber ID: {req.naccima_member_id}
                      </span>
                    )}
                    {req.rejection_reason && (
                      <span className="text-rose-600 font-bold block w-full mt-0.5">
                        Note: {req.rejection_reason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Review & Audit Actions */}
                <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                  <button
                    onClick={() => setInspectedReq(req)}
                    className="flex-1 lg:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Inspect Docs</span>
                  </button>

                  {req.status !== 'VERIFIED' && (
                    <button
                      onClick={() => handleAction(req.id, 'APPROVE')}
                      className="flex-1 lg:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setInspectedReq(req);
                      setActiveActionModal('REQUEST_ACTION');
                    }}
                    className="flex-1 lg:flex-initial bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-extrabold px-3 py-2 rounded-xl cursor-pointer"
                  >
                    Action Req.
                  </button>

                  {req.status === 'VERIFIED' && (
                    <button
                      onClick={() => {
                        setInspectedReq(req);
                        setActiveActionModal('SUSPEND');
                      }}
                      className="flex-1 lg:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-extrabold px-3 py-2 rounded-xl cursor-pointer"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspect Document Modal */}
      {inspectedReq && !activeActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">{inspectedReq.business_name}</h3>
                <p className="text-xs text-slate-400">Document Verification Dossier</p>
              </div>
              <button onClick={() => setInspectedReq(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Applied Tier</span>
                  <strong className="text-slate-800">{inspectedReq.verification_tier}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Current Status</span>
                  <strong className="text-slate-800">{inspectedReq.status}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Physical Address</span>
                  <strong className="text-slate-800">{inspectedReq.physical_address || 'Not specified'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">State / LGA</span>
                  <strong className="text-slate-800">{inspectedReq.operating_state} ({inspectedReq.operating_lga || 'General'})</strong>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                  Uploaded Compliance Proofs
                </h4>

                {/* ID Document */}
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">
                      National Identity Proof ({inspectedReq.id_type || 'NIN'})
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID Number: {inspectedReq.id_number || 'N/A'}
                    </p>
                  </div>
                  {inspectedReq.id_document_url ? (
                    <a
                      href={getSafeExternalUrl(inspectedReq.id_document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100"
                    >
                      <Eye className="w-3 h-3" /> View Doc
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No document image attached</span>
                  )}
                </div>

                {/* CAC Document */}
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">CAC Certificate / Status Report</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      RC/BN: {inspectedReq.cac_number || 'None'} | TIN: {inspectedReq.tin_number || 'None'}
                    </p>
                  </div>
                  {inspectedReq.cac_document_url ? (
                    <a
                      href={getSafeExternalUrl(inspectedReq.cac_document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100"
                    >
                      <Eye className="w-3 h-3" /> View CAC
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No CAC document attached</span>
                  )}
                </div>

                {/* Proof of Address */}
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">Operating Address Proof (Utility Bill)</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Location: {inspectedReq.physical_address || inspectedReq.operating_state}
                    </p>
                  </div>
                  {inspectedReq.proof_of_address_url ? (
                    <a
                      href={getSafeExternalUrl(inspectedReq.proof_of_address_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100"
                    >
                      <Eye className="w-3 h-3" /> View Bill
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No utility bill attached</span>
                  )}
                </div>

                {/* NACCIMA Document */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-amber-900">
                      NACCIMA / Chamber Member Accreditation
                    </p>
                    <p className="text-[11px] text-amber-800 font-mono">
                      Chamber: {inspectedReq.naccima_chamber_name || 'NACCIMA National'} | Member ID: {inspectedReq.naccima_member_id || 'None'}
                    </p>
                  </div>
                  {inspectedReq.naccima_document_url ? (
                    <a
                      href={getSafeExternalUrl(inspectedReq.naccima_document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-amber-200"
                    >
                      <Eye className="w-3 h-3" /> View Certificate
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No Chamber certificate attached</span>
                  )}
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => setInspectedReq(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleAction(inspectedReq.id, 'APPROVE');
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  Approve Application
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Note / Action Prompt Modal */}
      {inspectedReq && activeActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-slate-900">
              {activeActionModal === 'REQUEST_ACTION' && 'Request Action from Vendor'}
              {activeActionModal === 'REJECT' && 'Reject Verification Application'}
              {activeActionModal === 'SUSPEND' && 'Suspend Vendor Trust Badge'}
            </h3>

            <p className="text-xs text-slate-500">
              Enter the reason or specific clarification note that will appear on the vendor&apos;s dashboard:
            </p>

            <textarea
              rows={4}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="e.g. Please upload a clear photo of your CAC Certificate and an authentic utility bill with your business address."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveActionModal(null);
                  setActionNote('');
                }}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={isProcessingAction}
                onClick={() => handleAction(inspectedReq.id, activeActionModal, actionNote)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black"
              >
                {isProcessingAction ? 'Saving...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminVerificationDesk;
