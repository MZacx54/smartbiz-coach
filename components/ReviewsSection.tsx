import React, { useEffect, useState } from 'react';
import { Star, BadgeCheck, Flag, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { commerceService, errorMessage, ReviewSummary } from '../services/commerceService';

export const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <span className="inline-flex items-center" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        style={{ width: size, height: size }}
        className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
      />
    ))}
  </span>
);

const REPORT_REASONS = [
  { value: 'SCAM', label: 'Suspected scam / fraud' },
  { value: 'FAKE', label: 'Fake or counterfeit item' },
  { value: 'PROHIBITED', label: 'Prohibited item' },
  { value: 'WRONG_INFO', label: 'Misleading price or description' },
  { value: 'OTHER', label: 'Something else' },
];

interface Props {
  productId: number;
  productName: string;
  /** Pre-fills the tracking code, e.g. when arriving from the order tracking page. */
  initialTrackingCode?: string;
  onStats?: (avg: number, count: number) => void;
}

const ReviewsSection: React.FC<Props> = ({ productId, productName, initialTrackingCode, onStats }) => {
  const [data, setData] = useState<ReviewSummary | null>(null);
  const [showForm, setShowForm] = useState(!!initialTrackingCode);
  const [form, setForm] = useState({ rating: 5, comment: '', name: '', code: initialTrackingCode || '' });
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState({ reason: 'SCAM', details: '', contact: '' });

  const load = async () => {
    try {
      const d = await commerceService.reviews(productId);
      setData(d);
      onStats?.(d.avg_rating, d.review_count);
    } catch {
      setData({ avg_rating: 0, review_count: 0, distribution: {}, reviews: [] });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await commerceService.postReview({
        product_id: productId,
        rating: form.rating,
        comment: form.comment,
        reviewer_name: form.name,
        tracking_code: form.code.trim().toUpperCase(),
      });
      toast.success('Thank you! Your verified review is live.');
      setShowForm(false);
      setForm({ ...form, comment: '' });
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not post your review.'));
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await commerceService.reportListing({ product_id: productId, ...report });
      toast.success(res.message);
      setShowReport(false);
      setReport({ reason: 'SCAM', details: '', contact: '' });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send your report.'));
    } finally {
      setBusy(false);
    }
  };

  const total = data?.review_count || 0;

  return (
    <section className="space-y-4" aria-label="Customer reviews">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 font-heading">⭐ Customer Reviews</h2>
          <p className="text-xs text-slate-500">Only buyers with a delivered order can review, so every review is real.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 min-h-[40px] rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
          >
            Write a review
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" /> Report listing
          </button>
        </div>
      </div>

      {data && total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-6 items-center">
          <div className="text-center">
            <p className="text-4xl font-black text-slate-900">{data.avg_rating.toFixed(1)}</p>
            <Stars value={data.avg_rating} size={16} />
            <p className="text-[11px] text-slate-500 mt-1">{total} review{total === 1 ? '' : 's'}</p>
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = data.distribution[String(n)] || 0;
              return (
                <div key={n} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-3">{n}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${total ? (c / total) * 100 : 0}%` }} />
                  </div>
                  <span className="w-5 text-right">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={submitReview} className="bg-white rounded-2xl border border-emerald-200 p-4 space-y-3">
          <p className="text-sm font-black text-slate-900">Review “{productName}”</p>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                role="radio"
                aria-checked={form.rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setForm({ ...form, rating: n })}
                className="p-1 cursor-pointer"
              >
                <Star className={`w-7 h-7 ${n <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
          <input
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Your order tracking code (e.g. SB-1A2B3C4D) *"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold uppercase"
          />
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name (optional)"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
          />
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={3}
            placeholder="How was the product and delivery?"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
          />
          <button
            disabled={busy}
            className="w-full min-h-[48px] rounded-2xl bg-emerald-600 text-white font-black text-sm disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Posting...' : 'Post verified review'}
          </button>
        </form>
      )}

      {data && total === 0 && !showForm && (
        <p className="text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 p-5 text-center">
          No reviews yet. Be the first verified buyer to share your experience.
        </p>
      )}

      <div className="space-y-3">
        {data?.reviews.map((r) => (
          <article key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                <span className="text-sm font-bold text-slate-800">{r.reviewer_name}</span>
                {r.verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="w-3 h-3" /> Verified purchase
                  </span>
                )}
              </div>
              <time className="text-[11px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</time>
            </div>
            {r.comment && <p className="text-sm text-slate-600 whitespace-pre-line">{r.comment}</p>}
            {r.seller_reply && (
              <div className="bg-slate-50 border-l-4 border-emerald-500 rounded-r-xl px-3 py-2">
                <p className="text-[11px] font-extrabold text-emerald-700">Seller response</p>
                <p className="text-xs text-slate-600 whitespace-pre-line">{r.seller_reply}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      {showReport && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowReport(false)}
        >
          <form
            onSubmit={submitReport}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Report this listing</h3>
              <button type="button" aria-label="Close" onClick={() => setShowReport(false)} className="p-2 cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <select
              value={report.reason}
              onChange={(e) => setReport({ ...report, reason: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <textarea
              value={report.details}
              onChange={(e) => setReport({ ...report, details: e.target.value })}
              rows={3}
              placeholder="Tell us what is wrong"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
            />
            <input
              value={report.contact}
              onChange={(e) => setReport({ ...report, contact: e.target.value })}
              placeholder="Your phone or email (optional)"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
            />
            <button
              disabled={busy}
              className="w-full min-h-[48px] rounded-2xl bg-rose-600 text-white font-black text-sm disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Sending...' : 'Send report'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default ReviewsSection;
