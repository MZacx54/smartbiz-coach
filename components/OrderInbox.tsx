import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, BadgeCheck, Copy, MessageCircle, Package, RefreshCw, Truck } from 'lucide-react';
import {
  commerceService, errorMessage, CommerceOrder, DeliveryRateRow, LowStockRow, ModerationReport,
  OrderStatus, ReviewRow,
} from '../services/commerceService';
import { NIGERIAN_STATES } from '../config/nigeriaStates';
import { Stars } from './ReviewsSection';

type Tab = 'orders' | 'delivery' | 'reviews' | 'moderation';

const STATUS_STYLE: Record<OrderStatus, string> = {
  PAID: 'bg-emerald-100 text-emerald-800',
  PACKED: 'bg-sky-100 text-sky-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-200 text-slate-600',
  DISPUTED: 'bg-rose-100 text-rose-800',
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'New' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'DISPUTED', label: 'Problems' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const NEXT_ACTIONS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  PAID: [{ to: 'PACKED', label: 'Mark packed' }, { to: 'SHIPPED', label: 'Mark shipped' }],
  PACKED: [{ to: 'SHIPPED', label: 'Mark shipped' }],
  SHIPPED: [{ to: 'DELIVERED', label: 'Mark delivered' }],
  DISPUTED: [{ to: 'DELIVERED', label: 'Resolve: delivered' }],
};

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const waLink = (phone: string, text: string) => {
  const d = (phone || '').replace(/\D/g, '');
  const num = d.startsWith('0') && d.length === 11 ? '234' + d.slice(1) : d;
  return `https://wa.me/${num.length >= 10 ? num : ''}?text=${encodeURIComponent(text)}`;
};

const statusMessage = (o: CommerceOrder) => {
  const track = `${window.location.origin}/track/${o.tracking_code}`;
  const lines: Record<string, string> = {
    PAID: `Hello ${o.buyer_name}, we received your order ${o.tracking_code}. We are getting it ready.`,
    PACKED: `Hello ${o.buyer_name}, your order ${o.tracking_code} is packed and will be dispatched soon.`,
    SHIPPED: `Hello ${o.buyer_name}, your order ${o.tracking_code} is on its way${o.courier ? ` via ${o.courier}` : ''}${o.waybill_number ? ` (waybill ${o.waybill_number})` : ''}.`,
    DELIVERED: `Hello ${o.buyer_name}, your order ${o.tracking_code} was delivered. Thank you! Please leave a review.`,
    CANCELLED: `Hello ${o.buyer_name}, your order ${o.tracking_code} has been cancelled.`,
    DISPUTED: `Hello ${o.buyer_name}, we saw the issue you reported on order ${o.tracking_code} and want to fix it.`,
  };
  return `${lines[o.status] || ''}\nTrack: ${track}`;
};

const OrderCard: React.FC<{ order: CommerceOrder; onChanged: (o: CommerceOrder) => void }> = ({ order, onChanged }) => {
  const [open, setOpen] = useState(order.status === 'PAID' || order.status === 'DISPUTED');
  const [courier, setCourier] = useState(order.courier);
  const [waybill, setWaybill] = useState(order.waybill_number);
  const [busy, setBusy] = useState(false);

  const move = async (to: OrderStatus) => {
    if (to === 'CANCELLED' && !window.confirm('Cancel this order? Stock will be returned to your shelf. Refund the buyer from your Paystack dashboard.')) return;
    setBusy(true);
    try {
      const updated = await commerceService.updateOrder(order.id, {
        status: to,
        ...(to === 'SHIPPED' ? { courier, waybill_number: waybill } : {}),
      });
      onChanged(updated);
      toast.success(`Order ${updated.tracking_code} is now ${updated.status_label}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update the order'));
    } finally {
      setBusy(false);
    }
  };

  const saveShipping = async () => {
    setBusy(true);
    try {
      onChanged(await commerceService.updateOrder(order.id, { courier, waybill_number: waybill }));
      toast.success('Shipping details saved');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 truncate">
            {order.buyer_name} · {naira(order.total_amount)}
          </p>
          <p className="text-[11px] text-slate-500">
            {order.tracking_code} · {new Date(order.created_at).toLocaleString()} · {order.items.length} item(s)
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>
          {order.status_label}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {!order.payment_verified && (
            <p className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Payment was not confirmed automatically. Check Paystack for reference <strong>{order.reference}</strong> before shipping.
            </p>
          )}
          {order.status === 'DISPUTED' && (
            <p className="text-xs bg-rose-50 text-rose-800 rounded-xl p-3">
              <strong>Buyer reported a problem:</strong> {order.dispute_reason}
            </p>
          )}
          <ul className="text-sm text-slate-700 space-y-1">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-2">
                <span>{i.quantity} × {i.name}</span>
                <span className="font-bold">{naira(i.line_total)}</span>
              </li>
            ))}
            {order.delivery_fee > 0 && (
              <li className="flex justify-between text-slate-500"><span>Delivery ({order.delivery_state})</span><span>{naira(order.delivery_fee)}</span></li>
            )}
          </ul>
          <div className="text-xs text-slate-600 space-y-0.5">
            <p>📞 {order.buyer_phone}</p>
            <p>📍 {order.delivery_address}{order.delivery_state ? `, ${order.delivery_state}` : ''}</p>
            {order.notes && <p>📝 {order.notes}</p>}
          </div>

          {(order.status === 'PAID' || order.status === 'PACKED' || order.status === 'SHIPPED') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder="Courier (GIG, Peace Mass...)"
                aria-label="Courier"
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
              />
              <input
                value={waybill}
                onChange={(e) => setWaybill(e.target.value)}
                placeholder="Waybill / tracking no."
                aria-label="Waybill number"
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
              />
              <button onClick={saveShipping} disabled={busy} className="px-3 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50">
                Save shipping
              </button>
            </div>
          )}

          <ol className="space-y-1 border-l-2 border-slate-100 pl-3">
            {order.events.map((e, i) => (
              <li key={i} className="text-[11px] text-slate-500">
                <strong className="text-slate-700">{e.status}</strong> · {new Date(e.created_at).toLocaleString()}
                {e.note ? ` — ${e.note}` : ''}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            {(NEXT_ACTIONS[order.status] || []).map((a) => (
              <button
                key={a.to}
                onClick={() => move(a.to)}
                disabled={busy}
                className="px-4 min-h-[40px] rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
            {['PAID', 'PACKED', 'SHIPPED', 'DISPUTED'].includes(order.status) && (
              <button
                onClick={() => move('CANCELLED')}
                disabled={busy}
                className="px-4 min-h-[40px] rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel order
              </button>
            )}
            <a
              href={waLink(order.buyer_phone, statusMessage(order))}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl bg-green-50 text-green-700 text-xs font-extrabold"
            >
              <MessageCircle className="w-4 h-4" /> Update buyer on WhatsApp
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/track/${order.tracking_code}`);
                toast.success('Tracking link copied');
              }}
              className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy tracking link
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

const DeliveryTab: React.FC = () => {
  const [rates, setRates] = useState<DeliveryRateRow[]>([]);
  const [state, setState] = useState('*');
  const [fee, setFee] = useState('');
  const [eta, setEta] = useState('3');

  const load = useCallback(() => commerceService.deliveryRates().then(setRates).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await commerceService.saveDeliveryRate(state, Number(fee || 0), Number(eta || 3));
      toast.success('Delivery rate saved');
      setFee('');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save rate'));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Set what you charge to deliver to each state. Buyers see the fee before they pay. “All other states” is your default rate; leave it at ₦0 for free delivery.
      </p>
      <form onSubmit={save} className="bg-white rounded-2xl border border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <select value={state} onChange={(e) => setState(e.target.value)} aria-label="State" className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold">
          <option value="*">All other states (default)</option>
          {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Fee (₦)" aria-label="Delivery fee" required className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold" />
        <input type="number" min="0" value={eta} onChange={(e) => setEta(e.target.value)} placeholder="Days" aria-label="Delivery days" className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold" />
        <button className="min-h-[44px] rounded-xl bg-emerald-600 text-white text-sm font-extrabold cursor-pointer">Save rate</button>
      </form>
      <ul className="space-y-2">
        {rates.length === 0 && <li className="text-sm text-slate-500">No rates yet. Buyers currently see free delivery.</li>}
        {rates.map((r) => (
          <li key={r.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between text-sm">
            <span><strong>{r.state === '*' ? 'All other states' : r.state}</strong> · {naira(r.fee)} · ~{r.eta_days} day(s)</span>
            <button
              onClick={async () => { await commerceService.deleteDeliveryRate(r.id); load(); }}
              className="text-xs font-bold text-rose-600 cursor-pointer"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ReviewsTab: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    commerceService.myReviews().then(setReviews).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const reply = async (id: number) => {
    try {
      await commerceService.replyReview(id, drafts[id] || '');
      toast.success('Reply posted');
      load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not post reply'));
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading reviews…</p>;
  if (!reviews.length) return <p className="text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center">No reviews yet. They appear here once buyers rate delivered orders.</p>;
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <article key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-black text-slate-900">{r.product_name}</p>
            <Stars value={r.rating} />
          </div>
          <p className="text-xs text-slate-500">{r.reviewer_name} · {new Date(r.created_at).toLocaleDateString()}</p>
          {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
          {r.seller_reply && <p className="text-xs bg-slate-50 border-l-4 border-emerald-500 px-3 py-2 rounded-r-xl text-slate-600"><strong>Your reply:</strong> {r.seller_reply}</p>}
          <div className="flex gap-2">
            <input
              value={drafts[r.id] ?? ''}
              onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })}
              placeholder={r.seller_reply ? 'Edit your reply' : 'Reply publicly to this review'}
              aria-label="Reply to review"
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
            />
            <button onClick={() => reply(r.id)} className="px-4 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer">Reply</button>
          </div>
        </article>
      ))}
    </div>
  );
};

const ModerationTab: React.FC = () => {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [filter, setFilter] = useState('OPEN');
  const [denied, setDenied] = useState(false);

  const load = useCallback(() => {
    commerceService.moderationReports(filter).then((r) => { setReports(r); setDenied(false); })
      .catch((e) => { if (e?.response?.status === 403) setDenied(true); });
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: 'suspend' | 'dismiss' | 'restore') => {
    try {
      await commerceService.moderate(id, action);
      toast.success(action === 'suspend' ? 'Listing suspended' : action === 'restore' ? 'Listing restored' : 'Report dismissed');
      load();
    } catch (e) {
      toast.error(errorMessage(e, 'Action failed'));
    }
  };

  if (denied) return <p className="text-sm text-rose-700 bg-rose-50 rounded-2xl p-4">Moderation is limited to SmartBiz staff accounts.</p>;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['OPEN', 'ACTIONED', 'DISMISSED'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {f === 'OPEN' ? 'Open' : f === 'ACTIONED' ? 'Suspended' : 'Dismissed'}
          </button>
        ))}
      </div>
      {reports.length === 0 && <p className="text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center">Nothing in this queue.</p>}
      {reports.map((r) => (
        <article key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-900">{r.product.name} <span className="text-slate-400 font-semibold">· {r.product.brand_name} · {naira(r.product.price)}</span></p>
              <p className="text-xs text-rose-700 font-bold">{r.reason_label} · {r.product.open_reports} open report(s) on this listing</p>
            </div>
            {r.product.is_suspended && <span className="text-[10px] font-extrabold bg-slate-900 text-white px-2 py-1 rounded-full">SUSPENDED</span>}
          </div>
          {r.details && <p className="text-sm text-slate-600">{r.details}</p>}
          <p className="text-[11px] text-slate-400">Reporter: {r.reporter_contact || 'anonymous'} · {new Date(r.created_at).toLocaleString()}</p>
          <div className="flex gap-2 flex-wrap">
            {r.status === 'OPEN' && (
              <>
                <button onClick={() => act(r.id, 'suspend')} className="px-4 min-h-[40px] rounded-xl bg-rose-600 text-white text-xs font-extrabold cursor-pointer">Suspend listing</button>
                <button onClick={() => act(r.id, 'dismiss')} className="px-4 min-h-[40px] rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Dismiss</button>
              </>
            )}
            {r.product.is_suspended && (
              <button onClick={() => act(r.id, 'restore')} className="px-4 min-h-[40px] rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer">Restore listing</button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
};

const OrderInbox: React.FC<{ user?: any }> = ({ user }) => {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const isStaff = !!(user?.is_staff || user?.is_superuser);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await commerceService.merchantOrders(filter);
      setOrders(d.orders);
      setCounts(d.counts);
      setLowStock(d.low_stock);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not load orders'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { if (tab === 'orders') load(); }, [load, tab]);

  const needsAction = (counts.PAID || 0) + (counts.DISPUTED || 0);
  const revenue = useMemo(
    () => orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total_amount, 0),
    [orders],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: `Orders${needsAction ? ` (${needsAction})` : ''}` },
    { key: 'delivery', label: 'Delivery fees' },
    { key: 'reviews', label: 'Reviews' },
    ...(isStaff ? [{ key: 'moderation' as Tab, label: 'Moderation' }] : []),
  ];

  const replaceOrder = (u: CommerceOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === u.id ? u : o)));
    commerceService.merchantOrders(filter).then((d) => { setCounts(d.counts); setLowStock(d.low_stock); }).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-heading flex items-center gap-2"><Package className="w-6 h-6 text-emerald-600" /> Online Orders</h1>
          <p className="text-xs text-slate-500">Orders from your public store and the National Market Square, from payment to delivery.</p>
        </div>
        {tab === 'orders' && (
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        )}
      </header>

      <nav className="flex gap-2 overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-4 min-h-[40px] rounded-xl text-xs font-extrabold cursor-pointer ${tab === t.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'orders' && (
        <>
          {lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-black text-amber-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Running low on stock</p>
              <ul className="mt-1 text-xs text-amber-800 flex flex-wrap gap-x-4 gap-y-1">
                {lowStock.map((p) => <li key={p.id}>{p.name}: <strong>{p.stock_count}</strong> left</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const c = f.key === 'ALL' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[f.key] || 0;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${filter === f.key ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {f.label} <span className="opacity-70">{c}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading orders…</p>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
              <Truck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No orders here yet</p>
              <p className="text-xs text-slate-500">Share your store link or an item link on WhatsApp Status to get your first paid order.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> {orders.length} order(s) shown · {naira(revenue)} value</p>
              <div className="space-y-3">
                {orders.map((o) => <OrderCard key={o.id} order={o} onChanged={replaceOrder} />)}
              </div>
            </>
          )}
        </>
      )}
      {tab === 'delivery' && <DeliveryTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'moderation' && isStaff && <ModerationTab />}
    </div>
  );
};

export default OrderInbox;
