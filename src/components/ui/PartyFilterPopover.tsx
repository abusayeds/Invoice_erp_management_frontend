/**
 * Customer / Vendor filter chip with fixed panel (avoids list-panel clipping).
 * Panel is portaled to document.body so overflow ancestors cannot clip it.
 * Stores backend party `_id` and searches via fetchCustomers / fetchVendors.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Plus } from "lucide-react";
import { fetchCustomers } from "@/services/customersApi";
import { fetchVendors } from "@/services/vendorsApi";

type PartyKind = "customer" | "vendor";

export const PartyFilterPopover: React.FC<{
  kind: PartyKind;
  applied: string | null;
  appliedLabel?: string;
  onApply: (id: string | null, label?: string) => void;
}> = ({ kind, applied, appliedLabel, onApply }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const label = kind === "customer" ? "Customer" : "Vendor";
  const allLabel = kind === "customer" ? "All Customers" : "All Vendors";

  const partyQuery = useQuery({
    queryKey: [`${kind}-filter-popover`, q],
    queryFn: async () => {
      const params = { page: 1, limit: 100, searchTerm: q.trim() || undefined };
      return kind === "customer" ? fetchCustomers(params) : fetchVendors(params);
    },
    staleTime: 30_000,
  });
  const rows = partyQuery.data?.rows ?? [];

  const updatePosition = () => {
    if (!ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    setRect({ top: bounds.bottom + 8, left: bounds.left, width: Math.max(bounds.width, 256) });
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const sync = () => updatePosition();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  const selectedLabel =
    applied == null ? "All" : appliedLabel || rows.find((r: { _id: string }) => r._id === applied)?.name || "Selected";

  const panel =
    open && rect
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[80] flex max-h-[70vh] w-64 flex-col rounded-md border border-gray-200 bg-white shadow-xl"
            style={{ top: rect.top, left: rect.left, width: rect.width }}
          >
            <div className="p-2 border-b border-gray-300">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${label}`}
                className="w-full px-2.5 py-1.5 text-sm bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div className="hover-scrollbar flex-1 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  onApply(null);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                {allLabel}
                {applied == null && <Check className="w-4 h-4 text-blue-600" />}
              </button>
              {rows.map((row: { _id: string; name: string }) => (
                <button
                  key={row._id}
                  type="button"
                  onClick={() => {
                    onApply(row._id, row.name);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <span className="truncate">{row.name}</span>
                  {applied === row._id && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"
      >
        <Plus className="w-3 h-3" />
        {label} | {selectedLabel}
        <ChevronDown className="w-3 h-3" />
      </button>
      {panel}
    </div>
  );
};

export default PartyFilterPopover;
