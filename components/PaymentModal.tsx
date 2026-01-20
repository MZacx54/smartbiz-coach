import React, { useState } from "react";
import { usePaystackPayment } from "react-paystack";

const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder";
const SQUAD_PUBLIC_KEY =
  import.meta.env.VITE_SQUAD_PUBLIC_KEY ||
  "pk_d0ac2e2a4e21ce3601eab31df4f36cf5d8284b90";

interface PaymentModalProps {
  amount: number;
  description: string;
  email?: string;
  onClose: () => void;
  onSuccess: (provider: "PAYSTACK" | "SQUAD", reference: string) => void;
}

// --- Updated PaymentModal with robust loading ---

const loadSquadSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).SquadPay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.squadco.com/widget/squad.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Squad SDK"));
    document.head.appendChild(script);
  });
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  amount,
  description,
  email = "guest@smartbiz.com",
  onClose,
  onSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [provider, setProvider] = useState<"PAYSTACK" | "SQUAD">("SQUAD");

  const isKeyPlaceholder = (key: string) => !key || key.includes("placeholder") || key === "undefined";

  const config = {
    reference: new Date().getTime().toString(),
    email: email,
    amount: amount * 100,
    publicKey: PAYSTACK_PUBLIC_KEY,
  };

  const initializePaystack = usePaystackPayment(config);

  const handlePay = async () => {
    setProcessing(true);

    if (provider === "SQUAD") {
      if (isKeyPlaceholder(SQUAD_PUBLIC_KEY)) {
        alert("Squad Public Key is not configured correctly. Please check your environment variables.");
        setProcessing(false);
        return;
      }

      try {
        await loadSquadSDK();
        const win = window as any;
        const squadInstance = new win.SquadPay({
          onClose: () => {
            console.log("Widget closed");
            setProcessing(false);
          },
          onLoad: () => console.log("Widget loaded successfully"),
          onSuccess: (response: any) => {
            onSuccess("SQUAD", response.transaction_reference);
            setProcessing(false);
          },
          key: SQUAD_PUBLIC_KEY,
          email: email,
          amount: amount * 100,
          currency_code: "NGN",
          transaction_ref: `SQD-${Date.now()}`,
        });
        squadInstance.setup();
        squadInstance.open();
      } catch (err) {
        alert("Could not load Squad SDK. Please check your internet connection.");
        setProcessing(false);
      }
    } else {
      if (isKeyPlaceholder(PAYSTACK_PUBLIC_KEY)) {
        alert("Paystack Public Key is not configured correctly. Please check your environment variables (VITE_PAYSTACK_PUBLIC_KEY).");
        setProcessing(false);
        return;
      }

      initializePaystack({
        onSuccess: (response: any) => {
          onSuccess("PAYSTACK", response.reference);
          setProcessing(false);
        },
        onClose: () => {
          setProcessing(false);
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Secure Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm uppercase tracking-wide">
              Total Amount
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">
              ₦{amount.toLocaleString()}
            </h2>
            <p className="text-xs text-gray-400 mt-1 truncate px-4">
              {description}
            </p>
          </div>

          <p className="text-xs font-bold text-gray-500 mb-3 uppercase">
            Select Gateway
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setProvider("SQUAD")}
              className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                provider === "SQUAD"
                  ? "border-orange-500 bg-orange-50 text-orange-700 font-bold"
                  : "border-gray-200 hover:border-orange-200 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
              }`}
            >
              Squad (GTCO)
            </button>
            <button
              onClick={() => setProvider("PAYSTACK")}
              className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                provider === "PAYSTACK"
                  ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                  : "border-gray-200 hover:border-blue-200 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
              }`}
            >
              Paystack
            </button>
          </div>

          <button
            onClick={handlePay}
            disabled={processing}
            className={`w-full py-3.5 rounded-lg text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
              provider === "PAYSTACK"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              `Pay ₦${amount.toLocaleString()}`
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-400">
            <span>🔒 256-bit SSL Encrypted</span>
            <span>•</span>
            <span>Trusted by 500k+ Businesses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
