/**
 * File: src/pages/purchase/Expense.tsx
 * Expense — master/detail layout matching the reference design.
 * Left: list (search, sort, status/vendor filters, selection mode).
 * Right: form-style "Expense Details" view (Vendor/Category/Default Taxes/
 *        Payment Type/Attachment | Expense #/Currency/Date/Amount/Shipping/
 *        Description/Totals). FAB → inline Create Expense form; pencil → Edit.
 *        Vendor box has a search dropdown + add-vendor modal (as on Bill page).
 * An expense is a single categorized spend — no line items, no status badge.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useNavigate } from "react-router-dom";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney, parseMoney, CreateContactModal } from "@/lib/db";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { showToast } from "@/utils/toast";
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  Settings,
  Pencil,
  Mail,
  MoreVertical,
  Upload,
  FileText,
  X,
  Trash2,
  ChevronRight,
  ClipboardList,
  Calendar,
  Bold,
  Italic,
  Underline,
  Eye,
  MessageCircle,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
interface Expense {
  id: number;
  number: string;
  vendor: string;
  category: string;
  defaultTaxes: string;
  note: string;
  date: string;
  amount: string;
}

const expenses: Expense[] = [
  { id: 2, number: "#2", vendor: "SST", category: "Accountants", defaultTaxes: "Test Tax", note: "No Notes", date: "Jun 16, 2026", amount: "$0.00" },
  { id: 3, number: "#3", vendor: "SST", category: "Advisers", defaultTaxes: "", note: "No Notes", date: "Jul 28, 1978", amount: "$0.00" },
];

const sortFields = ["Name", "First Name", "Last Name", "Expense Date", "Expense #", "Category", "Amount"];
const sortDirections = ["Ascending", "Descending"];
const statusList = ["All", "Trash"];
const vendorList = ["bdcalling", "bipul company", "Ex aut sequi ad libe", "Explicabo Doloremqu", "Officiis ullam labor", "SSE", "SST"];
const categoryList = ["Accountants", "Advisers", "Advertising", "Bank Fees", "Office Supplies", "Travel", "Utilities", "Meals & Entertainment"];
const taxList = ["Test Tax", "new test tax", "VAT", "GST"];
const recurringList = ["Never", "Daily", "Weekly", "Monthly", "Yearly"];

/* ── Outside-click dropdown ────────────────────────────────────── */
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClass?: string;
}> = ({ trigger, children, align = "left", panelClass = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className={`absolute z-30 mt-2 min-w-[180px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/* ── Modal shell ───────────────────────────────────────────────── */
const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full flex justify-center">{children}</div>
    </div>
  );
};

/* ── Floating-label field ──────────────────────────────────────── */
const fieldCls = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
const FloatBox: React.FC<{ label?: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="relative fl-wrap">
    {label && <label className="fl-label">{label}</label>}
    {children}
  </div>
);
const FloatField: React.FC<{ label?: string; value?: string; placeholder?: string; icon?: React.ReactNode; readOnly?: boolean }> = ({ label, value, placeholder, icon, readOnly }) => (
  <FloatBox label={label}>
    <div className="relative">
      {/* read-only fields must track the selected record — controlled, not defaultValue */}
      {readOnly
        ? <input value={value ?? ""} placeholder={placeholder && placeholder !== label ? placeholder : " "} readOnly className={fieldCls} />
        : <input defaultValue={value} placeholder={placeholder && placeholder !== label ? placeholder : " "} className={fieldCls} />}
      {icon && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
    </div>
  </FloatBox>
);

/* ── Add Vendor modal (same as Bill page) ──────────────────────── */
const AddVendorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [same, setSame] = useState(false);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-4xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Add Vendor</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={onClose} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
          </div>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <FloatField label="Company Name" placeholder="Company Name" />
              <FloatField label="Reg. No" placeholder="Reg. No" />
              <FloatBox label="Tax ID">
                <div className="relative">
                  <input placeholder=" " className={fieldCls} />
                  <button className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Fetch Details</button>
                </div>
              </FloatBox>
              <div className="grid grid-cols-2 gap-4"><FloatField label="Business Phone" placeholder="Business Phone" /><FloatField label="Fax" placeholder="Fax" /></div>
            </div>
            <div className="space-y-6">
              <FloatField label="First Name" placeholder="First Name" />
              <FloatField label="Last Name" placeholder="Last Name" />
              <FloatField label="Email" placeholder="Email" />
              <div className="grid grid-cols-2 gap-4"><FloatField label="Mobile" placeholder="Mobile" /><FloatField label="Home Phone" placeholder="Home Phone" /></div>
              <div className="grid grid-cols-2 gap-4"><FloatField label="Birthday" placeholder="Birthday" icon={<Calendar className="w-4 h-4" />} /><FloatField label="Anniversary" placeholder="Anniversary" icon={<Calendar className="w-4 h-4" />} /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-900">Address</span><span className="text-xs text-gray-400">Billing</span></div>
            <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={same} onChange={() => setSame((v) => !v)} className="accent-blue-600" /> Same as Billing</label><span className="text-xs text-gray-400">Shipping</span></div>
            <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><FloatField placeholder="Street 1" /><FloatField placeholder="Street 2" /></div><div className="grid grid-cols-4 gap-2"><FloatField placeholder="Zip" /><FloatField placeholder="City" /><FloatField placeholder="State" /><FloatField placeholder="Country" /></div></div>
            <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><FloatField placeholder="Street 1" /><FloatField placeholder="Street 2" /></div><div className="grid grid-cols-4 gap-2"><FloatField placeholder="Zip" /><FloatField placeholder="City" /><FloatField placeholder="State" /><FloatField placeholder="Country" /></div></div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">Bank Details</div>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-gray-50">
                {[Bold, Italic, Underline].map((Ic, i) => <button key={i} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700"><Ic className="w-4 h-4" /></button>)}
                <span className="w-px h-5 bg-gray-300 mx-1" />
                <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200"><span className="w-4 h-4 rounded bg-gray-900 border border-gray-300" /></button>
                <select className="ml-1 text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"><option>10</option><option>14</option><option>18</option></select>
              </div>
              <textarea placeholder="Bank Details" className="w-full h-24 p-3 text-sm text-gray-800 outline-none resize-none" />
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; exp: Expense }> = ({ onClose, exp }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Expense {exp.number} from info</h3>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Send</button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <input placeholder="To" className="flex-1 bg-transparent text-sm outline-none" />
          <button className="text-xs text-gray-500 hover:text-gray-700">Cc &amp; Bcc</button>
        </div>
        <input defaultValue={`Expense ${exp.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {exp.vendor}</p>
          <p>Expense {exp.number}<br />Category: {exp.category}<br />Amount: {exp.amount}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Expense form (Create / Edit — live, per reference) ────────── */
const EXP_CATEGORIES = ["Fees", "Accountants", "Advisers", "Tax Preparers", "Bookkeepers", "Consultants", "Payroll", "Office Supplies", "Travel", "Utilities"];
const EXP_TAXES = [
  { id: 1, name: "new test tax", rate: 58 },
  { id: 2, name: "Test Tax", rate: 72 },
  { id: 3, name: "VAT", rate: 15 },
  { id: 4, name: "GST", rate: 5 },
];
const payTypes = ["Paypal", "Stripe", "Venmo", "Paypal Checkout", "Braintree", "Custom", "UPI", "Google Pay", "Apple Pay", "Square", "Razor Pay", "Cash"];
const recurringOptions = ["Never", "Daily", "Weekly", "Fortnightly", "Monthly", "BiMonthly", "Quarterly"];

/* Full-width field that opens a dropdown panel (select-style). */
const FieldSelect: React.FC<{ label?: string; display: React.ReactNode; children: (close: () => void) => React.ReactNode }> = ({ label, display, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      {label && <label className="absolute -top-2 left-2 px-1 bg-white text-[11px] text-gray-500 z-10">{label}</label>}
      <div onClick={() => setOpen((o) => !o)} className={`${fieldCls} flex items-center justify-between cursor-pointer`}>
        <span className="truncate">{display}</span><ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

const ExpenseFormLive: React.FC<{ initial?: any; onClose: () => void; onSaved: (id: number) => void }> = ({ initial, onClose, onSaved }) => {
  const vendors = useCollection<any>("vendors", "name");
  const [vendorId, setVendorId] = useState<number | null>(initial?.vendorId ?? null);
  /* vendor finder — same behavior as the Customer field on create invoice /
     sales receipt: type text, suggestions filter, pencil opens Create Vendor */
  const [vendorQuery, setVendorQuery] = useState("");
  const [venOpen, setVenOpen] = useState(false);
  const [addVendor, setAddVendor] = useState(false);
  const venRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (venRef.current && !venRef.current.contains(e.target as Node)) setVenOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const [taxIds, setTaxIds] = useState<Set<number>>(new Set(initial?.taxIds ?? []));
  const [inclusive, setInclusive] = useState(!!initial?.inclusive);
  const [taxSearch, setTaxSearch] = useState("");
  const [payType, setPayType] = useState(initial?.paymentType ?? "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [shipping, setShipping] = useState(initial?.shipping ? String(initial.shipping) : "");
  const [date, setDate] = useState(initial?.date ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  const [recurring, setRecurring] = useState(initial?.recurring ?? "Never");
  const [upTo, setUpTo] = useState(initial?.upTo ?? "");
  const [description, setDescription] = useState(initial?.notes ?? "");
  const [number] = useState(initial?.number?.replace("#", "") ?? "");

  const vendorName = vendorId != null ? vendors.find((v) => v.id === vendorId)?.name || "" : vendorQuery;
  const vendorMatches = vendors.filter((v) => v.name.toLowerCase().includes(vendorQuery.toLowerCase()));
  const amt = parseMoney(amount);
  const ship = parseMoney(shipping);
  const taxLines = EXP_TAXES.filter((t) => taxIds.has(t.id)).map((t) => ({ ...t, value: +((amt * t.rate) / 100).toFixed(2) }));
  const total = +(amt + ship + (inclusive ? 0 : taxLines.reduce((s, t) => s + t.value, 0))).toFixed(2);
  const toggleTax = (id: number) => setTaxIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async () => {
    if (!category.trim() || amt <= 0) { showToast("Category and amount are required", "warning"); return; }
    // Accept a picked suggestion OR free-typed text: create the vendor from the
    // typed name so the expense has a real contact (same as invoice customer).
    let vid = vendorId;
    if (vid == null && vendorQuery.trim()) {
      vid = (await repo.add("vendors", { name: vendorQuery.trim(), status: "Active", payable: 0 })) as number;
    }
    const rec = {
      vendorId: vid, category: category.trim(), taxIds: [...taxIds], inclusive, paymentType: payType,
      amount: amt, shipping: ship, total, date, recurring, upTo: recurring === "Never" ? "" : upTo,
      notes: description,
    };
    if (initial?.id) {
      await repo.update("expenses", initial.id, rec);
      showToast("Expense updated", "success");
      onSaved(initial.id);
    } else {
      const n = await nextNumber("expenses");
      const id = await repo.add("expenses", { number: "#" + n, ts: Date.now(), ...rec });
      showToast("Expense created", "success");
      onSaved(id);
    }
    onClose();
  };

  const catMatches = EXP_CATEGORIES.filter((c) => !category.trim() || c.toLowerCase().includes(category.toLowerCase()));
  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar m-2 bg-white border border-gray-300 shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300">
        <h1 className="text-lg font-semibold text-gray-900">{initial?.id ? "Edit Expense" : "Create Expense"}</h1>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Settings"><Settings className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={save} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
        {/* left column */}
        <div className="space-y-6">
          <div className="relative fl-wrap" ref={venRef}>
            <label className="fl-label">Vendor</label>
            <div className="relative">
              <input
                value={vendorName}
                onChange={(e) => { setVendorQuery(e.target.value); setVendorId(null); setVenOpen(true); }}
                onFocus={() => setVenOpen(true)}
                placeholder="Find or add a vendor"
                className={fieldCls}
              />
              <button onClick={() => setAddVendor(true)} title="Create Vendor" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            {venOpen && (
              <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                {vendorMatches.map((v) => (
                  <button key={v.id} onClick={() => { setVendorId(v.id); setVendorQuery(v.name); setVenOpen(false); }} className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">
                    {v.name} {v.id === vendorId && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                {vendorMatches.length === 0 && <div className="px-3 py-2.5 text-sm text-gray-400">None found — click the pencil to add</div>}
              </div>
            )}
          </div>
          {/* Category — type-ahead suggestions (reference) */}
          <div className="relative fl-wrap" ref={catRef}>
            <label className="fl-label">Category *</label>
            <input value={category} onFocus={() => setCatOpen(true)} onChange={(e) => { setCategory(e.target.value); setCatOpen(true); }} placeholder=" " className={fieldCls} />
            {catOpen && catMatches.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                {catMatches.map((c) => (
                  <button key={c} onClick={() => { setCategory(c); setCatOpen(false); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{c}</button>
                ))}
              </div>
            )}
          </div>
          {/* Default Taxes — multi-select checklist with search (reference) */}
          <FieldSelect label="Default Taxes" display={taxIds.size ? EXP_TAXES.filter((t) => taxIds.has(t.id)).map((t) => t.name).join(", ") : <span className="text-gray-400">Default Taxes</span>}>
            {() => (
              <>
                <div className="px-3 py-2 border-b border-gray-300">
                  <input value={taxSearch} onChange={(e) => setTaxSearch(e.target.value)} placeholder="Search Tax" className="w-full px-2 py-1.5 text-sm bg-gray-100 rounded focus:outline-none" />
                </div>
                {EXP_TAXES.filter((t) => t.name.toLowerCase().includes(taxSearch.toLowerCase())).map((t) => (
                  <button key={t.id} onClick={() => toggleTax(t.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">
                    <span className={`w-4.5 h-4.5 w-[18px] h-[18px] flex-shrink-0 rounded-[4px] border flex items-center justify-center ${taxIds.has(t.id) ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{taxIds.has(t.id) && <Check className="w-3 h-3 text-white" />}</span>
                    {t.name} {t.rate}%
                  </button>
                ))}
                <button onClick={() => setInclusive((v) => !v)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-200">
                  <span className={`w-[18px] h-[18px] flex-shrink-0 rounded-[4px] border flex items-center justify-center ${inclusive ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{inclusive && <Check className="w-3 h-3 text-white" />}</span>
                  Inclusive
                </button>
              </>
            )}
          </FieldSelect>
          {/* Payment Type (reference dropdown) */}
          <FieldSelect label="Payment Type" display={payType || <span className="text-gray-400">Payment Type</span>}>
            {(close) => payTypes.map((m) => (
              <button key={m} onClick={() => { setPayType(m); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{m} {m === payType && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </FieldSelect>
          <div>
            <label className="text-xs text-gray-500">Attachment</label>
            <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
              <button className="flex flex-col items-center gap-2 py-5 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
              <button className="flex flex-col items-center gap-2 py-5 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
            </div>
          </div>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <FloatField label="Expense #" value={number} placeholder="Auto" readOnly />
            <FloatField label="Currency" value="$ USD" readOnly />
            <FloatBox label="Expense Date">
              <div className="relative">
                <input value={date} onChange={(e) => setDate(e.target.value)} placeholder=" " className={fieldCls} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><Calendar className="w-4 h-4" /></span>
              </div>
            </FloatBox>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FloatBox label="Expense Amount *"><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder=" " className={fieldCls} /></FloatBox>
            <FloatBox label="Shipping Cost"><input value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder=" " className={fieldCls} /></FloatBox>
          </div>
          <div className={`grid gap-3 ${recurring !== "Never" ? "grid-cols-2" : "grid-cols-1"}`}>
            <FieldSelect label="Recurring" display={recurring}>
              {(close) => recurringOptions.map((r) => (
                <button key={r} onClick={() => { setRecurring(r); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{r} {r === recurring && <Check className="w-4 h-4 text-blue-600" />}</button>
              ))}
            </FieldSelect>
            {recurring !== "Never" && (
              <FloatBox label="Up to *">
                <div className="relative">
                  <input value={upTo} onChange={(e) => setUpTo(e.target.value)} placeholder=" " className={fieldCls} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><Calendar className="w-4 h-4" /></span>
                </div>
              </FloatBox>
            )}
          </div>
          <div><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full h-40 border border-gray-300 rounded-md p-3 text-sm outline-none resize-none focus:ring-1 focus:ring-blue-600" /></div>
          {/* live totals (reference) */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Expense Amount</span><span className="font-semibold text-gray-900">{fmtMoney(amt)}</span></div>
            {ship > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Shipping Cost</span><span className="font-semibold text-gray-900">{fmtMoney(ship)}</span></div>}
            {!inclusive && taxLines.map((t) => (
              <div key={t.id} className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>{t.name} {t.rate}% on {fmtMoney(amt)}</span><span>{fmtMoney(t.value)}</span></div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(total)}</span></div>
          </div>
        </div>
      </div>
      {addVendor && (
        <CreateContactModal
          collection="vendors"
          onClose={() => setAddVendor(false)}
          onSaved={(id: number, name: string) => { setVendorId(id); setVendorQuery(name); }}
        />
      )}
    </section>
  );
};

export const Expenses: React.FC = () => {
  const navigate = useNavigate();
  const dbExpenses = useCollection<any>("expenses");
  const dbVendors = useCollection<any>("vendors", "name");
  const vendorList = useMemo(() => dbVendors.map((v) => v.name), [dbVendors]);
  const expenses: Expense[] = useMemo(
    () => dbExpenses.slice().sort((a, b) => b.id - a.id).map((e) => ({
      id: e.id, number: e.number, vendor: dbVendors.find((v) => v.id === e.vendorId)?.name || "—",
      category: e.category || "—", defaultTaxes: e.defaultTaxes || "", note: e.notes || "No Notes",
      date: e.date, amount: fmtMoney(e.total ?? e.amount),
    })),
    [dbExpenses, dbVendors],
  );
  const [expModal, setExpModal] = useState(false);
  const [selectedId, setSelectedId] = useState(2);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);
  const [sortBy, setSortBy] = useState("Expense Date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "email">(null);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [dupOpen, setDupOpen] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = expenses.filter(
      (i) =>
        (vendorFilter === null || i.vendor === vendorFilter) &&
        (search.trim() === "" || i.vendor.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search) || i.category.toLowerCase().includes(search.toLowerCase())),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Amount") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Expense #") r = a.id - b.id;
      else if (sortBy === "Category") r = a.category.localeCompare(b.category);
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.vendor.localeCompare(b.vendor);
      else r = a.id - b.id; // Expense Date
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [expenses, sortBy, sortDir, vendorFilter, search]);

  const selected = expenses.find((i) => i.id === selectedId) || expenses[0];
  const selectedDb: any = dbExpenses.find((e) => e.id === (selected?.id ?? selectedId)) || {};
  const selectedVendor: any = dbVendors.find((v) => v.id === selectedDb.vendorId) || {};
  const expTotal = selectedDb.total ?? selectedDb.amount ?? 0;

  /* Resolve a customer for a vendor (reuse by name, else copy the vendor over). */
  const ensureCustomerFor = async (vendor: any): Promise<number> => {
    const customers = await repo.getAll("customers");
    const match = customers.find((c: any) => c.name === vendor.name);
    if (match) return match.id;
    const { id, createdAt, updatedAt, payable, ...rest } = vendor;
    return repo.add("customers", { ...rest, balance: 0, status: "Active" });
  };
  /* Build one invoice out of a set of expenses (one line item per expense). */
  const invoiceFromExpenses = async (rows: any[]) => {
    const ven = dbVendors.find((v) => v.id === rows[0]?.vendorId) || {};
    const customerId = await ensureCustomerFor(ven);
    const items = rows.map((e, i) => ({ id: i + 1, name: e.category || "Expense", qty: 1, rate: e.amount || 0, taxId: e.taxIds?.[0] || 1, discount: 0, amount: e.amount || 0 }));
    const subTotal = +rows.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2);
    const shipping = +rows.reduce((s, e) => s + (e.shipping || 0), 0).toFixed(2);
    const total = +rows.reduce((s, e) => s + (e.total ?? e.amount ?? 0), 0).toFixed(2);
    const n = await nextNumber("invoices");
    const id = await repo.add("invoices", {
      number: "#" + n, customerId, date: rows[0]?.date, due: rows[0]?.date, ts: Date.now(), status: "Draft",
      items, subTotal, tax: +(total - subTotal - shipping).toFixed(2), shipping,
      total, amountPaid: 0, amountDue: total, notes: rows[0]?.notes || "", terms: "",
    });
    showToast("Invoice created", "success");
    navigate("/sales/sales-invoice", { state: { selectedId: id } });
  };
  /* ⋮ Create Invoice — bill this expense to a customer matching the vendor. */
  const createInvoiceFromExpense = async () => {
    if (!selectedDb?.id) return;
    await invoiceFromExpenses([selectedDb]);
  };
  const duplicateExpense = async () => {
    const { id, number, createdAt, updatedAt, ...rest } = selectedDb;
    const n = await nextNumber("expenses");
    const newId = await repo.add("expenses", { ...rest, number: "#" + n, ts: Date.now() });
    setSelectedId(newId);
    showToast("Expense duplicated", "success");
  };
  const trashCurrent = async () => {
    await repo.remove("expenses", selectedDb.id);
    showToast(`Expense ${selectedDb.number} moved to trash`, "success");
    setSelectedId(expenses.find((e) => e.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };
  const trashSelectedExp = async () => {
    const ids = [...checked];
    await repo.removeMany("expenses", ids);
    showToast(`${ids.length} ${ids.length === 1 ? "expense" : "expenses"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(expenses.find((e) => !ids.includes(e.id))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  /* Selection-bar Create Invoice — one invoice from all checked expenses. */
  const createInvoiceFromSelected = async () => {
    if (checked.size === 0) { showToast("Select expenses to create an invoice", "warning"); return; }
    const rows = dbExpenses.filter((e) => checked.has(e.id));
    exitSelect();
    await invoiceFromExpenses(rows);
  };

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = expenses.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  if (!selected && mode !== "create") return <ListEmptyState title="No expenses yet" onCreate={() => setMode("create")} createLabel="New Expense" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Create Invoice" onClick={createInvoiceFromSelected} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><ClipboardList className="w-4 h-4" /></button>
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select expenses to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Expenses</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}

        {/* search */}
        <div className="px-3 py-2 border-b border-gray-300">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-300">
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
            {(close) => (
              <>
                {sortFields.map((o) => (
                  <button key={o} onClick={() => { setSortBy(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
                <div className="border-t border-gray-200 my-1" />
                {sortDirections.map((d) => (
                  <button key={d} onClick={() => { setSortDir(d); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{d} {d === sortDir && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
              </>
            )}
          </Dropdown>
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>
            {(close) => statusList.map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s === "Trash" ? statusFilter : s); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${s === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>{s} {s === statusFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Vendor{vendorFilter ? ` | ${vendorFilter.split(" ")[0]}` : " | All"}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => (
              <>
                <button onClick={() => { setVendorFilter(null); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">All Vendors {vendorFilter === null && <Check className="w-4 h-4 text-blue-600" />}</button>
                <div className="px-3 py-1.5 border-y border-gray-200">
                  <input placeholder="Search Vendor" className="w-full px-2 py-1 text-xs bg-gray-100 rounded focus:outline-none" />
                </div>
                {vendorList.map((c) => (
                  <button key={c} onClick={() => { setVendorFilter(c); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{c} {vendorFilter === c && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
              </>
            )}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((p) => {
            const active = !selectMode && mode === "view" && p.id === selectedId;
            const isChecked = checked.has(p.id);
            return (
              <button key={p.id} onClick={() => (selectMode ? toggleRow(p.id) : (setSelectedId(p.id), setMode("view")))}
                className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{p.vendor}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.number}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{p.note}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs text-gray-500">{p.date}</span>
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{p.amount}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{p.category}</span>
                </div>
              </button>
            );
          })}
          </div>
          {/* FAB → Create Expense */}
          {!selectMode && (
            <button onClick={() => setExpModal(true)} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{money(listTotal)}</div>
          <div className="text-xs text-gray-500">{filtered.length} Expenses</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {expModal ? (
        <ExpenseFormLive onClose={() => setExpModal(false)} onSaved={(id) => { setMode("view"); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} {checked.size === 1 ? "Expense" : "Expenses"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : mode !== "view" ? (
        <ExpenseFormLive initial={selectedDb} onClose={() => setMode("view")} onSaved={(id) => setSelectedId(id)} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          {/* detail header */}
          <div className="h-12 flex items-center justify-between px-6 border-b border-gray-300 bg-gray-100">
            <h1 className="text-base font-semibold text-gray-900 tracking-tight">Expense Details</h1>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setModal("settings")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Settings"><Settings className="w-4 h-4" /></button>
              <button onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Email"><Mail className="w-4 h-4" /></button>
              <button onClick={() => setMode("edit")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Edit"><Pencil className="w-4 h-4" /></button>
              {/* ⋮ menu (reference: Create Invoice / Duplicate ▸ As Expense / Trash) */}
              <Dropdown align="right" panelClass="min-w-[190px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                {(close) => (
                  <div className="py-1">
                    <button onClick={() => { createInvoiceFromExpense(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Create Invoice</button>
                    <div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}>
                      <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                      {dupOpen && (
                        <div className="absolute right-full top-0 mr-0.5 min-w-[150px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                          <button onClick={() => { duplicateExpense(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">As Expense</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button>
                  </div>
                )}
              </Dropdown>
            </div>
          </div>

          {/* read-only form view (live from the record) */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
            {/* left */}
            <div className="space-y-6">
              <FloatField label="Vendor" value={selected.vendor} readOnly />
              <FloatField label="Category *" value={selected.category} readOnly />
              <FloatField label="Default Taxes" value={(selectedDb.taxIds || []).length ? EXP_TAXES.filter((t) => selectedDb.taxIds.includes(t.id)).map((t) => t.name).join(", ") : selected.defaultTaxes || "—"} readOnly />
              <FloatField label="Payment Type" value={selectedDb.paymentType || "—"} readOnly />
              <div>
                <label className="text-xs text-gray-500">Attachment</label>
                <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                  <button className="flex flex-col items-center gap-2 py-5 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                  <button className="flex flex-col items-center gap-2 py-5 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
                </div>
              </div>
            </div>
            {/* right */}
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <FloatField label="Expense #" value={selected.number.replace("#", "")} readOnly />
                <FloatField label="Currency" value="$ USD" readOnly />
                <FloatField label="Expense Date" value={selected.date} icon={<Calendar className="w-4 h-4" />} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FloatField label="Expense Amount *" value={fmtMoney(selectedDb.amount || 0)} readOnly />
                <FloatField label="Shipping Cost" value={selectedDb.shipping ? fmtMoney(selectedDb.shipping) : "—"} readOnly />
              </div>
              <div className={`grid gap-3 ${selectedDb.recurring && selectedDb.recurring !== "Never" ? "grid-cols-2" : "grid-cols-1"}`}>
                <FloatField label="Recurring" value={selectedDb.recurring || "Never"} readOnly />
                {selectedDb.recurring && selectedDb.recurring !== "Never" && (
                  <FloatField label="Up to *" value={selectedDb.upTo || "—"} icon={<Calendar className="w-4 h-4" />} readOnly />
                )}
              </div>
              <FloatField label={selectedDb.notes ? "Description" : undefined} value={selectedDb.notes} placeholder="Description" readOnly />
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Expense Amount</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.amount || 0)}</span></div>
                {(selectedDb.shipping || 0) > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Shipping Cost</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.shipping)}</span></div>}
                {!selectedDb.inclusive && EXP_TAXES.filter((t) => (selectedDb.taxIds || []).includes(t.id)).map((t) => (
                  <div key={t.id} className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>{t.name} {t.rate}% on {fmtMoney(selectedDb.amount || 0)}</span><span>{fmtMoney(((selectedDb.amount || 0) * t.rate) / 100)}</span></div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(expTotal)}</span></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Expense" onClose={() => setModal(null)} />}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} exp={selected} />}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this expense?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these expenses?" onNo={() => setConfirmAction(null)} onYes={trashSelectedExp} />
      )}
    </div>
  );
};

export default Expenses;
