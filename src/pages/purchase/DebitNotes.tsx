/**
 * File: src/pages/purchase/DebitNotes.tsx
 * Debit Note — master/detail layout matching the reference design.
 * Left: list (search, sort, status/vendor/date filters, selection mode).
 * Right: detail (action icons + ⋮ menu, Unused badge, line items, totals
 *        with Amount Used / Amount Unused, terms/notes/attachment, ribbon)
 *        and modals (Apply to Bill → Bills picker, Activity Log,
 *        Preview / Email / Settings).
 * Purchase-side analog of the Credit Note: it carries a balance you Apply to
 * a Bill (vendor side), instead of an invoice.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useLocation } from "react-router-dom";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, money as fmtMoney, CreateDocForm, DocPreview , PdfPreviewModal} from "@/lib/db";
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
  CornerUpLeft,
  Calendar,
  Barcode,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Unused" | "Partially Used" | "Used";

interface DebitNote {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  amount: string;
  status: Status;
}

const debitNotes: DebitNote[] = [
  { id: 3, name: "Ex aut sequi ad libe", number: "#3", note: "Consequatur Quo sae", date: "Jun 16, 2026", amount: "$0.00", status: "Unused" },
  { id: 2, name: "Explicabo Doloremqu", number: "#2", note: "Consequatur Quo sae", date: "Jun 16, 2026", amount: "$0.00", status: "Unused" },
  { id: 1, name: "Est lorem ut maxime", number: "#1", note: "Consequatur Quo sae", date: "Jun 16, 2026", amount: "$0.00", status: "Unused" },
];

const sortFields = ["Name", "First Name", "Last Name", "Debit Note date", "Debit Note #", "Status", "Total"];
const sortDirections = ["Ascending", "Descending"];
const statusList: (Status | "All" | "Trash")[] = ["All", "Unused", "Partially Used", "Used", "Trash"];
const vendorList = ["Ex aut sequi ad libe", "Explicabo Doloremqu", "Est lorem ut maxime", "bipul company", "SSE", "SST"];
const dateRanges = ["All", "Today", "This Week", "Last Week", "This Month", "Last 30 Days", "Last Month", "Last 90 Days", "This Year", "Last Year", "Date Range"];

const STATUS_BADGE: Record<Status, string> = {
  Unused: "bg-gray-900 text-white",
  "Partially Used": "bg-orange-500 text-white",
  Used: "bg-green-500 text-white",
};
const RIBBON_BG: Record<Status, string> = {
  Unused: "bg-green-500 text-white",
  "Partially Used": "bg-orange-500 text-white",
  Used: "bg-green-600 text-white",
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

/* ── Bills picker (opened from Apply to Bill) ──────────────────── */
const BillsModal: React.FC<{ onClose: () => void; onDone: () => void; vendor: string }> = ({ onClose, onDone, vendor }) => {
  const [picked, setPicked] = useState(true);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-xl my-10 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Bills</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={onDone} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Done</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => setPicked((p) => !p)} className="w-full flex items-start gap-3 px-5 py-3 border-b border-gray-300 hover:bg-gray-50 text-left">
            <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${picked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{picked && <Check className="w-3.5 h-3.5 text-white" />}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">{vendor}</div>
              <div className="text-xs text-gray-500 mt-0.5">#6</div>
              <div className="text-xs text-gray-500 mt-0.5">Mollit fugiat elit</div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500">Jun 17, 2026</span>
              <span className="text-sm font-semibold text-gray-900 mt-0.5">$0.00</span>
              <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500 text-white">Paid</span>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <span className={`w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${picked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{picked && <Check className="w-3.5 h-3.5 text-white" />}</span>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-gray-900">$0.00 <span className="text-gray-500 font-normal">Due</span></div>
            <div className="text-xs text-gray-500">{picked ? "1 Bill Selected" : "0 Bills Selected"}</div>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

/* ── Apply to Bill modal ───────────────────────────────────────── */
const ApplyModal: React.FC<{ onClose: () => void; dn: DebitNote; onApply: () => void }> = ({ onClose, dn, onApply }) => {
  const [amount, setAmount] = useState("");
  const [billsOpen, setBillsOpen] = useState(false);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Apply to Bill</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={onApply} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-gray-700">Debit Note</label>
            <div className="text-sm font-semibold text-gray-900">{dn.number}</div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-gray-700">Amount</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setAmount("0.00")} className="px-3 py-1.5 text-xs border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$ 0.00" className="w-32 text-right border-b border-gray-300 pb-1 text-sm outline-none bg-transparent text-gray-900" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea defaultValue={`Debit Note ${dn.number}`} className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Internal Notes</label>
            <textarea placeholder="Internal Notes" className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" />
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-sm font-medium text-gray-800">Bills</span>
            <button onClick={() => setBillsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Pencil className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      {billsOpen && <BillsModal onClose={() => setBillsOpen(false)} onDone={() => setBillsOpen(false)} vendor={dn.name} />}
    </Overlay>
  );
};

/* ── Activity Log modal ────────────────────────────────────────── */
const ActivityModal: React.FC<{ onClose: () => void; dn: DebitNote; applied: boolean }> = ({ onClose, dn, applied }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-xl my-12 bg-[#2a2f36] text-white rounded-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <h3 className="text-lg font-medium">Activity Log</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-6">
        <ol className="relative border-l border-white/15 ml-3 space-y-7">
          {applied && (
            <li className="ml-6">
              <span className="absolute -left-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-white/70" /></span>
              <div className="text-sm">Debit Note <span className="text-blue-400">{dn.number}</span> applied to bill <span className="text-blue-400">#6</span>.</div>
              <div className="text-xs text-white/50 mt-1">Today 06:59 PM • info@inovoic.com</div>
            </li>
          )}
          <li className="ml-6">
            <span className="absolute -left-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-white/70" /></span>
            <div className="text-sm">New Debit Note <span className="text-blue-400">{dn.number}</span> created.</div>
            <div className="text-xs text-white/50 mt-1">{dn.date} • info@inovoic.com</div>
          </li>
        </ol>
      </div>
    </div>
  </Overlay>
);

/* ── DEBIT NOTE preview (white document) ───────────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; dn: DebitNote }> = ({ onClose, dn }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Debit Note {dn.number}</h3>
        <div className="flex items-center gap-1">
          {[Download, Printer, Mail].map((Ic, i) => (
            <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><Ic className="w-4 h-4" /></button>
          ))}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div style={{ background: "#fff", color: "#111" }} className="p-6">
        <div className="relative">
          {/* Unused corner ribbon */}
          <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
            <div className="absolute top-[18px] -left-[34px] w-32 -rotate-45 bg-gray-900 text-white text-[10px] font-semibold py-1 text-center">{dn.status}</div>
          </div>
          <div className="text-right text-sm italic text-gray-500">(Original)</div>
          <div className="border border-gray-300">
            <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">DEBIT NOTE</h1>
            <div className="flex justify-between gap-6 p-4">
              <div>
                <div className="font-bold text-lg">info</div>
                <div className="text-sm text-gray-700">Bangladesh</div>
                <div className="text-sm text-gray-700">info@inovoic.com</div>
                <div className="font-bold text-sm mt-2">Debit Note To:</div>
                <div className="text-sm font-semibold">{dn.name}</div>
              </div>
              <table className="text-sm border-collapse h-fit">
                <tbody>
                  {[["Debit Note #", dn.number.replace("#", "")], ["Debit Note date", dn.date], ["Total", dn.amount]].map(([k, v]) => (
                    <tr key={k}><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1.5">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-6 text-center text-sm font-semibold border-t border-gray-300">hdgh</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; dn: DebitNote }> = ({ onClose, dn }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Debit Note {dn.number} from info</h3>
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
        <input defaultValue={`Debit Note ${dn.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {dn.name}</p>
          <p>Debit Note {dn.number}<br />Total Amount: {dn.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Debit Note {dn.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Floating-label field ──────────────────────────────────────── */
const fieldCls = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
const FloatField: React.FC<{ label?: string; value?: string; placeholder?: string; icon?: React.ReactNode }> = ({ label, value, placeholder, icon }) => (
  <div className="relative fl-wrap">
    {label && <label className="fl-label">{label}</label>}
    <div className="relative">
      <input defaultValue={value} placeholder={placeholder && placeholder !== label ? placeholder : " "} className={fieldCls} />
      {icon && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
    </div>
  </div>
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

/* ── Edit Debit Note (inline form, replaces detail) ────────────── */
const EditDebitNote: React.FC<{ dn: DebitNote; onClose: () => void }> = ({ dn, onClose }) => {
  const [vendorQuery, setVendorQuery] = useState(dn.name);
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
  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar m-2 bg-white border border-gray-300 shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300 sticky top-0 bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-900">Edit Debit Note</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} title="Settings" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Barcode className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-5 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Save</button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* top fields */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative fl-wrap" ref={vref}>
            <label className="fl-label">Vendor *</label>
            <div className="relative">
              <input value={vendorQuery} onChange={(e) => { setVendorQuery(e.target.value); setVendorOpen(true); }} onFocus={() => setVendorOpen(true)} placeholder=" " className={fieldCls} />
              <button onClick={() => setAddVendor(true)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
            </div>
            {vendorOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                {matches.map((v) => <button key={v} onClick={() => { setVendorQuery(v); setVendorOpen(false); }} className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{v}</button>)}
                {matches.length === 0 && <div className="px-3 py-2.5 text-sm text-gray-400">No vendor found</div>}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] text-gray-500">Address</label>
            <button className="w-full mt-0.5 flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-500"><span /> <ChevronDown className="w-4 h-4" /></button>
          </div>
          <FloatField label="Debit Note #" value={dn.number.replace("#", "")} />
          <FloatField label="Currency" value="$ USD" />
          <FloatField label="Debit Note date *" value={dn.date} icon={<Calendar className="w-4 h-4" />} />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-64"><FloatField label="Sub Title" value="hdgh" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="accent-blue-600" /> Discount before tax</label>
        </div>

        {/* line items */}
        <div className="border border-gray-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left font-semibold px-4 py-2.5">Sr. No.</th>
                <th className="text-left font-semibold px-2 py-2.5">Items</th>
                <th className="text-right font-semibold px-2 py-2.5">Quantity</th>
                <th className="text-right font-semibold px-2 py-2.5">Rate</th>
                <th className="text-right font-semibold px-2 py-2.5">Tax</th>
                <th className="text-right font-semibold px-2 py-2.5">Discount</th>
                <th className="text-right font-semibold px-4 py-2.5">Amount</th>
              </tr>
            </thead>
          </table>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Product</button>
              <button className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Service</button>
            </div>
            <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        {/* terms / notes / totals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Terms &amp; Conditions</label><textarea defaultValue="Eum illo minus fuga" className="mt-1 w-full h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
            <div><label className="text-xs text-gray-500">Internal Notes</label><textarea placeholder="Internal Notes" className="mt-1 w-full h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
          </div>
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Notes</label><textarea defaultValue={dn.note} className="mt-1 w-full h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
            <div>
              <label className="text-xs text-gray-500">Attachment</label>
              <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-md overflow-hidden self-start">
            <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{dn.amount}</span></div>
            <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-200"><span className="text-gray-700">Total</span><span className="font-semibold text-gray-900">{dn.amount}</span></div>
            <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Amount Used</span><span>$0.00</span></div>
            <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Amount Unused</span><span className="font-semibold text-gray-900">{dn.amount}</span></div>
          </div>
        </div>
      </div>

      {addVendor && <AddVendorModal onClose={() => setAddVendor(false)} />}
      {settingsOpen && <AppSettingsModal initialTab="Debit Note" onClose={() => setSettingsOpen(false)} />}
    </section>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const DebitNotes: React.FC = () => {
  // Opened from the Bills page (Debit Note action) → pre-select that note.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 3);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Debit Note date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "apply" | "activity">(null);
  const [editMode, setEditMode] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);

  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const dbNotes = useCollection<any>("debitNotes");
  const dbVendors = useCollection<any>("vendors", "name");
  const debitNotes: DebitNote[] = useMemo(
    () => dbNotes.slice().sort((a, b) => b.id - a.id).map((d) => ({
      id: d.id, name: dbVendors.find((v) => v.id === d.vendorId)?.name || "—",
      number: d.number, note: d.notes || "No Notes", date: d.date, amount: fmtMoney(d.total), status: d.status || "Unused",
    })),
    [dbNotes, dbVendors],
  );

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = debitNotes.filter(
      (i) =>
        (statusFilter === "All" || i.status === statusFilter) &&
        (vendorFilter === null || i.name === vendorFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Total") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Debit Note #") r = a.id - b.id;
      else if (sortBy === "Status") r = a.status.localeCompare(b.status);
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.name.localeCompare(b.name);
      else r = a.id - b.id; // Debit Note date
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [debitNotes, sortBy, sortDir, statusFilter, vendorFilter, search]);

  const selected = debitNotes.find((i) => i.id === selectedId) || debitNotes[0];
  const isApplied = selected ? appliedIds.has(selected.id) : false;

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listUnusedTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = debitNotes.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const applyToBill = () => {
    setAppliedIds((p) => new Set(p).add(selected.id));
    setModal(null);
  };

  const actionIcons: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: Settings, title: "Settings", onClick: () => setModal("settings") },
    { icon: ChevronUp, title: "Collapse" },
    { icon: SlidersHorizontal, title: "Adjust" },
    { icon: Pencil, title: "Edit", onClick: () => setEditMode(true) },
    { icon: PenTool, title: "Signature" },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => setModal("preview") },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen) return <ListEmptyState title="No debit notes yet" onCreate={() => setCreateOpen(true)} createLabel="New Debit Note" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              {[Trash2, MessageCircle, Mail, Eye, Check].map((Ic, i) => (
                <button key={i} onClick={Ic === Check ? exitSelect : Ic === Eye ? () => setModal("preview") : undefined} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Ic className="w-4 h-4" /></button>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Debit Notes</h2>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search debit notes..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
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
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Debit Note date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => dateRanges.map((d) => (
              <button key={d} onClick={() => { setDateFilter(d); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{d} {d === dateFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((p) => {
            const active = !selectMode && p.id === selectedId;
            const isChecked = checked.has(p.id);
            return (
              <button key={p.id} onClick={() => (selectMode ? toggleRow(p.id) : (setSelectedId(p.id), setEditMode(false)))}
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
          {/* FAB */}
          {!selectMode && (
            <button onClick={() => setCreateOpen(true)} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{money(listUnusedTotal)} <span className="text-gray-500 font-normal">Unused</span></div>
          <div className="text-xs text-gray-500">{filtered.length} Debit Notes</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {createOpen ? (
        /* Create Debit Note — same full inline form as Create Credit Note */
        <CreateDocForm collection="debitNotes" title="New Debit Note" party="vendors" buy creditTotals onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} Debit {checked.size === 1 ? "Note" : "Notes"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : editMode ? (
        <EditDebitNote dn={selected} onClose={() => setEditMode(false)} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
                <button className="text-xs text-blue-600 hover:text-blue-700 underline">View Contact</button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                {/* ⋮ menu */}
                <Dropdown align="right" panelClass="w-56" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <>
                      <button onClick={close} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-400" /></button>
                      {/* Duplicate submenu */}
                      <button onClick={() => setDupOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><span className="flex items-center gap-2"><Copy className="w-4 h-4 text-gray-400" /> Duplicate</span> <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                      {dupOpen && (
                        <div className="bg-gray-50">
                          <button onClick={close} className="w-full px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 text-left">As Debit Note</button>
                        </div>
                      )}
                      <button onClick={() => { setModal("apply"); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><CornerUpLeft className="w-4 h-4 text-gray-400" /> Apply To Bill</button>
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><Signature className="w-4 h-4 text-gray-400" /> Signature Request</button>
                      <button onClick={() => { setModal("activity"); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><History className="w-4 h-4 text-gray-400" /> Activity Log</button>
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200"><Trash2 className="w-4 h-4" /> Trash</button>
                    </>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* meta row — #, Debit Note date, (Settled On when applied), amount + badge */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
              <div className="flex items-center gap-12">
                <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                <div><div className="text-xs text-gray-500">Debit Note date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                {isApplied && (
                  <div><div className="text-xs text-gray-500">Settled On</div><button className="text-sm font-semibold text-blue-600 hover:underline">6</button></div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{selected.amount}</span>
                <span className={`mt-1 px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
              </div>
            </div>

            {/* line items (header only — empty) */}
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

            {/* terms + notes + attachment + totals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Terms &amp; Conditions</label>
                  <div className="mt-1 h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">Eum illo minus fuga</div>
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
                <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Amount Used</span><span>$0.00</span></div>
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Amount Unused</span><span className="font-semibold text-gray-900">{selected.amount}</span></div>
              </div>
            </div>

            {/* status corner ribbon */}
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 text-[10px] font-semibold py-1 text-center ${RIBBON_BG[selected.status]}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Debit Note" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbNotes.find((x) => x.id === selectedId) || {}; const pp: any = dbVendors.find((x) => x.id === d.vendorId) || {}; const pn = pp.name || "—"; return <PdfPreviewModal docType="debitNote" recordId={d.id} title={`Debit Note `} onClose={() => setModal(null)} />; })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} dn={selected} />}
      {modal === "apply" && <ApplyModal onClose={() => setModal(null)} dn={selected} onApply={applyToBill} />}
      {modal === "activity" && <ActivityModal onClose={() => setModal(null)} dn={selected} applied={isApplied} />}
    </div>
  );
};

export default DebitNotes;
