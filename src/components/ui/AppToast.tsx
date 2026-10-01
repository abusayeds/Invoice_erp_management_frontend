/**
 * File: src/components/ui/AppToast.tsx
 * The one and only notification format for the whole app — every success,
 * error, warning, and API error (backend or frontend) renders through this,
 * via `showAppToast()` (used internally by `src/utils/alert.ts` and
 * `src/utils/toast.ts`, which every page already calls).
 *
 * Stacked top-right with a bottom progress bar that depletes, then the toast
 * closes itself. Toasts never block the rest of the app.
 * - Errors/warnings stay up longer than successes so they can be read.
 * - Hovering a toast pauses its countdown; the X closes it immediately.
 * - An identical toast already on screen is restarted instead of stacked.
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type AppToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  type: AppToastType;
  title?: string;
  message: string;
};

const DURATION_MS: Record<AppToastType, number> = {
  success: 3500,
  info: 4500,
  warning: 6000,
  error: 6000,
};

const MAX_VISIBLE = 4;

let toasts: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  listeners.forEach((l) => l(toasts));
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Show one toast. Returns its id (usable with dismissAppToast, rarely needed). */
export function showAppToast(type: AppToastType, message: string, title?: string): string {
  const id = newId();
  const sameIdx = toasts.findIndex(
    (t) => t.type === type && t.message === message && t.title === title,
  );
  if (sameIdx >= 0) {
    // New id remounts the card, restarting its countdown in place.
    toasts = toasts.map((t, i) => (i === sameIdx ? { ...t, id } : t));
  } else {
    toasts = [...toasts, { id, type, message, title }].slice(-MAX_VISIBLE);
  }
  emit();
  return id;
}

export function dismissAppToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribeAppToasts(listener: (items: ToastItem[]) => void): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

const TYPE_STYLES: Record<AppToastType, { icon: React.ElementType; color: string }> = {
  success: { icon: CheckCircle2, color: "#22c55e" },
  error: { icon: XCircle, color: "#ef4444" },
  warning: { icon: AlertTriangle, color: "#f59e0b" },
  info: { icon: Info, color: "#3b82f6" },
};

const ToastCard: React.FC<{ item: ToastItem; onDismiss: (id: string) => void }> = ({
  item,
  onDismiss,
}) => {
  const [paused, setPaused] = useState(false);
  const { icon: Icon, color } = TYPE_STYLES[item.type];

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="app-toast-enter pointer-events-auto relative w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border shadow-lg"
      style={{
        background: "var(--surface)",
        borderColor: "var(--color-gray-300)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3 pr-9">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color }} />
        <div className="min-w-0 flex-1">
          {item.title && (
            <p className="text-sm font-semibold" style={{ color: "var(--color-base-900)" }}>
              {item.title}
            </p>
          )}
          <p className="text-sm leading-snug break-words" style={{ color: "var(--color-base-900)" }}>
            {item.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Close"
        title="Close"
        className="absolute right-2 top-2 rounded p-1 hover:bg-black/10"
        style={{ color: "var(--color-base-500)" }}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Countdown bar — CSS animation so hover can pause it; closes on finish. */}
      <div
        className="h-[3px] origin-left"
        onAnimationEnd={() => onDismiss(item.id)}
        style={{
          background: color,
          animation: `app-toast-countdown ${DURATION_MS[item.type]}ms linear forwards`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
};

/** Mount once at the app root. Renders every active toast, stacked top-right. */
export const AppToastContainer: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeAppToasts(setItems), []);

  if (items.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[300] flex flex-col items-end gap-2">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismissAppToast} />
      ))}
    </div>,
    document.body,
  );
};

export default AppToastContainer;
