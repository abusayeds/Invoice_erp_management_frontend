/**
 * File: src/pages/sales/Customers.tsx
 * Customer page — master/detail layout matching the reference design.
 * Left: customer list (search, sort, filter chips, selection mode).
 * Right: detail with Overview / Details / Settings tabs + action icons
 *        (edit, Add Payment, Statement, more) and their modals.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useLocation, useNavigate } from "react-router-dom";
import { useCollection, repo, downloadDocPdf } from "@/lib/db";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  DollarSign,
  FileText,
  MoreVertical,
  Trash2,
  Archive,
  Copy,
  Mail,
  Eye,
  Upload,
  X,
  Download,
  Printer,
  MessageCircle,
  Sparkles,
  Calendar,
  Bold,
  Italic,
  Underline,
  SlidersHorizontal,
  Merge,
} from "lucide-react";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { PdfDocPreview } from "@/lib/db/PdfDocPreview";
import { usePdfSettings, getPdfSettings } from "@/lib/db/pdfSettings";
import { TabSlide } from "@/components/ui/TabSlide";
import { RecentActivities } from "@/components/ui/RecentActivities";
import { showToast } from "@/utils/toast";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Data ──────────────────────────────────────────────────────── */
interface Customer {
  id: number;
  name: string;
  contact: string;
  amount: number;
}

// Customers now come live from the shared datastore (see component below).

const chartData = [
  { name: "Jan '26", Sales: 0, Overdue: 0, Paid: 0 },
  { name: "Feb '26", Sales: 0, Overdue: 0, Paid: 0 },
  { name: "Mar '26", Sales: 0, Overdue: 0, Paid: 0 },
  { name: "Apr '26", Sales: 0, Overdue: 0, Paid: 0 },
  { name: "May '26", Sales: 0, Overdue: 0, Paid: 0 },
  { name: "Jun '26", Sales: 0, Overdue: 0, Paid: 0 },
];

const sortFields = ["Name", "First Name", "Last Name", "Created On", "Outstanding", "Total", "Due", "Paid"];
const createdOptions = ["All", "Today", "This Week", "This Month", "This Year"];
const activityFilters = ["All", "Created", "Updated", "Archived", "Draft", "Sent", "Invoiced"];

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

/* ── Add Payment modal ─────────────────────────────────────────── */
const PaymentModal: React.FC<{ onClose: () => void; customer: string }> = ({ onClose, customer }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-lg my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900">Add Payment</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Save &amp; Send</button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-500">Customer</label>
          <input defaultValue={customer} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Date</label>
            <input type="date" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Type</label>
            <select className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
              {["Cash", "Bank", "Card", "Cheque"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Amount</label>
          <div className="flex items-center gap-2 mt-1">
            <button className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
            <input defaultValue="6201.52" className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Notes</label>
          <textarea rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Internal Notes</label>
          <textarea rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" />
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
      </div>
    </div>
  </Overlay>
);

/* ── Statement config modal ────────────────────────────────────── */
const StatementModal: React.FC<{ onClose: () => void; onGo: () => void }> = ({ onClose, onGo }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-md my-16 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
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
        <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
          {["All Transactions", "Invoices", "Payments"].map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
          {["PDF", "CSV", "Excel"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
    </div>
  </Overlay>
);

/* ── Statement preview (settings-driven live document) ─────────── */
const StatementPreview: React.FC<{
  onClose: () => void;
  name: string;
  partyId: number;
  onOpenSettings: () => void;
  onDownload?: () => void;
}> = ({ onClose, name, partyId, onOpenSettings, onDownload }) => {
  const settings = usePdfSettings("statement", "normal");
  const printRef = useRef<HTMLDivElement>(null);

  /** Browser print dialog — prints from a connected printer, or offers
   *  "Save as PDF" when no printer is available (native dialog behaviour). */
  const print = () => {
    const html = printRef.current?.innerHTML || "";
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${name}'s Statement</title></head><body style="margin:0;background:#fff">${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.onafterprint = () => w.close(); }, 300);
  };

  const actions: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: SlidersHorizontal, title: "PDF settings", onClick: onOpenSettings },
    { icon: Download, title: "Download", onClick: onDownload },
    { icon: Printer, title: "Print", onClick: print },
    { icon: Mail, title: "Email" },
    { icon: MessageCircle, title: "WhatsApp" },
  ];

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
          <h3 className="text-base font-medium">{name}'s Statement</h3>
          <div className="flex items-center gap-1">
            {actions.map((a) => (
              <button key={a.title} onClick={a.onClick} title={a.title} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><a.icon className="w-4 h-4" /></button>
            ))}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div ref={printRef} className="bg-gray-200">
          <PdfDocPreview docType="statement" mode="normal" settings={settings} partyId={partyId} />
        </div>
      </div>
    </Overlay>
  );
};

/* ── Merge Customers modal (reference flow) ────────────────────── */
const MergeCustomersModal: React.FC<{
  customers: { id: number; name: string; contact: string }[];
  onClose: () => void;
  onMerge: (targetId: number) => void;
}> = ({ customers, onClose, onMerge }) => {
  const [targetId, setTargetId] = useState<number | null>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Merge Customers</h3>
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
          {customers.map((c) => (
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
          Select the customer with which you wish to merge the rest of the customers
        </div>
      </div>
    </div>
  );
};

/* ── Toggle ────────────────────────────────────────────────────── */
const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button onClick={onChange} className={`w-9 h-5 rounded-full transition-colors relative ${on ? "bg-blue-600" : "bg-gray-300"}`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
  </button>
);

/* ── Calendar date-picker popover (matches the reference) ──────── */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const CalendarPopover: React.FC<{ value: string; onPick: (v: string) => void; onClose: () => void }> = ({ value, onPick, onClose }) => {
  const parsed = value && !Number.isNaN(Date.parse(value)) ? new Date(value) : new Date();
  const [view, setView] = useState(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const isSel = (d: number) => value && !Number.isNaN(Date.parse(value)) && parsed.getDate() === d && parsed.getMonth() === view.getMonth() && parsed.getFullYear() === view.getFullYear();
  const nav = (delta: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  return (
    <div ref={ref} className="absolute right-0 top-full z-40 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => nav(-1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
          <button onClick={() => nav(1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-gray-500 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center">
        {cells.map((d, i) => d === null
          ? <span key={i} />
          : (
            <button key={i}
              onClick={() => { onPick(fmtDate(new Date(view.getFullYear(), view.getMonth(), d))); onClose(); }}
              className={`w-8 h-8 mx-auto my-0.5 rounded-full text-sm transition-colors ${isSel(d) ? "border border-blue-600 text-blue-700 font-semibold" : "text-gray-800 hover:bg-gray-100"}`}>
              {d}
            </button>
          ))}
      </div>
    </div>
  );
};

/** Input field with a calendar icon that opens the date-picker popover. */
const DateField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative fl-wrap">
      <label className="fl-label">{label}</label>
      <div className="relative">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder=" "
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600" />
        <button type="button" onClick={() => setOpen((o) => !o)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <Calendar className="w-4 h-4" />
        </button>
      </div>
      {open && <CalendarPopover value={value} onPick={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
};

/* ── Rich text editor (Bank Details — B / I / U, color, size) ──── */
const RichTextEditor: React.FC<{ value: string; onChange: (html: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState("#000000");
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const exec = (cmd: string, val?: string) => { ref.current?.focus(); document.execCommand(cmd, false, val); onChange(ref.current?.innerHTML || ""); };
  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        {([["bold", Bold], ["italic", Italic], ["underline", Underline]] as const).map(([cmd, Ic]) => (
          <button key={cmd} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700"><Ic className="w-4 h-4" /></button>
        ))}
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <label className="relative w-6 h-6 rounded border border-gray-300 cursor-pointer" style={{ background: color }}>
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); exec("foreColor", e.target.value); }} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <select defaultValue="3" onChange={(e) => exec("fontSize", e.target.value)} className="ml-1 text-xs border border-gray-300 rounded px-1.5 py-1 bg-white">
          {[["1", "12"], ["2", "14"], ["3", "16"], ["4", "18"], ["5", "20"], ["6", "24"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML || "")}
        data-placeholder={placeholder}
        className="w-full min-h-28 p-3 text-sm text-gray-800 outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400"
      />
    </div>
  );
};

/* ── Edit Customer form (inline, replaces detail; persists to datastore) ── */
const editFieldCls = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
const EditField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: React.ReactNode }> = ({ label, value, onChange, placeholder, icon }) => (
  <div className="relative fl-wrap">
    <label className="fl-label">{label}</label>
    <div className="relative">
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder && placeholder !== label ? placeholder : " "} className={editFieldCls} />
      {icon && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
    </div>
  </div>
);

/** Floating-label select used by the edit form (Settings tab). */
const EditSelect: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="relative fl-wrap">
    <label className="fl-label">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${editFieldCls} appearance-none pr-8`}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

const PAYMENT_TERMS = ["Default Company", "Net on receipt", "Net 7", "Net 10", "Net 15", "Net 30", "Net 60"];
const CURRENCIES = ["$ USD", "৳ BDT", "€ EUR", "£ GBP", "₹ INR"];

const EditCustomer: React.FC<{ customer: any; onClose: () => void; mode?: "edit" | "create"; onSaved?: (id: number) => void }> = ({ customer, onClose, mode = "edit", onSaved }) => {
  const isCreate = mode === "create";
  const taxes = useCollection<any>("taxes", "name");
  const taxOptions = ["None", ...taxes.map((t) => `${t.name} (${t.rate}%)`)];
  const [tab, setTab] = useState<"Details" | "Settings">("Details");
  const [tabDir, setTabDir] = useState<"" | "left" | "right">("");
  const switchTab = (t: "Details" | "Settings") => {
    if (t === tab) return;
    setTabDir(t === "Settings" ? "right" : "left");
    setTab(t);
  };
  const [sameAsBilling, setSameAsBilling] = useState(!!customer.sameAsBilling);
  const [emailEditing, setEmailEditing] = useState(!customer.email);
  const [f, setF] = useState({
    name: customer.name || "",
    regNo: customer.regNo || "", taxId: customer.taxId || "",
    phone: customer.phone || "", fax: customer.fax || "",
    firstName: (customer.contact || "").split(" ")[0] || "",
    lastName: (customer.contact || "").split(" ").slice(1).join(" ") || "",
    email: customer.email || "",
    mobile: customer.mobile || "", homePhone: customer.homePhone || "",
    birthday: customer.birthday || "", anniversary: customer.anniversary || "",
    street1: customer.street1 || "", street2: customer.street2 || "",
    zip: customer.zip || "", city: customer.city || "", state: customer.state || "", country: customer.country || "",
    shipStreet1: customer.shipStreet1 || "", shipStreet2: customer.shipStreet2 || "",
    shipZip: customer.shipZip || "", shipCity: customer.shipCity || "", shipState: customer.shipState || "", shipCountry: customer.shipCountry || "",
    bank: customer.bank || "",
    /* settings tab */
    currency: customer.currency || "$ USD",
    defaultTaxService: customer.defaultTaxService || "None",
    defaultTaxProduct: customer.defaultTaxProduct || "None",
    hourlyRate: customer.hourlyRate != null ? String(customer.hourlyRate) : "",
    paymentTerms: customer.paymentTerms || "Default Company",
    openingBalance: customer.openingBalance != null ? String(customer.openingBalance) : "",
    openingBalanceDate: customer.openingBalanceDate || "",
    notes: customer.notes || "",
    paymentReminder: customer.paymentReminder !== false,
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  /* "Same as Billing" mirrors the billing values into the shipping column */
  const ship = (k: "Street1" | "Street2" | "Zip" | "City" | "State" | "Country") =>
    sameAsBilling ? (f as any)[k.charAt(0).toLowerCase() + k.slice(1)] : (f as any)["ship" + k];

  const save = async () => {
    const contact = `${f.firstName} ${f.lastName}`.trim();
    const payload = {
      contact, email: f.email.trim(), phone: f.phone.trim(),
      regNo: f.regNo, taxId: f.taxId, fax: f.fax, mobile: f.mobile, homePhone: f.homePhone,
      birthday: f.birthday, anniversary: f.anniversary,
      street1: f.street1, street2: f.street2, zip: f.zip, city: f.city, state: f.state, country: f.country,
      sameAsBilling,
      shipStreet1: ship("Street1"), shipStreet2: ship("Street2"), shipZip: ship("Zip"),
      shipCity: ship("City"), shipState: ship("State"), shipCountry: ship("Country"),
      bank: f.bank, subtitle: contact || f.email.trim(),
      currency: f.currency, defaultTaxService: f.defaultTaxService, defaultTaxProduct: f.defaultTaxProduct,
      hourlyRate: parseFloat(f.hourlyRate) || 0,
      paymentTerms: f.paymentTerms,
      openingBalance: parseFloat(f.openingBalance) || 0,
      openingBalanceDate: f.openingBalanceDate,
      notes: f.notes, paymentReminder: f.paymentReminder,
    };
    if (isCreate) {
      if (!f.name.trim()) return;
      const id = await repo.add("customers", { name: f.name.trim(), balance: 0, status: "Active", ...payload });
      onSaved?.(id as number);
    } else {
      await repo.update("customers", customer.id, { name: f.name.trim() || customer.name, ...payload });
    }
    onClose();
  };

  const shipDisabled = sameAsBilling;
  const shipField = (label: string, key: "Street1" | "Street2" | "Zip" | "City" | "State" | "Country", placeholder?: string) => (
    <div className={`relative fl-wrap ${shipDisabled ? "opacity-60 pointer-events-none" : ""}`}>
      <label className="fl-label">{label}</label>
      <input value={ship(key)} onChange={(e) => set("ship" + key, e.target.value)} placeholder={placeholder && placeholder !== label ? placeholder : " "} className={editFieldCls} />
    </div>
  );

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">{isCreate ? "Create Customer" : "Edit Customer"}</h1>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"><Sparkles className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={save} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Save</button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-8 border-b border-gray-200">
        {(["Details", "Settings"] as const).map((t) => (
          <button key={t} onClick={() => switchTab(t)} className={`py-3 text-sm transition-colors border-b-2 -mb-px ${tab === t ? "text-gray-900 font-medium border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}>{t}</button>
        ))}
      </div>

      <TabSlide tabKey={tab} dir={tabDir}>
      {tab === "Details" ? (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <EditField label="Company Name" value={f.name} onChange={(v) => set("name", v)} />
              <div className="grid grid-cols-2 gap-4"><EditField label="Reg. No" value={f.regNo} onChange={(v) => set("regNo", v)} /><EditField label="Tax ID" value={f.taxId} onChange={(v) => set("taxId", v)} /></div>
              <div className="grid grid-cols-2 gap-4"><EditField label="Business Phone" value={f.phone} onChange={(v) => set("phone", v)} /><EditField label="Fax" value={f.fax} onChange={(v) => set("fax", v)} /></div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4"><EditField label="First Name" value={f.firstName} onChange={(v) => set("firstName", v)} /><EditField label="Last Name" value={f.lastName} onChange={(v) => set("lastName", v)} /></div>
              {/* Email — shown as a removable chip once set (matches the reference) */}
              <div className="relative">
                <label className="absolute -top-2 left-2 px-1 bg-white text-[11px] text-gray-500 z-10">Email</label>
                {f.email && !emailEditing ? (
                  <div className={`${editFieldCls} flex items-center`}>
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-300 rounded-full pl-3 pr-1.5 py-0.5 text-sm text-gray-800">
                      {f.email}
                      <button type="button" onClick={() => { set("email", ""); setEmailEditing(true); }} className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white hover:bg-gray-500"><X className="w-3 h-3" /></button>
                    </span>
                  </div>
                ) : (
                  <input
                    value={f.email}
                    onChange={(e) => set("email", e.target.value)}
                    onBlur={() => f.email.trim() && setEmailEditing(false)}
                    onKeyDown={(e) => e.key === "Enter" && f.email.trim() && setEmailEditing(false)}
                    placeholder="Email"
                    className={editFieldCls}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4"><EditField label="Mobile" value={f.mobile} onChange={(v) => set("mobile", v)} /><EditField label="Home Phone" value={f.homePhone} onChange={(v) => set("homePhone", v)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <DateField label="Birthday" value={f.birthday} onChange={(v) => set("birthday", v)} />
                <DateField label="Anniversary" value={f.anniversary} onChange={(v) => set("anniversary", v)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 pt-2">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-900">Address</span><span className="text-xs text-gray-400">Billing</span></div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={sameAsBilling} onChange={() => setSameAsBilling((v) => !v)} className="accent-blue-600" /> Same as Billing</label>
              <span className="text-xs text-gray-400">Shipping</span>
            </div>
            <div className="space-y-4">
              <EditField label="Street 1" value={f.street1} onChange={(v) => set("street1", v)} />
              <EditField label="Street 2" value={f.street2} onChange={(v) => set("street2", v)} placeholder="Street 2" />
              <div className="grid grid-cols-3 gap-3"><EditField label="Zip" value={f.zip} onChange={(v) => set("zip", v)} /><EditField label="City" value={f.city} onChange={(v) => set("city", v)} /><EditField label="State" value={f.state} onChange={(v) => set("state", v)} placeholder="State" /></div>
              <EditField label="Country" value={f.country} onChange={(v) => set("country", v)} />
            </div>
            <div className="space-y-4">
              {shipField("Street 1", "Street1")}
              {shipField("Street 2", "Street2")}
              <div className="grid grid-cols-3 gap-3">{shipField("Zip", "Zip")}{shipField("City", "City")}{shipField("State", "State")}</div>
              {shipField("Country", "Country")}
            </div>
          </div>

          <div className="pt-2">
            <div className="text-sm font-semibold text-gray-900 mb-2">Bank Details</div>
            <RichTextEditor value={f.bank} onChange={(html) => set("bank", html)} placeholder="Bank Details" />
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <EditSelect label="Currency" value={f.currency} options={CURRENCIES} onChange={(v) => set("currency", v)} />
            <EditSelect label="Default Taxes (Service)" value={f.defaultTaxService} options={taxOptions} onChange={(v) => set("defaultTaxService", v)} />
            <EditSelect label="Default Taxes (Product)" value={f.defaultTaxProduct} options={taxOptions} onChange={(v) => set("defaultTaxProduct", v)} />
            <EditField label="Hourly Rate" value={f.hourlyRate} onChange={(v) => set("hourlyRate", v)} placeholder="Hourly Rate" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <EditSelect label="Payment Terms (Sales)" value={f.paymentTerms} options={PAYMENT_TERMS} onChange={(v) => set("paymentTerms", v)} />
            </div>
            <EditField label="Opening Balance" value={f.openingBalance} onChange={(v) => set("openingBalance", v)} placeholder="Opening Balance" />
            <DateField label="Opening Balance Date" value={f.openingBalanceDate} onChange={(v) => set("openingBalanceDate", v)} />
          </div>
          <div>
            <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes" rows={5} className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-y" />
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-gray-900">Payment Reminder</span>
            <Toggle on={f.paymentReminder} onChange={() => set("paymentReminder", !f.paymentReminder)} />
          </div>
        </div>
      )}
      </TabSlide>
    </section>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const dbCustomers = useCollection<any>("customers", "name");
  const dbInvoices = useCollection<any>("invoices");
  const dbPayments = useCollection<any>("paymentsReceived");
  const customers: Customer[] = useMemo(
    () => dbCustomers
      .filter((c) => c.status !== "Archived")
      .map((c) => ({ id: c.id, name: c.name, contact: c.contact || c.email || c.subtitle || "—", amount: -(c.balance || 0) })),
    [dbCustomers],
  );
  const [createMode, setCreateMode] = useState(false);
  // Opened from an activity link (or another page) → pre-select that customer.
  const location = useLocation();
  const navSelectedId = (location.state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 1);
  useEffect(() => { if (navSelectedId != null) { setSelectedId(navSelectedId); setEditMode(false); setCreateMode(false); } }, [navSelectedId]);
  const [tab, setTab] = useState<"Overview" | "Details" | "Settings">("Overview");
  const [sortBy, setSortBy] = useState("Name");
  const [createdOn, setCreatedOn] = useState("All");
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("All");
  const [modal, setModal] = useState<null | "payment" | "statement" | "preview" | "pdfSettings">(null);
  // selection-bar bulk actions: merge picker → confirm alert / archive / delete alerts
  const [selAction, setSelAction] = useState<null | "merge" | "mergeConfirm" | "archive" | "delete">(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  // pending duplicate that needs the "already exists" confirmation ("customer" or "both")
  const [dupConfirm, setDupConfirm] = useState<null | "customer" | "both">(null);
  const [editMode, setEditMode] = useState(false);
  const [reminder, setReminder] = useState(true);
  const [contactLogin, setContactLogin] = useState(false);

  // selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    let list = customers.filter((c) => search.trim() === "" || (c.name || "").toLowerCase().includes(search.toLowerCase()));
    list = [...list].sort((a, b) =>
      sortBy === "Outstanding" || sortBy === "Total" || sortBy === "Due" || sortBy === "Paid"
        ? a.amount - b.amount
        : (a.name || "").localeCompare(b.name || ""),
    );
    return list;
  }, [customers, search, sortBy]);

  const selected = customers.find((c) => c.id === selectedId) || customers[0];
  const listDue = customers.reduce((s, c) => s + (c.amount < 0 ? -c.amount : 0), 0);
  // Resolve the full DB record for whatever row is actually displayed (selected),
  // not the raw selectedId — they diverge when selectedId is stale (e.g. after the
  // selected customer was archived/trashed), which would otherwise duplicate {}.
  const selectedDb: any = dbCustomers.find((c) => c.id === (selected?.id ?? selectedId)) || {};
  const custInv = dbInvoices.filter((i) => i.customerId === selectedId);
  const custTotal = custInv.reduce((s, i) => s + (i.total || 0), 0);
  const custPaid = custInv.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const custDue = custInv.reduce((s, i) => s + (i.amountDue || 0), 0);
  const stmtTx = [
    ...custInv.map((i) => ({ ts: i.ts || 0, date: i.date, details: `Invoice ${i.number}`, amount: i.total || 0, paid: 0 })),
    ...dbPayments.filter((p) => p.customerId === selectedId).map((p) => ({ ts: p.ts || 0, date: p.date, details: `Payment ${p.number}`, amount: 0, paid: p.amount || 0 })),
  ].sort((a, b) => a.ts - b.ts);
  let _bal = 0;
  const stmtRows = stmtTx.map((t) => { _bal += t.amount - t.paid; return { date: t.date, details: t.details, amount: money(t.amount), paid: money(t.paid), balance: money(_bal) }; });
  const stmtSummary = { amount: money(stmtTx.reduce((s, t) => s + t.amount, 0)), paid: money(stmtTx.reduce((s, t) => s + t.paid, 0)), balance: money(_bal) };

  /* ── More-menu actions ─────────────────────────────────────────── */
  const removeSelected = async () => {
    const id = selected?.id ?? selectedId;
    if (!id) return;
    await repo.remove("customers", id);
    const remaining = customers.filter((c) => c.id !== id);
    setSelectedId(remaining[0]?.id ?? 0);
    setEditMode(false);
  };
  // Archive keeps the record (status: Archived) but drops it from the list.
  const archiveSelectedOne = async () => {
    const id = selected?.id ?? selectedId;
    if (!id) return;
    await repo.update("customers", id, { status: "Archived" });
    const remaining = customers.filter((c) => c.id !== id);
    setSelectedId(remaining[0]?.id ?? 0);
    setEditMode(false);
  };

  /* ── Selection-bar bulk actions (merge / archive / delete + alerts) ── */
  const checkedIds = [...checked];
  const afterBulk = (removedIds: number[]) => {
    const remaining = customers.filter((c) => !removedIds.includes(c.id));
    if (removedIds.includes(selectedId)) setSelectedId(remaining[0]?.id ?? 0);
    exitSelect();
    setSelAction(null);
  };
  const bulkArchive = async () => {
    await Promise.all(checkedIds.map((id) => repo.update("customers", id, { status: "Archived" })));
    showToast(`${checkedIds.length} ${checkedIds.length === 1 ? "customer" : "customers"} archived`, "success");
    afterBulk(checkedIds);
  };
  const bulkDelete = async () => {
    await repo.removeMany("customers", checkedIds);
    showToast(`${checkedIds.length} ${checkedIds.length === 1 ? "customer" : "customers"} deleted`, "success");
    afterBulk(checkedIds);
  };
  /** Merge: re-point every reference of the losing customers to the target,
   *  combine balances, then remove the losers — fully relational. */
  const bulkMerge = async (targetId: number) => {
    const losers = checkedIds.filter((id) => id !== targetId);
    const refCollections = ["invoices", "estimates", "proformas", "salesReceipts", "creditNotes", "deliveryChallans", "paymentsReceived", "projects", "timelogs"] as const;
    for (const col of refCollections) {
      const rows = await repo.getAll(col);
      await Promise.all(rows.filter((r: any) => losers.includes(r.customerId)).map((r: any) => repo.update(col, r.id, { customerId: targetId })));
    }
    const all = await repo.getAll("customers");
    const extra = losers.reduce((s, id) => s + (all.find((c: any) => c.id === id)?.balance || 0), 0);
    const target = all.find((c: any) => c.id === targetId);
    await repo.update("customers", targetId, { balance: (target?.balance || 0) + extra });
    await repo.removeMany("customers", losers);
    showToast("Customers merged", "success");
    afterBulk(losers);
    setSelectedId(targetId);
  };
  // Copy the full customer record into a new customers row (same company name).
  const duplicateAsCustomer = async (): Promise<number> => {
    const { id, createdAt, updatedAt, ...rest } = selectedDb;
    const newId = await repo.add("customers", { ...rest });
    return newId;
  };
  // Copy the full customer record into the vendors collection.
  const duplicateAsVendor = async (): Promise<number> => {
    const { id, createdAt, updatedAt, balance, ...rest } = selectedDb;
    return repo.add("vendors", { ...rest, payable: balance || 0, status: rest.status || "Active" });
  };
  const goToVendor = (vendorId: number) => navigate("/purchase/vendors", { state: { selectedId: vendorId } });
  const handleDuplicate = async (target: "customer" | "vendor" | "both") => {
    if (!selectedDb?.name) return; // nothing valid to duplicate
    if (target === "vendor") {
      goToVendor(await duplicateAsVendor());
      return;
    }
    // customer + both create a customer copy → confirm first ("name already exists").
    setDupConfirm(target);
  };
  const confirmDuplicate = async () => {
    const target = dupConfirm;
    setDupConfirm(null);
    if (!target || !selectedDb?.name) return;
    const newId = await duplicateAsCustomer();
    if (target === "both") goToVendor(await duplicateAsVendor());
    else setSelectedId(newId);
  };

  const allSelected = filtered.length > 0 && filtered.every((c) => checked.has(c.id));
  const selectedCustomers = customers.filter((c) => checked.has(c.id));
  const totals = {
    total: selectedCustomers.reduce((s, c) => s + Math.abs(c.amount), 0),
    paid: selectedCustomers.filter((c) => c.amount >= 0).reduce((s, c) => s + c.amount, 0),
    due: selectedCustomers.filter((c) => c.amount < 0).reduce((s, c) => s + Math.abs(c.amount), 0),
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

  if (!selected && !createMode) return <ListEmptyState title="No customers yet" onCreate={() => { setCreateMode(true); setSelectMode(false); }} createLabel="New Customer" />;

  return (
    <div className="flex h-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>
              {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            <div className="flex items-center gap-0.5">
              <button
                title="Merge"
                onClick={() => (checked.size < 2 ? showToast("Select at least two customers to merge", "warning") : setSelAction("merge"))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
              ><Merge className="w-4 h-4" /></button>
              <button
                title="Archive"
                onClick={() => (checked.size === 0 ? showToast("Select customers to archive", "warning") : setSelAction("archive"))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
              ><Archive className="w-4 h-4" /></button>
              <button
                title="Delete"
                onClick={() => (checked.size === 0 ? showToast("Select customers to delete", "warning") : setSelAction("delete"))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
              ><Trash2 className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Customers</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select customers"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}

        {/* search */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((c) => {
            const active = !selectMode && c.id === selectedId;
            const isChecked = checked.has(c.id);
            return (
              <button key={c.id} onClick={() => (selectMode ? toggleRow(c.id) : (setSelectedId(c.id), setEditMode(false)))}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 flex items-center gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{c.contact}</div>
                </div>
                <span className={`text-sm font-medium flex-shrink-0 ${c.amount < 0 ? "text-red-500" : "text-gray-900"}`}>{money(c.amount)}</span>
              </button>
            );
          })}
          {/* FAB → Add Customer (live → shared datastore) */}
          {!selectMode && (
            <button onClick={() => { setCreateMode(true); setSelectMode(false); }} className="absolute bottom-20 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
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
        <section className="flex-1 flex items-center justify-center">
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
        <EditCustomer key="create" mode="create" customer={{}} onClose={() => setCreateMode(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editMode ? (
        <EditCustomer key={selectedId} customer={selectedDb} onClose={() => setEditMode(false)} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {/* detail header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{selected.name}</h1>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setEditMode(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setModal("payment")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Add Payment"><DollarSign className="w-4 h-4" /></button>
              <button onClick={() => setModal("statement")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Statement"><FileText className="w-4 h-4" /></button>
              <Dropdown align="right" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MoreVertical className="w-4 h-4" /></span>}>
                {(close) => (
                  <DetailMoreMenu close={close} onArchive={archiveSelectedOne} onTrash={removeSelected} onDuplicate={handleDuplicate} />
                )}
              </Dropdown>
            </div>
          </div>

          {/* tabs */}
          <div className="flex items-center justify-center gap-8 border-b border-gray-200">
            {tabs.map((t) => (
              <button key={t} onClick={() => switchTab(t)} className={`py-3 text-sm transition-colors border-b-2 -mb-px ${tab === t ? "text-gray-900 font-medium border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}>{t}</button>
            ))}
          </div>

          {/* tab body — directional push transition */}
          <TabSlide tabKey={tab} dir={tabDir}>

          {/* ── Overview ── */}
          {tab === "Overview" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Outstanding", value: money(-custDue), color: "text-red-500" },
                  { label: "Net Profit", value: money(custPaid), color: "text-gray-900" },
                  { label: "Sales", value: money(custTotal), color: "text-gray-900" },
                ].map((c) => (
                  <div key={c.label} className="text-center py-2">
                    <div className={`text-xs font-medium mb-1 ${c.label === "Outstanding" ? "text-red-500" : "text-gray-500"}`}>{c.label}</div>
                    <div className={`text-lg font-semibold ${c.color}`}>{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-900">Sales</span>
                  <div className="flex items-center gap-4">
                    {[{ c: "#007aff", l: "Sales" }, { c: "#ff3b30", l: "Overdue" }, { c: "#34a853", l: "Paid" }].map((x) => (
                      <span key={x.l} className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-3 rounded-[3px]" style={{ background: x.c }} />{x.l}</span>
                    ))}
                    <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600">Months <ChevronDown className="w-3.5 h-3.5" /></span>}>
                      {(close) => ["Days", "Weeks", "Months", "Years"].map((o) => <button key={o} onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o}</button>)}
                    </Dropdown>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--color-gray-500)", fontSize: 11 }} axisLine={{ stroke: "var(--color-gray-200)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--color-gray-500)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "var(--color-gray-100)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--color-gray-200)", borderRadius: 8, color: "var(--color-gray-900)" }} />
                    <Bar dataKey="Sales" fill="#007aff" barSize={36} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Overdue" fill="#ff3b30" barSize={36} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Paid" fill="#34a853" barSize={36} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900">Recent Activities</h3>
                  <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600">{activityFilter} <ChevronDown className="w-3.5 h-3.5" /></span>}>
                    {(close) => activityFilters.map((o) => <button key={o} onClick={() => { setActivityFilter(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === activityFilter && <Check className="w-4 h-4 text-blue-600" />}</button>)}
                  </Dropdown>
                </div>
                <RecentActivities customerId={selected.id} filter={activityFilter} />
              </div>
            </div>
          )}

          {/* ── Details ── */}
          {tab === "Details" && (() => {
            const billing = [selectedDb.street1, selectedDb.street2, [selectedDb.city, selectedDb.zip].filter(Boolean).join(" "), selectedDb.state, selectedDb.country].filter(Boolean);
            const shipping = [selectedDb.shipStreet1, selectedDb.shipStreet2, [selectedDb.shipCity, selectedDb.shipZip].filter(Boolean).join(" "), selectedDb.shipState, selectedDb.shipCountry].filter(Boolean);
            return (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    ["Company", selectedDb.name || selected.name], ["Reg. No", selectedDb.regNo || "—"], ["Tax ID", selectedDb.taxId || "—"],
                    ["Business Phone", selectedDb.phone || "—"], ["Fax", selectedDb.fax || "—"], ["Email", selectedDb.email || "—"],
                    ["First Name", (selectedDb.contact || "").split(" ")[0] || "—"], ["Last Name", (selectedDb.contact || "").split(" ").slice(1).join(" ") || "—"], ["Mobile Number", selectedDb.mobile || "—"],
                    ["Home Phone", selectedDb.homePhone || "—"], ["Birthday", selectedDb.birthday || "—"], ["Anniversary", selectedDb.anniversary || "—"],
                  ].map(([k, v]) => (
                    <div key={k}><div className="text-xs text-gray-500">{k}</div><div className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{v}</div></div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Billing Address</div>
                    <div className="text-sm text-gray-800 leading-relaxed">{billing.length ? billing.map((l, i) => <div key={i}>{l}</div>) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Shipping Address</div>
                    <div className="text-sm text-gray-800 leading-relaxed">{shipping.length ? shipping.map((l, i) => <div key={i}>{l}</div>) : "—"}</div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Bank Details</div>
                  {selectedDb.bank
                    ? <div className="text-sm text-gray-800 leading-relaxed [&_b]:font-bold" dangerouslySetInnerHTML={{ __html: selectedDb.bank }} />
                    : <div className="text-sm text-gray-400">—</div>}
                </div>
              </div>
            );
          })()}

          {/* ── Settings ── */}
          {tab === "Settings" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  ["Currency", selectedDb.currency || "$ USD"],
                  ["Default Taxes (Service)", selectedDb.defaultTaxService || "None"],
                  ["Default Taxes (Product)", selectedDb.defaultTaxProduct || "None"],
                  ["Hourly Rate", selectedDb.hourlyRate ? money(selectedDb.hourlyRate) : "—"],
                  ["Payment Terms (Sales)", selectedDb.paymentTerms || "Default Company"],
                  ["Opening Balance", selectedDb.openingBalance ? money(selectedDb.openingBalance) : "—"],
                  ["Opening Balance Date", selectedDb.openingBalanceDate || "—"],
                ].map(([k, v]) => (
                  <div key={k}><div className="text-xs text-gray-500">{k}</div><div className="text-sm font-semibold text-gray-900 mt-0.5">{v}</div></div>
                ))}
              </div>
              {selectedDb.notes && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Notes</div>
                  <div className="text-sm text-gray-800">{selectedDb.notes}</div>
                </div>
              )}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between max-w-sm">
                  <span className="text-sm text-gray-700">Payment Reminder</span>
                  <Toggle on={selectedDb.paymentReminder !== false} onChange={() => repo.update("customers", selectedDb.id, { paymentReminder: selectedDb.paymentReminder === false })} />
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
      {modal === "payment" && <PaymentModal onClose={() => setModal(null)} customer={selected.name} />}
      {modal === "statement" && <StatementModal onClose={() => setModal(null)} onGo={() => setModal("preview")} />}
      {modal === "preview" && (
        <StatementPreview
          onClose={() => setModal(null)}
          name={selected.name}
          partyId={selected.id}
          onOpenSettings={() => setModal("pdfSettings")}
          onDownload={async () => downloadDocPdf({ filename: `${selected.name} Statement`, docTitle: "STATEMENT", partyLabel: "Statement To", partyLines: [selected.name, selectedDb.contact, selectedDb.email, selectedDb.phone].filter(Boolean) as string[], meta: [["Amount", stmtSummary.amount], ["Paid", stmtSummary.paid], ["Balance", stmtSummary.balance], ["From", "Apr 27, 2026"], ["To", "Jun 22, 2026"]], itemHead: ["Date", "Details", "Amount", "Paid", "Balance"], itemRows: [["—", "Opening Balance", "$0.00", "$0.00", "$0.00"], ...stmtRows.map((r) => [r.date, r.details, r.amount, r.paid, r.balance]), ["", "Total", stmtSummary.amount, stmtSummary.paid, stmtSummary.balance]], settings: await getPdfSettings("statement", "normal") })}
        />
      )}
      {modal === "pdfSettings" && (
        <PdfPrintSettingsModal onClose={() => setModal("preview")} initialDocType="statement" partyId={selected.id} />
      )}
      {(selAction === "merge" || selAction === "mergeConfirm") && (
        <MergeCustomersModal
          customers={customers.filter((c) => checked.has(c.id))}
          onClose={() => { setSelAction(null); setMergeTargetId(null); }}
          onMerge={(id) => { setMergeTargetId(id); setSelAction("mergeConfirm"); }}
        />
      )}
      {selAction === "mergeConfirm" && mergeTargetId != null && (
        <ConfirmAlert
          message="Are you sure want to merge these customers?"
          onNo={() => setSelAction("merge")}
          onYes={() => bulkMerge(mergeTargetId)}
        />
      )}
      {selAction === "archive" && (
        <ConfirmAlert message="Are you sure want to archive these customers?" onNo={() => setSelAction(null)} onYes={bulkArchive} />
      )}
      {selAction === "delete" && (
        <ConfirmAlert message="Are you sure want to delete these customers?" onNo={() => setSelAction(null)} onYes={bulkDelete} />
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

export default Customers;
