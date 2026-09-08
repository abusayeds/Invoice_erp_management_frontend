/**
 * File: src/pages/sales/Estimates.tsx
 * Estimate — master/detail layout matching the reference design.
 * Left: list (search, sort, status/customer/date filters, selection mode).
 * Right: detail (action icons + ⋮ menu, status badge, line items,
 *        terms/notes/attachment, totals, status ribbon) and modals
 *        (Preview / Packing Slip / Email / Settings).
 * Statuses carry color badges (Draft/Sent/Approved/Invoiced/On Hold/…).
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
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { SignatureRequestModal } from "@/components/modals/SignatureRequestModal";
import { ActivityLogModal } from "@/components/modals/ActivityLogModal";
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
  Package,
  CircleChevronUp,
  CircleChevronDown,
  Send,
  Bold,
  Italic,
  Underline,
  Paperclip,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Draft" | "Sent" | "Approved" | "Invoiced" | "On Hold" | "Disputed" | "Declined" | "Cancelled";

interface Estimate {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  amount: string;
  status: Status;
}

const estimates: Estimate[] = [
  { id: 8, name: "Sadamon Service", number: "#8", note: "Deserunt quos nemo d", date: "Jun 17, 2026", amount: "$0.00", status: "Sent" },
  { id: 7, name: "Dignissimos quae ull", number: "#7", note: "Deserunt quos nemo d", date: "Jun 17, 2026", amount: "$4,465.12", status: "Approved" },
  { id: 6, name: "Sadamon Service", number: "#6", note: "Deserunt quos nemo d", date: "Jun 17, 2026", amount: "$4,600.12", status: "Invoiced" },
  { id: 5, name: "sayed cpy 1", number: "#5", note: "Deserunt quos nemo d", date: "Jun 16, 2026", amount: "$1,108.60", status: "On Hold" },
  { id: 4, name: "sayed cpy", number: "#4", note: "Deserunt quos nemo d", date: "Jun 16, 2026", amount: "$1,725.00", status: "Draft" },
  { id: 3, name: "SMT", number: "#3", note: "No Notes", date: "Apr 27, 2026", amount: "$750.00", status: "Draft" },
  { id: 2, name: "STA", number: "#2", note: "No Notes", date: "Apr 27, 2026", amount: "$530.00", status: "Draft" },
];

interface LineItem {
  no: number;
  name: string;
  sub?: string;
  qty: string;
  rate: string;
  tax: string;
  amount: string;
}
const lineItems: LineItem[] = [
  { no: 1, name: "dwccwc", qty: "1", rate: "$2.00", tax: "Test Tax, new test tax", amount: "$2.00" },
  { no: 2, name: "Service 2", sub: "this is service 2", qty: "12 ft", rate: "$40.00", tax: "Test Tax, new test tax", amount: "$480.00" },
];

const sortFields = ["Name", "First Name", "Last Name", "Estimate date", "Estimate #", "Status", "Total"];
const sortDirections = ["Ascending", "Descending"];
const statusList: (Status | "All" | "Trash")[] = ["All", "Draft", "Sent", "Approved", "Invoiced", "On Hold", "Disputed", "Declined", "Cancelled", "Trash"];
const markAsStatuses = ["Draft", "Sent", "Approved", "Invoiced", "On Hold", "Disputed", "Declined", "Cancelled", "Received"];
const badgeOf = (s: string) => (STATUS_BADGE as Record<string, string>)[s] || "bg-gray-600 text-white";
const EST_TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const EST_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
const nowLabel = () => {
  const d = new Date();
  return "Today " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};
const duplicateAs = ["As Invoice", "As Estimate", "As Proforma Invoice", "As Purchase Order"];
const customerList = ["bdcalling", "Sadamon Service", "Dignissimos quae ull", "sayed cpy 1", "sayed cpy", "SMT", "STA"];
const dateRanges = ["All", "Today", "This Week", "Last Week", "This Month", "Last 30 Days", "Last Month", "Last 90 Days", "This Quarter", "Last Quarter", "This Year", "Last Year", "Date Range"];

const STATUS_BADGE: Record<Status, string> = {
  Draft: "bg-gray-600 text-white",
  Sent: "bg-gray-900 text-white",
  Approved: "bg-green-500 text-white",
  Invoiced: "bg-gray-900 text-white",
  "On Hold": "bg-orange-500 text-white",
  Disputed: "bg-amber-500 text-white",
  Declined: "bg-red-500 text-white",
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

/* ── ESTIMATE preview (white document) ─────────────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; e: Estimate }> = ({ onClose, e }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Estimate {e.number}</h3>
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
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">ESTIMATE</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[["Estimate #", e.number.replace("#", "")], ["Estimate date", e.date], ["Total", e.amount]].map(([k, v]) => (
                  <tr key={k}><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-6 px-4 py-3 text-sm border-t border-gray-300">
            <div>
              <div className="font-bold">Estimate To:</div>
              <div className="font-semibold">jamil ali</div>
              <div className="font-semibold">{e.name}</div>
              <div>dk d 12540</div>
              <div>Bangladesh</div>
            </div>
            <div>
              <div className="font-bold">Ship To</div>
              <div>kj dhaka 2 dk d 12540 Bangladesh</div>
            </div>
          </div>
          <table className="w-full text-xs border-t border-gray-300">
            <thead>
              <tr>{["Sr. No.", "Products", "Quantity", "Unit Price", "Tax", "Amount"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2 font-semibold">dwccwc</td>
                <td className="border border-gray-300 px-2 py-2">1</td>
                <td className="border border-gray-300 px-2 py-2">$2.00</td>
                <td className="border border-gray-300 px-2 py-2">Test Tax, new test tax</td>
                <td className="border border-gray-300 px-2 py-2">$2.00</td>
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
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">Service 2</div><div className="text-gray-500">this is service 2</div></td>
                <td className="border border-gray-300 px-2 py-2">12 ft</td>
                <td className="border border-gray-300 px-2 py-2">$40.00</td>
                <td className="border border-gray-300 px-2 py-2">Test Tax, new test tax</td>
                <td className="border border-gray-300 px-2 py-2">$480.00</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end px-4 py-3 text-sm">
            <table className="text-right">
              <tbody>
                <tr><td className="px-3 py-1 font-bold">Sub Total</td><td className="px-3 py-1">$482.00</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">Test Tax 72% on $482.00</td><td className="px-3 py-1">$347.04</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">new test tax 58% on $482.00</td><td className="px-3 py-1">$279.56</td></tr>
                <tr className="border-t border-gray-300"><td className="px-3 py-1 font-bold">Total</td><td className="px-3 py-1 font-bold">$1,108.60</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-300 text-sm">
            <div className="font-bold">Terms &amp; Conditions</div>
            <div className="text-gray-700">Velit sapiente volu</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── PACKING SLIP (white document, quantities only) ────────────── */
const PackingSlipModal: React.FC<{ onClose: () => void; e: Estimate }> = ({ onClose, e }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Packing Slip {e.number.replace("#", "")}</h3>
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
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">PACKING SLIP</h1>
          <div className="flex justify-between gap-6 p-4">
            <div className="text-sm">
              <div className="font-bold text-lg">info</div>
              <div className="text-gray-700">Bangladesh</div>
              <div className="text-gray-700">info@inovoic.com</div>
              <div className="font-bold mt-2">Estimate To:</div>
              <div className="font-semibold">jamil ali</div>
              <div className="font-semibold">{e.name}</div>
              <div>ali@gamil.com</div>
              <div>Mobile: 13254</div>
              <div>Business Phone: 32312</div>
              <div>Home No: 54584512</div>
              <div>Fax: 5454</div>
              <div>dhaka dhaka dk d 12540 Bangladesh</div>
              <div>Reg. No: 4685</div>
              <div>Tax ID: 1412</div>
            </div>
            <div className="text-sm">
              <table className="border-collapse mb-3">
                <tbody>
                  <tr><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">Estimate #</td><td className="border border-gray-300 px-3 py-1.5">{e.number.replace("#", "")}</td></tr>
                  <tr><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">Date</td><td className="border border-gray-300 px-3 py-1.5">{e.date}</td></tr>
                </tbody>
              </table>
              <div className="font-bold">Ship To</div>
              <div>kj</div>
              <div>dhaka 2</div>
              <div>dk d 12540</div>
              <div>Bangladesh</div>
            </div>
          </div>
          <table className="w-full text-xs border-t border-gray-300">
            <thead>
              <tr>{["Sr. No.", "Products", "Quantity"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2 font-semibold">dwccwc</td>
                <td className="border border-gray-300 px-2 py-2">1</td>
              </tr>
            </tbody>
          </table>
          <table className="w-full text-xs">
            <thead>
              <tr>{["Sr. No.", "Services", "Quantity"].map((h) => <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">Service 2</div><div className="text-gray-500">this is service 2</div></td>
                <td className="border border-gray-300 px-2 py-2">12 ft</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; e: Estimate }> = ({ onClose, e }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Estimate {e.number} from info</h3>
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
        <input defaultValue={`Estimate ${e.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {e.name}</p>
          <p>Estimate {e.number}<br />Total Amount: {e.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Estimate {e.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
export const Estimates: React.FC = () => {
  const dbEstimates = useCollection<any>("estimates");
  const dbCustomers = useCollection<any>("customers", "name");
  const estimates: Estimate[] = useMemo(
    () => dbEstimates.slice().sort((a, b) => b.id - a.id).map((e) => ({
      id: e.id, name: dbCustomers.find((c) => c.id === e.customerId)?.name || "—",
      number: e.number, note: e.notes || "No Notes", date: e.date, amount: fmtMoney(e.total), status: e.status,
    })),
    [dbEstimates, dbCustomers],
  );
  // Opened from a Duplicate action / activity link → pre-select that estimate.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 5);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Estimate date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "packing" | "email" | "pdfSettings">(null);
  const [markAsOpen, setMarkAsOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigRequestOpen, setSigRequestOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = estimates.filter(
      (i) =>
        (statusFilter === "All" || i.status === statusFilter) &&
        (customerFilter === null || i.name === customerFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Total") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Estimate #") r = a.id - b.id;
      else if (sortBy === "Status") r = a.status.localeCompare(b.status);
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.name.localeCompare(b.name);
      else r = a.id - b.id; // Estimate date
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [estimates, sortBy, sortDir, statusFilter, customerFilter, search]);

  const selected = estimates.find((i) => i.id === selectedId) || estimates[0];
  const selectedDb: any = dbEstimates.find((e) => e.id === (selected?.id ?? selectedId)) || {};
  const selectedCustomer: any = dbCustomers.find((c) => c.id === selectedDb.customerId) || {};

  /* Append an event to the estimate's activity log (drives the Activity Log modal). */
  const logActivity = async (kind: string, text: string) => {
    const rec = dbEstimates.find((e) => e.id === selectedDb.id);
    await repo.update("estimates", selectedDb.id, { activity: [...(rec?.activity || []), { kind, text, ts: Date.now(), dateLabel: nowLabel() }] });
  };

  const convertToInvoice = async () => {
    const est = selectedDb;
    if (!est?.id) return;
    const n = await nextNumber("invoices");
    const id = await repo.add("invoices", {
      number: "#" + n, customerId: est.customerId, date: est.date, due: est.due || est.date, ts: Date.now(), status: "Draft",
      items: est.items || [], subTotal: est.subTotal || 0, tax: est.tax || 0, shipping: 0, total: est.total || 0,
      amountPaid: 0, amountDue: est.total || 0, notes: "Converted from Estimate " + est.number, terms: est.terms || "",
    });
    await repo.update("estimates", est.id, { status: "Invoiced" });
    await logActivity("sent", `Estimate ${est.number} converted to invoice.`);
    showToast("Converted to invoice", "success");
    navigate("/sales/sales-invoice", { state: { selectedId: id } });
  };

  const markAs = async (status: string) => {
    await repo.update("estimates", selectedDb.id, { status });
    await logActivity(status === "Sent" ? "sent" : "status", `Estimate ${selectedDb.number} mark as ${status.toLowerCase()}.`);
    showToast(`Estimate marked as ${status}`, "success");
  };

  const duplicateEstAs = async (label: string) => {
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
    } else if (label === "As Estimate") {
      const n = await nextNumber("estimates");
      const id = await repo.add("estimates", { ...base, number: "#" + n, status: "Draft" });
      setSelectedId(id);
      showToast("Estimate duplicated", "success");
    } else if (label === "As Proforma Invoice") {
      const n = await nextNumber("proformas");
      const id = await repo.add("proformas", { ...base, number: "#" + n, status: "Draft", amountPaid: 0, amountDue: base.total });
      showToast("Proforma invoice created", "success");
      navigate("/sales/proforma-invoices", { state: { selectedId: id } });
    } else if (label === "As Purchase Order") {
      const vendors = await repo.getAll("vendors");
      const n = await nextNumber("purchaseOrders");
      const id = await repo.add("purchaseOrders", { ...base, number: "#" + n, vendorId: vendors[0]?.id ?? 1, status: "Draft", billStatus: "Not Billed", amountPaid: 0, amountDue: base.total });
      showToast("Purchase order created", "success");
      navigate("/purchase/purchase-orders", { state: { selectedId: id } });
    }
  };

  const trashCurrent = async () => {
    await repo.remove("estimates", selectedDb.id);
    showToast(`Estimate ${selectedDb.number} moved to trash`, "success");
    setSelectedId(estimates.find((e) => e.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };
  const trashSelectedEst = async () => {
    const ids = [...checked];
    await repo.removeMany("estimates", ids);
    showToast(`${ids.length} ${ids.length === 1 ? "estimate" : "estimates"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(estimates.find((e) => !ids.includes(e.id))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    await repo.update("estimates", selectedDb.id, { signature: data.image, signatureName: data.name, signatureTitle: data.title, signatureDate: data.date });
    await logActivity("status", `Customer signature added to Estimate ${selectedDb.number}.`);
    showToast("Signature saved", "success");
  };

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = estimates.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
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
    { icon: Printer, title: "Print", onClick: () => { logActivity("printed", `Estimate ${selectedDb.number} printed.`); setModal("preview"); } },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen) return <ListEmptyState title="No estimates yet" onCreate={() => setCreateOpen(true)} createLabel="New Estimate" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select estimates to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Estimates</h2>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search estimates..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
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
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Estimate date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
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
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{p.amount}</span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeOf(p.status)}`}>{p.status}</span>
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
          <div className="text-xs text-gray-500">{filtered.length} Estimates</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {createOpen ? (
        <CreateDocForm collection="estimates" title="New Estimate" party="customers" onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editOpen ? (
        <CreateDocForm key={selectedId} collection="estimates" title="Edit Estimate" party="customers" record={selectedDb} onClose={() => setEditOpen(false)} onSaved={(id) => { setEditOpen(false); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} {checked.size === 1 ? "Estimate" : "Estimates"} Selected</h2>
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
                <button className="text-xs text-blue-600 hover:text-blue-700 underline">jamil ali</button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                {/* ⋮ menu (reference: WhatsApp / Packing Slip / Convert to Invoice / Mark As ▸ / Duplicate ▸ / Signature Request / Activity Log / Trash) */}
                <Dropdown align="right" panelClass="min-w-[200px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <div className="py-1">
                      <button onClick={() => { showToast("Opening WhatsApp…", "info"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => { setModal("packing"); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Packing Slip</button>
                      <button onClick={() => { convertToInvoice(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Convert to Invoice</button>
                      {/* Mark As ▸ */}
                      <div className="relative" onMouseEnter={() => setMarkAsOpen(true)} onMouseLeave={() => setMarkAsOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Mark As <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {markAsOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[150px] max-h-[60vh] overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {markAsStatuses.map((s) => (
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
                            {duplicateAs.map((s) => (
                              <button key={s} onClick={() => { duplicateEstAs(s); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setSigRequestOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-200">Signature Request</button>
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
            {/* meta row — #, Estimate date, status badge */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
              <div className="flex items-center gap-12">
                <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                <div><div className="text-xs text-gray-500">Estimate date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeOf(selected.status)}`}>{selected.status}</span>
            </div>

            {/* billing + shipping addresses — same alignment as the invoice page */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-5 py-4 border-b border-gray-300">
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
                      <td className="px-2 py-3 text-right text-gray-800">{it.qty ?? 1}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(it.rate)}</td>
                      <td className="px-2 py-3 text-gray-800">{EST_TAX_NAME[it.taxId || 1]}</td>
                      <td className="px-2 py-3 text-right text-gray-500 text-xs">{it.discount ? fmtMoney(it.discount) : "—"}</td>
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
                {Object.entries(
                  ((selectedDb.items || []) as any[]).reduce((acc: Record<number, number>, it: any) => {
                    const base = it.amount ?? (it.qty || 0) * (it.rate || 0);
                    acc[it.taxId || 1] = (acc[it.taxId || 1] || 0) + base;
                    return acc;
                  }, {}),
                ).map(([taxId, base]) => (
                  <div key={taxId} className="flex justify-between px-4 py-2 text-xs text-gray-500">
                    <span>{EST_TAX_NAME[Number(taxId)]} {EST_TAX_RATE[Number(taxId)]}% on {fmtMoney(base as number)}</span>
                    <span>{fmtMoney(((base as number) * (EST_TAX_RATE[Number(taxId)] || 0)) / 100)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedDb.total)}</span></div>
              </div>
            </div>

            {/* saved signature (shows after Add Signature) */}
            <SignatureBlock record={selectedDb} label="Customer Signature" />

            {/* status corner ribbon */}
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 text-[10px] font-semibold py-1 text-center ${badgeOf(selected.status)}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Estimate" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbEstimates.find((x) => x.id === selectedId) || {}; const pp: any = dbCustomers.find((x) => x.id === d.customerId) || {}; const pn = pp.name || "—"; return <PdfPreviewModal docType="estimate" recordId={d.id} title={`Estimate `} onClose={() => setModal(null)} />; })()}
      {modal === "packing" && <PackingSlipModal onClose={() => setModal(null)} e={selected} />}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} e={selected} />}
      {modal === "pdfSettings" && (
        <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="estimate" />
      )}
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
          docLabel="Estimate"
          number={selectedDb.number || ""}
          customer={selectedCustomer}
          onClose={() => setSigRequestOpen(false)}
          onSend={() => { logActivity("sent", `Signature request for Estimate ${selectedDb.number} sent.`); showToast("Signature request sent", "success"); }}
        />
      )}
      {activityOpen && <ActivityLogModal docLabel="Estimate" record={selectedDb} onClose={() => setActivityOpen(false)} />}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this estimate?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these estimates?" onNo={() => setConfirmAction(null)} onYes={trashSelectedEst} />
      )}
    </div>
  );
};

export default Estimates;
