import api from './api';

export type OrderStatus = 'PAID' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';

export interface OrderItemRow {
  product_id: number | null;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface OrderEventRow {
  status: OrderStatus;
  note: string;
  created_at: string;
}

export interface CommerceOrder {
  id: number;
  tracking_code: string;
  reference: string;
  status: OrderStatus;
  status_label: string;
  buyer_name: string;
  buyer_phone: string;
  delivery_address?: string;
  delivery_state: string;
  notes?: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_verified: boolean;
  courier: string;
  waybill_number: string;
  dispute_reason: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  buyer_confirmed_at: string | null;
  brand_name: string;
  brand_slug: string | null;
  seller_whatsapp: string;
  items: OrderItemRow[];
  events: OrderEventRow[];
  can_review?: boolean;
}

export interface LowStockRow { id: number; name: string; stock_count: number; low_stock_threshold: number }

export interface DeliveryRateRow { id: number; state: string; fee: number; eta_days: number }

export interface ReviewRow {
  id: number;
  product_id: number;
  product_name: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  seller_reply: string;
  created_at: string;
}

export interface ReviewSummary {
  avg_rating: number;
  review_count: number;
  distribution: Record<string, number>;
  reviews: ReviewRow[];
}

export interface ModerationReport {
  id: number;
  reason: string;
  reason_label: string;
  details: string;
  reporter_contact: string;
  status: 'OPEN' | 'ACTIONED' | 'DISMISSED';
  resolution_note: string;
  created_at: string;
  product: { id: number; name: string; price: number; brand_name: string; is_suspended: boolean; open_reports: number };
}

const M = '/api/marketplace';

/** Public buyer-facing share URL (served by the backend so WhatsApp/Facebook get a rich preview). */
export const productShareUrl = (productId: number | string) => `${window.location.origin}/s/p/${productId}`;
export const storeShareUrl = (slug: string) => `${window.location.origin}/s/u/${slug}`;

export const commerceService = {
  merchantOrders: (status?: string) =>
    api.get(`${M}/orders/mine/`, { params: status && status !== 'ALL' ? { status } : {} })
      .then(r => r.data as { orders: CommerceOrder[]; counts: Record<OrderStatus, number>; low_stock: LowStockRow[] }),
  updateOrder: (id: number, body: Partial<{ status: OrderStatus; courier: string; waybill_number: string; note: string }>) =>
    api.patch(`${M}/orders/${id}/`, body).then(r => r.data as CommerceOrder),
  track: (code: string) => api.get(`${M}/orders/track/${encodeURIComponent(code)}/`).then(r => r.data as CommerceOrder),
  buyerAction: (code: string, action: 'confirm' | 'dispute', reason?: string) =>
    api.post(`${M}/orders/track/${encodeURIComponent(code)}/action/`, { action, reason }).then(r => r.data as CommerceOrder),

  deliveryQuote: (productIds: (number | string)[], state: string) =>
    api.get(`${M}/delivery-quote/`, { params: { product_ids: productIds.join(','), state } })
      .then(r => r.data as { total_fee: number; quotes: { brand_id: number; brand_name: string; fee: number; eta_days: number }[] }),
  deliveryRates: () => api.get(`${M}/delivery-rates/`).then(r => r.data as DeliveryRateRow[]),
  saveDeliveryRate: (state: string, fee: number, eta_days: number) =>
    api.post(`${M}/delivery-rates/`, { state, fee, eta_days }).then(r => r.data as DeliveryRateRow),
  deleteDeliveryRate: (id: number) => api.delete(`${M}/delivery-rates/${id}/`),

  reviews: (productId: number | string) =>
    api.get(`${M}/reviews/`, { params: { product_id: productId } }).then(r => r.data as ReviewSummary),
  postReview: (body: { product_id: number; rating: number; comment: string; reviewer_name?: string; tracking_code: string }) =>
    api.post(`${M}/reviews/`, body).then(r => r.data as ReviewRow),
  myReviews: () => api.get(`${M}/reviews/mine/`).then(r => r.data as ReviewRow[]),
  replyReview: (id: number, reply: string) => api.post(`${M}/reviews/${id}/reply/`, { reply }).then(r => r.data as ReviewRow),

  reportListing: (body: { product_id: number; reason: string; details?: string; contact?: string }) =>
    api.post(`${M}/reports/`, body).then(r => r.data as { message: string }),
  moderationReports: (status = 'OPEN') =>
    api.get(`${M}/moderation/reports/`, { params: { status } }).then(r => r.data as ModerationReport[]),
  moderate: (id: number, action: 'suspend' | 'dismiss' | 'restore', note?: string) =>
    api.post(`${M}/moderation/reports/${id}/`, { action, note }).then(r => r.data as ModerationReport),

  listingAssist: (body: { name: string; category?: string; price?: number | string; description?: string; location?: string }) =>
    api.post(`${M}/listing-assist/`, body).then(r => r.data as {
      title: string; description: string; price_min: number | null; price_max: number | null; tags: string[]; source: 'ai' | 'template';
    }),
};

export const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.error || err?.response?.data?.detail || fallback;
