/**
 * File: src/pages/purchase/Bills.tsx
 * Bill — master/detail layout matching the reference design.
 * Left: list (search, sort, status/vendor/date filters, selection mode).
 * Right: detail (action icons incl. $ payment + ⋮ menu, status badge, meta
 *        with Bill date + Due, line items, terms/notes/attachment, totals
 *        with Amount Due, ribbon). FAB opens an inline Create Bill form with
 *        a vendor search + add-vendor modal.
 * Modals: Add Payment, Add Vendor, Preview / Email / Settings.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney, parseMoney, CreateDocForm, DocPreview , PdfPreviewModal} from "@/lib/db";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { SignatureModal } from "@/components/modals/SignatureModal";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { SignatureRequestModal } from "@/components/modals/SignatureRequestModal";
import { ActivityLogModal } from "@/components/modals/ActivityLogModal";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { showToast } from "@/utils/toast";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Settings,
  ChevronUp,
  SlidersHorizontal,
  Pencil,
  PenTool,
  DollarSign,
  Eye,
  Printer,
  Mail,
  MoreVertical,
  Upload,
  FileText,
  Download,
  X,
  Trash2,
  MessageCircle,
  Calendar,
  CircleChevronUp,
  CircleChevronDown,
  Barcode,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Draft" | "Sent" | "Paid" | "Partially Paid" | "Overdue";

interface Bill {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  due: string;
  amount: string;
  status: Status;
}

const bills: Bill[] = [
  { id: 7, name: "Est lorem ut maxime", number: "#7", note: "hi, Mollit fugiat elit", date: "Jun 17, 2026", due: "Jun 17, 2026", amount: "$0.00", status: "Paid" },
  { id: 6, name: "bipul company", number: "#6", note: "hi, Mollit fugiat elit", date: "Jun 17, 2026", due: "Jun 17, 2026", amount: "$0.00", status: "Paid" },
  { id: 5, name: "SSE", number: "#5", note: "hi, Mollit fugiat elit", date: "Jun 16, 2026", due: "Jun 16, 2026", amount: "$0.00", status: "Draft" },
  { id: 4, name: "SSE", number: "#4", note: "Mollit fugiat elit", date: "Jun 16, 2026", due: "Jun 16, 2026", amount: "$0.00", status: "Draft" },
];

const sortFields = ["Name", "First Name", "Last Name", "Bill date", "Bill #", "Due Date", "Status", "Total"];
const sortDirections = ["Ascending", "Descending"];
const statusList: (Status | "All" | "Trash")[] = ["All", "Draft", "Sent", "Paid", "Partially Paid", "Overdue", "Trash"];
const paymentMethods = ["Paypal", "Stripe", "Venmo", "Paypal Checkout", "Braintree", "Custom", "UPI", "Google Pay", "Apple Pay", "Square"];
const duplicateAs = ["As Bill", "As Debit Note"];
const BILL_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
const BILL_TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const nowLabel = () => "Today " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const dateRanges = ["All", "Today", "This Week", "Last Week", "This Month", "Last 30 Days", "Last Month", "Last 90 Days", "This Year", "Last Year", "Date Range"];

const STATUS_BADGE: Record<Status, string> = {
  Draft: "bg-gray-600 text-white",
  Sent: "bg-gray-900 text-white",
  Paid: "bg-green-500 text-white",
  "Partially Paid": "bg-orange-500 text-white",
  Overdue: "bg-red-500 text-white",
};

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
const FloatField: React.FC<{ label: string; value?: string; placeholder?: string; icon?: React.ReactNode }> = ({ label, value, placeholder, icon }) => (
  <div className="relative fl-wrap">
    {label && <label className="fl-label">{label}</label>}
    <div className="relative">
      <input defaultValue={value} placeholder={placeholder && placeholder !== label ? placeholder : " "} className={fieldCls} />
      {icon && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
    </div>
  </div>
);

/* ── Add Vendor modal (from Create Bill vendor box pencil) ─────── */
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
              <div className="relative fl-wrap">
                <label className="fl-label">Tax ID</label>
                <div className="relative">
                  <input placeholder=" " className={fieldCls} />
                  <button className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Fetch Details</button>
                </div>
              </div>
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
            <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><FloatField label="" placeholder="Street 1" /><FloatField label="" placeholder="Street 2" /></div><div className="grid grid-cols-4 gap-2"><FloatField label="" placeholder="Zip" /><FloatField label="" placeholder="City" /><FloatField label="" placeholder="State" /><FloatField label="" placeholder="Country" /></div></div>
            <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><FloatField label="" placeholder="Street 1" /><FloatField label="" placeholder="Street 2" /></div><div className="grid grid-cols-4 gap-2"><FloatField label="" placeholder="Zip" /><FloatField label="" placeholder="City" /><FloatField label="" placeholder="State" /><FloatField label="" placeholder="Country" /></div></div>
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

/* ── Add Payment modal ($ icon) — persists via onSave ──────────── */
const PaymentModal: React.FC<{ onClose: () => void; bill: Bill; due: number; onSave: (amount: number, method: string, notes: string) => void }> = ({ onClose, bill, due, onSave }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);
  const [notes, setNotes] = useState("");
  const amt = parseFloat(amount) || 0;
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-lg my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Add Payment</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button
              onClick={() => amt > 0 && onSave(Math.min(amt, due), method, notes)}
              disabled={amt <= 0}
              className={`px-4 py-1.5 text-sm rounded-md ${amt <= 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >Save</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <FloatField label="Vendor" value={bill.name} />
          <div className="grid grid-cols-2 gap-3"><FloatField label="Payment date" value={new Date().toLocaleDateString("en-US")} icon={<Calendar className="w-4 h-4" />} />
            <div><label className="text-xs text-gray-500">Type</label><select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white">{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select></div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Amount</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setAmount(due.toFixed(2))} className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white text-right" />
            </div>
            <div className="text-xs text-gray-400 text-right mt-1">{fmtMoney(due)} Due</div>
          </div>
          <div><label className="text-xs text-gray-500">Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" /></div>
        </div>
      </div>
    </Overlay>
  );
};

/* ── BILL preview (white document) ─────────────────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; bill: Bill }> = ({ onClose, bill }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Bill {bill.number}</h3>
        <div className="flex items-center gap-1">
          {[Download, Printer, Mail].map((Ic, i) => (
            <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><Ic className="w-4 h-4" /></button>
          ))}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div style={{ background: "#fff", color: "#111" }} className="p-6">
        <div className="text-right text-sm italic text-gray-500">(Original)</div>
        <div className="border border-gray-300">
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">BILL</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
              <div className="font-bold text-sm mt-2">Vendor:</div>
              <div className="text-sm font-semibold">{bill.name}</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[["Bill #", bill.number.replace("#", "")], ["Bill date", bill.date], ["Due Date", bill.due], ["Amount Due", bill.amount]].map(([k, v]) => (
                  <tr key={k}><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <table className="w-full text-xs border-t border-gray-300">
            <thead>
              <tr>{["Sr. No.", "Items", "Quantity", "Rate", "Tax", "Amount"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr><td colSpan={6} className="border border-gray-300 px-2 py-6 text-center text-gray-400">No items</td></tr>
            </tbody>
          </table>
          <div className="flex justify-end px-4 py-3 text-sm">
            <table className="text-right">
              <tbody>
                <tr><td className="px-3 py-1 font-bold">Sub Total</td><td className="px-3 py-1">$0.00</td></tr>
                <tr><td className="px-3 py-1 font-bold">Total</td><td className="px-3 py-1">$0.00</td></tr>
                <tr className="border-t border-gray-300"><td className="px-3 py-1 font-bold">Amount Due</td><td className="px-3 py-1 font-bold">{bill.amount}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-300 text-sm">
            <div className="font-bold">Terms &amp; Conditions</div>
            <div className="text-gray-700">Perferendis ad vero</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; bill: Bill }> = ({ onClose, bill }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Bill {bill.number} from info</h3>
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
        <input defaultValue={`Bill ${bill.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {bill.name}</p>
          <p>Bill {bill.number}<br />Total Amount: {bill.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Bill {bill.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
export const Bills: React.FC = () => {
  const dbBills = useCollection<any>("bills");
  const dbVendors = useCollection<any>("vendors", "name");
  const vendorList = useMemo(() => dbVendors.map((v) => v.name), [dbVendors]);
  const bills: Bill[] = useMemo(
    () => dbBills.slice().sort((a, b) => b.id - a.id).map((b) => ({
      id: b.id, name: dbVendors.find((v) => v.id === b.vendorId)?.name || "—",
      number: b.number, note: b.notes || "Mollit fugiat elit", date: b.date, due: b.due,
      amount: fmtMoney(b.amountDue ?? b.total ?? 0), status: b.status,
    })),
    [dbBills, dbVendors],
  );
  // Opened from an activity link → pre-select that bill.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 7);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Bill date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "payment" | "pdfSettings">(null);
  const [createMode, setCreateMode] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigRequestOpen, setSigRequestOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = bills.filter(
      (i) =>
        (statusFilter === "All" || i.status === statusFilter) &&
        (vendorFilter === null || i.name === vendorFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Total") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Bill #") r = a.id - b.id;
      else if (sortBy === "Status") r = a.status.localeCompare(b.status);
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.name.localeCompare(b.name);
      else r = a.id - b.id; // Bill date / Due Date
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [bills, sortBy, sortDir, statusFilter, vendorFilter, search]);

  const selected = bills.find((i) => i.id === selectedId) || bills[0];
  const selectedDb: any = dbBills.find((d) => d.id === (selected?.id ?? selectedId)) || {};
  const selectedVendor: any = dbVendors.find((v) => v.id === selectedDb.vendorId) || {};

  /* Append an event to the bill's activity log. */
  const logActivity = async (kind: string, text: string) => {
    const rec = dbBills.find((d) => d.id === selectedDb.id);
    await repo.update("bills", selectedDb.id, { activity: [...(rec?.activity || []), { kind, text, ts: Date.now(), dateLabel: nowLabel() }] });
  };
  /** $ Add Payment — records a payments-made row and settles the bill. */
  const addPayment = async (amount: number, method: string, notes: string) => {
    const n = await nextNumber("paymentsMade");
    await repo.add("paymentsMade", { number: "#" + n, vendorId: selectedDb.vendorId, billId: selectedDb.id, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), ts: Date.now(), amount: +amount.toFixed(2), method, notes });
    const newDue = Math.max(0, +((selectedDb.amountDue || 0) - amount).toFixed(2));
    await repo.update("bills", selectedDb.id, {
      amountDue: newDue,
      amountPaid: +((selectedDb.amountPaid || 0) + amount).toFixed(2),
      status: newDue <= 0 ? "Paid" : "Partially Paid",
    });
    await logActivity("status", `Payment #${n} created to bill ${selectedDb.number?.replace("#", "")}.`);
    showToast("Payment added", "success");
    setModal(null);
  };
  /** Create a debit note from this bill (⋮ Debit Note / Duplicate ▸ As Debit Note). */
  const createDebitNote = async () => {
    const n = await nextNumber("debitNotes");
    const id = await repo.add("debitNotes", {
      number: "#" + n, vendorId: selectedDb.vendorId, date: selectedDb.date, due: selectedDb.due, ts: Date.now(),
      status: "Unused", items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0, tax: selectedDb.tax || 0,
      total: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "",
    });
    await logActivity("status", `Debit note created from Bill ${selectedDb.number}.`);
    showToast("Debit note created", "success");
    navigate("/purchase/debit-notes", { state: { selectedId: id } });
  };
  const duplicateBillAs = async (label: string) => {
    if (label === "As Debit Note") { await createDebitNote(); return; }
    const n = await nextNumber("bills");
    const id = await repo.add("bills", {
      number: "#" + n, vendorId: selectedDb.vendorId, date: selectedDb.date, due: selectedDb.due, ts: Date.now(),
      status: "Draft", items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0, tax: selectedDb.tax || 0,
      total: selectedDb.total || 0, amountPaid: 0, amountDue: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "",
    });
    setSelectedId(id);
    showToast("Bill duplicated", "success");
  };
  const trashCurrent = async () => {
    await repo.remove("bills", selectedDb.id);
    showToast(`Bill ${selectedDb.number} moved to trash`, "success");
    setSelectedId(bills.find((b) => b.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };
  const trashSelectedBills = async () => {
    const ids = [...checked];
    await repo.removeMany("bills", ids);
    showToast(`${ids.length} ${ids.length === 1 ? "bill" : "bills"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(bills.find((b) => !ids.includes(b.id))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    await repo.update("bills", selectedDb.id, { signature: data.image, signatureName: data.name, signatureTitle: data.title, signatureDate: data.date });
    await logActivity("status", `Vendor signature added to Bill ${selectedDb.number}.`);
    showToast("Signature saved", "success");
  };

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = bills.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const actionIcons: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: Settings, title: "Settings", onClick: () => setModal("settings") },
    { icon: expanded ? CircleChevronUp : CircleChevronDown, title: expanded ? "Collapse" : "Expand", onClick: () => setExpanded((v) => !v) },
    { icon: SlidersHorizontal, title: "PDF & Print Settings", onClick: () => setModal("pdfSettings") },
    { icon: Pencil, title: "Edit", onClick: () => selectedDb?.id && setEditRecord(selectedDb) },
    { icon: PenTool, title: "Vendor Signature", onClick: () => setSigOpen(true) },
    { icon: DollarSign, title: "Add Payment", onClick: () => setModal("payment") },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => { logActivity("printed", `Bill ${selectedDb.number} printed.`); setModal("preview"); } },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createMode) return <ListEmptyState title="No bills yet" onCreate={() => setCreateMode(true)} createLabel="New Bill" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select bills to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Bills</h2>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bills..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-nowrap items-center gap-2 px-3 py-2 border-b border-gray-300 overflow-x-auto hover-scrollbar" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>
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
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Vendor{vendorFilter ? ` | ${vendorFilter.split(" ")[0]}` : " | All"}<ChevronDown className="w-3 h-3" /></span>}>
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
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Bill date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => dateRanges.map((d) => (
              <button key={d} onClick={() => { setDateFilter(d); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{d} {d === dateFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((p) => {
            const active = !selectMode && !createMode && p.id === selectedId;
            const isChecked = checked.has(p.id);
            return (
              <button key={p.id} onClick={() => (selectMode ? toggleRow(p.id) : (setSelectedId(p.id), setCreateMode(false)))}
                className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.number}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{p.note}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs text-gray-500">{p.date}</span>
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{p.amount}</span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                </div>
              </button>
            );
          })}
          </div>
          {/* FAB → Create Bill */}
          {!selectMode && (
            <button onClick={() => setCreateMode(true)} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{money(listTotal)} <span className="font-normal text-gray-500">Due</span></div>
          <div className="text-xs text-gray-500">{filtered.length} Bills</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} {checked.size === 1 ? "Bill" : "Bills"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : createMode ? (
        <CreateDocForm collection="bills" title="Create Bill" party="vendors" buy amountDue onClose={() => setCreateMode(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editRecord ? (
        <CreateDocForm collection="bills" title="Edit Bill" party="vendors" buy amountDue record={editRecord} onClose={() => setEditRecord(null)} onSaved={(id) => { setEditRecord(null); setSelectedId(id); }} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
                <button className="text-xs text-blue-600 hover:text-blue-700 underline">{selectedVendor.contact || selectedVendor.email || "View Contact"}</button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                {/* ⋮ menu (reference: WhatsApp / Duplicate ▸ / Debit Note / Signature Request / Activity Log / Trash) */}
                <Dropdown align="right" panelClass="min-w-[200px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <div className="py-1">
                      <button onClick={() => { showToast("Opening WhatsApp…", "info"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button>
                      <div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {dupOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[160px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {duplicateAs.map((st) => (
                              <button key={st} onClick={() => { duplicateBillAs(st); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">{st}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { createDebitNote(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Debit Note</button>
                      <button onClick={() => { setSigRequestOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Signature Request</button>
                      <button onClick={() => { setActivityOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Activity Log</button>
                      <button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button>
                    </div>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* meta row — #, Bill date, Due, status badge (chevron toggle) */}
            {expanded && (
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
              <div className="flex items-center gap-12">
                <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                <div><div className="text-xs text-gray-500">Bill date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                <div><div className="text-xs text-gray-500">Due</div><div className="text-sm font-semibold text-gray-900">{selected.due}</div></div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
            </div>
            )}

            {/* line items */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left font-semibold px-5 py-2.5">Sr. No.</th>
                    <th className="text-left font-semibold px-2 py-2.5">Items</th>
                    <th className="text-right font-semibold px-2 py-2.5">Quantity</th>
                    <th className="text-right font-semibold px-2 py-2.5">Rate</th>
                    <th className="text-left font-semibold px-2 py-2.5">Tax</th>
                    <th className="text-right font-semibold px-2 py-2.5">Discount</th>
                    <th className="text-right font-semibold px-5 py-2.5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDb.items || []).length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No items</td></tr>
                  )}
                  {(selectedDb.items || []).map((it: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-300 align-top">
                      <td className="px-5 py-3 text-gray-700">{idx + 1}</td>
                      <td className="px-2 py-3"><div className="font-semibold text-gray-900">{it.name}</div>{it.description && <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{it.qty ?? 1}{it.unit ? ` ${it.unit}` : ""}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(it.rate)}</td>
                      <td className="px-2 py-3 text-gray-800">{BILL_TAX_NAME[it.taxId || 1]}</td>
                      <td className="px-2 py-3 text-right text-gray-500 text-xs">{it.discount ? `${it.discount}%` : "—"}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtMoney(it.amount ?? (it.qty || 0) * (it.rate || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* terms + notes + attachment + totals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Terms &amp; Conditions</label>
                  <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{selectedDb.terms || "—"}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Attachment</label>
                  <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                    <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                    <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Notes</label>
                <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{selectedDb.notes || "—"}</div>
              </div>
              <div className="border border-gray-200 rounded-md overflow-hidden self-start">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.subTotal)}</span></div>
                {(selectedDb.inlineDiscount || 0) > 0 && (
                  <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Inline Discount</span><span>{fmtMoney(selectedDb.inlineDiscount)}</span></div>
                )}
                {Object.entries(
                  ((selectedDb.items || []) as any[]).reduce((acc: Record<number, number>, it: any) => {
                    const base = it.amount ?? (it.qty || 0) * (it.rate || 0);
                    acc[it.taxId || 1] = (acc[it.taxId || 1] || 0) + base;
                    return acc;
                  }, {}),
                ).map(([taxId, base]) => (
                  <div key={taxId} className="flex justify-between px-4 py-2 text-xs text-gray-500">
                    <span>{BILL_TAX_NAME[Number(taxId)]} {BILL_TAX_RATE[Number(taxId)]}% on {fmtMoney(base as number)}</span>
                    <span>{fmtMoney(((base as number) * (BILL_TAX_RATE[Number(taxId)] || 0)) / 100)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-200"><span className="text-gray-700">Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.total)}</span></div>
                {(selectedDb.amountPaid || 0) > 0 && (
                  <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Amount Paid</span><span>{fmtMoney(selectedDb.amountPaid)}</span></div>
                )}
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Amount Due</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.amountDue)}</span></div>
              </div>
            </div>

            {/* saved signature (shows after Add Signature) */}
            <SignatureBlock record={selectedDb} label="Vendor Signature" />

            {/* status corner ribbon */}
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 text-[10px] font-semibold py-1 text-center ${STATUS_BADGE[selected.status]}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Bill" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbBills.find((x) => x.id === selectedId) || {}; const pp: any = dbVendors.find((x) => x.id === d.vendorId) || {}; const pn = pp.name || "—"; return <PdfPreviewModal docType="bill" recordId={d.id} title={`Bill `} onClose={() => setModal(null)} />; })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} bill={selected} />}
      {modal === "payment" && <PaymentModal onClose={() => setModal(null)} bill={selected} due={selectedDb.amountDue || 0} onSave={addPayment} />}
      {modal === "pdfSettings" && (
        <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="bill" />
      )}
      {sigOpen && (
        <SignatureModal
          heading="Vendor Signature"
          defaultName={selectedVendor.contact || selectedVendor.name || ""}
          onDone={saveSignature}
          onClose={() => setSigOpen(false)}
        />
      )}
      {sigRequestOpen && (
        <SignatureRequestModal
          docLabel="Bill"
          number={selectedDb.number || ""}
          customer={selectedVendor}
          onClose={() => setSigRequestOpen(false)}
          onSend={() => { logActivity("sent", `Signature request for Bill ${selectedDb.number} sent.`); showToast("Signature request sent", "success"); }}
        />
      )}
      {activityOpen && <ActivityLogModal docLabel="Bill" record={selectedDb} onClose={() => setActivityOpen(false)} />}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this bill?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these bills?" onNo={() => setConfirmAction(null)} onYes={trashSelectedBills} />
      )}
    </div>
  );
};

export default Bills;
