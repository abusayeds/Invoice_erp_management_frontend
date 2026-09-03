/**
 * File: src/pages/purchase/Vendors.tsx
 * Vendor page — master/detail layout matching the reference design.
 * Left: vendor list (search, sort, status / created-on filters, selection).
 * Right: detail with Overview / Details / Settings tabs + action icons
 *        (edit, Add Payment $, Statement) and an inline Edit Vendor form.
 * Modals: Add Payment (with Bills picker), Statement config → white preview.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useLocation, useNavigate } from "react-router-dom";
import { useCollection, repo, downloadDocPdf } from "@/lib/db";
import { TabSlide } from "@/components/ui/TabSlide";
import { RecentActivities } from "@/components/ui/RecentActivities";
import { showToast } from "@/utils/toast";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  Pencil,
  DollarSign,
  FileText,
  MoreVertical,
  Trash2,
  Copy,
  Mail,
  Upload,
  X,
  Download,
  Printer,
  Sparkles,
  Archive,
  Merge,
  ChevronRight,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

/* ── Data ──────────────────────────────────────────────────────── */
interface Vendor {
  id: number;
  name: string;
  contact: string;
  amount: number;
}

const vendors: Vendor[] = [
  { id: 1, name: "bipul company", contact: "bipul ali", amount: 0 },
  { id: 2, name: "Est lorem ut maxime", contact: "", amount: 0 },
  { id: 3, name: "Est officiis nihil", contact: "", amount: 0 },
  { id: 4, name: "Ex aut sequi ad libe", contact: "", amount: 0 },
  { id: 5, name: "Explicabo Doloremqu", contact: "", amount: 0 },
  { id: 6, name: "khan", contact: "a b", amount: 22358.28 },
  { id: 7, name: "mynul company", contact: "my", amount: 0 },
  { id: 8, name: "Officiis ullam labor", contact: "", amount: 0 },
  { id: 9, name: "SSE", contact: "Vandor 2", amount: 5425.12 },
  { id: 10, name: "SST", contact: "Vendors 1", amount: 480.0 },
  { id: 11, name: "Ut ut nulla voluptat", contact: "", amount: 0 },
];

const sortFields = ["Name", "First Name", "Last Name", "Created On", "Payable", "Total", "Due", "Paid"];
const createdOptions = ["All", "Today", "This Week", "This Month", "This Year"];
const activityFilters = ["All", "Created", "Updated", "Archived", "Bill", "Expense", "Payment"];

/* ── Helpers ───────────────────────────────────────────────────── */
const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <div className={`absolute z-30 mt-2 min-w-[170px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/* ── Detail "more" menu (Archive / Duplicate ▸ / Trash) ────────── */
const DetailMoreMenu: React.FC<{
  close: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onDuplicate: (target: "customer" | "vendor" | "both") => void;
}> = ({ close, onArchive, onTrash, onDuplicate }) => {
  const [subOpen, setSubOpen] = useState(false);
  const item = "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left";
  const run = (fn: () => void) => { fn(); close(); };
  return (
    <div>
      <button onClick={() => run(onArchive)} className={item}>
        <span className="flex items-center gap-2"><Archive className="w-4 h-4" /> Archive</span>
      </button>
      <div className="relative" onMouseLeave={() => setSubOpen(false)}>
        <button onClick={() => setSubOpen((o) => !o)} onMouseEnter={() => setSubOpen(true)} className={item}>
          <span className="flex items-center gap-2"><Copy className="w-4 h-4" /> Duplicate</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        {subOpen && (
          <div className="absolute right-full top-0 mr-1 min-w-[150px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
            {(["customer", "vendor", "both"] as const).map((t) => (
              <button key={t} onClick={() => run(() => onDuplicate(t))} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left capitalize">{t}</button>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => run(onTrash)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">
        <Trash2 className="w-4 h-4" /> Trash
      </button>
    </div>
  );
};

/* ── Merge Vendors modal (mirrors the customers merge flow) ────── */
const MergeVendorsModal: React.FC<{
  vendors: { id: number; name: string; contact: string }[];
  onClose: () => void;
  onMerge: (targetId: number) => void;
}> = ({ vendors, onClose, onMerge }) => {
  const [targetId, setTargetId] = useState<number | null>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Merge Vendors</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button
              onClick={() => targetId != null && onMerge(targetId)}
              disabled={targetId == null}
              className={`px-5 py-1.5 text-sm rounded-md font-medium ${targetId == null ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              Merge
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {vendors.map((c) => (
            <button key={c.id} onClick={() => setTargetId(c.id)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50">
              <span className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${targetId === c.id ? "border-blue-600" : "border-gray-400"}`}>
                {targetId === c.id && <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 truncate">{c.name}</span>
                {c.contact && <span className="block text-xs text-gray-500 truncate">{c.contact}</span>}
              </span>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-500">
          Select the vendor with which you wish to merge the rest of the vendors
        </div>
      </div>
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

/* ── Bills picker (opened from Add Payment) ────────────────────── */
const BillsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-xl my-12 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: 360 }}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-semibold text-gray-900">Bills</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Done</button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No Records</div>
      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
        <span className="w-5 h-5 flex-shrink-0 rounded-[5px] border border-gray-400" />
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-gray-900">$0.00 <span className="text-gray-500 font-normal">Due</span></div>
          <div className="text-xs text-gray-500">0 Bills</div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Add Payment modal ─────────────────────────────────────────── */
const PaymentModal: React.FC<{ onClose: () => void; vendor: string }> = ({ onClose, vendor }) => {
  const [billsOpen, setBillsOpen] = useState(false);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-lg my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Add Payment</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Save &amp; Send</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500">Payment #</label>
            <input defaultValue="998" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Vendor *</label>
            <input defaultValue={vendor} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Payment date *</label>
              <input type="date" defaultValue="2026-06-21" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Type *</label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white text-gray-500">
                {["Type", "Cash", "Bank", "Card", "Cheque"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Amount</label>
            <div className="flex items-center gap-2 mt-1">
              <button className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
              <input defaultValue="0.00" className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white text-right" />
            </div>
            <div className="text-xs text-gray-400 text-right mt-1">$0.00 Due</div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Internal Notes</label>
            <textarea rows={2} placeholder="Internal Notes" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Attachment</label>
            <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
              <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span>
                <span className="text-xs text-gray-600">Upload from Computer</span>
              </button>
              <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span>
                <span className="text-xs text-gray-600">Upload from Document</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-sm font-medium text-gray-800">Bills</span>
            <button onClick={() => setBillsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Pencil className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      {billsOpen && <BillsModal onClose={() => setBillsOpen(false)} />}
    </Overlay>
  );
};

/* ── Statement config modal ────────────────────────────────────── */
const StatementModal: React.FC<{ onClose: () => void; onGo: () => void }> = ({ onClose, onGo }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-md my-16 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-semibold text-gray-900">Statement</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onGo} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Go</button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
          {["All", "Outstanding", "Custom"].map((o) => <option key={o}>{o}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Start Date</label>
            <input type="date" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500">End Date</label>
            <input type="date" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <select className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
            {["All Transactions", "Bills", "Payments"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <select className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
            {["PDF", "CSV", "XLSX"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Statement preview (white document) ────────────────────────── */
interface StmtRow { date: string; details: string; amount: string; paid: string; balance: string }
const StatementPreview: React.FC<{ onClose: () => void; name: string; vendor: any; rows: StmtRow[]; summary: { amount: string; paid: string; balance: string }; onDownload?: () => void }> = ({ onClose, name, vendor, rows, summary, onDownload }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">{name}'s Statement</h3>
        <div className="flex items-center gap-1">
          {[Download, Printer, Mail].map((Ic, i) => (
            <button key={i} onClick={i === 0 ? onDownload : undefined} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><Ic className="w-4 h-4" /></button>
          ))}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div style={{ background: "#fff", color: "#111" }} className="p-6">
        <h1 className="text-center text-2xl font-bold mb-4">STATEMENT</h1>
        <div className="flex justify-between gap-6 mb-4">
          <div className="text-sm">
            <div className="font-bold">info</div>
            <div>Bangladesh</div>
            <div>info@inovoic.com</div>
            <div className="font-bold mt-2">Statement To:</div>
            <div className="font-semibold">{name}</div>
            {vendor?.contact && <div>{vendor.contact}</div>}
            {vendor?.email && <div>{vendor.email}</div>}
            {vendor?.phone && <div>Phone: {vendor.phone}</div>}
          </div>
          <table className="text-sm border-collapse h-fit">
            <tbody>
              {[["Amount", summary.amount], ["Paid", summary.paid], ["Balance", summary.balance], ["From", "Apr 27, 2026"], ["To", "Jun 22, 2026"]].map(([k, v]) => (
                <tr key={k}><td className="border border-gray-300 px-3 py-1 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>{["Date", "Details", "Amount", "Paid", "Balance"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr><td className="border border-gray-300 px-2 py-1.5">—</td><td className="border border-gray-300 px-2 py-1.5">Opening Balance</td><td className="border border-gray-300 px-2 py-1.5">$0.00</td><td className="border border-gray-300 px-2 py-1.5">$0.00</td><td className="border border-gray-300 px-2 py-1.5">$0.00</td></tr>
            {rows.length === 0 && <tr><td className="border border-gray-300 px-2 py-6 text-center text-gray-400" colSpan={5}>No transactions</td></tr>}
            {rows.map((r, i) => (
              <tr key={i}><td className="border border-gray-300 px-2 py-1.5">{r.date}</td><td className="border border-gray-300 px-2 py-1.5">{r.details}</td><td className="border border-gray-300 px-2 py-1.5">{r.amount}</td><td className="border border-gray-300 px-2 py-1.5">{r.paid}</td><td className="border border-gray-300 px-2 py-1.5">{r.balance}</td></tr>
            ))}
            <tr className="font-bold"><td className="border border-gray-300 px-2 py-1.5" colSpan={2}>Total</td><td className="border border-gray-300 px-2 py-1.5">{summary.amount}</td><td className="border border-gray-300 px-2 py-1.5">{summary.paid}</td><td className="border border-gray-300 px-2 py-1.5">{summary.balance}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </Overlay>
);

/* ── Toggle ────────────────────────────────────────────────────── */
const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button onClick={onChange} className={`w-9 h-5 rounded-full transition-colors relative ${on ? "bg-blue-600" : "bg-gray-300"}`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
  </button>
);

/* ── Vendor form (inline right panel — Create & Edit, per reference) ── */
const fieldCls = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
const VField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, placeholder, type = "text", disabled }) => (
  <div className="relative fl-wrap">
    <label className="fl-label">{label}</label>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder && placeholder !== label ? placeholder : " "}
      className={`${fieldCls} ${disabled ? "bg-gray-50 text-gray-400" : ""}`}
    />
  </div>
);

interface AddrForm { street1: string; street2: string; zip: string; city: string; state: string; country: string }
const emptyAddr = (a?: Partial<AddrForm>): AddrForm => ({
  street1: a?.street1 || "", street2: a?.street2 || "", zip: a?.zip || "",
  city: a?.city || "", state: a?.state || "", country: a?.country || "",
});

const VendorForm: React.FC<{
  title: string;
  initial?: any; // existing vendor DB record for edit; omit for create
  onClose: () => void;
  onSaved: (id: number) => void;
}> = ({ title, initial, onClose, onSaved }) => {
  const [tab, setTab] = useState<"Details" | "Settings">("Details");
  const [tabDir, setTabDir] = useState<"" | "left" | "right">("");
  const switchTab = (t: "Details" | "Settings") => {
    if (t === tab) return;
    setTabDir(t === "Settings" ? "right" : "left");
    setTab(t);
  };
  const init = initial || {};
  const contactParts = (init.contact || "").split(" ");
  const [sameAsBilling, setSameAsBilling] = useState(!!init.sameAsBilling);
  const [f, setF] = useState({
    name: init.name || "",
    firstName: init.firstName ?? (contactParts[0] || ""),
    lastName: init.lastName ?? (contactParts.slice(1).join(" ") || ""),
    email: init.email || "",
    regNo: init.regNo || "",
    taxId: init.taxId || "",
    businessPhone: init.businessPhone || init.phone || "",
    fax: init.fax || "",
    mobile: init.mobile || "",
    homePhone: init.homePhone || "",
    birthday: init.birthday || "",
    anniversary: init.anniversary || "",
    bankDetails: init.bankDetails || "",
    currency: init.currency || "$ USD",
    paymentTerms: init.paymentTerms || "Default Company",
  });
  const [billing, setBilling] = useState<AddrForm>(emptyAddr(init.billing));
  const [shipping, setShipping] = useState<AddrForm>(emptyAddr(init.shipping));
  const [reminder, setReminder] = useState(init.reminder ?? true);
  const [contactLogin, setContactLogin] = useState(init.contactLogin ?? false);
  const upd = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const contact = `${f.firstName} ${f.lastName}`.trim();
    const name = f.name.trim() || contact;
    if (!name) { showToast("Enter a company or contact name", "warning"); return; }
    const ship = sameAsBilling ? { ...billing } : shipping;
    const data = {
      name, contact, subtitle: contact,
      firstName: f.firstName.trim(), lastName: f.lastName.trim(),
      email: f.email.trim(),
      regNo: f.regNo.trim(), taxId: f.taxId.trim(),
      phone: f.businessPhone.trim(), businessPhone: f.businessPhone.trim(), fax: f.fax.trim(),
      mobile: f.mobile.trim(), homePhone: f.homePhone.trim(),
      birthday: f.birthday, anniversary: f.anniversary,
      billing, shipping: ship, sameAsBilling,
      bankDetails: f.bankDetails,
      currency: f.currency, paymentTerms: f.paymentTerms,
      reminder, contactLogin,
    };
    let id: number;
    if (init.id != null) {
      await repo.update("vendors", init.id, data);
      id = init.id;
      showToast("Vendor updated", "success");
    } else {
      id = await repo.add("vendors", { ...data, payable: 0, status: "Active" });
      showToast("Vendor created", "success");
    }
    onSaved(id);
    onClose();
  };

  const addrBlock = (a: AddrForm, set: React.Dispatch<React.SetStateAction<AddrForm>>, disabled = false) => {
    const u = (k: keyof AddrForm) => (v: string) => set((p) => ({ ...p, [k]: v }));
    return (
      <div className="space-y-4">
        <VField label="Street 1" value={a.street1} onChange={u("street1")} disabled={disabled} />
        <VField label="Street 2" value={a.street2} onChange={u("street2")} disabled={disabled} />
        <div className="grid grid-cols-3 gap-3">
          <VField label="Zip" value={a.zip} onChange={u("zip")} disabled={disabled} />
          <VField label="City" value={a.city} onChange={u("city")} disabled={disabled} />
          <VField label="State" value={a.state} onChange={u("state")} disabled={disabled} />
        </div>
        <VField label="Country" value={a.country} onChange={u("country")} disabled={disabled} />
      </div>
    );
  };

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
      {/* form header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"><Sparkles className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={save} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Save</button>
        </div>
      </div>
      {/* tabs */}
      <div className="flex items-center justify-center gap-8 border-b border-gray-300">
        {(["Details", "Settings"] as const).map((t) => (
          <button key={t} onClick={() => switchTab(t)} className={`py-3 text-sm transition-colors border-b-2 -mb-px ${tab === t ? "text-gray-900 font-medium border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}>{t}</button>
        ))}
      </div>

      <TabSlide tabKey={tab} dir={tabDir}>
      {tab === "Details" ? (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            {/* left col */}
            <div className="space-y-6">
              <VField label="Company Name" value={f.name} onChange={upd("name")} />
              <div className="grid grid-cols-2 gap-4"><VField label="Reg. No" value={f.regNo} onChange={upd("regNo")} /><VField label="Tax ID" value={f.taxId} onChange={upd("taxId")} /></div>
              <div className="grid grid-cols-2 gap-4"><VField label="Business Phone" value={f.businessPhone} onChange={upd("businessPhone")} /><VField label="Fax" value={f.fax} onChange={upd("fax")} /></div>
            </div>
            {/* right col */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4"><VField label="First Name" value={f.firstName} onChange={upd("firstName")} /><VField label="Last Name" value={f.lastName} onChange={upd("lastName")} /></div>
              <VField label="Email" value={f.email} onChange={upd("email")} type="email" />
              <div className="grid grid-cols-2 gap-4"><VField label="Mobile" value={f.mobile} onChange={upd("mobile")} /><VField label="Home Phone" value={f.homePhone} onChange={upd("homePhone")} /></div>
              <div className="grid grid-cols-2 gap-4"><VField label="Birthday" value={f.birthday} onChange={upd("birthday")} type="date" /><VField label="Anniversary" value={f.anniversary} onChange={upd("anniversary")} type="date" /></div>
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 pt-2">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-900">Address</span><span className="text-xs text-gray-400">Billing</span></div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={sameAsBilling} onChange={() => setSameAsBilling((v) => !v)} className="accent-blue-600" /> Same as Billing</label>
              <span className="text-xs text-gray-400">Shipping</span>
            </div>
            {addrBlock(billing, setBilling)}
            {addrBlock(sameAsBilling ? billing : shipping, setShipping, sameAsBilling)}
          </div>

          {/* Bank Details WYSIWYG */}
          <div className="pt-2">
            <div className="text-sm font-semibold text-gray-900 mb-2">Bank Details</div>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-gray-50">
                {[Bold, Italic, Underline].map((Ic, i) => <button key={i} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700"><Ic className="w-4 h-4" /></button>)}
                <span className="w-px h-5 bg-gray-300 mx-1" />
                <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200"><span className="w-4 h-4 rounded bg-gray-900 border border-gray-300" /></button>
                <select className="ml-1 text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"><option>10</option><option>14</option><option>16</option><option>18</option><option>24</option></select>
              </div>
              <textarea value={f.bankDetails} onChange={(e) => upd("bankDetails")(e.target.value)} placeholder="Bank Details" className="w-full h-28 p-3 text-sm text-gray-800 outline-none resize-none" />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-6">
            <VField label="Currency" value={f.currency} onChange={upd("currency")} />
            <VField label="Payment Terms (Purchases)" value={f.paymentTerms} onChange={upd("paymentTerms")} />
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between max-w-sm"><span className="text-sm text-gray-700">Payment Reminder</span><Toggle on={reminder} onChange={() => setReminder((v) => !v)} /></div>
            <div className="flex items-center justify-between max-w-sm"><span className="text-sm text-gray-700">Contact Login</span><Toggle on={contactLogin} onChange={() => setContactLogin((v) => !v)} /></div>
          </div>
        </div>
      )}
      </TabSlide>
    </section>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const Vendors: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // When navigated here from a "Duplicate ▸ Vendor" action, pre-select that vendor.
  const navSelectedId = (location.state as { selectedId?: number } | null)?.selectedId;
  const dbVendors = useCollection<any>("vendors", "name");
  const dbBills = useCollection<any>("bills");
  const dbPaymentsMade = useCollection<any>("paymentsMade");
  const dbExpenses = useCollection<any>("expenses");
  const vendors: Vendor[] = useMemo(
    () => dbVendors
      .filter((v) => v.status !== "Archived")
      .map((v) => ({ id: v.id, name: v.name, contact: v.contact || v.email || v.subtitle || "—", amount: -(v.payable || 0) })),
    [dbVendors],
  );
  // Create Vendor renders as an inline right panel (per reference), not a modal.
  const [createMode, setCreateMode] = useState(false);
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 1);
  useEffect(() => { if (navSelectedId != null) { setSelectedId(navSelectedId); setEditMode(false); } }, [navSelectedId]);
  const [tab, setTab] = useState<"Overview" | "Details" | "Settings">("Overview");
  const [sortBy, setSortBy] = useState("Name");
  const [createdOn, setCreatedOn] = useState("All");
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("All");
  const [modal, setModal] = useState<null | "payment" | "statement" | "preview">(null);
  // selection-bar bulk actions: merge picker → confirm alert / archive / delete alerts
  const [selAction, setSelAction] = useState<null | "merge" | "mergeConfirm" | "archive" | "delete">(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  // pending duplicate that needs the "already exists" confirmation ("vendor" or "both")
  const [dupConfirm, setDupConfirm] = useState<null | "vendor" | "both">(null);
  const [editMode, setEditMode] = useState(false);
  // Overview records section selector (reference: Expenses ▾ → Expenses / Bill / Payment Made)
  const [recordsType, setRecordsType] = useState<"Expenses" | "Bill" | "Payment Made">("Expenses");
  const [reminder, setReminder] = useState(true);
  const [contactLogin, setContactLogin] = useState(false);

  // selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    let list = vendors.filter((c) => search.trim() === "" || (c.name || "").toLowerCase().includes(search.toLowerCase()));
    list = [...list].sort((a, b) =>
      sortBy === "Payable" || sortBy === "Total" || sortBy === "Due" || sortBy === "Paid"
        ? b.amount - a.amount
        : (a.name || "").localeCompare(b.name || ""),
    );
    return list;
  }, [vendors, search, sortBy]);

  const selected = vendors.find((c) => c.id === selectedId) || vendors[0];
  const listDue = vendors.reduce((s, c) => s + (c.amount < 0 ? -c.amount : 0), 0);
  // Resolve the DB record for the row actually displayed — selectedId can go stale
  // after archive/trash, which would otherwise leave selectedDb = {}.
  const selectedDb: any = dbVendors.find((v) => v.id === (selected?.id ?? selectedId)) || {};
  const venBills = dbBills.filter((b) => b.vendorId === selectedId);
  const venPayments = dbPaymentsMade.filter((p) => p.vendorId === selectedId);
  const venExpenses = dbExpenses.filter((x) => x.vendorId === selectedId);
  const venPayable = venBills.reduce((s, b) => s + (b.amountDue || 0), 0);
  const venTotal = venBills.reduce((s, b) => s + (b.total || 0), 0);
  const venPaid = venPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const stmtTx = [
    ...venBills.map((b) => ({ ts: b.ts || 0, date: b.date, details: `Bill ${b.number}`, amount: b.total || 0, paid: 0 })),
    ...dbPaymentsMade.filter((p) => p.vendorId === selectedId).map((p) => ({ ts: p.ts || 0, date: p.date, details: `Payment ${p.number}`, amount: 0, paid: p.amount || 0 })),
  ].sort((a, b) => a.ts - b.ts);
  let _bal = 0;
  const stmtRows = stmtTx.map((t) => { _bal += t.amount - t.paid; return { date: t.date, details: t.details, amount: money(t.amount), paid: money(t.paid), balance: money(_bal) }; });
  const stmtSummary = { amount: money(stmtTx.reduce((s, t) => s + t.amount, 0)), paid: money(stmtTx.reduce((s, t) => s + t.paid, 0)), balance: money(_bal) };

  /* ── More-menu actions ─────────────────────────────────────────── */
  const removeSelected = async () => {
    const id = selected?.id ?? selectedId;
    if (!id) return;
    await repo.remove("vendors", id);
    const remaining = vendors.filter((c) => c.id !== id);
    setSelectedId(remaining[0]?.id ?? 0);
    setEditMode(false);
  };
  // Archive keeps the record (status: Archived) but drops it from the list.
  const archiveSelectedOne = async () => {
    const id = selected?.id ?? selectedId;
    if (!id) return;
    await repo.update("vendors", id, { status: "Archived" });
    const remaining = vendors.filter((c) => c.id !== id);
    setSelectedId(remaining[0]?.id ?? 0);
    setEditMode(false);
  };

  /* ── Selection-bar bulk actions (merge / archive / delete + alerts) ── */
  const checkedIds = [...checked];
  const afterBulk = (removedIds: number[]) => {
    const remaining = vendors.filter((c) => !removedIds.includes(c.id));
    if (removedIds.includes(selectedId)) setSelectedId(remaining[0]?.id ?? 0);
    exitSelect();
    setSelAction(null);
  };
  const bulkArchive = async () => {
    await Promise.all(checkedIds.map((id) => repo.update("vendors", id, { status: "Archived" })));
    showToast(`${checkedIds.length} ${checkedIds.length === 1 ? "vendor" : "vendors"} archived`, "success");
    afterBulk(checkedIds);
  };
  const bulkDelete = async () => {
    await repo.removeMany("vendors", checkedIds);
    showToast(`${checkedIds.length} ${checkedIds.length === 1 ? "vendor" : "vendors"} deleted`, "success");
    afterBulk(checkedIds);
  };
  /** Merge: re-point every reference of the losing vendors to the target,
   *  combine payables, then remove the losers — fully relational. */
  const bulkMerge = async (targetId: number) => {
    const losers = checkedIds.filter((id) => id !== targetId);
    const refCollections = ["bills", "purchaseOrders", "purchaseInvoices", "purchaseReturns", "paymentsMade", "debitNotes", "expenses"] as const;
    for (const col of refCollections) {
      const rows = await repo.getAll(col);
      await Promise.all(rows.filter((r: any) => losers.includes(r.vendorId)).map((r: any) => repo.update(col, r.id, { vendorId: targetId })));
    }
    const all = await repo.getAll("vendors");
    const extra = losers.reduce((s, id) => s + (all.find((v: any) => v.id === id)?.payable || 0), 0);
    const target = all.find((v: any) => v.id === targetId);
    await repo.update("vendors", targetId, { payable: (target?.payable || 0) + extra });
    await repo.removeMany("vendors", losers);
    showToast("Vendors merged", "success");
    afterBulk(losers);
    setSelectedId(targetId);
  };
  // Copy the full vendor record into a new vendors row (same company name).
  const duplicateAsVendor = async (): Promise<number> => {
    const { id, createdAt, updatedAt, ...rest } = selectedDb;
    return repo.add("vendors", { ...rest });
  };
  // Copy the full vendor record into the customers collection.
  const duplicateAsCustomer = async (): Promise<number> => {
    const { id, createdAt, updatedAt, payable, ...rest } = selectedDb;
    return repo.add("customers", { ...rest, balance: payable || 0, status: rest.status || "Active" });
  };
  const goToCustomer = (customerId: number) => navigate("/sales/customers", { state: { selectedId: customerId } });
  const handleDuplicate = async (target: "customer" | "vendor" | "both") => {
    if (!selectedDb?.name) return; // nothing valid to duplicate
    if (target === "customer") {
      goToCustomer(await duplicateAsCustomer());
      return;
    }
    // vendor + both create a vendor copy → confirm first ("name already exists").
    setDupConfirm(target);
  };
  const confirmDuplicate = async () => {
    const target = dupConfirm;
    setDupConfirm(null);
    if (!target || !selectedDb?.name) return;
    const newId = await duplicateAsVendor();
    if (target === "both") goToCustomer(await duplicateAsCustomer());
    else setSelectedId(newId);
  };

  const allSelected = filtered.length > 0 && filtered.every((c) => checked.has(c.id));
  const selectedVendors = vendors.filter((c) => checked.has(c.id));
  const totals = {
    total: selectedVendors.reduce((s, c) => s + Math.abs(c.amount), 0),
    paid: 0,
    due: selectedVendors.reduce((s, c) => s + Math.abs(c.amount), 0),
  };
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((c) => c.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const tabs: ("Overview" | "Details" | "Settings")[] = ["Overview", "Details", "Settings"];
  // Directional push: moving to a higher tab enters from the right, lower from the left.
  const [tabDir, setTabDir] = useState<"" | "left" | "right">("");
  const switchTab = (t: (typeof tabs)[number]) => {
    if (t === tab) return;
    setTabDir(tabs.indexOf(t) > tabs.indexOf(tab) ? "right" : "left");
    setTab(t);
  };

  if (!selected && !createMode)
    return (
      <div className="flex h-full bg-[#FAFBFC] items-center justify-center">
        <button onClick={() => setCreateMode(true)} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Vendor</button>
      </div>
    );

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>
              {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            <div className="flex items-center gap-0.5">
              <button
                title="Merge"
                onClick={() => (checked.size < 2 ? showToast("Select at least two vendors to merge", "warning") : setSelAction("merge"))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
              ><Merge className="w-4 h-4" /></button>
              <button
                title="Archive"
                onClick={() => (checked.size === 0 ? showToast("Select vendors to archive", "warning") : setSelAction("archive"))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
              ><Archive className="w-4 h-4" /></button>
              <button
                title="Delete"
                onClick={() => (checked.size === 0 ? showToast("Select vendors to delete", "warning") : setSelAction("delete"))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
              ><Trash2 className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Vendors</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select vendors"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}

        {/* search */}
        <div className="px-3 py-2 border-b border-gray-300">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-nowrap items-center gap-2 px-3 py-2 border-b border-gray-300 overflow-x-auto hover-scrollbar" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
            {(close) => sortFields.map((o) => (
              <button key={o} onClick={() => { setSortBy(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 cursor-pointer hover:border-gray-400"><Plus className="w-3 h-3" />Status</span>
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Created On | {createdOn}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => createdOptions.map((o) => (
              <button key={o} onClick={() => { setCreatedOn(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === createdOn && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((c) => {
            const active = !selectMode && c.id === selectedId;
            const isChecked = checked.has(c.id);
            return (
              <button key={c.id} onClick={() => (selectMode ? toggleRow(c.id) : (setSelectedId(c.id), setEditMode(false), setCreateMode(false)))}
                className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-center gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                  {c.contact && <div className="text-xs text-gray-500 mt-0.5 truncate">{c.contact}</div>}
                </div>
                {c.amount > 0 && <span className="text-sm font-medium flex-shrink-0 text-gray-900">{money(c.amount)}</span>}
              </button>
            );
          })}
          </div>
          {/* FAB */}
          {!selectMode && (
            <button onClick={() => { setCreateMode(true); setEditMode(false); }} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600" title="Create Vendor"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{money(listDue)} <span className="font-normal text-gray-500">Due</span></div>
          <div className="text-xs text-gray-500">{filtered.length} Contacts</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} {checked.size === 1 ? "Contact" : "Contacts"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(totals.total)}</span>
              <span className="text-gray-500">Paid</span><span className="font-semibold text-green-500">{money(totals.paid)}</span>
              <span className="text-gray-500">Due</span><span className="font-semibold text-red-500">{money(totals.due)}</span>
            </div>
          </div>
        </section>
      ) : createMode ? (
        <VendorForm title="Create Vendor" onClose={() => setCreateMode(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editMode ? (
        <VendorForm title="Edit Vendor" initial={selectedDb} onClose={() => setEditMode(false)} onSaved={(id) => setSelectedId(id)} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          {/* detail header */}
          <div className="h-12 flex items-center justify-between px-6 border-b border-gray-300 bg-gray-100">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{selected.name}</h1>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setEditMode(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setModal("payment")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Add Payment"><DollarSign className="w-4 h-4" /></button>
              <button onClick={() => setModal("statement")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Statement"><FileText className="w-4 h-4" /></button>
              <Dropdown align="right" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="More"><MoreVertical className="w-4 h-4" /></span>}>
                {(close) => (
                  <DetailMoreMenu close={close} onArchive={archiveSelectedOne} onTrash={removeSelected} onDuplicate={handleDuplicate} />
                )}
              </Dropdown>
            </div>
          </div>

          {/* tabs */}
          <div className="flex items-center justify-center gap-8 border-b border-gray-300">
            {tabs.map((t) => (
              <button key={t} onClick={() => switchTab(t)} className={`py-3 text-sm transition-colors border-b-2 -mb-px ${tab === t ? "text-gray-900 font-medium border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}>{t}</button>
            ))}
          </div>

          {/* tab body — directional push transition */}
          <TabSlide tabKey={tab} dir={tabDir}>

          {/* ── Overview ── */}
          {tab === "Overview" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-4 divide-x divide-gray-200">
                {[
                  { label: "Payable Amount", value: money(-venPayable), color: "text-gray-900" },
                  { label: "Net Profit", value: money(venTotal - venPayable), color: "text-gray-900" },
                  { label: "Bills", value: money(venTotal), color: "text-gray-900" },
                  { label: "Payment Made", value: money(venPaid), color: "text-gray-900" },
                ].map((c) => (
                  <div key={c.label} className="text-center py-2">
                    <div className={`text-xs font-medium mb-1 ${c.label === "Payable Amount" ? "text-red-500" : "text-gray-500"}`}>{c.label}</div>
                    <div className={`text-lg font-semibold ${c.color}`}>{c.value}</div>
                  </div>
                ))}
              </div>

              {/* Records: Expenses ▾ / Bill / Payment Made (reference selector) */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3">
                  <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">{recordsType} <ChevronDown className="w-4 h-4 text-gray-500" /></span>}>
                    {(close) => (["Expenses", "Bill", "Payment Made"] as const).map((o) => (
                      <button key={o} onClick={() => { setRecordsType(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === recordsType && <Check className="w-4 h-4 text-blue-600" />}</button>
                    ))}
                  </Dropdown>
                </div>
                {(() => {
                  const rows =
                    recordsType === "Expenses"
                      ? venExpenses.map((x) => ({ id: `x${x.id}`, title: x.category || `Expense ${x.number}`, sub: x.date, right: money(x.amount || 0), status: "" }))
                      : recordsType === "Bill"
                        ? venBills.map((b) => ({ id: `b${b.id}`, title: `Bill ${b.number}`, sub: b.date, right: money(b.total || 0), status: b.status || "" }))
                        : venPayments.map((p) => ({ id: `p${p.id}`, title: `Payment ${p.number}`, sub: p.date, right: money(p.amount || 0), status: p.method || "" }));
                  return rows.length === 0 ? (
                    <div className="px-4 pb-10 pt-6 text-center text-sm text-gray-400">No Records</div>
                  ) : (
                    <div>
                      {rows.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{r.sub}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-gray-900">{r.right}</div>
                            {r.status && <div className="text-xs text-gray-500 mt-0.5">{r.status}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Recent Activities */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900">Recent Activities</h3>
                  <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600">{activityFilter} <ChevronDown className="w-3.5 h-3.5" /></span>}>
                    {(close) => activityFilters.map((o) => <button key={o} onClick={() => { setActivityFilter(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === activityFilter && <Check className="w-4 h-4 text-blue-600" />}</button>)}
                  </Dropdown>
                </div>
                <RecentActivities vendorId={selected.id} filter={activityFilter} />
              </div>
            </div>
          )}

          {/* ── Details ── */}
          {tab === "Details" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                {[
                  ["Company", selectedDb.name || selected.name],
                  ["Reg. No", selectedDb.regNo || "—"], ["Tax ID", selectedDb.taxId || "—"],
                  ["Business Phone", selectedDb.businessPhone || selectedDb.phone || "—"], ["Fax", selectedDb.fax || "—"],
                  ["First Name", selectedDb.firstName || (selectedDb.contact || "").split(" ")[0] || "—"], ["Last Name", selectedDb.lastName || (selectedDb.contact || "").split(" ").slice(1).join(" ") || "—"], ["Email", selectedDb.email || "—"],
                  ["Mobile Number", selectedDb.mobile || "—"], ["Home Phone", selectedDb.homePhone || "—"],
                  ["Birthday", selectedDb.birthday || "—"], ["Anniversary", selectedDb.anniversary || "—"],
                ].map(([k, v]) => (
                  <div key={k}><div className="text-xs text-gray-500">{k}</div><div className="text-sm font-semibold text-gray-900 mt-0.5">{v}</div></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                {(["Billing Address", "Shipping Address"] as const).map((label, i) => {
                  const a = i === 0 ? selectedDb.billing : selectedDb.shipping;
                  const line1 = [a?.street1, a?.street2].filter(Boolean).join(", ");
                  const line2 = [a?.city, a?.state, a?.country, a?.zip].filter(Boolean).join(", ");
                  return (
                    <div key={label}>
                      <div className="text-xs text-gray-500 mb-1">{label}</div>
                      <div className="text-sm text-gray-800 leading-relaxed">
                        {line1 || line2 ? (<>{line1}{line1 && line2 && <br />}{line2}</>) : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm font-semibold text-gray-900 mb-2">Bank Details</div>
                <div className="text-sm text-gray-800 whitespace-pre-line">{selectedDb.bankDetails || "—"}</div>
              </div>
            </div>
          )}

          {/* ── Settings ── */}
          {tab === "Settings" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6 max-w-2xl">
                <div><div className="text-xs text-gray-500">Currency</div><div className="text-sm font-semibold text-gray-900 mt-0.5">{selectedDb.currency || "$ USD"}</div></div>
                <div><div className="text-xs text-gray-500">Payment Terms (Purchases)</div><div className="text-sm font-semibold text-gray-900 mt-0.5">{selectedDb.paymentTerms || "Default Company"}</div></div>
              </div>
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between max-w-sm">
                  <span className="text-sm text-gray-700">Payment Reminder</span>
                  <Toggle on={reminder} onChange={() => setReminder((v) => !v)} />
                </div>
                <div className="flex items-center justify-between max-w-sm">
                  <span className="text-sm text-gray-700">Contact Login</span>
                  <Toggle on={contactLogin} onChange={() => setContactLogin((v) => !v)} />
                </div>
              </div>
            </div>
          )}
          </TabSlide>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "payment" && <PaymentModal onClose={() => setModal(null)} vendor={selected.name} />}
      {modal === "statement" && <StatementModal onClose={() => setModal(null)} onGo={() => setModal("preview")} />}
      {modal === "preview" && <StatementPreview onClose={() => setModal(null)} name={selected.name} vendor={selectedDb} rows={stmtRows} summary={stmtSummary} onDownload={() => downloadDocPdf({ filename: `${selected.name} Statement`, docTitle: "STATEMENT", partyLabel: "Statement To", partyLines: [selected.name, selectedDb.contact, selectedDb.email, selectedDb.phone].filter(Boolean) as string[], meta: [["Amount", stmtSummary.amount], ["Paid", stmtSummary.paid], ["Balance", stmtSummary.balance], ["From", "Apr 27, 2026"], ["To", "Jun 22, 2026"]], itemHead: ["Date", "Details", "Amount", "Paid", "Balance"], itemRows: [["—", "Opening Balance", "$0.00", "$0.00", "$0.00"], ...stmtRows.map((r) => [r.date, r.details, r.amount, r.paid, r.balance]), ["", "Total", stmtSummary.amount, stmtSummary.paid, stmtSummary.balance]] })} />}
      {(selAction === "merge" || selAction === "mergeConfirm") && (
        <MergeVendorsModal
          vendors={vendors.filter((c) => checked.has(c.id))}
          onClose={() => { setSelAction(null); setMergeTargetId(null); }}
          onMerge={(id) => { setMergeTargetId(id); setSelAction("mergeConfirm"); }}
        />
      )}
      {selAction === "mergeConfirm" && mergeTargetId != null && (
        <ConfirmAlert
          message="Are you sure want to merge these vendors?"
          onNo={() => setSelAction("merge")}
          onYes={() => bulkMerge(mergeTargetId)}
        />
      )}
      {selAction === "archive" && (
        <ConfirmAlert message="Are you sure want to archive these vendors?" onNo={() => setSelAction(null)} onYes={bulkArchive} />
      )}
      {selAction === "delete" && (
        <ConfirmAlert message="Are you sure want to delete these vendors?" onNo={() => setSelAction(null)} onYes={bulkDelete} />
      )}
      {dupConfirm && (
        <Overlay onClose={() => setDupConfirm(null)}>
          <div className="w-full max-w-sm my-40 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <p className="text-sm text-gray-800 text-center mb-6">Contact with this company name already exists. Create anyway?</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setDupConfirm(null)} className="px-5 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">No</button>
                <button onClick={confirmDuplicate} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Yes</button>
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
};

export default Vendors;
