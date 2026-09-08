import React, { useEffect, useState } from "react";
import { toastEventTarget, ToastType } from "../../utils/toast";
import { CheckCircle, Info, AlertCircle, AlertTriangle, X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-white flex-shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />,
};

const colors: Record<ToastType, string> = {
  success: "bg-green-600",
  info: "bg-gray-800",
  error: "bg-red-600",
  warning: "bg-yellow-600",
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as {
        message: string;
        type: ToastType;
      };
      const id = Date.now();
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
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${colors[toast.type]}`}
        >
          {icons[toast.type]}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
            className="ml-1 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
