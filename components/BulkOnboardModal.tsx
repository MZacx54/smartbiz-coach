import React, { useState } from 'react';
import { X, Upload, Check, AlertCircle, Download, Users, FileText, Sparkles, Building2 } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface BulkOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BulkOnboardModal: React.FC<BulkOnboardModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [cohortName, setCohortName] = useState('NACCIMA National Pilot Cohort');
  const [cohortSlug, setCohortSlug] = useState('naccima-national');
  const [chapter, setChapter] = useState('Lagos Chamber of Commerce & Industry (LCCI)');
  const [defaultState, setDefaultState] = useState('Lagos');
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState(
`amina@aminagrains.ng, Hajiya Amina Bello, Amina Grains Processing Ltd, 08031234567, Kano, Kano Chapter, Agribusiness
tunde@ekocrafts.ng, Tunde Adeyemi, Eko Footwear & Leather Works, 08029876543, Lagos, LCCI, Manufacturing
chidinma@medplus.ng, Pharm. Chidinma Okafor, MedPlus Pharmacy, 08091122334, Abuja, Abuja Chamber, Healthcare`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleDownloadSampleCSV = () => {
    const sample = `email,name,business_name,phone,state,chapter,sector
amina@grainshub.ng,Amina Bello,Amina Grains Hub,08031234567,Kano,Kano Chamber,Agribusiness
emeka@abafootwear.ng,Emeka Obi,Ariaria Leather Works,08098765432,Abia,Aba Chamber,Manufacturing
fatima@textiles.ng,Fatima Danjuma,Zaria Fabric Depot,08023456789,Kaduna,Kaduna Chamber,Fashion & Retail`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SmartBiz_NACCIMA_Bulk_Onboard_Sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCredentialsCSV = () => {
    if (!result || !result.provisioned_members) return;
    const headers = ['Email', 'Temporary Password', 'Business Name', 'Owner Name', 'Phone', 'Chapter', 'Sector', 'Status'];
    const rows = result.provisioned_members.map((m: any) => [
      m.email,
      m.temp_password,
      `"${m.business_name}"`,
      `"${m.owner_name}"`,
      m.phone,
      `"${m.chapter}"`,
      `"${m.sector}"`,
      m.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.setAttribute('download', `${cohortSlug}_MSME_Credentials_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      if (inputMode === 'csv') {
        if (!file) {
          toast.error('Please upload a CSV file.');
          setIsSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('cohort_name', cohortName);
        formData.append('cohort_slug', cohortSlug);
        formData.append('chapter', chapter);
        formData.append('state', defaultState);

        const res = await api.post('/api/users/bulk-onboard/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResult(res.data);
        toast.success(`Successfully provisioned ${res.data.summary?.newly_provisioned || 0} MSME accounts!`);
        if (onSuccess) onSuccess();
      } else {
        // Parse manual CSV text lines
        const lines = manualText.split('\n').filter(l => l.trim().length > 0);
        const members: any[] = [];
        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim());
          if (parts[0] && parts[0].includes('@')) {
            members.push({
              email: parts[0],
              name: parts[1] || parts[0].split('@')[0],
              business_name: parts[2] || parts[1] || parts[0].split('@')[0],
              phone: parts[3] || '',
              state: parts[4] || defaultState,
              chapter: parts[5] || chapter,
              sector: parts[6] || 'Retail & Trade'
            });
          }
        }

        if (members.length === 0) {
          toast.error('No valid member records found. Each line must start with an email.');
          setIsSubmitting(false);
          return;
        }

        const res = await api.post('/api/users/bulk-onboard/', {
          cohort_name: cohortName,
          cohort_slug: cohortSlug,
          chapter: chapter,
          state: defaultState,
          members: members
        });
        setResult(res.data);
        toast.success(`Successfully provisioned ${res.data.summary?.newly_provisioned || 0} MSME accounts!`);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to process bulk onboarding. Check file format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 px-6 py-5 border-b border-emerald-500/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  NACCIMA & Chamber Engine
                </span>
              </div>
              <h2 className="text-xl font-black text-white font-heading mt-0.5">
                Bulk MSME Cohort Onboarding & Credential Provisioner
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Form */}
          {!result && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Cohort / Program Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cohortName}
                    onChange={(e) => {
                      setCohortName(e.target.value);
                      setCohortSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }}
                    placeholder="e.g. NACCIMA Lagos Women MSME Cohort"
                    className="w-full bg-slate-950 border border-slate-700 text-sm text-white rounded-xl px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    State Chapter
                  </label>
                  <input
                    type="text"
                    required
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g. Lagos Chamber (LCCI) or Kano Chapter"
                    className="w-full bg-slate-950 border border-slate-700 text-sm text-white rounded-xl px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Input Mode Selector */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setInputMode('csv')}
                  className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    inputMode === 'csv'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  📁 Upload CSV Spreadsheet
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    inputMode === 'manual'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  ✍️ Direct CSV Line Entry
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSampleCSV}
                  className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Sample Template
                </button>
              </div>

              {inputMode === 'csv' ? (
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center space-y-3 transition-colors bg-slate-950/50">
                  <Upload className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-white">Select member roster CSV file</p>
                    <p className="text-xs text-slate-400 mt-1">Columns: email, name, business_name, phone, state, sector</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 file:cursor-pointer cursor-pointer"
                  />
                  {file && (
                    <div className="text-xs font-mono text-emerald-300 bg-emerald-500/10 py-1.5 px-3 rounded-lg inline-block">
                      ✓ Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Paste CSV Records (1 MSME per line: email, owner_name, business_name, phone, state, chapter, sector)
                  </label>
                  <textarea
                    rows={6}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 rounded-xl p-3 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Automatic Provisioning Features */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-400">
                <p className="font-bold text-white uppercase tracking-wider text-[10px] text-emerald-400">
                  ⚡ Automatic Provisioning Benefits:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>✓ Generates random 10-char temporary passwords</div>
                  <div>✓ Allocates 100 Welcome BizCredits per member</div>
                  <div>✓ Initializes Brand Identity & Vendor profile</div>
                  <div>✓ Tags member to {chapter}</div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Provisioning MSMEs...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Provision & Onboard Cohort
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-6">
              
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Check className="w-5 h-5" /> Bulk Onboarding Complete!
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Cohort: <strong className="text-white">{result.cohort?.name}</strong> | Total Members: {result.cohort?.total_members}
                  </p>
                  <p className="text-xs text-slate-400">
                    Newly Provisioned: <strong className="text-emerald-400">{result.summary?.newly_provisioned}</strong> | Existing Linked: {result.summary?.already_existing}
                  </p>
                </div>

                <button
                  onClick={handleDownloadCredentialsCSV}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Credentials (CSV)
                </button>
              </div>

              {/* Credentials Table Preview */}
              {result.provisioned_members && result.provisioned_members.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Provisioned Member Accounts & Temporary Passwords
                  </h3>
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Business</th>
                          <th className="p-3">Email / Username</th>
                          <th className="p-3">Temp Password</th>
                          <th className="p-3">Chapter</th>
                          <th className="p-3">Welcome Credits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {result.provisioned_members.map((m: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-900/50">
                            <td className="p-3 font-bold text-white">{m.business_name}</td>
                            <td className="p-3 font-mono text-emerald-300">{m.email}</td>
                            <td className="p-3 font-mono font-bold text-amber-300">{m.temp_password}</td>
                            <td className="p-3">{m.chapter}</td>
                            <td className="p-3 font-bold text-emerald-400">100 BizCredits</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                >
                  Onboard Another Batch
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl"
                >
                  Done
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default BulkOnboardModal;
