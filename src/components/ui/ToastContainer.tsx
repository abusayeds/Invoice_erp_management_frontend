import React, { useEffect, useState } from "react";
import { toastEventTarget, ToastType } from "../../utils/toast";
import { CheckCircle, Info, AlertCircle, AlertTriangle, X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/**
 * Use fixed hex colors (not remapped gray/blue tokens). The app dark theme
 * inverts gray-*, so e.g. bg-gray-800 + text-white becomes unreadable.
 */
const STYLES: Record<
  ToastType,
  { bar: string; icon: string; bg: string; border: string; text: string }
> = {
  success: {
    bar: "#15803d",
    icon: "#15803d",
    bg: "#ecfdf5",
    border: "#86efac",
    text: "#14532d",
  },
  info: {
    bar: "#007aff",
    icon: "#007aff",
    bg: "#eff6ff",
    border: "#93c5fd",
    text: "#1e3a5f",
  },
  error: {
    bar: "#dc2626",
    icon: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    text: "#7f1d1d",
  },
  warning: {
    bar: "#d97706",
    icon: "#b45309",
    bg: "#fffbeb",
    border: "#fcd34d",
    text: "#78350f",
  },
};

const IconFor: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  info: Info,
  error: AlertCircle,
  warning: AlertTriangle,
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as {
        message: string;
        type: ToastType;
      };
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3500,
      );
    };
    toastEventTarget.addEventListener("toast", handler);
    return () => toastEventTarget.removeEventListener("toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-[min(100vw-2rem,22rem)] pointer-events-none">
      {toasts.map((toast) => {
        const s = STYLES[toast.type];
        const Icon = IconFor[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-lg shadow-xl text-sm font-medium overflow-hidden"
            style={{
              backgroundColor: s.bg,
              border: `1px solid ${s.border}`,
              color: s.text,
            }}
          >
            <span
              className="w-1.5 self-stretch flex-shrink-0"
              style={{ backgroundColor: s.bar }}
              aria-hidden
            />
            <div className="flex items-start gap-2.5 flex-1 py-3 pr-3 pl-1 min-w-0">
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: s.icon }} />
              <span className="flex-1 leading-snug break-words" style={{ color: s.text }}>
                {toast.message}
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="ml-1 flex-shrink-0 opacity-70 hover:opacity-100"
                style={{ color: s.text }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
