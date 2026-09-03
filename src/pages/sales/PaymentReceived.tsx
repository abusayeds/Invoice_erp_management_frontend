/**
 * File: src/pages/sales/PaymentReceived.tsx
 * Payment Received — master/detail layout matching the reference design.
 * Left: list (search, sort, status/customer/date filters, selection mode).
 * Right: detail (action icons + ⋮ menu, meta with Payment date / Payment Type,
 *        Notes + Internal Notes, Attachment) and modals (Preview / Email).
 * A payment is a money record — no line items, no totals, no status badge;
 * the list shows the payment method as the third line instead.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useLocation } from "react-router-dom";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney, parseMoney, DocPreview , PdfPreviewModal} from "@/lib/db";
import { showToast } from "@/utils/toast";
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Pencil,
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
  Settings,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
interface Payment {
  id: number;
  name: string;
  number: string;
  note: string;
  date: string;
  amount: string;
  method: string;
}

const payments: Payment[] = [
  { id: 13, name: "bdcalling", number: "#todays", note: "No Notes", date: "Today 08:24 PM", amount: "$0.00", method: "Master Card" },
  { id: 12, name: "STT", number: "#13334", note: "No Notes", date: "Jun 18, 2026", amount: "$0.00", method: "Cash" },
  { id: 11, name: "SMT", number: "#12", note: "hi", date: "Jun 18, 2026", amount: "$0.00", method: "SNC" },
  { id: 10, name: "STA", number: "#11", note: "9", date: "Jun 17, 2026", amount: "$1,730.00", method: "Cash" },
  { id: 9, name: "Harum ut dolore aliq", number: "#10", note: "13 hi", date: "Jun 17, 2026", amount: "$12,303.16", method: "Master Card" },
  { id: 8, name: "Dolor perspiciatis", number: "#9", note: "8", date: "Jun 17, 2026", amount: "$20,178.72", method: "Vitae voluptatum acc" },
  { id: 7, name: "SMT", number: "#6", note: "5", date: "Jun 16, 2026", amount: "$1,725.00", method: "SNC" },
  { id: 6, name: "sayed cpy 1", number: "#5", note: "4", date: "Jun 16, 2026", amount: "$450.00", method: "iZettle" },
  { id: 5, name: "sayed cpy", number: "#4", note: "3", date: "Jun 16, 2026", amount: "$139.60", method: "iZettle" },
  { id: 4, name: "SMT", number: "#3", note: "No Notes", date: "Jun 16, 2026", amount: "$1,700.00", method: "Cash" },
  { id: 3, name: "STA", number: "#2", note: "2", date: "Jun 16, 2026", amount: "$50.00", method: "Cash" },
  { id: 2, name: "STT", number: "#1", note: "1", date: "Apr 27, 2026", amount: "$0.00", method: "Cash" },
];

const sortFields = ["Name", "First Name", "Last Name", "Payment date", "Payment #", "Amount"];
const sortDirections = ["Ascending", "Descending"];
const statusList = ["All", "Trash"];
const customerList = ["bdcalling", "STT", "SMT", "STA", "Harum ut dolore aliq", "Dolor perspiciatis", "sayed cpy", "sayed cpy 1"];
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

/* ── PAYMENT RECEIPT preview (white document) ──────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; p: Payment }> = ({ onClose, p }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Payment Receipt {p.number}</h3>
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
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">PAYMENT RECEIPT</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
              <div className="font-bold text-sm mt-2">Received From:</div>
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="text-sm">dk d 12540 Bangladesh</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[["Payment #", p.number.replace("#", "")], ["Payment date", p.date], ["Payment Type", p.method], ["Amount", p.amount]].map(([k, v]) => (
                  <tr key={k}><td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td><td className="border border-gray-300 px-3 py-1.5">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-8 border-t border-gray-300 text-center">
            <div className="text-sm text-gray-600">Amount Received</div>
            <div className="text-3xl font-bold mt-1">{p.amount}</div>
          </div>
          <div className="px-4 py-3 border-t border-gray-300 text-sm">
            <div className="font-bold">Notes</div>
            <div className="text-gray-700">{p.note}</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; p: Payment }> = ({ onClose, p }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-900">Payment Receipt {p.number} from info</h3>
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
        <input defaultValue={`Payment Receipt ${p.number} from info`} className="w-full border-b border-gray-200 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-200 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {p.name}</p>
          <p>Payment Receipt {p.number}<br />Amount Received: {p.amount} ({p.method})</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Payment Receipt {p.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
/* ── Record Payment modal (pays a live invoice → updates it) ───── */
const payMethods = ["Cash", "Master Card", "iZettle", "Stripe", "PayPal", "Bank Transfer", "SNC"];

const RecordPaymentForm: React.FC<{ onClose: () => void; onSaved: (id: number) => void; record?: any }> = ({ onClose, onSaved, record }) => {
  const isEdit = !!record?.id;
  const invoices = useCollection<any>("invoices");
  const customers = useCollection<any>("customers", "name");
  const unpaid = useMemo(() => invoices.filter((i) => (i.amountDue || 0) > 0).sort((a, b) => b.id - a.id), [invoices]);
  const [invoiceId, setInvoiceId] = useState<number | "">(record?.invoiceId ?? "");
  const inv = invoices.find((i) => i.id === invoiceId);
  // when editing, keep the paid invoice available in the picker even if it's now fully settled
  const options = useMemo(
    () => (isEdit && inv && !unpaid.some((u) => u.id === inv.id) ? [inv, ...unpaid] : unpaid),
    [isEdit, inv, unpaid],
  );
  const [amount, setAmount] = useState(record?.amount != null ? String(record.amount) : "0.00");
  const [method, setMethod] = useState(record?.method || "Cash");
  const [date, setDate] = useState(record?.date || "Jun 22, 2026");
  const [notes, setNotes] = useState(record?.notes ?? "");
  // auto-fill the amount to the invoice's due only when CREATING (edit keeps the payment's amount)
  useEffect(() => { if (inv && !isEdit) setAmount(String(inv.amountDue)); }, [invoiceId]);
  const custName = (id: number) => customers.find((c) => c.id === id)?.name || "—";

  const save = async () => {
    if (!inv) return;
    const amt = parseMoney(amount);
    if (isEdit) {
      // reverse this payment's original effect on the invoice, then apply the new amount
      const oldAmt = record.amount || 0;
      const dueReversed = (inv.amountDue || 0) + oldAmt;
      const paidReversed = (inv.amountPaid || 0) - oldAmt;
      const due = Math.max(0, dueReversed - amt);
      const paid = paidReversed + amt;
      await repo.update("invoices", inv.id, { amountPaid: +paid.toFixed(2), amountDue: +due.toFixed(2), status: due <= 0 ? "Paid" : "Partially Paid" });
      await repo.update("paymentsReceived", record.id, { amount: amt, method, date, notes });
      onSaved(record.id);
      onClose();
      return;
    }
    const n = await nextNumber("paymentsReceived");
    const id = await repo.add("paymentsReceived", { number: "#" + n, customerId: inv.customerId, invoiceId: inv.id, date, ts: Date.now(), amount: amt, method, notes });
    const paid = (inv.amountPaid || 0) + amt;
    const due = Math.max(0, (inv.amountDue || 0) - amt);
    await repo.update("invoices", inv.id, { amountPaid: +paid.toFixed(2), amountDue: +due.toFixed(2), status: due <= 0 ? "Paid" : "Partially Paid" });
    onSaved(id);
    onClose();
  };

  const fc = "w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 sticky top-0 bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Payment" : "Add Payment"}</h1>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={save} disabled={!inv} className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-40">Save</button>
          <button onClick={save} disabled={!inv} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40">Save &amp; Send</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500">Customer / Invoice *</label>
            <select value={invoiceId} disabled={isEdit} onChange={(e) => setInvoiceId(e.target.value ? Number(e.target.value) : "")} className={`${fc} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}>
              <option value="">Select an unpaid invoice</option>
              {options.map((i) => <option key={i.id} value={i.id}>{i.number} · {custName(i.customerId)} · {fmtMoney(i.amountDue)} due</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Payment date</label><input value={date} onChange={(e) => setDate(e.target.value)} className={fc} /></div>
            <div><label className="text-xs text-gray-500">Payment Type</label><select value={method} onChange={(e) => setMethod(e.target.value)} className={fc}>{payMethods.map((m) => <option key={m}>{m}</option>)}</select></div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Amount</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => inv && setAmount(String(inv.amountDue))} className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm text-right bg-white text-gray-900" />
            </div>
          </div>
          <div><label className="text-xs text-gray-500">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full h-20 border border-gray-300 rounded-md p-3 text-sm outline-none resize-none" /></div>
        </div>
        <div className="space-y-4">
          <div><label className="text-xs text-gray-500">Internal Notes</label><textarea placeholder="Internal Notes" className="mt-1 w-full h-20 border border-gray-300 rounded-md p-3 text-sm outline-none resize-none" /></div>
          <div>
            <label className="text-xs text-gray-500">Attachment</label>
            <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
              <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
              <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
            </div>
          </div>
          {inv && <div className="text-sm text-gray-600 border border-gray-200 rounded-md p-3">Outstanding on {inv.number}: <span className="font-semibold text-gray-900">{fmtMoney(inv.amountDue)}</span></div>}
        </div>
      </div>
    </section>
  );
};

export const PaymentReceived: React.FC = () => {
  const dbPayments = useCollection<any>("paymentsReceived");
  const dbCustomers = useCollection<any>("customers", "name");
  const payments: Payment[] = useMemo(
    () => dbPayments.slice().sort((a, b) => b.id - a.id).map((p) => ({
      id: p.id, name: dbCustomers.find((c) => c.id === p.customerId)?.name || "—",
      number: p.number, note: p.notes || "No Notes", date: p.date, amount: fmtMoney(p.amount), method: p.method || "Cash",
    })),
    [dbPayments, dbCustomers],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Opened from an activity link → pre-select that payment.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 13);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Payment date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "preview" | "email">(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = payments.filter(
      (i) =>
        (customerFilter === null || i.name === customerFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)),
    );
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortBy === "Amount") r = toNum(a.amount) - toNum(b.amount);
      else if (sortBy === "Payment #") r = a.id - b.id;
      else if (sortBy === "Name" || sortBy === "First Name" || sortBy === "Last Name") r = a.name.localeCompare(b.name);
      else r = a.id - b.id; // Payment date
      return sortDir === "Ascending" ? r : -r;
    });
    return list;
  }, [payments, sortBy, sortDir, customerFilter, search]);

  const selected = payments.find((i) => i.id === selectedId) || payments[0];
  const selectedDb: any = dbPayments.find((d) => d.id === (selected?.id ?? selectedId)) || {};

  // Keep selectedId pointing at a real payment so the detail, edit and PDF preview
  // all use the same record (the hardcoded default id often matches nothing, which
  // made the receipt PDF render a different payment than the one shown).
  useEffect(() => {
    if (payments.length > 0 && !payments.some((p) => p.id === selectedId)) {
      setSelectedId(payments[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments]);

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = payments.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  const bulkTrash = async () => {
    const ids = [...checked];
    if (ids.length === 0) { showToast("Select payments to delete", "info"); return; }
    await repo.removeMany("paymentsReceived", ids);
    showToast(`${ids.length} ${ids.length === 1 ? "payment" : "payments"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(payments.find((i) => !ids.includes(i.id))?.id ?? 0);
    exitSelect();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const actionIcons: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: SlidersHorizontal, title: "Adjust" },
    { icon: Pencil, title: "Edit", onClick: () => setEditOpen(true) },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => setModal("preview") },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen) return <ListEmptyState title="No payments received yet" onCreate={() => setCreateOpen(true)} createLabel="New Payment" />;

  return (
    <div className="flex h-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={bulkTrash} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Payment Received</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>
                {(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}
              </Dropdown>
            </div>
          </div>
        )}

        {/* search */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payments..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
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
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Payment date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
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
                className={`w-full text-left px-4 py-3 border-b border-gray-200 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.number}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{p.note}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 min-w-0 max-w-[140px]">
                  <span className="text-xs text-gray-500 truncate">{p.date}</span>
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{p.amount}</span>
                  <span className="text-xs text-gray-500 mt-0.5 truncate w-full text-right">{p.method}</span>
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
          <div className="text-xs text-gray-500">{filtered.length} Payments</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {createOpen ? (
        <RecordPaymentForm onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editOpen ? (
        <RecordPaymentForm key={selectedId} record={selectedDb} onClose={() => setEditOpen(false)} onSaved={(id) => { setEditOpen(false); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} {checked.size === 1 ? "Payment" : "Payments"} Selected</h2>
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
              <h1 className="text-lg font-semibold text-gray-900 truncate min-w-0">{selected.name}</h1>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                {/* ⋮ menu */}
                <Dropdown align="right" panelClass="w-48" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <>
                      <button onClick={close} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200"><Trash2 className="w-4 h-4" /> Trash</button>
                    </>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* meta row — #, Payment date, Payment Type (no status badge) */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-200">
              <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
              <div className="flex items-center gap-12">
                <div><div className="text-xs text-gray-500">Payment date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                <div><div className="text-xs text-gray-500">Payment Type</div><div className="text-sm font-semibold text-gray-900">{selected.method}</div></div>
              </div>
            </div>

            {/* Notes | Internal Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200">
              <div className="px-5 py-3 border-r border-gray-200">
                <div className="text-sm font-semibold text-gray-900 mb-2">Notes</div>
                <div className="text-sm text-gray-600">{selected.note === "No Notes" ? "No Notes" : selected.note}</div>
              </div>
              <div className="px-5 py-3">
                <div className="text-sm font-semibold text-gray-900 mb-2">Internal Notes</div>
                <div className="text-sm text-gray-600">No Internal Notes</div>
              </div>
            </div>

            {/* Attachment (full width) */}
            <div className="px-5 py-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Attachment</div>
              <div className="grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                <button className="flex flex-col items-center gap-2 py-8 hover:bg-gray-50"><span className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                <button className="flex flex-col items-center gap-2 py-8 hover:bg-gray-50"><span className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "preview" && (() => {
        // In select mode with several rows ticked, preview them all merged into
        // one PDF; otherwise preview the single active record.
        const batchIds = selectMode ? [...checked] : [];
        const d: any = dbPayments.find((x) => x.id === (selected?.id ?? selectedId)) || {};
        return (
          <PdfPreviewModal
            docType="paymentReceived"
            recordId={batchIds.length ? batchIds[0] : d.id}
            recordIds={batchIds.length > 1 ? batchIds : undefined}
            title={batchIds.length > 1 ? `Payment Receipts (${batchIds.length})` : `Payment Receipt `}
            onClose={() => setModal(null)}
          />
        );
      })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} p={selected} />}
    </div>
  );
};

export default PaymentReceived;
