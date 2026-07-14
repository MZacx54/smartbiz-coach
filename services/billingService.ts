import api from "./api";

export interface TransactionData {
  id: number;
  amount: string;
  description: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  provider: 'PAYSTACK';
  type: 'PURCHASE' | 'BOOKING' | 'CREDIT_TOPUP';
  reference: string;
  created_at: string;
}

export interface CreditLedgerData {
  id: number;
  amount: number;
  activity: string;
  created_at: string;
}

export const billingService = {
  getTransactions: async (): Promise<TransactionData[]> => {
    const response = await api.get("billing/transactions/");
    return response.data;
  },

  getCreditLedger: async (): Promise<CreditLedgerData[]> => {
    const response = await api.get("billing/ledger/");
    return response.data;
  },

  buyCredits: async (amount: number) => {
    const response = await api.post("billing/buy-credits/", { amount });
    return response.data;
  },

  verifyPayment: async (reference: string, amount: number): Promise<{ message: string; credits: number }> => {
    const response = await api.post("billing/verify-payment/", {
      reference,
      amount,
    });
    return response.data;
  },

  deductCredits: async (amount: number, activity: string): Promise<{ message: string; credits: number }> => {
    const response = await api.post("billing/deduct-credits/", {
      amount,
      activity,
    });
    return response.data;
  },

  getPaystackConfig: async (): Promise<{ publicKey: string }> => {
    const response = await api.get("billing/config/");
    return response.data;
  },

  getAdminTransactions: async (): Promise<AdminDashboardData> => {
    const response = await api.get("billing/admin/transactions/");
    return response.data;
  },
};

export interface AdminDashboardData {
  total_revenue: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  transactions: {
    id: number;
    username: string;
    email: string;
    business_name: string;
    amount: number;
    description: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    reference: string;
    created_at: string;
  }[];
}
