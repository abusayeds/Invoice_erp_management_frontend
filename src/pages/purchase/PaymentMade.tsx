/**
 * File: src/pages/purchase/PaymentMade.tsx
 * Payment Made — master/detail layout matching the reference design.
 * Left: list (search, sort, status/vendor/date filters, selection mode).
 * Right: detail (action icons + ⋮ menu, meta with Payment date / Type, a
 *        Bills section showing the bill the payment was applied to, Notes +
 *        Internal Notes, Attachment) and modals (Edit Payment → Bills chooser,
 *        PDF preview / Email).
 * Purchase-side analog of Payment Received, but a payment is applied to a Bill
 * (the detail carries a Bills section, and editing opens a bill chooser).
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { useLocation } from "react-router-dom";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney, parseMoney, DocPreview , PdfPreviewModal} from "@/lib/db";
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
  Calendar,
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
  billNo: string;
}

const payments: Payment[] = [
  { id: 7, name: "bipul company", number: "#998", note: "6", date: "Today 08:54 PM", amount: "$0.00", method: "Stripe", billNo: "#6" },
  { id: 6, name: "Officiis ullam labor", number: "#576", note: "Exercitationem earum", date: "Jul 16, 2018", amount: "$0.00", method: "Sint exercitation es", billNo: "#5" },
  { id: 5, name: "Ut ut nulla voluptat", number: "#229", note: "Dolore officia facil", date: "Apr 20, 2018", amount: "$0.00", method: "Itaque qui dolore es", billNo: "#4" },
  { id: 4, name: "Explicabo Doloremqu", number: "#774", note: "Assumenda incididunt", date: "Dec 26, 2015", amount: "$0.00", method: "Ducimus ut dictamn", billNo: "#3" },
  { id: 3, name: "Ex aut sequi ad libe", number: "#945", note: "Aliqua Ut adipisci", date: "Jul 5, 1996", amount: "$0.00", method: "Obcaecati maxime", billNo: "#2" },
  { id: 2, name: "Est lorem ut maxime", number: "#997", note: "Et veniam adipisici", date: "May 25, 1990", amount: "$0.00", method: "Consequuntur esse", billNo: "#1" },
  { id: 1, name: "Est officiis nihil", number: "#398", note: "Officiis libero volu", date: "Nov 16, 1984", amount: "$0.00", method: "Vitae voluptatum acc", billNo: "#0" },
];

const sortFields = ["Name", "First Name", "Last Name", "Payment date", "Payment #", "Amount"];
const sortDirections = ["Ascending", "Descending"];
const statusList = ["All", "Trash"];
const vendorList = ["bipul company", "Officiis ullam labor", "Ut ut nulla voluptat", "Explicabo Doloremqu", "Ex aut sequi ad libe", "Est lorem ut maxime", "Est officiis nihil"];
const paymentTypes = ["Stripe", "Paypal", "Venmo", "Cash", "Bank", "Custom", "UPI", "Google Pay", "Apple Pay", "Square"];
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

/* ── Bills chooser (opened from Edit Payment) ──────────────────── */
const BillsChooser: React.FC<{ onClose: () => void; onDone: () => void; vendor: string; billNo: string }> = ({ onClose, onDone, vendor, billNo }) => {
  const [picked, setPicked] = useState(true);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-xl my-10 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Bills</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={onDone} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Done</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => setPicked((p) => !p)} className="w-full flex items-start gap-3 px-5 py-3 border-b border-gray-200 hover:bg-gray-50 text-left">
            <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${picked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{picked && <Check className="w-3.5 h-3.5 text-white" />}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">{vendor}</div>
              <div className="text-xs text-gray-500 mt-0.5">{billNo}</div>
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

/* ── Edit Payment modal ────────────────────────────────────────── */
const EditModal: React.FC<{ onClose: () => void; p: Payment }> = ({ onClose, p }) => {
  const [billsOpen, setBillsOpen] = useState(false);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-lg my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Edit Payment</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs text-gray-500">Payment #</label><input defaultValue={p.number.replace("#", "")} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" /></div>
          <div><label className="text-xs text-gray-500">Vendor *</label><input defaultValue={p.name} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Payment date *</label>
              <div className="relative mt-1"><input defaultValue="6/21/2026" className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" /><Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
            </div>
            <div><label className="text-xs text-gray-500">Type *</label>
              <select defaultValue={p.method} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">{[p.method, ...paymentTypes.filter((t) => t !== p.method)].map((m) => <option key={m}>{m}</option>)}</select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Amount</label>
            <div className="flex items-center gap-2 mt-1">
              <button className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap">Full Payment</button>
              <input defaultValue="200" className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white text-right" />
            </div>
            <div className="text-xs text-gray-400 text-right mt-1">$0.00 Due</div>
          </div>
          <div><label className="text-xs text-gray-500">Notes</label><textarea rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" /></div>
          <div><label className="text-xs text-gray-500">Internal Notes</label><textarea rows={2} placeholder="Internal Notes" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-white" /></div>
          <div>
            <label className="text-xs text-gray-500">Attachment</label>
            <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
              <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
              <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-sm font-medium text-gray-800">Bills</span>
            <button onClick={() => setBillsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Pencil className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      {billsOpen && <BillsChooser onClose={() => setBillsOpen(false)} onDone={() => setBillsOpen(false)} vendor={p.name} billNo={p.billNo} />}
    </Overlay>
  );
};

/* ── PAYMENT MADE preview (white document) ─────────────────────── */
const PreviewModal: React.FC<{ onClose: () => void; p: Payment }> = ({ onClose, p }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Payment Made {p.number}</h3>
        <div className="flex items-center gap-1">
          {[Download, Printer, Mail].map((Ic, i) => (
            <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><Ic className="w-4 h-4" /></button>
          ))}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div style={{ background: "#fff", color: "#111" }} className="p-6">
        <h1 className="text-center text-2xl font-bold mb-4">PAYMENT MADE</h1>
        <div className="mb-4 text-sm">
          <div className="font-bold text-lg">info</div>
          <div className="text-gray-700">Bangladesh</div>
          <div className="text-gray-700">info@inovoic.com</div>
          <div className="font-bold mt-2">Payment To:</div>
          <div className="font-semibold">{p.name}</div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>{["Payment #", "Payment date", "Amount", "Payment Type"].map((h) => <th key={h} className="border border-gray-300 px-3 py-2 text-left font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-3 py-2">{p.number.replace("#", "")}</td>
              <td className="border border-gray-300 px-3 py-2">{p.date}</td>
              <td className="border border-gray-300 px-3 py-2">{p.amount}</td>
              <td className="border border-gray-300 px-3 py-2">{p.method}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Overlay>
);

/* ── Email modal ───────────────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void; p: Payment }> = ({ onClose, p }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-900">Payment Made {p.number} from info</h3>
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
        <input defaultValue={`Payment Made ${p.number} from info`} className="w-full border-b border-gray-200 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-200 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {p.name}</p>
          <p>Payment Made {p.number}<br />Amount: {p.amount} ({p.method})</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Payment Made {p.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
/* ── Record Payment Made modal (pays a live bill → updates it) ── */
const madeMethods = ["Cash", "Stripe", "PayPal", "Bank Transfer", "Master Card", "Cheque"];
const RecordPaymentMadeModal: React.FC<{ onClose: () => void; onSaved: (id: number) => void }> = ({ onClose, onSaved }) => {
  const bills = useCollection<any>("bills");
  const vendors = useCollection<any>("vendors", "name");
  const unpaid = useMemo(() => bills.filter((b) => (b.amountDue || 0) > 0).sort((a, b) => b.id - a.id), [bills]);
  const [billId, setBillId] = useState<number | "">("");
  const bill = bills.find((b) => b.id === billId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState("Jun 22, 2026");
  useEffect(() => { if (bill) setAmount(String(bill.amountDue)); }, [billId]);
  const vname = (id: number) => vendors.find((v) => v.id === id)?.name || "—";
  const save = async () => {
    if (!bill) return;
    const amt = parseMoney(amount);
    const n = await nextNumber("paymentsMade");
    const id = await repo.add("paymentsMade", { number: "#" + n, vendorId: bill.vendorId, billId: bill.id, date, ts: Date.now(), amount: amt, method, notes: "" });
    const paid = (bill.amountPaid || 0) + amt;
    const due = Math.max(0, (bill.amountDue || 0) - amt);
    await repo.update("bills", bill.id, { amountPaid: +paid.toFixed(2), amountDue: +due.toFixed(2), status: due <= 0 ? "Paid" : "Partially Paid" });
    onSaved(id); onClose();
  };
  const fc = "w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-lg my-16 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Record Payment</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={save} disabled={!bill} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40">Save</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500">Bill *</label>
            <select value={billId} onChange={(e) => setBillId(e.target.value ? Number(e.target.value) : "")} className={fc}>
              <option value="">Select an unpaid bill</option>
              {unpaid.map((b) => <option key={b.id} value={b.id}>{b.number} · {vname(b.vendorId)} · {fmtMoney(b.amountDue)} due</option>)}
            </select>
          </div>
          {bill && <div className="text-sm text-gray-600">Vendor: <span className="font-semibold text-gray-900">{vname(bill.vendorId)}</span> · Outstanding: <span className="font-semibold text-gray-900">{fmtMoney(bill.amountDue)}</span></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Amount</label><input value={amount} onChange={(e) => setAmount(e.target.value)} className={fc} /></div>
            <div><label className="text-xs text-gray-500">Payment date</label><input value={date} onChange={(e) => setDate(e.target.value)} className={fc} /></div>
          </div>
          <div><label className="text-xs text-gray-500">Payment Type</label><select value={method} onChange={(e) => setMethod(e.target.value)} className={fc}>{madeMethods.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
      </div>
    </Overlay>
  );
};

export const PaymentMade: React.FC = () => {
  const dbPayments = useCollection<any>("paymentsMade");
  const dbVendors = useCollection<any>("vendors", "name");
  const dbBills = useCollection<any>("bills");
  const payments: Payment[] = useMemo(
    () => dbPayments.slice().sort((a, b) => b.id - a.id).map((p) => ({
      id: p.id, name: dbVendors.find((v) => v.id === p.vendorId)?.name || "—",
      number: p.number, note: p.notes || "No Notes", date: p.date, amount: fmtMoney(p.amount),
      method: p.method || "Cash", billNo: dbBills.find((b) => b.id === p.billId)?.number || "—",
    })),
    [dbPayments, dbVendors, dbBills],
  );
  const [createOpen, setCreateOpen] = useState(false);
  // Opened from an activity link → pre-select that payment.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 7);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Payment date");
  const [sortDir, setSortDir] = useState("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "preview" | "email" | "edit">(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = payments.filter(
      (i) =>
        (vendorFilter === null || i.name === vendorFilter) &&
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
  }, [payments, sortBy, sortDir, vendorFilter, search]);

  const selected = payments.find((i) => i.id === selectedId) || payments[0];

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedTotal = payments.filter((i) => checked.has(i.id)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const actionIcons: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: SlidersHorizontal, title: "Adjust" },
    { icon: Pencil, title: "Edit", onClick: () => setModal("edit") },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => setModal("preview") },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen) return <ListEmptyState title="No payments made yet" onCreate={() => setCreateOpen(true)} createLabel="New Payment" />;

  return (
    <div className="flex h-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              {[Trash2, MessageCircle, Mail, Eye, Check].map((Ic, i) => (
                <button key={i} onClick={Ic === Check ? exitSelect : Ic === Eye ? () => setModal("preview") : undefined} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Ic className="w-4 h-4" /></button>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Payment Made</h2>
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
      {selectMode ? (
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

            {/* meta row */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-200">
              <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
              <div className="flex items-center gap-12">
                <div><div className="text-xs text-gray-500">Payment date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                <div><div className="text-xs text-gray-500">Payment Type</div><div className="text-sm font-semibold text-gray-900">{selected.method}</div></div>
              </div>
            </div>

            {/* Bills section */}
            <div className="border-b border-gray-200">
              <div className="px-5 py-2.5 bg-gray-50 text-sm font-semibold text-gray-900">Bills</div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
                <span className="text-sm text-gray-800">{selected.billNo}</span>
                <span className="text-sm font-semibold text-gray-900">{selected.amount}</span>
              </div>
            </div>

            {/* Notes | Internal Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-gray-200">
              <div className="px-5 py-3 border-r border-gray-200">
                <div className="text-sm font-semibold text-gray-900 mb-2">Notes</div>
                <div className="text-sm text-gray-600">No Notes</div>
              </div>
              <div className="px-5 py-3">
                <div className="text-sm font-semibold text-gray-900 mb-2">Internal Notes</div>
                <div className="text-sm text-gray-600">No Internal Notes</div>
              </div>
            </div>

            {/* Attachment */}
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
      {modal === "edit" && <EditModal onClose={() => setModal(null)} p={selected} />}
      {modal === "preview" && (() => { const d: any = dbPayments.find((x) => x.id === selectedId) || {}; const pp: any = dbVendors.find((x) => x.id === d.vendorId) || {}; const pn = pp.name || "—"; return <PdfPreviewModal docType="paymentMade" recordId={d.id} title={`Payment Made `} onClose={() => setModal(null)} />; })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} p={selected} />}
      {createOpen && <RecordPaymentMadeModal onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />}
    </div>
  );
};

export default PaymentMade;
