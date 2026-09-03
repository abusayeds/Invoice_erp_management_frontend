/**
 * File: src/pages/sales/Proformainvoices.tsx
 * Proforma Invoice — master/detail layout matching the reference design.
 * Left: list (search, sort, status/customer filters, selection mode).
 * Right: detail (action icons + ⋮ menu, billing, line items, totals,
 *        attachment, Sent/Draft ribbon) and modals (Preview/Email/Settings).
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, money as fmtMoney, CreateDocForm, DocPreview, repo, nextNumber , PdfPreviewModal} from "@/lib/db";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { SignatureModal } from "@/components/modals/SignatureModal";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
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
  RefreshCcw,
  Copy,
  Signature,
  History,
  CircleChevronUp,
  CircleChevronDown,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Draft" | "Sent" | "Invoiced" | "Cancelled";

interface Proforma {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  amount: string;
  status: Status;
}

const proformas: Proforma[] = [
  { id: 8, name: "Dignissimos quae ull", number: "#8", note: "Quia veritatis labor", date: "Jun 17, 2026", amount: "$0.00", status: "Sent" },
  { id: 7, name: "Harum ut dolore aliq", number: "#7", note: "Sit quos sint quos e", date: "Jun 17, 2026", amount: "$140.00", status: "Sent" },
  { id: 6, name: "Dignissimos quae ull", number: "#6", note: "No Notes", date: "Jun 16, 2026", amount: "$6,142.00", status: "Draft" },
  { id: 5, name: "STT", number: "#5", note: "No Notes", date: "Jun 16, 2026", amount: "$2,930.00", status: "Draft" },
  { id: 4, name: "sayed cpy", number: "#4", note: "No Notes", date: "Jun 16, 2026", amount: "$300.00", status: "Draft" },
  { id: 3, name: "Harum ut dolore aliq", number: "#3", note: "No Notes", date: "Jun 16, 2026", amount: "$460.50", status: "Draft" },
  { id: 2, name: "STA", number: "#2", note: "No Notes", date: "Jun 16, 2026", amount: "$0.00", status: "Draft" },
  { id: 1, name: "sayed cpy 1", number: "#1", note: "No Notes", date: "Jun 16, 2026", amount: "$0.00", status: "Draft" },
];

interface LineItem {
  no: number;
  name: string;
  sub?: string;
  qty: string;
  mrp: string;
  rate: string;
  tax: string;
  amount: string;
}
const lineItems: LineItem[] = [
  { no: 1, name: "Quia veritatis labor", sub: "this is a service 1", qty: "11 cm", mrp: "$0.00", rate: "$0.00", tax: "Test Tax, new test …", amount: "$0.00" },
  { no: 2, name: "Drive", sub: "the is a service 2", qty: "10 box", mrp: "$0.00", rate: "$0.00", tax: "Test Tax, new test …", amount: "$0.00" },
];

const sortFields = ["Proforma Invoice date", "Due Date", "Amount", "Proforma Invoice #", "Status", "Customer"];
const statusList = ["All", "Draft", "Invoiced", "Cancelled", "Trash"];
const customerList = ["Dignissimos quae ull", "Harum ut dolore aliq", "STA", "STT", "sayed cpy", "sayed cpy 1", "SMT"];

const PF_TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const PF_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };

const STATUS_BADGE: Record<Status, string> = {
  Draft: "bg-gray-600 text-white",
  Sent: "bg-gray-900 text-white",
  Invoiced: "bg-green-500 text-white",
  Cancelled: "bg-red-500 text-white",
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

/* ── PROFORMA INVOICE preview (white document) ─────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; pf: Proforma }> = ({ onClose, pf }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Proforma Invoice{pf.number}</h3>
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
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">PROFORMA INVOICE</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[["Proforma Invoice #", pf.number.replace("#", "")], ["Proforma Invoice date", pf.date], ["Total", pf.amount]].map(([k, v]) => (
                  <tr key={k}><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-6 px-4 py-3 text-sm border-t border-gray-300">
            <div>
              <div className="font-bold">Proforma Invoice To:</div>
              <div className="font-semibold">{pf.name}</div>
              <div>dk dhaka 12540</div>
              <div>Bangladesh</div>
            </div>
            <div>
              <div className="font-bold">Ship To</div>
              <div>dk dhaka 12540 Bangladesh</div>
              <div className="font-bold mt-1">Shipping Method:</div>
              <div>Priority Shipping</div>
            </div>
          </div>
          <table className="w-full text-xs border-t border-gray-300">
            <thead>
              <tr>{["Sr. No.", "Products", "Quantity", "Unit Price", "Test Tax", "Amount"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">Drive</div><div className="text-gray-500">the is a service 2</div></td>
                <td className="border border-gray-300 px-2 py-2">10 box</td>
                <td className="border border-gray-300 px-2 py-2">$0.00</td>
                <td className="border border-gray-300 px-2 py-2">$0.00</td>
                <td className="border border-gray-300 px-2 py-2">$0.00</td>
              </tr>
            </tbody>
          </table>
          <table className="w-full text-xs">
            <thead>
              <tr>{["Sr. No.", "Services", "Quantity", "Rate", "Test Tax", "Amount"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">Quia veritatis labor</div><div className="text-gray-500">this is a service 1</div></td>
                <td className="border border-gray-300 px-2 py-2">11 cm</td>
                <td className="border border-gray-300 px-2 py-2">$0.00</td>
                <td className="border border-gray-300 px-2 py-2">$0.00</td>
                <td className="border border-gray-300 px-2 py-2">$0.00</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end px-4 py-3 text-sm">
            <table className="text-right">
              <tbody>
                <tr><td className="px-3 py-1 font-bold">Sub Total</td><td className="px-3 py-1">$0.00</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">Total Qty</td><td className="px-3 py-1">2.00</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">Test Tax 72% on $0.00</td><td className="px-3 py-1">$0.00</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">Round Off</td><td className="px-3 py-1">$0.00</td></tr>
                <tr className="border-t border-gray-300"><td className="px-3 py-1 font-bold">Total</td><td className="px-3 py-1 font-bold">$0.00</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-300 text-sm">
            <div className="font-bold">Terms &amp; Conditions</div>
            <div className="text-gray-700">Eos ab vel officiis</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; pf: Proforma }> = ({ onClose, pf }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-900">Proforma Invoice {pf.number} from info</h3>
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
        <input defaultValue={`Proforma Invoice ${pf.number} from info`} className="w-full border-b border-gray-200 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-200 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {pf.name}</p>
          <p>Proforma Invoice {pf.number}<br />Total Amount: {pf.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Proforma Invoice {pf.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
export const ProformaInvoices: React.FC = () => {
  // Opened from a Duplicate action / activity link → pre-select that proforma invoice.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 8);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Proforma Invoice date");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "pdfSettings">(null);
  const [markAsOpen, setMarkAsOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  const dbProformas = useCollection<any>("proformas");
  const dbCustomers = useCollection<any>("customers", "name");
  const proformas: Proforma[] = useMemo(
    () => dbProformas.slice().sort((a, b) => b.id - a.id).map((d) => ({
      id: d.id, name: dbCustomers.find((c) => c.id === d.customerId)?.name || "—",
      number: d.number, note: d.notes || "No Notes", date: d.date, amount: fmtMoney(d.total), status: d.status,
    })),
    [dbProformas, dbCustomers],
  );

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = proformas.filter(
      (i) =>
        (statusFilter === "All" || i.status === statusFilter) &&
        (customerFilter === null || i.name === customerFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      if (sortBy === "Amount") return toNum(b.amount) - toNum(a.amount);
      if (sortBy === "Proforma Invoice #") return b.id - a.id;
      if (sortBy === "Status") return a.status.localeCompare(b.status);
      if (sortBy === "Customer") return a.name.localeCompare(b.name);
      return b.id - a.id;
    });
    return list;
  }, [proformas, sortBy, statusFilter, customerFilter, search]);

  const selected = proformas.find((i) => i.id === selectedId) || proformas[0];

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = proformas.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const selectedDb: any = dbProformas.find((p) => p.id === (selected?.id ?? selectedId)) || {};
  const selectedCustomer: any = dbCustomers.find((c) => c.id === selectedDb.customerId) || {};

  /* ── reference actions ─────────────────────────────────────────── */
  const markAs = async (status: Status) => {
    await repo.update("proformas", selectedDb.id, { status });
    showToast(`Proforma invoice marked as ${status}`, "success");
  };
  const convertToInvoice = async () => {
    const n = await nextNumber("invoices");
    const id = await repo.add("invoices", {
      number: "#" + n, customerId: selectedDb.customerId, date: selectedDb.date, due: selectedDb.due || selectedDb.date,
      ts: Date.now(), status: "Draft", items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0,
      tax: selectedDb.tax || 0, shipping: 0, total: selectedDb.total || 0, amountPaid: 0,
      amountDue: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "",
    });
    await repo.update("proformas", selectedDb.id, { status: "Invoiced" });
    showToast("Converted to invoice", "success");
    navigate("/sales/sales-invoice", { state: { selectedId: id } });
  };
  const duplicateAs = async (label: string) => {
    const base = {
      customerId: selectedDb.customerId, date: selectedDb.date, due: selectedDb.due, ts: Date.now(),
      items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0, tax: selectedDb.tax || 0,
      total: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "",
    };
    if (label === "As Invoice") {
      const n = await nextNumber("invoices");
      const id = await repo.add("invoices", { ...base, number: "#" + n, status: "Draft", amountPaid: 0, amountDue: base.total });
      showToast("Invoice created", "success");
      navigate("/sales/sales-invoice", { state: { selectedId: id } });
    } else if (label === "As Proforma Invoice") {
      const n = await nextNumber("proformas");
      const id = await repo.add("proformas", { ...base, number: "#" + n, status: "Draft", amountPaid: 0, amountDue: base.total });
      setSelectedId(id);
      showToast("Proforma invoice duplicated", "success");
    } else if (label === "As Purchase Order") {
      const vendors = await repo.getAll("vendors");
      const n = await nextNumber("purchaseOrders");
      const id = await repo.add("purchaseOrders", { ...base, number: "#" + n, vendorId: vendors[0]?.id ?? 1, status: "Draft", billStatus: "Not Billed", amountPaid: 0, amountDue: base.total });
      showToast("Purchase order created", "success");
      navigate("/purchase/purchase-orders", { state: { selectedId: id } });
    }
  };
  const trashCurrent = async () => {
    await repo.remove("proformas", selectedDb.id);
    showToast(`Proforma invoice ${selectedDb.number} moved to trash`, "success");
    setSelectedId(proformas.find((p) => p.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };
  const trashSelected = async () => {
    const ids = [...checked];
    await repo.removeMany("proformas", ids);
    showToast(`${ids.length} proforma ${ids.length === 1 ? "invoice" : "invoices"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(proformas.find((p) => !ids.includes(p.id))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    await repo.update("proformas", selectedDb.id, { signature: data.image, signatureName: data.name, signatureTitle: data.title, signatureDate: data.date });
    showToast("Signature saved", "success");
  };

  const actionIcons: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: Settings, title: "Settings", onClick: () => setModal("settings") },
    { icon: expanded ? CircleChevronUp : CircleChevronDown, title: expanded ? "Collapse" : "Expand", onClick: () => setExpanded((v) => !v) },
    { icon: SlidersHorizontal, title: "PDF & Print Settings", onClick: () => setModal("pdfSettings") },
    { icon: Pencil, title: "Edit", onClick: () => selectedDb?.id && setEditRecord(selectedDb) },
    { icon: PenTool, title: "Customer Signature", onClick: () => setSigOpen(true) },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => setModal("preview") },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen) return <ListEmptyState title="No proforma invoices yet" onCreate={() => setCreateOpen(true)} createLabel="New Proforma Invoice" />;

  return (
    <div className="flex h-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select proforma invoices to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Proforma Invoices</h2>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proforma invoices..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200">
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
            {(close) => sortFields.map((o) => (
              <button key={o} onClick={() => { setSortBy(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>
            {(close) => statusList.map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s === "Trash" ? statusFilter : s); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${s === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>{s} {s === statusFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Customer{customerFilter ? ` | ${customerFilter.split(" ")[0]}` : " | All"}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => (
              <>
                <button onClick={() => { setCustomerFilter(null); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">All {customerFilter === null && <Check className="w-4 h-4 text-blue-600" />}</button>
                {customerList.map((c) => (
                  <button key={c} onClick={() => { setCustomerFilter(c); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{c} {customerFilter === c && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
              </>
            )}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((p) => {
            const active = !selectMode && p.id === selectedId;
            const isChecked = checked.has(p.id);
            return (
              <button key={p.id} onClick={() => (selectMode ? toggleRow(p.id) : setSelectedId(p.id))}
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
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{p.amount}</span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                </div>
              </button>
            );
          })}
          {/* FAB */}
          {!selectMode && (
            <button onClick={() => setCreateOpen(true)} className="absolute bottom-20 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">$9,106.40</div>
          <div className="text-xs text-gray-500">{filtered.length} Proforma Invoices</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {createOpen ? (
        <CreateDocForm collection="proformas" title="New Proforma Invoice" party="customers" onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editRecord ? (
        <CreateDocForm collection="proformas" title="Edit Proforma Invoice" party="customers" record={editRecord} onClose={() => setEditRecord(null)} onSaved={(id) => { setEditRecord(null); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} Proforma {checked.size === 1 ? "Invoice" : "Invoices"} Selected</h2>
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
                {/* ⋮ menu (reference: WhatsApp / Convert to Invoice / Mark As ▸ / Duplicate ▸ / Signature Request / Activity Log / Trash) */}
                <Dropdown align="right" panelClass="min-w-[200px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <div className="py-1">
                      <button onClick={() => { showToast("Opening WhatsApp…", "info"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => { convertToInvoice(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Convert to Invoice</button>
                      {/* Mark As ▸ */}
                      <div className="relative" onMouseEnter={() => setMarkAsOpen(true)} onMouseLeave={() => setMarkAsOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Mark As <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {markAsOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[150px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {(["Draft", "Sent", "Invoiced", "Cancelled"] as Status[]).map((s) => (
                              <button key={s} onClick={() => { markAs(s); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Duplicate ▸ */}
                      <div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {dupOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[190px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {["As Invoice", "As Proforma Invoice", "As Purchase Order"].map((s) => (
                              <button key={s} onClick={() => { duplicateAs(s); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { showToast("Signature request sent", "success"); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-200">Signature Request</button>
                      <button onClick={() => { setActivityOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Activity Log</button>
                      <button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button>
                    </div>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* Expandable info panel (chevron toggle) */}
            {expanded && (
            <>
            {/* meta row */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-10">
                <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                <div><div className="text-xs text-gray-500">Proforma Invoice date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
            </div>

            {/* billing + shipping addresses (live from the customer) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-5 py-4 border-b border-gray-200">
              <div>
                <div className="text-xs text-gray-500 mb-1">Billing Address</div>
                {[selectedCustomer.street1, selectedCustomer.street2, [selectedCustomer.city, selectedCustomer.zip].filter(Boolean).join(" "), selectedCustomer.country].filter(Boolean).length
                  ? [selectedCustomer.street1, selectedCustomer.street2, [selectedCustomer.city, selectedCustomer.zip].filter(Boolean).join(" "), selectedCustomer.country].filter(Boolean).map((l: string, i: number) => (
                      <div key={i} className={`text-sm ${i === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{l}</div>
                    ))
                  : <div className="text-sm text-gray-400">—</div>}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Shipping Address</div>
                {[selectedCustomer.shipStreet1, selectedCustomer.shipStreet2, [selectedCustomer.shipCity, selectedCustomer.shipZip].filter(Boolean).join(" "), selectedCustomer.shipCountry].filter(Boolean).length
                  ? [selectedCustomer.shipStreet1, selectedCustomer.shipStreet2, [selectedCustomer.shipCity, selectedCustomer.shipZip].filter(Boolean).join(" "), selectedCustomer.shipCountry].filter(Boolean).map((l: string, i: number) => (
                      <div key={i} className={`text-sm ${i === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{l}</div>
                    ))
                  : <div className="text-sm text-gray-400">—</div>}
              </div>
            </div>

            {/* sub meta */}
            <div className="grid grid-cols-2 gap-6 px-5 py-3 border-b border-gray-200">
              <div>
                <div className="text-xs text-gray-500">Sub Title</div>
                <div className="text-sm font-semibold text-gray-900">{selectedDb.subTitle || selectedCustomer.subtitle || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Shipping Method</div>
                <div className="text-sm font-semibold text-gray-900">{selectedDb.shippingMethod || "Standard Ground"}</div>
              </div>
            </div>
            </>
            )}

            {/* line items */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left font-semibold px-5 py-2.5">Sr. No.</th>
                    <th className="text-left font-semibold px-2 py-2.5">Items</th>
                    <th className="text-right font-semibold px-2 py-2.5">Quantity</th>
                    <th className="text-right font-semibold px-2 py-2.5">MRP</th>
                    <th className="text-right font-semibold px-2 py-2.5">Rate</th>
                    <th className="text-left font-semibold px-2 py-2.5">Tax</th>
                    <th className="text-right font-semibold px-2 py-2.5">Discount</th>
                    <th className="text-right font-semibold px-5 py-2.5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDb.items || []).length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">No items</td></tr>
                  )}
                  {(selectedDb.items || []).map((it: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200 align-top">
                      <td className="px-5 py-3 text-gray-700">{idx + 1}</td>
                      <td className="px-2 py-3"><div className="font-semibold text-gray-900">{it.name}</div>{it.description && <div className="text-xs text-gray-500 mt-1">{it.description}</div>}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{it.qty ?? 1}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(0)}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(it.rate)}</td>
                      <td className="px-2 py-3 text-gray-800">{PF_TAX_NAME[it.taxId || 1]}</td>
                      <td className="px-2 py-3 text-right text-gray-500 text-xs">{it.discount ? fmtMoney(it.discount) : "—"}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtMoney(it.amount ?? (it.qty || 0) * (it.rate || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* notes + attachment + totals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
              <div>
                <label className="text-xs text-gray-500">Notes</label>
                <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{selectedDb.notes || "—"}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Attachment</label>
                <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                  <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                  <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-md overflow-hidden self-start">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.subTotal)}</span></div>
                <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Total Qty</span><span>{((selectedDb.items || []) as any[]).reduce((s, it) => s + (it.qty || 0), 0).toFixed(2)}</span></div>
                {Object.entries(
                  ((selectedDb.items || []) as any[]).reduce((acc: Record<number, number>, it: any) => {
                    const base = it.amount ?? (it.qty || 0) * (it.rate || 0);
                    acc[it.taxId || 1] = (acc[it.taxId || 1] || 0) + base;
                    return acc;
                  }, {}),
                ).map(([taxId, base]) => (
                  <div key={taxId} className="flex justify-between px-4 py-2 text-xs text-gray-500">
                    <span>{PF_TAX_NAME[Number(taxId)]} {PF_TAX_RATE[Number(taxId)]}% on {fmtMoney(base as number)}</span>
                    <span>{fmtMoney(((base as number) * (PF_TAX_RATE[Number(taxId)] || 0)) / 100)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.total)}</span></div>
              </div>
            </div>

            {/* saved signature (shows after Add Signature) */}
            <SignatureBlock record={selectedDb} label="Customer Signature" />

            {/* status corner ribbon */}
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 text-[10px] font-semibold py-1 text-center ${selected.status === "Sent" ? "bg-gray-900 text-white" : selected.status === "Draft" ? "bg-gray-600 text-white" : selected.status === "Invoiced" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Proforma Invoice" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbProformas.find((x) => x.id === selectedId) || {}; const pp: any = dbCustomers.find((x) => x.id === d.customerId) || {}; const pn = pp.name || "—"; return <PdfPreviewModal docType="proformaInvoice" recordId={d.id} title={`Proforma Invoice `} onClose={() => setModal(null)} />; })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} pf={selected} />}
      {modal === "pdfSettings" && (
        <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="proformaInvoice" />
      )}
      {sigOpen && (
        <SignatureModal
          heading="Customer Signature"
          defaultName={selectedCustomer.contact || selectedCustomer.name || ""}
          onDone={saveSignature}
          onClose={() => setSigOpen(false)}
        />
      )}
      {activityOpen && (
        <Overlay onClose={() => setActivityOpen(false)}>
          <div className="w-full max-w-md my-16 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Activity Log — Proforma Invoice {selectedDb.number}</h3>
              <button onClick={() => setActivityOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {[
                ...(selectedDb.signatureDate ? [{ text: `Customer signature added by ${selectedDb.signatureName || "customer"}.`, date: selectedDb.signatureDate }] : []),
                ...(selectedDb.status && selectedDb.status !== "Draft" ? [{ text: `Marked as ${selectedDb.status}.`, date: selectedDb.date }] : []),
                { text: `Proforma Invoice ${selectedDb.number} created.`, date: selectedDb.date },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0"><Plus className="w-4 h-4" /></div>
                  <div>
                    <div className="text-sm text-gray-800">{r.text}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Overlay>
      )}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this proforma invoice?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these proforma invoices?" onNo={() => setConfirmAction(null)} onYes={trashSelected} />
      )}
    </div>
  );
};

export default ProformaInvoices;
