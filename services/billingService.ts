import api from "./api";

export const billingService = {
  getTransactions: async () => {
    const response = await api.get("billing/transactions/");
    return response.data;
  },

  buyCredits: async (amount: number) => {
    const response = await api.post("billing/buy-credits/", { amount });
    return response.data;
  },

  verifyPayment: async (reference: string, amount: number) => {
    const response = await api.post("billing/verify-payment/", {
      reference,
      amount,
    });
    return response.data;
  },

  verifySquadPayment: async (reference: string, amount: number) => {
    const response = await api.post("billing/verify-squad-payment/", {
      reference,
      amount,
    });
    return response.data;
  },
};
