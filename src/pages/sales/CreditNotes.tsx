/**
 * File: src/pages/sales/CreditNotes.tsx
 * Credit Note — master/detail layout matching the reference design.
 * Left: list (search, sort, status/customer/date filters, selection mode).
 * Right: detail (action icons + ⋮ menu, Unused badge, line items, totals
 *        with Amount Used / Amount Unused, terms/notes/attachment, ribbon)
 *        and modals (Apply to Invoice → Invoices picker, Activity Log,
 *        Preview / Email / Settings).
 * A credit note carries a balance that can be Applied to an invoice; once
 * applied the meta shows "Settled On", totals split Used/Unused, and the
 * list row shows the remaining unused amount in green.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney, CreateDocForm, DocPreview , PdfPreviewModal} from "@/lib/db";
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
  CircleChevronUp,
  CircleChevronDown,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Unused" | "Partially Used" | "Used";

interface CreditNote {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  amount: string;
  status: Status;
}

const creditNotes: CreditNote[] = [
  { id: 8, name: "Vitae pariatur Vero", number: "#8", note: "Impedit magna ipsum", date: "Jun 17, 2026", amount: "$8,923.68", status: "Unused" },
  { id: 7, name: "Dignissimos quae ull", number: "#7", note: "Impedit magna ipsum", date: "Jun 17, 2026", amount: "$9,604.92", status: "Unused" },
  { id: 6, name: "Dignissimos quae ull", number: "#6", note: "Impedit magna ipsum", date: "Jun 17, 2026", amount: "$0.00", status: "Unused" },
  { id: 5, name: "Dolore quidem nisi d", number: "#5", note: "Impedit magna ipsum", date: "Jun 17, 2026", amount: "$0.00", status: "Unused" },
  { id: 4, name: "Harum ut dolore aliq", number: "#4", note: "Impedit magna ipsum", date: "Jun 17, 2026", amount: "$310.50", status: "Unused" },
  { id: 3, name: "sayed cpy 1", number: "#3", note: "Impedit magna ipsum", date: "Jun 16, 2026", amount: "$4.60", status: "Unused" },
  { id: 2, name: "sayed cpy 1", number: "#2", note: "Impedit magna ipsum", date: "Jun 16, 2026", amount: "$3,355.00", status: "Unused" },
  { id: 1, name: "sayed cpy 1", number: "#1", note: "Impedit magna ipsum", date: "Jun 16, 2026", amount: "$3,325.00", status: "Unused" },
];

interface LineItem {
  no: number;
  name: string;
  code?: string;
  sub?: string;
  qty: string;
  sac?: string;
  rate: string;
  tax: string;
  amount: string;
}
const lineItems: LineItem[] = [
  { no: 1, name: "Pen drive", code: "58", sub: "hi this is pen drive product", qty: "12 54", rate: "$98.00", tax: "Test Tax, new test tax", amount: "$1,176.00" },
  { no: 2, name: "charge", sac: "dg", sub: "hi ...............", qty: "123 box", rate: "$32.00", tax: "new test tax", amount: "$3,936.00" },
];

const sortFields = ["Name", "First Name", "Last Name", "Credit note date", "Credit Note #", "Status", "Total"];
const sortDirections = ["Ascending", "Descending"];
const statusList: (Status | "All" | "Trash")[] = ["All", "Unused", "Partially Used", "Used", "Trash"];
const CN_TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const CN_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
const nowLabel = () => "Today " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const customerList = ["bdcalling", "Vitae pariatur Vero", "Dignissimos quae ull", "Dolore quidem nisi d", "Harum ut dolore aliq", "sayed cpy 1"];
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

/* ── Apply to Invoice modal (live: picks one of the customer's open invoices) ── */
const ApplyModal: React.FC<{
  onClose: () => void;
  cn: CreditNote;
  unused: number;
  openInvoices: any[];
  onApply: (invoiceId: number, amount: number) => void;
}> = ({ onClose, cn, unused, openInvoices, onApply }) => {
  const [amount, setAmount] = useState("");
  const [pickedId, setPickedId] = useState<number | null>(openInvoices[0]?.id ?? null);
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const picked = openInvoices.find((i) => i.id === pickedId);
  const maxApply = Math.min(unused, picked?.amountDue ?? unused);
  const parsed = parseFloat(amount) || 0;
  const applyAmt = Math.min(parsed > 0 ? parsed : maxApply, maxApply);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Apply to Invoice</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button
              onClick={() => pickedId != null && applyAmt > 0 && onApply(pickedId, applyAmt)}
              disabled={pickedId == null || maxApply <= 0}
              className={`px-4 py-1.5 text-sm rounded-md ${pickedId == null || maxApply <= 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >Save</button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-gray-700">Credit Note</label>
            <div className="text-sm font-semibold text-gray-900">{cn.number} <span className="text-gray-500 font-normal">({money(unused)} unused)</span></div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-gray-700">Amount</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setAmount(maxApply.toFixed(2))} className="px-3 py-1.5 text-xs border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={money(maxApply)} className="w-32 text-right border-b border-gray-300 pb-1 text-sm outline-none bg-transparent text-gray-900" />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800 mb-2">Invoices</div>
            <div className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-56 overflow-y-auto custom-scrollbar">
              {openInvoices.length === 0 && <div className="px-4 py-6 text-sm text-gray-400 text-center">No open invoices for this customer</div>}
              {openInvoices.map((inv) => (
                <button key={inv.id} onClick={() => setPickedId(inv.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                  <span className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${pickedId === inv.id ? "border-blue-600" : "border-gray-400"}`}>
                    {pickedId === inv.id && <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{inv.number}</span>
                    <span className="block text-xs text-gray-500">{inv.date}</span>
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{money(inv.amountDue || 0)} <span className="text-xs text-gray-500 font-normal">due</span></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

/* ── CREDIT NOTE preview (white document) ──────────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; cn: CreditNote }> = ({ onClose, cn }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Credit Note {cn.number}</h3>
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
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">CREDIT NOTE</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[["Credit Note #", cn.number.replace("#", "")], ["Credit note date", cn.date], ["Total", cn.amount]].map(([k, v]) => (
                  <tr key={k}><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-6 px-4 py-3 text-sm border-t border-gray-300">
            <div>
              <div className="font-bold">Credit To:</div>
              <div className="font-semibold">{cn.name}</div>
              <div>dk d 12540</div>
              <div>Bangladesh</div>
            </div>
          </div>
          <table className="w-full text-xs border-t border-gray-300">
            <thead>
              <tr>{["Sr. No.", "Products", "Quantity", "Rate", "Tax", "Amount"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">Pen drive</div><div className="text-gray-500">hi this is pen drive product</div></td>
                <td className="border border-gray-300 px-2 py-2">12 54</td>
                <td className="border border-gray-300 px-2 py-2">$98.00</td>
                <td className="border border-gray-300 px-2 py-2">Test Tax, new test tax</td>
                <td className="border border-gray-300 px-2 py-2">$1,176.00</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">2.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">charge</div><div className="text-gray-500">hi ...............</div></td>
                <td className="border border-gray-300 px-2 py-2">123 box</td>
                <td className="border border-gray-300 px-2 py-2">$32.00</td>
                <td className="border border-gray-300 px-2 py-2">new test tax</td>
                <td className="border border-gray-300 px-2 py-2">$3,936.00</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end px-4 py-3 text-sm">
            <table className="text-right">
              <tbody>
                <tr><td className="px-3 py-1 font-bold">Sub Total</td><td className="px-3 py-1">$8,923.68</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">Test Tax 72% on $1,176.00</td><td className="px-3 py-1">$846.72</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">new test tax 58% on $3,936.00</td><td className="px-3 py-1">$2,282.88</td></tr>
                <tr className="border-t border-gray-300"><td className="px-3 py-1 font-bold">Total</td><td className="px-3 py-1 font-bold">$8,923.68</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-300 text-sm">
            <div className="font-bold">Terms &amp; Conditions</div>
            <div className="text-gray-700">Necessitatibus alias</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; cn: CreditNote }> = ({ onClose, cn }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-900">Credit Note {cn.number} from info</h3>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Send</button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <input placeholder="To" className="flex-1 bg-transparent text-sm outline-none" />
          <button className="text-xs text-gray-500 hover:text-gray-700">Cc &amp; Bcc</button>
        </div>
        <input defaultValue={`Credit Note ${cn.number} from info`} className="w-full border-b border-gray-200 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-200 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {cn.name}</p>
          <p>Credit Note {cn.number}<br />Total Amount: {cn.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Credit Note {cn.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
export const CreditNotes: React.FC = () => {
  // Opened from a Duplicate action / activity link → pre-select that credit note.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 8);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Credit note date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "apply" | "pdfSettings">(null);
  const [dupOpen, setDupOpen] = useState(false);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigRequestOpen, setSigRequestOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const dbNotes = useCollection<any>("creditNotes");
  const dbCustomers = useCollection<any>("customers", "name");
  const creditNotes: CreditNote[] = useMemo(
    () => dbNotes.slice().sort((a, b) => b.id - a.id).map((d) => ({
      id: d.id, name: dbCustomers.find((c) => c.id === d.customerId)?.name || "—",
      number: d.number, note: d.notes || "No Notes", date: d.date, amount: fmtMoney(d.total), status: d.status || "Unused",
    })),
    [dbNotes, dbCustomers],
  );

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = creditNotes.filter(
      (i) =>
        (statusFilter === "All" || i.status === statusFilter) &&
        (customerFilter === null || i.name === customerFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Total") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Credit Note #") r = a.id - b.id;
      else if (sortBy === "Status") r = a.status.localeCompare(b.status);
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.name.localeCompare(b.name);
      else r = a.id - b.id; // Credit note date
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [creditNotes, sortBy, sortDir, statusFilter, customerFilter, search]);

  const selected = creditNotes.find((i) => i.id === selectedId) || creditNotes[0];

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const selectedDb: any = dbNotes.find((d) => d.id === (selected?.id ?? selectedId)) || {};
  const selectedCustomer: any = dbCustomers.find((c) => c.id === selectedDb.customerId) || {};
  const dbInvoices = useCollection<any>("invoices");
  const openInvoices = dbInvoices.filter((i) => i.customerId === selectedDb.customerId && (i.amountDue || 0) > 0);
  const usedFor = (id: number) => dbNotes.find((d) => d.id === id)?.amountUsed || 0;
  const unusedFor = (cn: CreditNote) => num(cn.amount) - usedFor(cn.id);
  const isApplied = selected ? usedFor(selected.id) > 0 : false;

  /* Append an event to the credit note's activity log. */
  const logActivity = async (kind: string, text: string) => {
    const rec = dbNotes.find((d) => d.id === selectedDb.id);
    await repo.update("creditNotes", selectedDb.id, { activity: [...(rec?.activity || []), { kind, text, ts: Date.now(), dateLabel: nowLabel() }] });
  };
  const duplicateAsCreditNote = async () => {
    const n = await nextNumber("creditNotes");
    const id = await repo.add("creditNotes", {
      customerId: selectedDb.customerId, date: selectedDb.date, due: selectedDb.due, ts: Date.now(),
      number: "#" + n, status: "Unused", items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0,
      tax: selectedDb.tax || 0, total: selectedDb.total || 0, amountUsed: 0, inlineDiscount: selectedDb.inlineDiscount || 0,
      notes: selectedDb.notes || "", terms: selectedDb.terms || "",
    });
    setSelectedId(id);
    showToast("Credit note duplicated", "success");
  };
  const trashCurrent = async () => {
    await repo.remove("creditNotes", selectedDb.id);
    showToast(`Credit Note ${selectedDb.number} moved to trash`, "success");
    setSelectedId(creditNotes.find((c) => c.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };
  const trashSelectedCn = async () => {
    const ids = [...checked];
    await repo.removeMany("creditNotes", ids);
    showToast(`${ids.length} credit ${ids.length === 1 ? "note" : "notes"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(creditNotes.find((c) => !ids.includes(c.id))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    await repo.update("creditNotes", selectedDb.id, { signature: data.image, signatureName: data.name, signatureTitle: data.title, signatureDate: data.date });
    await logActivity("status", `Customer signature added to Credit Note ${selectedDb.number}.`);
    showToast("Signature saved", "success");
  };

  const listUnusedTotal = filtered.reduce((s, i) => s + unusedFor(i), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = creditNotes.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  /** Apply the credit to a real invoice: reduce its due, mark the credit used. */
  const applyToInvoice = async (invoiceId: number, amount: number) => {
    const inv = dbInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const newDue = Math.max(0, (inv.amountDue || 0) - amount);
    await repo.update("invoices", invoiceId, {
      amountDue: +newDue.toFixed(2),
      amountPaid: +((inv.amountPaid || 0) + amount).toFixed(2),
      ...(newDue === 0 ? { status: "Paid" } : {}),
    });
    const newUsed = (selectedDb.amountUsed || 0) + amount;
    const total = selectedDb.total || 0;
    await repo.update("creditNotes", selectedDb.id, {
      amountUsed: +newUsed.toFixed(2),
      appliedInvoiceNo: inv.number,
      status: newUsed >= total ? "Used" : "Partially Used",
    });
    await logActivity("sent", `Credit Note ${selectedDb.number} applied to invoice ${inv.number}.`);
    showToast(`${money(amount)} applied to invoice ${inv.number}`, "success");
    setModal(null);
  };

  const actionIcons: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: Settings, title: "Settings", onClick: () => setModal("settings") },
    { icon: expanded ? CircleChevronUp : CircleChevronDown, title: expanded ? "Collapse" : "Expand", onClick: () => setExpanded((v) => !v) },
    { icon: SlidersHorizontal, title: "PDF & Print Settings", onClick: () => setModal("pdfSettings") },
    { icon: Pencil, title: "Edit", onClick: () => setEditOpen(true) },
    { icon: PenTool, title: "Customer Signature", onClick: () => setSigOpen(true) },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => { logActivity("printed", `Credit Note ${selectedDb.number} printed.`); setModal("preview"); } },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen) return <ListEmptyState title="No credit notes yet" onCreate={() => setCreateOpen(true)} createLabel="New Credit Note" />;

  return (
    <div className="flex h-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select credit notes to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Credit Notes</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}

        {/* search */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search credit notes..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200">
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
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Customer{customerFilter ? ` | ${customerFilter.split(" ")[0]}` : " | All"}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => (
              <>
                <button onClick={() => { setCustomerFilter(null); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">All Customers {customerFilter === null && <Check className="w-4 h-4 text-blue-600" />}</button>
                <div className="px-3 py-1.5 border-y border-gray-200">
                  <input placeholder="Search Customer" className="w-full px-2 py-1 text-xs bg-gray-100 rounded focus:outline-none" />
                </div>
                {customerList.map((c) => (
                  <button key={c} onClick={() => { setCustomerFilter(c); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{c} {customerFilter === c && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
              </>
            )}
          </Dropdown>
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Credit note date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => dateRanges.map((d) => (
              <button key={d} onClick={() => { setDateFilter(d); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{d} {d === dateFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((p) => {
            const active = !selectMode && !createOpen && !editOpen && p.id === selectedId;
            const isChecked = checked.has(p.id);
            const applied = usedFor(p.id) > 0;
            return (
              <button key={p.id} onClick={() => (selectMode ? toggleRow(p.id) : (setSelectedId(p.id), setCreateOpen(false), setEditOpen(false)))}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
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
                  <span className={`text-sm font-semibold mt-0.5 ${applied ? "text-green-600" : "text-gray-900"}`}>{applied ? money(unusedFor(p)) : p.amount}</span>
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
          <div className="text-xs text-gray-500">{filtered.length} Credit Notes</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {createOpen ? (
        <CreateDocForm collection="creditNotes" title="New Credit Note" party="customers" creditTotals onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editOpen ? (
        <CreateDocForm key={selectedId} collection="creditNotes" title="Edit Credit Note" party="customers" creditTotals record={selectedDb} onClose={() => setEditOpen(false)} onSaved={(id) => { setEditOpen(false); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} Credit {checked.size === 1 ? "Note" : "Notes"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative m-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">{selected.name}</h1>
                <button className="text-xs text-blue-600 hover:text-blue-700 underline">View Contact</button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                {/* ⋮ menu (reference: WhatsApp / Duplicate ▸ / Apply to Invoice / Signature Request / Activity Log / Trash) */}
                <Dropdown align="right" panelClass="min-w-[200px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <div className="py-1">
                      <button onClick={() => { showToast("Opening WhatsApp…", "info"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button>
                      <div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {dupOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[170px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            <button onClick={() => { duplicateAsCreditNote(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">As Credit Note</button>
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setModal("apply"); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Apply to Invoice</button>
                      <button onClick={() => { setSigRequestOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Signature Request</button>
                      <button onClick={() => { setActivityOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-200">Activity Log</button>
                      <button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button>
                    </div>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* Expandable info panel (chevron toggle) */}
            {expanded && (
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-12">
                <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                <div><div className="text-xs text-gray-500">Credit note date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                {isApplied && (
                  <div><div className="text-xs text-gray-500">Settled On</div><button onClick={() => selectedDb.appliedInvoiceNo && navigate("/sales/sales-invoice", { state: { selectedId: parseInt(String(selectedDb.appliedInvoiceNo).replace("#", ""), 10) } })} className="text-sm font-semibold text-blue-600 hover:underline">{selectedDb.appliedInvoiceNo || "—"}</button></div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{selected.amount}</span>
                <span className={`mt-1 px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
              </div>
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
                    <tr key={idx} className="border-b border-gray-200 align-top">
                      <td className="px-5 py-3 text-gray-700">{idx + 1}</td>
                      <td className="px-2 py-3">
                        <div className="font-semibold text-gray-900">{it.name}</div>
                        {it.description && <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>}
                      </td>
                      <td className="px-2 py-3 text-right text-gray-800">{it.qty ?? 1}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(it.rate)}</td>
                      <td className="px-2 py-3 text-gray-800">{CN_TAX_NAME[it.taxId || 1]}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{it.discount ? `${it.discount}%` : "—"}</td>
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
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Notes</label>
                  <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{selectedDb.notes || "—"}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Internal Notes</label>
                  <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{selectedDb.internalNotes || "—"}</div>
                </div>
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
                    <span>{CN_TAX_NAME[Number(taxId)]} {CN_TAX_RATE[Number(taxId)]}% on {fmtMoney(base as number)}</span>
                    <span>{fmtMoney(((base as number) * (CN_TAX_RATE[Number(taxId)] || 0)) / 100)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-200"><span className="text-gray-700">Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.total)}</span></div>
                <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Amount Used</span><span>{money(usedFor(selected.id))}</span></div>
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Amount Unused</span><span className="font-semibold text-gray-900">{money(unusedFor(selected))}</span></div>
              </div>
            </div>

            {/* saved signature (shows after Add Signature) */}
            <SignatureBlock record={selectedDb} label="Customer Signature" />

            {/* status corner ribbon */}
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 text-[10px] font-semibold py-1 text-center ${RIBBON_BG[selected.status]}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Credit Note" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbNotes.find((x) => x.id === selectedId) || {}; const pp: any = dbCustomers.find((x) => x.id === d.customerId) || {}; const pn = pp.name || "—"; return <PdfPreviewModal docType="creditNote" recordId={d.id} title={`Credit Note `} onClose={() => setModal(null)} />; })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} cn={selected} />}
      {modal === "apply" && <ApplyModal onClose={() => setModal(null)} cn={selected} unused={unusedFor(selected)} openInvoices={openInvoices} onApply={applyToInvoice} />}
      {modal === "pdfSettings" && <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="creditNote" />}
      {sigOpen && (
        <SignatureModal
          heading="Customer Signature"
          defaultName={selectedCustomer.contact || selectedCustomer.name || ""}
          onDone={saveSignature}
          onClose={() => setSigOpen(false)}
        />
      )}
      {sigRequestOpen && (
        <SignatureRequestModal
          docLabel="Credit Note"
          number={selectedDb.number || ""}
          customer={selectedCustomer}
          onClose={() => setSigRequestOpen(false)}
          onSend={() => { logActivity("sent", `Signature request for Credit Note ${selectedDb.number} sent.`); showToast("Signature request sent", "success"); }}
        />
      )}
      {activityOpen && <ActivityLogModal docLabel="Credit Note" record={selectedDb} onClose={() => setActivityOpen(false)} />}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this credit note?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these credit notes?" onNo={() => setConfirmAction(null)} onYes={trashSelectedCn} />
      )}
    </div>
  );
};

export default CreditNotes;
