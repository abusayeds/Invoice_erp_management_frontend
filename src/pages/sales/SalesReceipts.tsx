/**
 * File: src/pages/sales/SalesReceipts.tsx
 * Sales Receipt — master/detail layout matching the reference design.
 * Left: list (search, sort, status/customer/date filters, selection mode).
 * Right: detail (action icons + ⋮ menu, meta with Payment Type, line items,
 *        terms/notes/attachment, totals) and modals (Preview/Email/Settings).
 * A sales receipt records a completed payment — there is NO status badge and
 * NO payment icon; the meta carries a Payment Type instead.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useNavigate } from "react-router-dom";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { SignatureModal } from "@/components/modals/SignatureModal";
import { SignatureRequestModal } from "@/components/modals/SignatureRequestModal";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { ActivityLogModal } from "@/components/modals/ActivityLogModal";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { showToast } from "@/utils/toast";
import { useCollection, repo, nextNumber, money as fmtMoney, CreateDocForm, DocPreview , PdfPreviewModal} from "@/lib/db";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Settings,
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
  CircleChevronUp,
  CircleChevronDown,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
interface Receipt {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  amount: string;
}

const receipts: Receipt[] = [
  { id: 8, name: "Dolor perspiciatis", number: "#8", note: "hi title, In doloribus itaque", date: "Jun 17, 2026", amount: "$20,178.72" },
  { id: 7, name: "Sadamon Service", number: "#7", note: "hi title, In doloribus itaque", date: "Jun 17, 2026", amount: "$0.00" },
  { id: 6, name: "Aliqua In vel quod", number: "#6", note: "hi title, In doloribus itaque", date: "Jun 16, 2026", amount: "$0.00" },
  { id: 5, name: "SMT", number: "#5", note: "hi title, In doloribus itaque", date: "Jun 16, 2026", amount: "$1,725.00" },
  { id: 4, name: "sayed cpy 1", number: "#4", note: "hi title, In doloribus itaque", date: "Jun 16, 2026", amount: "$450.00" },
  { id: 3, name: "sayed cpy", number: "#3", note: "hi title, In doloribus itaque", date: "Jun 16, 2026", amount: "$139.60" },
  { id: 2, name: "SMT", number: "#2", note: "hi title, fghd", date: "Jun 16, 2026", amount: "$1,700.00" },
  { id: 1, name: "STT", number: "#1", note: "hi title, sfgb", date: "Jun 16, 2026", amount: "$0.00" },
];


const SR_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
const SR_TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const duplicateAs = ["As Sales Receipt", "As Invoice", "As Estimate"];
const nowLabel = () => "Today " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const sortFields = ["Name", "First Name", "Last Name", "Sales receipt date", "Sales Receipt #", "Total"];
const sortDirections = ["Ascending", "Descending"];
const statusList = ["All", "Trash"];
const customerList = ["bdcalling", "Dolor perspiciatis", "Sadamon Service", "Aliqua In vel quod", "SMT", "sayed cpy", "sayed cpy 1", "STT"];
const dateRanges = ["All", "Today", "This Week", "Last Week", "This Month", "Last 30 Days", "Last Month", "Last 90 Days", "This Year", "Last Year", "Date Range"];

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

/* ── SALES RECEIPT preview (white document) ────────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; r: Receipt }> = ({ onClose, r }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Sales Receipt {r.number}</h3>
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
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">SALES RECEIPT</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[["Sales Receipt #", r.number.replace("#", "")], ["Sales receipt date", r.date], ["Payment Type", "Vitae voluptatum acc"], ["Total", r.amount]].map(([k, v]) => (
                  <tr key={k}><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-6 px-4 py-3 text-sm border-t border-gray-300">
            <div>
              <div className="font-bold">Received From:</div>
              <div className="font-semibold">{r.name}</div>
              <div>dk dhaka 12540</div>
              <div>Bangladesh</div>
            </div>
            <div>
              <div className="font-bold">Ship To</div>
              <div>dk dhaka 12540 Bangladesh</div>
            </div>
          </div>
          <table className="w-full text-xs border-t border-gray-300">
            <thead>
              <tr>{["Sr. No.", "Products", "Quantity", "Unit Price", "Tax", "Amount"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">Drive</div><div className="text-gray-500">hi products , this is drive</div></td>
                <td className="border border-gray-300 px-2 py-2">11 cm</td>
                <td className="border border-gray-300 px-2 py-2">$236.00</td>
                <td className="border border-gray-300 px-2 py-2">Test Tax</td>
                <td className="border border-gray-300 px-2 py-2">$2,596.00</td>
              </tr>
            </tbody>
          </table>
          <table className="w-full text-xs">
            <thead>
              <tr>{["Sr. No.", "Services", "Quantity", "Rate", "Tax", "Amount"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">sta</div><div className="text-gray-500">hlw .........</div></td>
                <td className="border border-gray-300 px-2 py-2">122 ft</td>
                <td className="border border-gray-300 px-2 py-2">$56.00</td>
                <td className="border border-gray-300 px-2 py-2">Test Tax, new test tax</td>
                <td className="border border-gray-300 px-2 py-2">$6,832.00</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end px-4 py-3 text-sm">
            <table className="text-right">
              <tbody>
                <tr><td className="px-3 py-1 font-bold">Sub Total</td><td className="px-3 py-1">$9,428.00</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">new test tax 58% on $6,832.00</td><td className="px-3 py-1">$3,962.56</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">Test Tax 72% on $9,428.00</td><td className="px-3 py-1">$6,788.16</td></tr>
                <tr className="border-t border-gray-300"><td className="px-3 py-1 font-bold">Total</td><td className="px-3 py-1 font-bold">$20,178.72</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-300 text-sm">
            <div className="font-bold">Terms &amp; Conditions</div>
            <div className="text-gray-700">Pariatur Irure quia</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; r: Receipt }> = ({ onClose, r }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Sales Receipt {r.number} from info</h3>
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
        <input defaultValue={`Sales Receipt ${r.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {r.name}</p>
          <p>Sales Receipt {r.number}<br />Total Amount: {r.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Sales Receipt {r.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
export const SalesReceipts: React.FC = () => {
  const [selectedId, setSelectedId] = useState(8);
  const [sortBy, setSortBy] = useState("Sales receipt date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "pdfSettings">(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigRequestOpen, setSigRequestOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);
  const navigate = useNavigate();

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const dbReceipts = useCollection<any>("salesReceipts");
  const dbCustomers = useCollection<any>("customers", "name");
  const receipts: Receipt[] = useMemo(
    () => dbReceipts.slice().sort((a, b) => b.id - a.id).map((d) => ({
      id: d.id, name: dbCustomers.find((c) => c.id === d.customerId)?.name || "—",
      number: d.number, note: d.notes || "No Notes", date: d.date, amount: fmtMoney(d.total), method: d.method || "Cash",
    })),
    [dbReceipts, dbCustomers],
  );

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = receipts.filter(
      (i) =>
        (customerFilter === null || i.name === customerFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Total") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Sales Receipt #") r = a.id - b.id;
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.name.localeCompare(b.name);
      else r = a.id - b.id; // Sales receipt date
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [receipts, sortBy, sortDir, customerFilter, search]);

  const selected = receipts.find((i) => i.id === selectedId) || receipts[0];
  const selectedDb: any = dbReceipts.find((d) => d.id === (selected?.id ?? selectedId)) || {};
  const selectedCustomer: any = dbCustomers.find((c) => c.id === selectedDb.customerId) || {};

  const logActivity = async (kind: string, text: string) => {
    const rec = dbReceipts.find((d) => d.id === selectedDb.id);
    await repo.update("salesReceipts", selectedDb.id, { activity: [...(rec?.activity || []), { kind, text, ts: Date.now(), dateLabel: nowLabel() }] });
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    if (!selectedDb?.id) return;
    await repo.update("salesReceipts", selectedDb.id, { signature: data.image, signatureName: data.name, signatureTitle: data.title, signatureDate: data.date });
    await logActivity("status", `Customer signature added to Sales Receipt ${selectedDb.number}.`);
    showToast("Signature saved", "success");
  };
  /* ⋮ Duplicate ▸ — copy this receipt into another document collection. */
  const duplicateReceiptAs = async (label: string) => {
    const base = {
      customerId: selectedDb.customerId, date: selectedDb.date, due: selectedDb.due, ts: Date.now(),
      items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0, tax: selectedDb.tax || 0,
      total: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "", inlineDiscount: selectedDb.inlineDiscount || 0,
    };
    if (label === "As Sales Receipt") {
      const n = await nextNumber("salesReceipts");
      const id = await repo.add("salesReceipts", { ...base, number: "#" + n, paymentType: selectedDb.paymentType || "" });
      setSelectedId(id);
      showToast("Sales receipt duplicated", "success");
    } else if (label === "As Invoice") {
      const n = await nextNumber("invoices");
      const id = await repo.add("invoices", { ...base, number: "#" + n, status: "Draft", shipping: 0, amountPaid: 0, amountDue: base.total });
      showToast("Invoice created", "success");
      navigate("/sales/sales-invoice", { state: { selectedId: id } });
    } else if (label === "As Estimate") {
      const n = await nextNumber("estimates");
      const id = await repo.add("estimates", { ...base, number: "#" + n, status: "Draft" });
      showToast("Estimate created", "success");
      navigate("/sales/estimates", { state: { selectedId: id } });
    }
  };
  const trashCurrent = async () => {
    await repo.remove("salesReceipts", selectedDb.id);
    showToast(`Sales Receipt ${selectedDb.number} moved to trash`, "success");
    setSelectedId(receipts.find((r) => r.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };
  const trashSelectedReceipts = async () => {
    const ids = [...checked];
    await repo.removeMany("salesReceipts", ids);
    showToast(`${ids.length} sales ${ids.length === 1 ? "receipt" : "receipts"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(receipts.find((r) => !ids.includes(r.id))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = receipts.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
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
    { icon: Pencil, title: "Edit", onClick: () => setEditOpen(true) },
    { icon: PenTool, title: "Customer Signature", onClick: () => setSigOpen(true) },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => { logActivity("printed", `Sales Receipt ${selectedDb.number} printed.`); setModal("preview"); } },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen) return <ListEmptyState title="No sales receipts yet" onCreate={() => setCreateOpen(true)} createLabel="New Sales Receipt" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select sales receipts to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Sales Receipts</h2>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sales receipts..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
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
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Sales receipt date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
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
            return (
              <button key={p.id} onClick={() => (selectMode ? toggleRow(p.id) : (setSelectedId(p.id), setCreateOpen(false), setEditOpen(false)))}
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
                  <span className="text-sm font-semibold text-gray-900 mt-1">{p.amount}</span>
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
          <div className="text-sm font-semibold text-gray-900">{money(listTotal)}</div>
          <div className="text-xs text-gray-500">{filtered.length} Sales Receipts</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {createOpen ? (
        <CreateDocForm collection="salesReceipts" title="New Sales Receipt" party="customers" paymentType onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editOpen ? (
        <CreateDocForm key={selectedId} collection="salesReceipts" title="Edit Sales Receipt" party="customers" paymentType record={selectedDb} onClose={() => setEditOpen(false)} onSaved={(id) => { setEditOpen(false); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} Sales {checked.size === 1 ? "Receipt" : "Receipts"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
                <button className="text-xs text-blue-600 hover:text-blue-700 underline">{selectedCustomer.contact || selectedCustomer.email || "View Contact"}</button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                {/* ⋮ menu */}
                <Dropdown align="right" panelClass="w-56" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <>
                      <button onClick={() => { showToast("Opening WhatsApp…", "info"); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-400" /></button>
                      {/* Duplicate submenu (hover flyout) */}
                      <div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}>
                        <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><span className="flex items-center gap-2"><Copy className="w-4 h-4 text-gray-400" /> Duplicate</span> <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {dupOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[170px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {duplicateAs.map((s) => (
                              <button key={s} onClick={() => { duplicateReceiptAs(s); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setSigRequestOpen(true); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><Signature className="w-4 h-4 text-gray-400" /> Signature Request</button>
                      <button onClick={() => { setActivityOpen(true); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><History className="w-4 h-4 text-gray-400" /> Activity Log</button>
                      <button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200"><Trash2 className="w-4 h-4" /> Trash</button>
                    </>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* meta row — #, Sales receipt date, Payment Type (chevron toggle) */}
            {expanded && (
            <div className="flex items-center gap-12 px-5 py-3 border-b border-gray-300">
              <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{fmtMoney(selectedDb.total)}</div></div>
              <div><div className="text-xs text-gray-500">Sales receipt date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
              <div><div className="text-xs text-gray-500">Payment Type</div><div className="text-sm font-semibold text-gray-900">{selectedDb.paymentType || "—"}</div></div>
            </div>
            )}

            {/* line items (live from the record) */}
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
                      <td className="px-2 py-3">
                        <div className="font-semibold text-gray-900">{it.name}</div>
                        {it.description && <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>}
                      </td>
                      <td className="px-2 py-3 text-right text-gray-800">{it.qty ?? 1}{it.unit ? ` ${it.unit}` : ""}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(it.rate)}</td>
                      <td className="px-2 py-3 text-gray-800">{SR_TAX_NAME[it.taxId || 1]}</td>
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
                    <span>{SR_TAX_NAME[Number(taxId)]} {SR_TAX_RATE[Number(taxId)]}% on {fmtMoney(base as number)}</span>
                    <span>{fmtMoney(((base as number) * (SR_TAX_RATE[Number(taxId)] || 0)) / 100)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.total)}</span></div>
              </div>
            </div>

            {/* saved customer signature (shows after Add Signature) */}
            <SignatureBlock record={selectedDb} label="Customer Signature" />
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Sales Receipt" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbReceipts.find((x) => x.id === selectedId) || {}; const pp: any = dbCustomers.find((x) => x.id === d.customerId) || {}; const pn = pp.name || "—"; return <PdfPreviewModal docType="salesReceipt" recordId={d.id} title={`Sales Receipt `} onClose={() => setModal(null)} />; })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} r={selected} />}
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
          docLabel="Sales Receipt"
          number={selectedDb.number || ""}
          customer={selectedCustomer}
          onClose={() => setSigRequestOpen(false)}
          onSend={() => { logActivity("sent", `Signature request for Sales Receipt ${selectedDb.number} sent.`); showToast("Signature request sent", "success"); }}
        />
      )}
      {modal === "pdfSettings" && (
        <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="salesReceipt" />
      )}
      {activityOpen && <ActivityLogModal docLabel="Sales Receipt" record={selectedDb} onClose={() => setActivityOpen(false)} />}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this sales receipt?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these sales receipts?" onNo={() => setConfirmAction(null)} onYes={trashSelectedReceipts} />
      )}
    </div>
  );
};

export default SalesReceipts;
