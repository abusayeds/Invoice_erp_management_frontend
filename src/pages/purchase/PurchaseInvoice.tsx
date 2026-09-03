/**
 * File: src/pages/purchase/PurchaseInvoice.tsx
 * Purchase Invoice — master/detail layout following our established flow
 * (vendor-side document, analog of Bill / Sales Invoice).
 * Left: list (search, sort, status/vendor/date filters, selection mode).
 * Right: detail (action icons incl. $ payment + ⋮ menu, status badge, meta
 *        with Invoice date + Due, line items header, terms/notes/attachment,
 *        totals with Amount Due, status ribbon). FAB opens an inline
 *        Create Purchase Invoice form with a vendor search + add-vendor modal.
 * Modals: Add Payment, Add Vendor, Preview (PURCHASE INVOICE) / Email / Settings.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { useCollection, money as fmtMoney, CreateDocModal, DocPreview } from "@/lib/db";
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
  Copy,
  Signature,
  History,
  Calendar,
  Barcode,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Draft" | "Sent" | "Paid" | "Partially Paid" | "Overdue";

interface Invoice {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  due: string;
  amount: string;
  status: Status;
}

const invoices: Invoice[] = [
  { id: 16, name: "bdcalling", number: "#16", note: "Mollit fugiat elit", date: "Jun 20, 2026", due: "Jun 27, 2026", amount: "$6,201.52", status: "Paid" },
  { id: 14, name: "Sed aliquip eaque co", number: "#14", note: "hi, Mollit fugiat elit", date: "Jun 18, 2026", due: "Jun 25, 2026", amount: "$9,093.88", status: "Partially Paid" },
  { id: 9, name: "Dignissimos quae ull", number: "#9", note: "Harum ut dolore", date: "Jun 12, 2026", due: "Jun 19, 2026", amount: "$4,472.00", status: "Overdue" },
  { id: 5, name: "SMT", number: "#5", note: "Mollit fugiat elit", date: "Apr 27, 2026", due: "Apr 27, 2026", amount: "$160.00", status: "Draft" },
];

const sortFields = ["Name", "First Name", "Last Name", "Invoice date", "Invoice #", "Due Date", "Status", "Total"];
const sortDirections = ["Ascending", "Descending"];
const statusList: (Status | "All" | "Trash")[] = ["All", "Draft", "Sent", "Paid", "Partially Paid", "Overdue", "Trash"];
const paymentMethods = ["Paypal", "Stripe", "Venmo", "Paypal Checkout", "Braintree", "Custom", "UPI", "Google Pay", "Apple Pay", "Square"];
const duplicateAs = ["As Purchase Invoice", "As Debit Note"];
const vendorList = ["bipul company", "Ex aut sequi ad libe", "Explicabo Doloremqu", "Officiis ullam labor", "SSE", "SST", "bdcalling", "SMT"];
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
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
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

/* ── Add Vendor modal ──────────────────────────────────────────── */
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
              </div>
              <textarea placeholder="Bank Details" className="w-full h-24 p-3 text-sm text-gray-800 outline-none resize-none" />
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

/* ── Add Payment modal ($ icon) ────────────────────────────────── */
const PaymentModal: React.FC<{ onClose: () => void; inv: Invoice }> = ({ onClose, inv }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-lg my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-semibold text-gray-900">Add Payment</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <FloatField label="Vendor" value={inv.name} />
        <div className="grid grid-cols-2 gap-3"><FloatField label="Payment date" value="6/21/2026" icon={<Calendar className="w-4 h-4" />} />
          <div><label className="text-xs text-gray-500">Type</label><select className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white">{paymentMethods.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Amount</label>
          <div className="flex items-center gap-2 mt-1">
            <button className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
            <input defaultValue={inv.amount.replace("$", "")} className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white text-right" />
          </div>
        </div>
        <div><label className="text-xs text-gray-500">Notes</label><textarea rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" /></div>
      </div>
    </div>
  </Overlay>
);

/* ── PURCHASE INVOICE preview (white document) ─────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; inv: Invoice }> = ({ onClose, inv }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Purchase Invoice {inv.number}</h3>
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
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">PURCHASE INVOICE</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
              <div className="font-bold text-sm mt-2">Vendor:</div>
              <div className="text-sm font-semibold">{inv.name}</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[["Invoice #", inv.number.replace("#", "")], ["Invoice date", inv.date], ["Due Date", inv.due], ["Amount Due", inv.amount]].map(([k, v]) => (
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
                <tr><td className="px-3 py-1 font-bold">Sub Total</td><td className="px-3 py-1">{inv.amount}</td></tr>
                <tr><td className="px-3 py-1 font-bold">Total</td><td className="px-3 py-1">{inv.amount}</td></tr>
                <tr className="border-t border-gray-300"><td className="px-3 py-1 font-bold">Amount Due</td><td className="px-3 py-1 font-bold">{inv.amount}</td></tr>
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
const EmailModal: React.FC<{ onClose: () => void; inv: Invoice }> = ({ onClose, inv }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Purchase Invoice {inv.number} from info</h3>
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
        <input defaultValue={`Purchase Invoice ${inv.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {inv.name}</p>
          <p>Purchase Invoice {inv.number}<br />Total Amount: {inv.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Purchase Invoice {inv.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Create Purchase Invoice (inline form, replaces detail) ────── */
const CreateInvoice: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [addVendor, setAddVendor] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const vref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (vref.current && !vref.current.contains(e.target as Node)) setVendorOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const matches = vendorList.filter((v) => v.toLowerCase().includes(vendorQuery.toLowerCase()));
  const rows = [{ no: 1, name: "", desc: "Description" }, { no: 2, name: "Service", desc: "Description" }];

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar m-2 bg-white border border-gray-300 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300 sticky top-0 bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-900">Create Purchase Invoice</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} title="Settings" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Barcode className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-5 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Save</button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative fl-wrap" ref={vref}>
            <label className="fl-label">Vendor *</label>
            <div className="relative">
              <input value={vendorQuery} onChange={(e) => { setVendorQuery(e.target.value); setVendorOpen(true); }} onFocus={() => setVendorOpen(true)} placeholder=" " className={fieldCls} />
              <button onClick={() => setAddVendor(true)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
            </div>
            {vendorOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                {matches.map((v) => (
                  <button key={v} onClick={() => { setVendorQuery(v); setVendorOpen(false); }} className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{v}</button>
                ))}
                {matches.length === 0 && <div className="px-3 py-2.5 text-sm text-gray-400">No vendor found</div>}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] text-gray-500">Address</label>
            <button className="w-full mt-0.5 flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-500"><span /> <ChevronDown className="w-4 h-4" /></button>
          </div>
          <FloatField label="Invoice #" value="17" />
          <FloatField label="Currency" value="$ USD" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <FloatField label="Invoice date *" value="6/21/2026" icon={<Calendar className="w-4 h-4" />} />
          <FloatField label="Due Date *" value="6/21/2026" icon={<Calendar className="w-4 h-4" />} />
          <FloatField label="" placeholder="Sub Title" />
          <div className="md:col-span-2"><FloatField label="" placeholder="Shipping Method" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="accent-blue-600" /> Discount before tax</label>
        </div>

        <div className="border border-gray-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left font-semibold px-4 py-2.5">Sr. No.</th>
                <th className="text-left font-semibold px-2 py-2.5">Items</th>
                <th className="text-right font-semibold px-2 py-2.5">Quantity</th>
                <th className="text-right font-semibold px-2 py-2.5">Rate</th>
                <th className="text-left font-semibold px-2 py-2.5">Tax</th>
                <th className="text-right font-semibold px-2 py-2.5">Discount</th>
                <th className="text-right font-semibold px-4 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.no} className="border-t border-gray-200 align-top">
                  <td className="px-4 py-3 text-gray-700">{r.no}</td>
                  <td className="px-2 py-3"><input placeholder={r.name || "Item"} className="w-full bg-transparent text-sm outline-none font-medium text-gray-900" /><input placeholder={r.desc} className="w-full bg-transparent text-xs outline-none text-gray-500 mt-1" /></td>
                  <td className="px-2 py-3 text-right"><input defaultValue="1" className="w-12 bg-transparent text-sm text-right outline-none" /></td>
                  <td className="px-2 py-3 text-right"><input placeholder="Rate" className="w-16 bg-transparent text-sm text-right outline-none" /></td>
                  <td className="px-2 py-3"><span className="inline-flex items-center gap-1 text-sm text-gray-600">new test tax , Te… <ChevronDown className="w-3.5 h-3.5" /></span></td>
                  <td className="px-2 py-3 text-right"><span className="inline-flex items-center gap-1 text-sm text-gray-400">Discount <span className="px-1 bg-gray-100 rounded text-gray-500">%</span></span></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">$0.00</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Product</button>
              <button className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Service</button>
            </div>
            <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Terms &amp; Conditions</label><textarea defaultValue="Perferendis ad vero" className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
            <div><label className="text-xs text-gray-500">Internal Notes</label><textarea placeholder="Internal Notes" className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
          </div>
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Notes</label><textarea defaultValue="Mollit fugiat elit" className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
            <div>
              <label className="text-xs text-gray-500">Attachment</label>
              <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-md overflow-hidden self-start">
            <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">$0.00</span></div>
            <div className="flex justify-between px-4 py-2 text-sm text-gray-500"><span>Discount</span><span className="text-gray-400">30 or 30%</span></div>
            <div className="flex justify-between px-4 py-2 text-sm text-gray-500"><span>Shipping Cost</span><span className="text-gray-400">Shipping Cost</span></div>
            <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-200"><span className="text-gray-700">Total</span><span className="font-semibold text-gray-900">$0.00</span></div>
            <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Amount Due</span><span className="font-semibold text-gray-900">$0.00</span></div>
          </div>
        </div>
      </div>

      {addVendor && <AddVendorModal onClose={() => setAddVendor(false)} />}
      {settingsOpen && <AppSettingsModal initialTab="Bill" onClose={() => setSettingsOpen(false)} />}
    </section>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const PurchaseInvoices: React.FC = () => {
  const [selectedId, setSelectedId] = useState(16);
  const [sortBy, setSortBy] = useState("Invoice date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "payment">(null);
  const [createMode, setCreateMode] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const dbInvoices = useCollection<any>("purchaseInvoices");
  const dbVendors = useCollection<any>("vendors", "name");
  const invoices: Invoice[] = useMemo(
    () => dbInvoices.slice().sort((a, b) => b.id - a.id).map((d) => ({
      id: d.id, name: dbVendors.find((v) => v.id === d.vendorId)?.name || "—",
      number: d.number, note: d.notes || "No Notes", date: d.date, due: d.due,
      amount: fmtMoney(d.amountDue ?? d.total ?? 0), status: d.status,
    })),
    [dbInvoices, dbVendors],
  );

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = invoices.filter(
      (i) =>
        (statusFilter === "All" || i.status === statusFilter) &&
        (vendorFilter === null || i.name === vendorFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Total") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Invoice #") r = a.id - b.id;
      else if (sortBy === "Status") r = a.status.localeCompare(b.status);
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.name.localeCompare(b.name);
      else r = a.id - b.id;
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [invoices, sortBy, sortDir, statusFilter, vendorFilter, search]);

  const selected = invoices.find((i) => i.id === selectedId) || invoices[0];

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = invoices.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
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
    { icon: ChevronUp, title: "Collapse" },
    { icon: SlidersHorizontal, title: "Adjust" },
    { icon: Pencil, title: "Edit" },
    { icon: PenTool, title: "Signature" },
    { icon: DollarSign, title: "Add Payment", onClick: () => setModal("payment") },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => setModal("preview") },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createMode) return <ListEmptyState title="No purchase invoices yet" onCreate={() => setCreateMode(true)} createLabel="New Purchase Invoice" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              {[Trash2, DollarSign, MessageCircle, Mail, Eye, Check].map((Ic, i) => (
                <button key={i} onClick={Ic === Check ? exitSelect : Ic === Eye ? () => setModal("preview") : undefined} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Ic className="w-4 h-4" /></button>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Purchase Invoices</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-b border-gray-300">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search purchase invoices..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

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
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Invoice date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => dateRanges.map((d) => (
              <button key={d} onClick={() => { setDateFilter(d); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{d} {d === dateFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
        </div>

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
          {!selectMode && (
            <button onClick={() => setCreateOpen(true)} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{money(listTotal)} <span className="font-normal text-gray-500">Due</span></div>
          <div className="text-xs text-gray-500">{filtered.length} Purchase Invoices</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} {checked.size === 1 ? "Purchase Invoice" : "Purchase Invoices"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : createMode ? (
        <CreateInvoice onClose={() => setCreateMode(false)} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                <Dropdown align="right" panelClass="w-60" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <>
                      <button onClick={close} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={() => setDupOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><span className="flex items-center gap-2"><Copy className="w-4 h-4 text-gray-400" /> Duplicate</span> <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                      {dupOpen && (
                        <div className="bg-gray-50">
                          {duplicateAs.map((s) => (
                            <button key={s} onClick={close} className="w-full px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 text-left">{s}</button>
                          ))}
                        </div>
                      )}
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><FileText className="w-4 h-4 text-gray-400" /> Convert to Debit Note</button>
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><Check className="w-4 h-4 text-gray-400" /> Mark as Sent</button>
                      <button onClick={() => setMarkPaidOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Mark as Paid <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                      {markPaidOpen && (
                        <div className="bg-gray-50 max-h-48 overflow-y-auto custom-scrollbar">
                          {paymentMethods.map((s) => (
                            <button key={s} onClick={close} className="w-full px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 text-left">{s}</button>
                          ))}
                        </div>
                      )}
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><Signature className="w-4 h-4 text-gray-400" /> Signature Request</button>
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><History className="w-4 h-4 text-gray-400" /> Activity Log</button>
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200"><Trash2 className="w-4 h-4" /> Trash</button>
                    </>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* meta row */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
              <div className="flex items-center gap-12">
                <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                <div><div className="text-xs text-gray-500">Invoice date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                <div><div className="text-xs text-gray-500">Due</div><div className="text-sm font-semibold text-gray-900">{selected.due}</div></div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
            </div>

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
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Terms &amp; Conditions</label>
                  <div className="mt-1 h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">Perferendis ad vero</div>
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
                <div className="mt-1 h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{selected.note}</div>
              </div>
              <div className="border border-gray-200 rounded-md overflow-hidden self-start">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{selected.amount}</span></div>
                <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-200"><span className="text-gray-700">Total</span><span className="font-semibold text-gray-900">{selected.amount}</span></div>
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Amount Due</span><span className="font-semibold text-gray-900">{selected.amount}</span></div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 text-[10px] font-semibold py-1 text-center ${STATUS_BADGE[selected.status]}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {modal === "settings" && <AppSettingsModal initialTab="Bill" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbInvoices.find((x) => x.id === selectedId) || {}; const pp: any = dbVendors.find((x) => x.id === d.vendorId) || {}; const pn = pp.name || "—"; return <DocPreview onClose={() => setModal(null)} headerTitle={`Purchase Invoice ${d.number || ""}`} docTitle="PURCHASE INVOICE" partyLabel="Vendor:" partyName={pn} party={pp} number={d.number || ""} date={d.date || ""} due={d.due} items={d.items} subTotal={d.subTotal} tax={d.tax} total={d.total} amountDue={d.amountDue} showAmountDue terms={d.terms} notes={d.notes} />; })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} inv={selected} />}
      {createOpen && <CreateDocModal collection="purchaseInvoices" title="Create Purchase Invoice" party="vendors" buy onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />}
      {modal === "payment" && <PaymentModal onClose={() => setModal(null)} inv={selected} />}
    </div>
  );
};

export default PurchaseInvoices;
