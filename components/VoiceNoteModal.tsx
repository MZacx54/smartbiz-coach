import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, X, Loader2, Trash2, AlertTriangle, CheckCircle, Sparkles, WifiOff, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

type Pay = 'CASH' | 'TRANSFER' | 'CREDIT';

interface VoiceSale {
  item_name: string;
  product_type: 'PHYSICAL' | 'SERVICE';
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: Pay;
  customer_name: string;
  is_debt: boolean;
  matched_product_id?: number | null;
  matched_product_name?: string | null;
  is_new_item?: boolean;
  issues?: string[];
}

interface VoiceExpense {
  title: string;
  category: string;
  amount: number;
  payment_method: 'CASH' | 'TRANSFER';
  issues?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  selectedDate: string;
}

const LANGUAGES: { key: string; label: string; flag: string }[] = [
  { key: 'auto', label: 'Auto', flag: '✨' },
  { key: 'english', label: 'English', flag: '🇳🇬' },
  { key: 'pidgin', label: 'Pidgin', flag: '🗣️' },
  { key: 'hausa', label: 'Hausa', flag: '🟢' },
  { key: 'yoruba', label: 'Yorùbá', flag: '🟡' },
  { key: 'igbo', label: 'Igbo', flag: '🔴' },
];

const EXAMPLES: { lang: string; text: string }[] = [
  { lang: 'English', text: 'I make photocopies black and white for 200 naira' },
  { lang: 'Pidgin', text: 'I sell 2 bag of rice 180,000 cash, I buy fuel 2,500' },
  { lang: 'Hausa', text: 'Mun sayar da buhun shinkafa biyu na dubu ɗari da tamanin, Musa ya ɗauka bashi' },
  { lang: 'Yorùbá', text: 'Mo se photocopy fun igba naira, mo ta pure water marun ni ọgọrun-un meji' },
  { lang: 'Igbo', text: 'M mere photocopy na narị abụọ naira, m rere akwa puku abụọ, Ada ji ụgwọ' },
];

const EXPENSE_CATS: Record<string, string> = {
  FUEL_GEN: '⛽ Fuel & Generator', LOGISTICS: '🚚 Logistics', RENT_BILLS: '💡 Rent & Bills',
  PACKAGING: '📦 Packaging', PERSONAL: '👤 Personal', STAFF: '👥 Staff', OTHER: '⚙️ Other',
};

const MAX_SECONDS = 90;
const naira = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');

const pickMime = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find(o => MediaRecorder.isTypeSupported(o));
};

export const VoiceNoteModal: React.FC<Props> = ({ open, onClose, onSaved, selectedDate }) => {
  const [phase, setPhase] = useState<'capture' | 'processing' | 'review' | 'saving'>('capture');
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('sb_voice_lang') || 'auto');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');

  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [detectedLang, setDetectedLang] = useState('');
  const [sales, setSales] = useState<VoiceSale[]>([]);
  const [expenses, setExpenses] = useState<VoiceExpense[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  const reset = () => {
    setPhase('capture'); setError(''); setTranscript(''); setSummary(''); setSales([]); setExpenses([]);
    setSeconds(0); setRecording(false);
  };

  useEffect(() => {
    if (!open) {
      cancelledRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      stopStream();
      reset();
      setTyped('');
    }
  }, [open]);

  useEffect(() => () => { cancelledRef.current = true; stopStream(); }, []);

  const chooseLanguage = (key: string) => {
    setLanguage(key);
    localStorage.setItem('sb_voice_lang', key);
  };

  const applyPreview = (data: any) => {
    setTranscript(data.transcript || '');
    setSummary(data.english_summary || '');
    setDetectedLang(data.detected_language || '');
    setSales(data.sales || []);
    setExpenses(data.expenses || []);
    setPhase('review');
  };

  const analyse = async (payload: FormData | { text_transcript: string; language: string }) => {
    setError('');
    setPhase('processing');
    try {
      const res = payload instanceof FormData
        ? await api.post('/api/marketplace/voice-pos-ingest/', payload, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
        : await api.post('/api/marketplace/voice-pos-ingest/', payload, { timeout: 120000 });
      if (cancelledRef.current) return;
      applyPreview(res.data);
    } catch (err: any) {
      if (cancelledRef.current) return;
      const msg = err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'This is taking too long. Check your network and try again.' : 'Could not reach the server. Check your internet and try again.');
      setError(msg);
      if (err.response?.data?.transcript) setTyped(err.response.data.transcript);
      setPhase('capture');
    }
  };

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Your browser cannot record audio. Please type it below instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        stopStream();
        setRecording(false);
        if (cancelledRef.current) return;
        if (blob.size < 1500) {
          setError('That was too short. Tap the mic, speak, then tap again to finish.');
          return;
        }
        const form = new FormData();
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        form.append('audio', blob, `voice.${ext}`);
        form.append('language', language);
        analyse(form);
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX_SECONDS && recorderRef.current?.state === 'recording') recorderRef.current.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access was blocked. Allow the microphone in your browser, or type below.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  };

  const submitText = (text: string) => {
    const t = text.trim();
    if (!t) return;
    cancelledRef.current = false;
    analyse({ text_transcript: t, language });
  };

  // ---- editing helpers --------------------------------------------------
  const updateSale = (i: number, patch: Partial<VoiceSale>) => {
    setSales(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      const next = { ...s, ...patch };
      if ('quantity' in patch || 'unit_price' in patch) {
        next.total_amount = Math.round((Number(next.quantity) || 0) * (Number(next.unit_price) || 0) * 100) / 100;
      }
      if (patch.payment_method) next.is_debt = patch.payment_method === 'CREDIT';
      return next;
    }));
  };
  const updateExpense = (i: number, patch: Partial<VoiceExpense>) =>
    setExpenses(prev => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const salesInvalid = sales.some(s => !s.item_name.trim() || !(s.total_amount > 0));
  const expensesInvalid = expenses.some(e => !e.title.trim() || !(e.amount > 0));
  const nothingToSave = sales.length + expenses.length === 0;
  const totalSales = sales.reduce((a, s) => a + (s.total_amount || 0), 0);
  const totalExp = expenses.reduce((a, e) => a + (e.amount || 0), 0);

  const syncDebts = (debts: { name: string; amount: number; itemsBought: string }[]) => {
    if (!debts?.length) return;
    try {
      const existing = JSON.parse(localStorage.getItem('sb_debtors') || '[]');
      const created = debts.map((d, i) => ({
        id: `deb-${Date.now()}-${i}`,
        name: d.name,
        phone: '',
        amount: d.amount,
        paidAmount: 0,
        itemsBought: d.itemsBought,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'UNPAID',
        date: selectedDate,
        createdAt: new Date().toISOString(),
      }));
      localStorage.setItem('sb_debtors', JSON.stringify([...created, ...existing]));
      window.dispatchEvent(new Event('smartbiz_debtors_updated'));
      toast.success(`${created.length} debt${created.length > 1 ? 's' : ''} added to your Gbege Book 📒`);
    } catch { /* non-fatal */ }
  };

  const confirm = async () => {
    setPhase('saving');
    try {
      const res = await api.post('/api/marketplace/voice-pos-confirm/', {
        sales, expenses, transcript, detected_language: detectedLang, date: selectedDate,
      });
      toast.success(res.data.summary || 'Saved to your book!', { icon: '✅', duration: 4000 });
      if (res.data.new_products_created?.length) {
        toast(`New in your catalog: ${res.data.new_products_created.join(', ')}`, { icon: '📦', duration: 5000 });
      }
      syncDebts(res.data.debts);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not save. Please check the entries and try again.');
      setPhase('review');
    }
  };

  if (!open) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Mic className="w-5 h-5 text-rose-500" /> Speak Your Sales
            </h3>
            <p className="text-xs text-slate-500">
              {phase === 'review' ? 'Check what I heard, fix anything, then save.' : 'Say what you sold or spent. English, Pidgin, Hausa, Yorùbá or Igbo.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {(phase === 'capture' || phase === 'processing') && (
          <>
            <div>
              <p className="text-[11px] font-bold text-slate-600 mb-1.5">I will speak in:</p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(l => (
                  <button
                    key={l.key}
                    type="button"
                    disabled={recording || phase === 'processing'}
                    onClick={() => chooseLanguage(l.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all ${
                      language === l.key ? 'bg-rose-600 text-white border-rose-600 shadow' : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>

            {!online && (
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
                Voice needs internet. You're offline — use <b>Record Sale</b> (it saves offline and syncs later).
              </div>
            )}

            {error && (
              <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <div className="text-center py-2 space-y-2">
              <button
                type="button"
                disabled={phase === 'processing' || !online}
                onClick={recording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white shadow-xl transition-all cursor-pointer disabled:opacity-50 ${
                  recording ? 'bg-rose-600 ring-8 ring-rose-200 animate-pulse' : 'bg-rose-500 hover:bg-rose-600 hover:scale-105'
                }`}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
              >
                {phase === 'processing' ? <Loader2 className="w-9 h-9 animate-spin" /> : recording ? <Square className="w-8 h-8" /> : <Mic className="w-9 h-9" />}
              </button>
              <p className="text-sm font-bold text-slate-700">
                {phase === 'processing' ? 'Listening to your note…' : recording ? `Recording ${mm}:${ss} — tap to finish` : 'Tap to speak'}
              </p>
              {recording && <p className="text-[11px] text-slate-500">Speak clearly. You can mention many items in one go (max {MAX_SECONDS}s).</p>}
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700">Or type it:</label>
              <div className="flex gap-2">
                <input
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitText(typed); }}
                  placeholder="e.g. I make photocopies black and white for 200 naira"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  disabled={!typed.trim() || phase === 'processing' || !online}
                  onClick={() => submitText(typed)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  Go
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Tap an example to try it:</p>
              <div className="flex flex-col gap-1">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.lang}
                    type="button"
                    onClick={() => setTyped(ex.text)}
                    className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-100 text-slate-600 cursor-pointer"
                  >
                    <b className="text-rose-700">{ex.lang}:</b> “{ex.text}”
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {(phase === 'review' || phase === 'saving') && (
          <>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" /> I heard{detectedLang ? ` (${detectedLang})` : ''}:
                </span>
                <button
                  type="button"
                  onClick={() => { setTyped(transcript); reset(); }}
                  className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Edit / try again
                </button>
              </div>
              <p className="text-sm text-slate-800 italic">“{transcript}”</p>
              {summary && <p className="text-[11px] text-slate-500">In English: {summary}</p>}
            </div>

            {sales.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">Sales ({sales.length})</p>
                {sales.map((s, i) => (
                  <div key={i} className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                    <div className="flex gap-2 items-start">
                      <input
                        value={s.item_name}
                        onChange={e => updateSale(i, { item_name: e.target.value })}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-200 text-sm font-semibold"
                        placeholder="Item or service"
                      />
                      <button onClick={() => setSales(p => p.filter((_, x) => x !== i))} className="p-2 text-rose-500 cursor-pointer" aria-label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <label className="space-y-0.5"><span className="text-slate-500">Qty</span>
                        <input type="number" min={1} value={s.quantity} onChange={e => updateSale(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200" />
                      </label>
                      <label className="space-y-0.5"><span className="text-slate-500">Price each (₦)</span>
                        <input type="number" min={0} value={s.unit_price || ''} onChange={e => updateSale(i, { unit_price: parseFloat(e.target.value) || 0 })}
                          className={`w-full px-2 py-1.5 rounded-lg border ${s.unit_price > 0 ? 'border-slate-200' : 'border-rose-400 bg-rose-50'}`} />
                      </label>
                      <div className="space-y-0.5"><span className="text-slate-500">Total</span>
                        <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 font-black text-emerald-700">{naira(s.total_amount)}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {(['CASH', 'TRANSFER', 'CREDIT'] as Pay[]).map(pm => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => updateSale(i, { payment_method: pm })}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            s.payment_method === pm ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {pm === 'CASH' ? '💵 Cash' : pm === 'TRANSFER' ? '🏦 Transfer' : '📒 Owe me'}
                        </button>
                      ))}
                    </div>
                    {s.payment_method === 'CREDIT' && (
                      <input
                        value={s.customer_name}
                        onChange={e => updateSale(i, { customer_name: e.target.value })}
                        placeholder="Who owes you? (customer name)"
                        className={`w-full px-2.5 py-2 rounded-lg border text-sm ${s.customer_name.trim() ? 'border-slate-200' : 'border-amber-400 bg-amber-50'}`}
                      />
                    )}
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${s.product_type === 'SERVICE' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.product_type === 'SERVICE' ? '🛠 Service' : '📦 Goods'}
                      </span>
                      {s.matched_product_id
                        ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">In catalog: {s.matched_product_name}</span>
                        : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">New — will be added to your catalog (private)</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expenses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-rose-700 uppercase tracking-wide">Expenses ({expenses.length})</p>
                {expenses.map((e, i) => (
                  <div key={i} className="p-3 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2">
                    <div className="flex gap-2">
                      <input value={e.title} onChange={ev => updateExpense(i, { title: ev.target.value })}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-200 text-sm font-semibold" placeholder="What did you spend on?" />
                      <button onClick={() => setExpenses(p => p.filter((_, x) => x !== i))} className="p-2 text-rose-500 cursor-pointer" aria-label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <input type="number" min={0} value={e.amount || ''} onChange={ev => updateExpense(i, { amount: parseFloat(ev.target.value) || 0 })}
                        placeholder="₦ amount" className={`px-2 py-1.5 rounded-lg border ${e.amount > 0 ? 'border-slate-200' : 'border-rose-400 bg-rose-50'}`} />
                      <select value={e.category} onChange={ev => updateExpense(i, { category: ev.target.value })} className="px-1 py-1.5 rounded-lg border border-slate-200">
                        {Object.entries(EXPENSE_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <select value={e.payment_method} onChange={ev => updateExpense(i, { payment_method: ev.target.value as 'CASH' | 'TRANSFER' })} className="px-1 py-1.5 rounded-lg border border-slate-200">
                        <option value="CASH">💵 Cash</option>
                        <option value="TRANSFER">🏦 Transfer</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {nothingToSave && <p className="text-sm text-slate-500 text-center py-4">Nothing left to save. Tap “Edit / try again”.</p>}

            <div className="sticky bottom-0 bg-white pt-2 space-y-2">
              <div className="flex justify-between text-xs font-bold px-1">
                <span className="text-emerald-700">Sales {naira(totalSales)}</span>
                <span className="text-rose-700">Spent {naira(totalExp)}</span>
              </div>
              <button
                type="button"
                disabled={phase === 'saving' || nothingToSave || salesInvalid || expensesInvalid}
                onClick={confirm}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {phase === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {salesInvalid || expensesInvalid ? 'Fill the red boxes to save' : 'Confirm & Save to My Book'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceNoteModal;
