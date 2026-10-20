import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Circle, MessageCircle, Package, Search, Truck, XCircle } from 'lucide-react';
import { commerceService, errorMessage, CommerceOrder, OrderStatus } from '../services/commerceService';

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'PAID', label: 'Order paid' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'SHIPPED', label: 'On its way' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const OrderTracking: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (c: string) => {
    setLoading(true);
    setError('');
    try {
      setOrder(await commerceService.track(c));
    } catch (e) {
      setOrder(null);
      setError(errorMessage(e, 'We could not find an order with that tracking code.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (code) {
      setInput(code);
      load(code);
    }
  }, [code, load]);

  const act = async (action: 'confirm' | 'dispute') => {
    if (!order) return;
    setBusy(true);
    try {
      const updated = await commerceService.buyerAction(order.tracking_code, action, reason);
      setOrder(updated);
      setShowDispute(false);
      toast.success(action === 'confirm' ? 'Thanks for confirming your delivery!' : 'Problem reported. The seller has been notified.');
    } catch (e) {
      toast.error(errorMessage(e, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = order ? STEPS.findIndex((s) => s.key === order.status) : -1;
  const sellerWa = order?.seller_whatsapp && order.seller_whatsapp.length >= 10 ? order.seller_whatsapp : '';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/market" className="text-sm font-black text-slate-900">🇳🇬 SmartBiz Market Square</Link>
          <Link to="/market" className="text-xs font-extrabold text-emerald-700">Keep shopping →</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-heading flex items-center gap-2"><Truck className="w-6 h-6 text-emerald-600" /> Track your order</h1>
          <p className="text-xs text-slate-500">Enter the tracking code you received after payment (looks like SB-1A2B3C4D).</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (input.trim()) navigate(`/track/${input.trim().toUpperCase()}`); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tracking code"
            aria-label="Tracking code"
            className="flex-1 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold uppercase"
          />
          <button className="px-5 rounded-2xl bg-emerald-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer">
            <Search className="w-4 h-4" /> Track
          </button>
        </form>

        {loading && <p className="text-sm text-slate-500">Looking up your order…</p>}
        {error && !loading && <p role="alert" className="text-sm bg-rose-50 text-rose-700 rounded-2xl p-4">{error}</p>}

        {order && !loading && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Sold by</p>
                  <p className="text-base font-black text-slate-900">{order.brand_name}</p>
                  <p className="text-[11px] text-slate-500">{order.tracking_code} · ordered {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-lg font-black text-emerald-600">{naira(order.total_amount)}</p>
              </div>

              {order.status === 'CANCELLED' ? (
                <p className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 rounded-xl p-3"><XCircle className="w-5 h-5" /> This order was cancelled. Contact the seller about your refund.</p>
              ) : order.status === 'DISPUTED' ? (
                <p className="text-sm text-rose-700 bg-rose-50 rounded-xl p-3">You reported a problem. The seller has been notified and will contact you.</p>
              ) : (
                <ol className="space-y-3">
                  {STEPS.map((s, i) => {
                    const done = i <= stepIndex;
                    return (
                      <li key={s.key} className="flex items-center gap-3">
                        {done ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Circle className="w-6 h-6 text-slate-300" />}
                        <span className={`text-sm font-bold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {(order.courier || order.waybill_number) && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3">
                  🚚 {order.courier || 'Courier'}{order.waybill_number ? ` · Waybill ${order.waybill_number}` : ''}
                </p>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2"><Package className="w-4 h-4" /> Items</h2>
              <ul className="text-sm text-slate-700 space-y-1.5">
                {order.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-2 items-center">
                    <span>{i.quantity} × {i.name}</span>
                    <span className="flex items-center gap-3">
                      <strong>{naira(i.line_total)}</strong>
                      {order.status === 'DELIVERED' && i.product_id && (
                        <Link to={`/market/p/${i.product_id}?track=${order.tracking_code}#reviews`} className="text-xs font-extrabold text-emerald-700 underline">Review</Link>
                      )}
                    </span>
                  </li>
                ))}
                {order.delivery_fee > 0 && <li className="flex justify-between text-slate-500"><span>Delivery</span><span>{naira(order.delivery_fee)}</span></li>}
              </ul>
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2">
              <h2 className="text-sm font-black text-slate-900">History</h2>
              <ol className="space-y-1.5 border-l-2 border-slate-100 pl-3">
                {order.events.map((e, i) => (
                  <li key={i} className="text-xs text-slate-500"><strong className="text-slate-700">{e.status}</strong> · {new Date(e.created_at).toLocaleString()}{e.note ? ` — ${e.note}` : ''}</li>
                ))}
              </ol>
            </section>

            <div className="flex flex-wrap gap-2">
              {order.status === 'SHIPPED' && (
                <button disabled={busy} onClick={() => act('confirm')} className="px-5 min-h-[48px] rounded-2xl bg-emerald-600 text-white text-sm font-black cursor-pointer disabled:opacity-50">
                  ✅ I received my order
                </button>
              )}
              {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                <button onClick={() => setShowDispute((v) => !v)} className="px-5 min-h-[48px] rounded-2xl bg-white border border-rose-200 text-rose-700 text-sm font-bold cursor-pointer">
                  Report a problem
                </button>
              )}
              {sellerWa && (
                <a
                  href={`https://wa.me/${sellerWa}?text=${encodeURIComponent(`Hello, about my order ${order.tracking_code}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 min-h-[48px] rounded-2xl bg-green-50 text-green-700 text-sm font-extrabold"
                >
                  <MessageCircle className="w-4 h-4" /> Chat with seller
                </a>
              )}
            </div>

            {showDispute && (
              <div className="bg-white rounded-2xl border border-rose-200 p-4 space-y-2">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="What went wrong? (wrong item, damaged, not delivered…)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                />
                <button disabled={busy || reason.trim().length < 5} onClick={() => act('dispute')} className="w-full min-h-[48px] rounded-2xl bg-rose-600 text-white text-sm font-black cursor-pointer disabled:opacity-50">
                  Send problem report
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderTracking;
