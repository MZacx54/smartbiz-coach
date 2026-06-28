import React, { useState } from "react";
import { usePaystackPayment } from "react-paystack";

const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder";

interface PaymentModalProps {
  amount: number;
  description: string;
  email?: string;
  onClose: () => void;
  onSuccess: (reference: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  amount,
  description,
  email = "guest@smartbizcoach.com.ng",
  onClose,
  onSuccess,
}) => {
  const [processing, setProcessing] = useState(false);

  const isKeyPlaceholder = (key: string) => 
    !key || key.includes("placeholder") || key === "undefined";

  const config = {
    reference: new Date().getTime().toString(),
    email: email,
    amount: amount * 100, // Paystack expects Kobo
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: "NGN",
  };

  const initializePaystack = usePaystackPayment(config);

  const handlePaystackPay = () => {
    setProcessing(true);
    if (isKeyPlaceholder(PAYSTACK_PUBLIC_KEY)) {
      alert("Paystack Public Key is not configured correctly. Please check your VITE_PAYSTACK_PUBLIC_KEY environment variable.");
      setProcessing(false);
      return;
    }

    initializePaystack({
      onSuccess: (response: any) => {
        onSuccess(response.reference);
        setProcessing(false);
      },
      onClose: () => {
        setProcessing(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden relative border border-gray-100">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Secure Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
              Total Amount
            </p>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-1">
              ₦{amount.toLocaleString()}
            </h2>
            <p className="text-xs text-gray-400 mt-2 bg-gray-50 py-1.5 px-3 rounded-lg border border-gray-100 inline-block max-w-full truncate">
              {description}
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border border-green-100 mb-6">
            <div className="flex gap-2">
              <span className="text-lg">💳</span>
              <div className="text-xs text-green-900 leading-relaxed">
                Payment processed securely via <strong>Paystack</strong>. Supports Card, Bank Transfer, USSD, and more.
              </div>
            </div>
          </div>

          <button
            onClick={handlePaystackPay}
            disabled={processing}
            className="w-full py-4 rounded-xl text-white font-bold bg-green-600 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95"
          >
            {processing ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Processing...
              </>
            ) : (
              `Pay ₦${amount.toLocaleString()}`
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-400">
            <span>🔒 Secured by Paystack</span>
            <span>•</span>
            <span>PCI-DSS Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
