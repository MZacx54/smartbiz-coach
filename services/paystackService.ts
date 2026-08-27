import api from './api';
import { billingService } from './billingService';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: any) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * Ensures that the Paystack inline popup script (inline.js) is loaded and ready on the window.
 */
export const loadPaystackSDK = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.PaystackPop) {
      resolve(true);
      return;
    }

    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    // Check if script tag is already in DOM
    const existingScript = document.querySelector('script[src*="paystack.co/v1/inline.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      // In case it already loaded
      if (window.PaystackPop) {
        resolve(true);
        return;
      }
    }

    // Inject script tag
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      resolve(!!window.PaystackPop);
    };
    script.onerror = () => {
      console.error('Failed to load Paystack inline script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Retrieves the active Paystack Public Key from environment or backend config API.
 */
export const getPaystackPublicKey = async (): Promise<string> => {
  let key = (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || (window as any).env?.VITE_PAYSTACK_PUBLIC_KEY || '';

  if (key && key !== 'pk_test_placeholder' && key.startsWith('pk_')) {
    return key;
  }

  try {
    const config = await billingService.getPaystackConfig();
    if (config?.publicKey && config.publicKey.startsWith('pk_')) {
      return config.publicKey;
    }
  } catch (err) {
    console.warn('Could not fetch Paystack public key from billing config:', err);
  }

  try {
    const payoutRes = await api.get('/api/marketplace/payout/banks/');
    if (payoutRes.data?.paystack_public_key && payoutRes.data.paystack_public_key.startsWith('pk_')) {
      return payoutRes.data.paystack_public_key;
    }
  } catch (err) {
    console.warn('Could not fetch Paystack public key from payout endpoint:', err);
  }

  return key;
};

export interface PaystackCheckoutOptions {
  amount: number; // in Naira (e.g. 5000)
  email?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  orderNotes?: string;
  subaccountCode?: string; // e.g. ACCT_pdtmkty7e2khq5t (Direct vendor bank settlement)
  onSuccess: (response: { reference: string }) => void;
  onClose?: () => void;
}

/**
 * Launches Paystack Popup with optional direct Subaccount routing.
 */
export const openPaystackCheckout = async (options: PaystackCheckoutOptions): Promise<boolean> => {
  const isLoaded = await loadPaystackSDK();
  if (!isLoaded || !window.PaystackPop) {
    throw new Error('Paystack SDK failed to initialize. Please check your internet connection or use WhatsApp order.');
  }

  const publicKey = await getPaystackPublicKey();
  if (!publicKey || !publicKey.startsWith('pk_')) {
    throw new Error('Paystack public key is not configured. Please proceed via WhatsApp order.');
  }

  const cleanPhone = (options.customerPhone || '').replace(/\D/g, '');
  const email = options.email || (cleanPhone.length >= 7 
    ? `customer${cleanPhone}@smartbizcoach.com.ng` 
    : `buyer${Date.now()}@smartbizcoach.com.ng`);

  const amountKobo = Math.round(options.amount * 100);

  // Validate Subaccount code (must be valid Paystack subaccount format)
  const rawSub = (options.subaccountCode || '').trim();
  const validSubaccount = (rawSub.startsWith('ACCT_') && !rawSub.startsWith('ACCT_DIR_')) ? rawSub : undefined;

  const paystackSetupConfig: any = {
    key: publicKey,
    email: email,
    amount: amountKobo,
    currency: 'NGN',
    metadata: {
      custom_fields: [
        { display_name: 'Customer Name', variable_name: 'customer_name', value: options.customerName },
        { display_name: 'Customer Phone', variable_name: 'customer_phone', value: options.customerPhone },
        { display_name: 'Delivery Address', variable_name: 'delivery_address', value: options.customerAddress || 'N/A' },
        { display_name: 'Order Notes', variable_name: 'order_notes', value: options.orderNotes || '' }
      ]
    },
    callback: function (response: any) {
      options.onSuccess(response);
    },
    onClose: function () {
      if (options.onClose) {
        options.onClose();
      }
    }
  };

  // If vendor has an active Paystack subaccount, route 100% directly to vendor bank
  if (validSubaccount) {
    paystackSetupConfig.subaccount = validSubaccount;
  }

  const handler = window.PaystackPop.setup(paystackSetupConfig);
  handler.openIframe();
  return true;
};
