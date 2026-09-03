import React, { useState } from "react";
import { Edit2, Trash2, Info, Plus } from "lucide-react";

/* ── Payment method logos as styled badges ─────────────────────── */
const PaypalLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-blue-700 px-1">
    <span className="text-white font-bold italic text-xs tracking-tight">PayPal</span>
  </div>
);
const StripeLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-indigo-600 px-1">
    <span className="text-white font-semibold text-xs tracking-wider lowercase">stripe</span>
  </div>
);
const VenmoLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-sky-500 px-1">
    <span className="text-white font-bold text-xs tracking-tight">venmo</span>
  </div>
);
const PaypalCheckoutLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-yellow-400 px-1">
    <span className="text-blue-900 font-bold italic text-xs">PayPal</span>
  </div>
);
const BraintreeLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-gray-900 px-1">
    <span className="text-white font-semibold text-[9px] tracking-tight">Braintree</span>
  </div>
);
const CustomLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-gray-200 border border-gray-300 px-1">
    <span className="text-gray-500 text-[9px] font-medium">Your Logo</span>
  </div>
);
const UpiLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded border border-gray-200 bg-white px-1">
    <span className="text-gray-400 font-bold text-xs tracking-widest">UPI</span>
  </div>
);
const GooglePayLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded border border-gray-200 bg-white px-2 gap-0.5">
    <span className="font-bold text-xs">
      <span className="text-blue-600">G</span>
      <span className="text-red-500">o</span>
      <span className="text-yellow-500">o</span>
      <span className="text-blue-600">g</span>
      <span className="text-green-500">le</span>
    </span>
    <span className="text-gray-800 font-semibold text-xs"> Pay</span>
  </div>
);
const ApplePayLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-black px-2 gap-1">
    <svg viewBox="0 0 14 17" className="w-3 h-3.5 fill-white flex-shrink-0">
      <path d="M13.2 5.8c-.1.1-2 1.2-2 3.6 0 2.8 2.4 3.8 2.5 3.8-.1.1-.4 1.3-1.2 2.6-.8 1.2-1.6 2.4-3 2.4-1.3 0-1.7-.8-3.2-.8-1.5 0-2 .8-3.2.8-1.3 0-2.2-1.2-3-2.4C0 14.2 0 10.7 0 10.1c0-4.4 2.9-6.7 5.7-6.7 1.5 0 2.7.9 3.6.9.9 0 2.3-1 3.9-1 .6 0 2.3.1 3.2 1.8l-3.2-.3zM9.1 2.4C9.7 1.7 10.1.7 10.1 0c0-.1 0-.1-.1-.1-1.4.1-3 .9-3.8 1.9-.6.7-1.1 1.7-1.1 2.7 0 .1.1.2.1.2 1.5-.1 3.1-1 3.9-2.3z"/>
    </svg>
    <span className="text-white font-semibold text-xs">Pay</span>
  </div>
);
const SquareLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded border border-gray-300 bg-white px-1 gap-1">
    <div className="w-3 h-3 border-2 border-gray-800 rounded-sm flex-shrink-0" />
    <span className="text-gray-800 font-bold text-[10px] tracking-tight">Square</span>
  </div>
);
const ZelleLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-purple-600 px-1">
    <span className="text-white font-bold text-xs tracking-tight">Zelle</span>
  </div>
);
const CashAppLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-green-500 px-1">
    <span className="text-white font-bold text-xs">$Cash</span>
  </div>
);
const AmexLogo = () => (
  <div className="flex items-center justify-center w-16 h-7 rounded bg-blue-500 px-1">
    <span className="text-white font-bold text-[9px] text-center leading-tight">American Express</span>
  </div>
);

/* ── Payment method data ─────────────────────────────────────────── */
interface PaymentMethod {
  id: string;
  name: string;
  logo: React.ReactNode;
  enabled: boolean;
  hasInfo?: boolean;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: "paypal", name: "Paypal", logo: <PaypalLogo />, enabled: false },
  { id: "stripe", name: "Stripe", logo: <StripeLogo />, enabled: false },
  { id: "venmo", name: "Venmo", logo: <VenmoLogo />, enabled: false },
  { id: "paypal-checkout", name: "Paypal Checkout", logo: <PaypalCheckoutLogo />, enabled: false },
  { id: "braintree", name: "Braintree", logo: <BraintreeLogo />, enabled: false },
  { id: "custom", name: "Custom", logo: <CustomLogo />, enabled: false },
  { id: "upi", name: "UPI", logo: <UpiLogo />, enabled: false, hasInfo: true },
  { id: "google-pay", name: "Google Pay", logo: <GooglePayLogo />, enabled: false },
  { id: "apple-pay", name: "Apple Pay", logo: <ApplePayLogo />, enabled: false },
  { id: "square", name: "Square", logo: <SquareLogo />, enabled: false },
  { id: "zelle", name: "Zelle", logo: <ZelleLogo />, enabled: false },
  { id: "cash-app", name: "Cash App", logo: <CashAppLogo />, enabled: false },
  { id: "amex", name: "American Express", logo: <AmexLogo />, enabled: false },
];

/* ── Modal ───────────────────────────────────────────────────────── */
interface PaymentMethodsModalProps {
  onClose: () => void;
}

export const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({ onClose }) => {
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);

  const toggleEnabled = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const deleteMethod = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  };

  const addMethod = () => {
    const name = "New Method";
    setMethods((prev) => [
      ...prev,
      { id: Date.now().toString(), name, logo: <CustomLogo />, enabled: false },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Payment Methods</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={method.enabled}
                onChange={() => toggleEnabled(method.id)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0 accent-blue-600"
              />

              {/* Logo */}
              <div className="flex-shrink-0">{method.logo}</div>

              {/* Name */}
              <span className="flex-1 text-sm text-gray-800">{method.name}</span>

              {/* Info icon (UPI only) */}
              {method.hasInfo && (
                <button className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <Info className="w-4 h-4" />
                </button>
              )}

              {/* Edit */}
              <button className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteMethod(method.id)}
                className="p-1.5 text-red-500 hover:text-red-700 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer - Add Payment Method */}
        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={addMethod}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <div className="w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center">
              <Plus className="w-3 h-3" />
            </div>
            Add Payment Method
          </button>
        </div>
      </div>
    </div>
  );
};
