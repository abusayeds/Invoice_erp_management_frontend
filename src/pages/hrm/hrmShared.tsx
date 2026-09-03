/**
 * File: src/pages/hrm/hrmShared.tsx
 * Shared UI bits for the HRM module redesign (Employees / Set Salary / Payroll)
 * — searchable select (matches the ERPGO dropdown-with-search reference),
 * initials avatar, field wrapper and chip helpers. Qayd blue theme.
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

/* ── initials avatar ───────────────────────────────────────────── */

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export function Avatar({ name, size = 9 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = AVATAR_COLORS[(name.charCodeAt(0) + name.length) % AVATAR_COLORS.length];
  return (
    <div
      className={`rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}
      style={{ width: size * 4, height: size * 4 }}
    >
      {initials}
    </div>
  );
}

/* ── labelled field wrapper ────────────────────────────────────── */

export function Field({
  label,
  required,
  children,
  hint,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

/* ── searchable select (reference: dropdown with search box) ───── */

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  disabledPlaceholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-left ${
          disabled
            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            : open
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-white"
              : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {disabled ? disabledPlaceholder || placeholder : value || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
          <div className="relative border-b border-gray-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  o === value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                }`}
              >
                {o}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── status chips ──────────────────────────────────────────────── */

export function chipCls(kind: string): string {
  switch (kind) {
    case "Completed":
    case "Active":
    case "Paid":
    case "Approved":
      return "bg-green-100 text-green-700";
    case "Draft":
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "Unpaid":
    case "Rejected":
      return "bg-red-100 text-red-600";
    case "Inactive":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export function Chip({ label }: { label: string }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${chipCls(label)}`}>
      {label}
    </span>
  );
}

/* ── breadcrumb bar (matches CRM pages) ────────────────────────── */

export function HrmBreadcrumb({
  trail,
  current,
  onNavigate,
}: {
  trail: { label: string; to?: string }[];
  current: string;
  onNavigate: (to: string) => void;
}) {
  return (
    <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {trail.map((t) => (
          <React.Fragment key={t.label}>
            <button
              onClick={() => t.to && onNavigate(t.to)}
              className={t.to ? "hover:text-gray-700" : "cursor-default"}
            >
              {t.label}
            </button>
            <span>›</span>
          </React.Fragment>
        ))}
        <span className="text-gray-900 font-medium">{current}</span>
      </div>
    </div>
  );
}

/* ── API label extraction ──────────────────────────────────────────
 * Backend records vary in which key holds the human-readable name
 * (name / type_name / warning_type / populated refs like
 * user_id: { name }). These helpers pick the first readable string and
 * never return a raw id — blank is preferred so callers can filter
 * empties and fall back to local lists instead of showing invisible
 * or id-only options. */
export const looksLikeId = (s: string) => /^[0-9a-f]{24}$/i.test(s) || /^\d+$/.test(s);

export function apiLabel(rec: any, keys: string[]): string {
  const readable = (v: any): string =>
    typeof v === "string" && v.trim() && !looksLikeId(v.trim()) ? v.trim() : "";
  for (const k of keys) {
    const v = rec?.[k];
    const direct = readable(v);
    if (direct) return direct;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const nk of ["name", "title", ...Object.keys(v)]) {
        if (nk === "_id" || nk.endsWith("_id")) continue;
        const nested = readable(v[nk]);
        if (nested) return nested;
      }
    }
  }
  // last resort: any readable field under a non-id, non-meta key
  for (const [k, v] of Object.entries(rec ?? {})) {
    if (k === "_id" || /_?ids?$/i.test(k) || /^(createdAt|updatedAt|status|color|isDeleted|isArchive)$/.test(k)) continue;
    const s = readable(v);
    if (s && !/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  }
  return "";
}
