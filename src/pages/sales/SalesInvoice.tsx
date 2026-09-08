/**
 * File: src/pages/sales/SalesInvoice.tsx
 * Sales Invoice — master/detail layout matching the reference design.
 * Left: invoice list (search, sort, filter chips, status badges, footer).
 * Right: invoice detail (header actions, addresses, payment methods,
 *        line-items table, terms/notes/totals, attachments, Draft ribbon).
 * Backend intentionally not wired (per request) — data is hardcoded to
 * match the design. Selecting a list row updates the detail panel.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { SignatureModal } from "@/components/modals/SignatureModal";
import { SignatureRequestModal } from "@/components/modals/SignatureRequestModal";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { PdfDocPreview } from "@/lib/db/PdfDocPreview";
import { downloadServerPdf, printServerPdf, downloadServerBatchPdf, printServerBatchPdf, serverBatchPdfUrlForRecords } from "@/lib/db/serverPdf";
import { usePdfSettings, type PdfDocType } from "@/lib/db/pdfSettings";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { showToast } from "@/utils/toast";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney } from "@/lib/db";
import { CreateInvoiceForm } from "./CreateInvoiceForm";
import { fetchInvoice, fetchInvoices, updateInvoice, type BackendInvoiceDoc } from "@/services/invoicesApi";
import { fetchPaymentMethods, type PaymentMethodOption } from "@/services/paymentMethodsApi";
import { InvoicePaymentsModal } from "@/components/modals/InvoicePaymentsModal";
import { fetchCustomers, type TCustomerRow } from "@/services/customersApi";
import {
  Search,
  Plus,
  ChevronDown,
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
  Paperclip,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Link2,
  Trash2,
  MessageCircle,
  ChevronRight,
  CircleChevronUp,
  CircleChevronDown,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Draft" | "Paid" | "Partial" | "Overdue";

interface LineItem {
  no: number;
  name: string;
  sub?: string;
  qty: string;
  mrp: string;
  rate: string;
  rateSub?: string;
  tax: string;
  discountLabel?: string;
  amount: string;
}

interface Invoice {
  id: number;
  backendId?: string;
  name: string;
  customerSubtitle?: string;
  number: string;
  note: string;
  date: string;
  due: string;
  amount: string;
  currency?: string;
  status: Status;
}

const invoices: Invoice[] = [
  { id: 14, name: "Sed aliquip eaque co", number: "#14", note: "Test, Sit quos sint quos e", date: "Jun 18, 2026", due: "Jun 18, 2026", amount: "$9,093.88", status: "Draft" },
  { id: 13, name: "Harum ut dolore aliq", number: "#13", note: "hi, Sit quos sint quos e", date: "Jun 17, 2026", due: "Jun 17, 2026", amount: "$12,303.16", status: "Paid" },
  { id: 12, name: "sayed cpy 1", number: "#12", note: "Sit quos sint quos e", date: "Jun 16, 2026", due: "Jun 16, 2026", amount: "$0.00", status: "Paid" },
  { id: 11, name: "Aliqua In vel quod", number: "#11", note: "Sit quos sint quos e", date: "Jun 16, 2026", due: "Jun 16, 2026", amount: "$1,730.00", status: "Paid" },
  { id: 10, name: "Aute quidem et perfe", number: "#10", note: "Sit quos sint quos e", date: "Jun 16, 2026", due: "Jun 16, 2026", amount: "$0.00", status: "Paid" },
  { id: 9, name: "STA", number: "#9", note: "hi, hi", date: "Jun 16, 2026", due: "Jun 16, 2026", amount: "$1,730.00", status: "Paid" },
  { id: 8, name: "sayed cpy", number: "#8", note: "No Notes", date: "Apr 27, 2026", due: "Apr 27, 2026", amount: "$50.00", status: "Paid" },
  { id: 6, name: "STA", number: "#6", note: "No Notes", date: "Apr 27, 2026", due: "Apr 27, 2026", amount: "$160.00", status: "Overdue" },
  { id: 5, name: "SMT", number: "#5", note: "No Notes", date: "Apr 27, 2026", due: "Apr 27, 2026", amount: "$160.00", status: "Overdue" },
];

const lineItems: LineItem[] = [
  { no: 1, name: "Product 1", sub: "this is product 1", qty: "50 box", mrp: "$0.00", rate: "$25.00", rateSub: "Batch product 1", tax: "Test Tax, new test …", discountLabel: "Mfg Date 4/29/2026 · Exp. Date 2/25/2027", amount: "$1,250.00" },
  { no: 2, name: "charge", sub: "hi  ……………", qty: "123 cm", mrp: "$0.00", rate: "$32.00", rateSub: "SAC 23", tax: "new test tax", amount: "$3,936.00" },
];

const paymentMethods = [
  { label: "Mastercard", bg: "#ffffff", fg: "#eb001b" },
  { label: "iZettle", bg: "#1d1d1b", fg: "#ffffff" },
  { label: "PayPal", bg: "#003087", fg: "#ffffff" },
  { label: "Stripe", bg: "#635bff", fg: "#ffffff" },
  { label: "SC", bg: "#0473ea", fg: "#ffffff" },
  { label: "DBS", bg: "#ed1c24", fg: "#ffffff" },
  { label: "Benefit", bg: "#ffffff", fg: "#e2231a" },
  { label: "AmEx", bg: "#006fcf", fg: "#ffffff" },
  { label: "Cash App", bg: "#00d632", fg: "#ffffff" },
  { label: "VISA", bg: "#ffffff", fg: "#1a1f71" },
  { label: "Discover", bg: "#ffffff", fg: "#f76b1c" },
  { label: "M-PESA", bg: "#ffffff", fg: "#43b02a" },
  { label: "NET", bg: "#0066b3", fg: "#ffd200" },
  { label: "Zelle", bg: "#6d1ed4", fg: "#ffffff" },
  { label: "Facebook Pay", bg: "#ffffff", fg: "#1877f2" },
  { label: "SumUp", bg: "#ffffff", fg: "#1c1c1c" },
];

const sortFields = [
  "Name", "First Name", "Last Name", "Invoice date", "Due Date",
  "Invoice #", "Status", "Total", "Due", "Paid",
];
const statusList = [
  "All", "Draft", "Partial", "Paid", "Overdue", "Recurring",
  "Void", "Credit Notes Applied", "Open", "Trash",
];
const customerList = [
  "Aute quidem et perfe", "Dignissimos quae ull", "Dolor perspiciatis",
  "Dolore quidem nisi d", "Harum ut dolore aliq", "sayed cpy", "sayed cpy 1",
  "Aliqua In vel quod", "Aute quidem et perfe", "Sed aliquip eaque co", "SMT", "STA",
].filter((v, i, a) => a.indexOf(v) === i);

const STATUS_BADGE: Record<Status, string> = {
  Draft: "bg-gray-600 text-white",
  Paid: "bg-green-500 text-white",
  Partial: "bg-orange-500 text-white",
  Overdue: "bg-red-500 text-white",
};

const invoiceSortToBackend = (value: string) => {
  switch (value) {
    case "Invoice #":
      return "invoice_number";
    case "Name":
    case "First Name":
    case "Last Name":
      return "customer_name";
    case "Status":
      return "status";
    case "Total":
    case "Due":
    case "Paid":
      return "-total";
    case "Due Date":
      return "-due_date";
    default:
      return "-date";
  }
};

const apiText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const apiMoney = (amount: number, currency?: string) => {
  const cur = apiText(currency) || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${cur} ${(amount || 0).toFixed(2)}`;
  }
};

const invoiceAddressLines = (address?: BackendInvoiceDoc["billing_address"]) =>
  [address?.street, address?.street2, [address?.city, address?.state, address?.zip].filter(Boolean).join(", "), address?.country]
    .filter(Boolean);

const customerDisplayName = (customer: any): string => {
  return (
    apiText(customer?.businessProfile?.companyName) ||
    apiText(customer?.company_name) ||
    apiText(customer?.name) ||
    apiText(customer?.contact) ||
    "—"
  );
};

const customerDisplaySubtitle = (customer: any): string => {
  return [apiText(customer?.name), apiText(customer?.email)].filter(Boolean).join(" · ");
};

const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
};

const DynamicPaymentBadges: React.FC<{ names: string[]; options: PaymentMethodOption[] }> = ({ names, options }) => {
  if (!names.length) return <div className="text-sm text-gray-400">—</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name) => {
        const meta = options.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
        return (
          <span
            key={name}
            className="px-1.5 h-6 min-w-[34px] rounded text-[9px] font-bold flex items-center justify-center border border-black/10 bg-white"
            title={name}
          >
            {meta?.logo ? <img src={meta.logo} alt={name} className="max-h-4 max-w-14 object-contain" /> : name}
          </span>
        );
      })}
    </div>
  );
};

/* ── Small dropdown ────────────────────────────────────────────── */
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}> = ({ trigger, children, align = "left" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left?: number; right?: number; width: number } | null>(null);

  const updatePosition = () => {
    const node = ref.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    setRect({
      top: bounds.bottom + 8,
      left: align === "right" ? undefined : bounds.left,
      right: align === "right" ? window.innerWidth - bounds.right : undefined,
      width: bounds.width,
    });
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const sync = () => updatePosition();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, align]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => {
        setOpen((o) => {
          const next = !o;
          if (!o) setTimeout(updatePosition, 0);
          return next;
        });
      }}>{trigger}</button>
      {open && rect && (
        <div
          ref={panelRef}
          className="fixed z-50 min-w-[180px] max-h-[70vh] overflow-y-auto hover-scrollbar rounded-md border border-gray-200 bg-white py-1 shadow-xl"
          style={align === "right" ? { top: rect.top, right: rect.right } : { top: rect.top, left: rect.left, minWidth: rect.width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/* ── Modal shell ───────────────────────────────────────────────── */
const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose,
  children,
}) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
      onMouseDown={onClose}
    >
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full flex justify-center">
        {children}
      </div>
    </div>
  );
};

/* ── Print / preview modal (white printable document) ──────────── */
const PreviewModal: React.FC<{ onClose: () => void; title?: string }> = ({ onClose, title }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
      {/* dark header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">{title || "Invoice# 14"}</h3>
        <div className="flex items-center gap-1">
          {[Download, Printer, Mail].map((Ic, i) => (
            <button key={i} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10">
              <Ic className="w-4 h-4" />
            </button>
          ))}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* white document */}
      <div style={{ background: "#fff", color: "#111" }} className="p-6">
        <div className="text-right text-sm italic text-gray-500">(Original)</div>
        <div className="border border-gray-300">
          <h1 className="text-center text-2xl font-bold py-3 border-b border-gray-300">INVOICE</h1>
          <div className="flex justify-between gap-6 p-4">
            <div>
              <div className="font-bold text-lg">info</div>
              <div className="text-sm text-gray-700">Bangladesh</div>
              <div className="text-sm text-gray-700">info@inovoic.com</div>
            </div>
            <table className="text-sm border-collapse">
              <tbody>
                {[
                  ["Invoice #", "14"],
                  ["P.O. #", "58"],
                  ["Invoice date", "Jun 18, 2026"],
                  ["Due Date", "Jun 18, 2026"],
                  ["Total", "$9,093.88"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="border border-gray-300 px-3 py-1.5 font-semibold text-right">{k}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-2 text-right text-xs text-gray-600">We accept payment by</div>
          <div className="px-4 pb-3 flex flex-wrap gap-1 justify-end">
            {paymentMethods.map((p) => (
              <span key={p.label} className="px-1.5 h-6 min-w-[34px] rounded text-[9px] font-bold flex items-center justify-center border border-gray-300" style={{ background: p.bg, color: p.fg }}>
                {p.label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6 px-4 py-3 text-sm border-t border-gray-300">
            <div>
              <div className="font-bold">Invoice To:</div>
              <div className="font-semibold">Sed aliquip eaque co</div>
              <div>kj</div>
              <div>dk dhaka 12540</div>
              <div>Bangladesh</div>
            </div>
            <div>
              <div className="font-bold">Ship To</div>
              <div>kj</div>
              <div>dk dhaka 12540 Bangladesh</div>
              <div className="font-bold mt-1">Shipping Method:</div>
              <div>Priority Shipping</div>
            </div>
          </div>
          <div className="text-center font-bold text-sm py-1">Test</div>
          {/* products */}
          <table className="w-full text-xs border-t border-gray-300">
            <thead>
              <tr>
                {["Sr. No.", "Products", "Quantity", "Unit Price", "new test tax", "Test Tax", "Amount"].map((h) => (
                  <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">Product 1</div><div className="text-gray-500">this is product 1</div></td>
                <td className="border border-gray-300 px-2 py-2 font-semibold">50 box</td>
                <td className="border border-gray-300 px-2 py-2">$25.00<div className="text-[10px]">Exp. Date Feb 25, 2027</div></td>
                <td className="border border-gray-300 px-2 py-2">$725.00<div className="text-[10px]">Mfg Date Apr 29, 2026</div></td>
                <td className="border border-gray-300 px-2 py-2">$900.00</td>
                <td className="border border-gray-300 px-2 py-2">$1,250.00</td>
              </tr>
            </tbody>
          </table>
          {/* services */}
          <table className="w-full text-xs">
            <thead>
              <tr>
                {["Sr. No.", "Services", "Quantity", "Rate", "new test tax", "Amount"].map((h) => (
                  <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-2 text-center">1.</td>
                <td className="border border-gray-300 px-2 py-2"><div className="font-semibold">charge</div><div className="text-gray-500">hi  ………</div></td>
                <td className="border border-gray-300 px-2 py-2">123 cm</td>
                <td className="border border-gray-300 px-2 py-2">$32.00</td>
                <td className="border border-gray-300 px-2 py-2">$2,282.88</td>
                <td className="border border-gray-300 px-2 py-2">$3,936.00</td>
              </tr>
            </tbody>
          </table>
          {/* totals */}
          <div className="flex justify-end px-4 py-3 text-sm">
            <table className="text-right">
              <tbody>
                <tr><td className="px-3 py-1 font-bold">Sub Total</td><td className="px-3 py-1">$5,186.00</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">new test tax 58% on $5,186.00</td><td className="px-3 py-1">$3,007.88</td></tr>
                <tr><td className="px-3 py-1 text-gray-600">Test Tax 72% on $1,250.00</td><td className="px-3 py-1">$900.00</td></tr>
                <tr className="border-t border-gray-300"><td className="px-3 py-1 font-bold">Total</td><td className="px-3 py-1 font-bold">$9,093.88</td></tr>
                <tr><td className="px-3 py-1 font-bold">Amount Due</td><td className="px-3 py-1 font-bold">$9,093.88</td></tr>
              </tbody>
            </table>
          </div>
          <div className="text-right px-4 pb-2 text-xs">Total in Words: Nine Thousand Ninety Three Dollars and Eighty Eight Cents</div>
          <div className="px-4 py-3 border-t border-gray-300 text-sm">
            <div className="font-bold">Terms &amp; Conditions</div>
            <div className="text-gray-700">Eos ab vel officiis</div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

/* ── Email compose modal ───────────────────────────────────────── */
const EmailModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Invoice # 14 from info</h3>
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
        <input defaultValue="Invoice # 14 from info" className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <span className="text-sm text-gray-700">From: info@inovoic.com</span>
          <div className="flex items-center gap-2 text-gray-500">
            <ChevronDown className="w-4 h-4" />
            <Pencil className="w-4 h-4" />
          </div>
        </div>
        {/* toolbar */}
        <div className="flex items-center gap-1 flex-wrap text-gray-500 border-b border-gray-300 pb-2">
          <span className="inline-flex items-center text-xs px-1">Font <ChevronDown className="w-3 h-3 ml-0.5" /></span>
          {[Bold, Italic, Underline].map((Ic, i) => <button key={i} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded"><Ic className="w-3.5 h-3.5" /></button>)}
          <span className="px-1 font-bold text-sm border-b-2 border-current">A</span>
          {[AlignLeft, AlignCenter, AlignRight, ImageIcon, Link2].map((Ic, i) => <button key={i} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded"><Ic className="w-3.5 h-3.5" /></button>)}
        </div>
        {/* body */}
        <div className="text-sm text-gray-800 space-y-2 min-h-[140px]">
          <p>Dear Sed aliquip eaque co</p>
          <p>50 quie sint quos e<br />Invoice # 14<br />Invoice Total Amount: $9,093.88</p>
          <p>Eos ab vel officiis</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Invoice # 14</span>
        </div>
        {/* attachment */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
            <FileText className="w-4 h-4" /> Invoice #14 <X className="w-3.5 h-3.5 cursor-pointer" />
          </span>
          <button className="w-9 h-9 flex items-center justify-center rounded-md bg-gray-800 text-white"><Paperclip className="w-4 h-4" /></button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Customer multi-select filter (staged, Apply/Cancel) ───────── */
const CustomerFilter: React.FC<{
  applied: string[] | null; // null = All Customers
  onApply: (v: string[] | null) => void;
}> = ({ applied, onApply }) => {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(applied === null);
  const [sel, setSel] = useState<Set<string>>(new Set(applied ?? customerList));
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const customerQuery = useQuery({
    queryKey: ["sales-invoice-customer-filter", q],
    queryFn: async () => fetchCustomers({ page: 1, limit: 100, searchTerm: q.trim() || undefined }),
    staleTime: 30_000,
  });

  const customerOptions = useMemo<TCustomerRow[]>(() => {
    const rows = customerQuery.data?.rows ?? [];
    if (rows.length > 0) return rows;
    if (q.trim()) return [];
    return customerList.map((name, index) => ({ id: index + 1, _id: name, name, contact: "", amount: 0, status: "Active" }));
  }, [customerQuery.data, q]);

  const customerNames = useMemo(() => customerOptions.map((row) => row.name).filter(Boolean), [customerOptions]);

  const updatePosition = () => {
    const node = ref.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    setRect({ top: bounds.bottom + 8, left: bounds.left, width: Math.max(bounds.width, 256) });
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // sync staged state from applied whenever the menu opens
  useEffect(() => {
    if (open) {
      setAll(applied === null);
      setSel(new Set(applied ?? customerNames));
      setQ("");
      setTimeout(updatePosition, 0);
    }
  }, [open, applied]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const sync = () => updatePosition();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  const toggleAll = () => {
    if (all) {
      setAll(false);
      setSel(new Set());
    } else {
      setAll(true);
      setSel(new Set(customerNames));
    }
  };
  const toggle = (name: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      setAll(next.size === customerNames.length);
      return next;
    });
  };
  const apply = () => {
    onApply(all || sel.size === customerNames.length ? null : [...sel]);
    setOpen(false);
  };

  const label = applied === null ? "All" : applied.length === 1 ? applied[0] : `${applied.length}`;

  const Box: React.FC<{ on: boolean }> = ({ on }) => (
    <span className={`w-4 h-4 rounded-[4px] flex items-center justify-center border ${on ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>
      {on && <Check className="w-3 h-3 text-white" />}
    </span>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (!o) setTimeout(updatePosition, 0);
            return next;
          });
        }}
        className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"
      >
        <Plus className="w-3 h-3" />
        Customer | {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && rect && (
        <div ref={panelRef} className="fixed z-50 flex max-h-[70vh] w-64 flex-col rounded-md border border-gray-200 bg-white shadow-xl" style={{ top: rect.top, left: rect.left, width: rect.width }}>
          <label className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-300 cursor-pointer">
            <Box on={all} />
            <input type="checkbox" className="hidden" checked={all} onChange={toggleAll} />
            <span className="text-sm text-gray-800">All Customers</span>
          </label>
          <div className="p-2 border-b border-gray-300">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Customer"
              className="w-full px-2.5 py-1.5 text-sm bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div className="hover-scrollbar flex-1 overflow-y-auto py-1">
            {customerOptions.map((customer) => (
              <label key={customer._id} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Box on={sel.has(customer.name)} />
                <input type="checkbox" className="hidden" checked={sel.has(customer.name)} onChange={() => toggle(customer.name)} />
                <span className="truncate">{customer.name}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-200">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={apply} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── "Mark as Paid" payment methods (reference submenu) ────────── */
const PAY_METHOD_NAMES = [
  "Paypal", "Stripe", "Venmo", "Paypal Checkout", "Braintree", "Custom", "UPI",
  "Google Pay", "Apple Pay", "Square", "Razor Pay", "Pine Labs", "Cheque",
  "Master Card", "Others", "Money Order", "iZettle",
];

/* ── $ menu: Add Payment / Mark as Paid ▸ payment methods ──────── */
const PaidMenu: React.FC<{ close: () => void; onAddPayment: () => void; onMarkPaid: (method: string) => void }> = ({ close, onAddPayment, onMarkPaid }) => {
  const [sub, setSub] = useState(false);
  const item = "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap";
  return (
    <div className="py-1 min-w-[170px]">
      <button onClick={() => { onAddPayment(); close(); }} className={item}>Add Payment</button>
      <div className="relative" onMouseEnter={() => setSub(true)} onMouseLeave={() => setSub(false)}>
        <button className={item}>Mark as Paid <ChevronRight className="w-4 h-4 text-gray-400" /></button>
        {sub && (
          <div className="absolute left-full top-0 ml-0.5 min-w-[170px] max-h-[60vh] overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
            {PAY_METHOD_NAMES.map((m) => (
              <button key={m} onClick={() => { onMarkPaid(m); close(); }} className={item}>{m}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── ⋮ menu (reference: WhatsApp / Packing Slip / Delivery Note /
      Duplicate ▸ / Credit Notes ▸ / Signature Request / Activity Log / Trash) ── */
const DUP_TARGETS = ["As Invoice", "As Estimate", "As Proforma Invoice", "As Credit Note", "As Purchase Order", "As Delivery Challan"];
const InvoiceMoreMenu: React.FC<{ close: () => void; onAction: (a: string) => void }> = ({ close, onAction }) => {
  const [sub, setSub] = useState<null | "dup" | "credit">(null);
  const item = "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap";
  const run = (a: string) => { onAction(a); close(); };
  return (
    <div className="py-1 min-w-[190px]">
      <button onClick={() => run("whatsapp")} className={item}>WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button>
      <button onClick={() => run("packingSlip")} className={item}>Packing Slip</button>
      <button onClick={() => run("deliveryNote")} className={item}>Delivery Note</button>
      <div className="relative" onMouseEnter={() => setSub("dup")} onMouseLeave={() => setSub(null)}>
        <button className={item}>Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>
        {sub === "dup" && (
          <div className="absolute right-full top-0 mr-0.5 min-w-[190px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
            {DUP_TARGETS.map((t) => (
              <button key={t} onClick={() => run("dup:" + t)} className={item}>{t}</button>
            ))}
          </div>
        )}
      </div>
      <div className="relative" onMouseEnter={() => setSub("credit")} onMouseLeave={() => setSub(null)}>
        <button className={item}>Credit Notes <ChevronRight className="w-4 h-4 text-gray-400" /></button>
        {sub === "credit" && (
          <div className="absolute right-full top-0 mr-0.5 min-w-[160px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
            <button onClick={() => run("dup:As Credit Note")} className={item}>Create New</button>
          </div>
        )}
      </div>
      <button onClick={() => run("signature")} className={`${item} border-t border-gray-200`}>Signature Request</button>
      <button onClick={() => run("activity")} className={item}>Activity Log</button>
      <button onClick={() => run("trash")} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button>
    </div>
  );
};

/* ── Packing Slip / Delivery Note preview (settings-driven, live data) ── */
const DocTypePreview: React.FC<{ docType: PdfDocType; title: string; recordId: number; recordIds?: number[]; onClose: () => void }> = ({ docType, title, recordId, recordIds, onClose }) => {
  const settings = usePdfSettings(docType, "normal");
  // Batch mode: several selected records merged into one PDF (each on its own page).
  const batchIds = (recordIds ?? []).filter((n) => Number.isFinite(n));
  const isBatch = batchIds.length > 1;
  const [batchUrl, setBatchUrl] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(isBatch);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  useEffect(() => {
    if (!isBatch) return;
    let alive = true;
    let url: string | null = null;
    setBatchLoading(true);
    setBatchUrl(null);
    serverBatchPdfUrlForRecords(docType, batchIds).then((u) => {
      url = u;
      if (!alive) { if (u) URL.revokeObjectURL(u); return; }
      setBatchUrl(u);
      setBatchLoading(false);
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, isBatch, batchIds.join(",")]);
  const onDownload = () => isBatch ? downloadServerBatchPdf(docType, batchIds, `${title}.pdf`) : downloadServerPdf(docType, recordId, `${title}.pdf`);
  const onPrint = () => isBatch ? printServerBatchPdf(docType, batchIds) : printServerPdf(docType, recordId);
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
          <h3 className="text-base font-medium">{title}</h3>
          <div className="flex items-center gap-1">
            <button title="Download" onClick={onDownload} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><Download className="w-4 h-4" /></button>
            <button title="Print" onClick={onPrint} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><Printer className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
          </div>
        </div>
        {isBatch ? (
          batchLoading ? (
            <div style={{ width: "100%", height: "70vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="animate-spin" style={{ width: 44, height: 44, border: "3px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%" }} />
            </div>
          ) : batchUrl ? (
            <div style={{ width: "100%", height: "70vh", background: "#f3f4f6" }}>
              <iframe src={`${batchUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title="Documents PDF" style={{ width: "100%", height: "100%", border: "none" }} />
            </div>
          ) : (
            <PdfDocPreview docType={docType} mode="normal" settings={settings} recordId={recordId} />
          )
        ) : (
          <PdfDocPreview docType={docType} mode="normal" settings={settings} recordId={recordId} />
        )}
      </div>
    </div>
  );
};

/* ── Activity Log modal — live events for one invoice ──────────── */
const ActivityLogModal: React.FC<{ invoice: any; payments: any[]; onClose: () => void }> = ({ invoice, payments, onClose }) => {
  const rows = [
    ...payments.map((p) => ({ text: `Payment ${p.number} received (${p.method || "Cash"}).`, date: p.date, ts: p.ts || 0 })),
    { text: `Invoice ${invoice.number} created.`, date: invoice.date, ts: invoice.ts || 0 },
  ].sort((a, b) => b.ts - a.ts);
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-md my-16 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Activity Log — Invoice {invoice.number}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {rows.map((r, i) => (
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
  );
};

/* ── Create Invoice modal (live customer + item pickers → persists) ── */
const TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
const fmtToday = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
type DraftRow = { key: string; name: string; qty: number; rate: number; taxId: number };

const CreateInvoiceModal: React.FC<{ onClose: () => void; onSaved: (id: number) => void }> = ({ onClose, onSaved }) => {
  const customers = useCollection<any>("customers", "name");
  const products = useCollection<any>("products", "name");
  const services = useCollection<any>("services", "name");
  const catalog = useMemo(
    () => [
      ...products.map((p) => ({ key: "p" + p.id, name: p.name, rate: p.price || 0, taxId: p.taxId || 1 })),
      ...services.map((s) => ({ key: "s" + s.id, name: s.name, rate: s.price || 0, taxId: s.taxId || 1 })),
    ],
    [products, services],
  );
  const [customerId, setCustomerId] = useState<number | "">("");
  const [date, setDate] = useState("Jun 22, 2026");
  const [due, setDue] = useState("Jun 29, 2026");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([{ key: "", name: "", qty: 1, rate: 0, taxId: 1 }]);

  const addRow = () => setRows((r) => [...r, { key: "", name: "", qty: 1, rate: 0, taxId: 1 }]);
  const pickItem = (idx: number, key: string) =>
    setRows((r) => r.map((row, i) => {
      if (i !== idx) return row;
      const it = catalog.find((c) => c.key === key);
      return it ? { ...row, key, name: it.name, rate: it.rate, taxId: it.taxId } : { ...row, key: "", name: "" };
    }));
  const setQty = (idx: number, qty: number) => setRows((r) => r.map((row, i) => (i === idx ? { ...row, qty } : row)));
  const removeRow = (idx: number) => setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));

  const subTotal = rows.reduce((s, r) => s + r.qty * r.rate, 0);
  const taxTotal = rows.reduce((s, r) => s + r.qty * r.rate * ((TAX_RATE[r.taxId] || 0) / 100), 0);
  const total = subTotal + taxTotal;

  const save = async () => {
    if (customerId === "") return;
    const n = await nextNumber("invoices");
    const items = rows.filter((r) => r.name).map((r, i) => ({ id: i + 1, name: r.name, qty: r.qty, rate: r.rate, taxId: r.taxId, amount: +(r.qty * r.rate).toFixed(2) }));
    const id = await repo.add("invoices", {
      number: "#" + n, customerId, date, due, ts: Date.now(), status: "Draft",
      items, subTotal: +subTotal.toFixed(2), tax: +taxTotal.toFixed(2), shipping: 0,
      total: +total.toFixed(2), amountPaid: 0, amountDue: +total.toFixed(2), notes, terms: "",
    });
    onSaved(id);
    onClose();
  };

  const fc = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-3xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Create Invoice</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={save} disabled={customerId === ""} className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40">Save</button>
          </div>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs text-gray-500">Customer *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")} className={`mt-1 ${fc}`}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500">Invoice date</label><input value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${fc}`} /></div>
            <div><label className="text-xs text-gray-500">Due date</label><input value={due} onChange={(e) => setDue(e.target.value)} className={`mt-1 ${fc}`} /></div>
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left font-semibold px-3 py-2">Item</th>
                <th className="text-right font-semibold px-2 py-2 w-20">Qty</th>
                <th className="text-right font-semibold px-2 py-2 w-24">Rate</th>
                <th className="text-right font-semibold px-3 py-2 w-28">Amount</th>
                <th className="w-8" />
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-3 py-2">
                      <select value={r.key} onChange={(e) => pickItem(i, e.target.value)} className="w-full bg-transparent text-sm outline-none">
                        <option value="">Select product / service</option>
                        {catalog.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-right"><input type="number" min={0} value={r.qty} onChange={(e) => setQty(i, Number(e.target.value))} className="w-16 bg-transparent text-sm text-right outline-none" /></td>
                    <td className="px-2 py-2 text-right text-gray-700">{fmtMoney(r.rate)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmtMoney(r.qty * r.rate)}</td>
                    <td className="px-2 py-2 text-right"><button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2 border-t border-gray-200"><button onClick={addRow} className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Item</button></div>
          </div>

          <div className="flex justify-between gap-5">
            <div className="flex-1"><label className="text-xs text-gray-500">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full h-20 border border-gray-200 rounded-md p-2 text-sm outline-none resize-none" /></div>
            <div className="w-56 border border-gray-200 rounded-md overflow-hidden self-start">
              <div className="flex justify-between px-3 py-2 text-sm"><span className="text-gray-600">Sub Total</span><span className="font-semibold text-gray-900">{fmtMoney(subTotal)}</span></div>
              <div className="flex justify-between px-3 py-2 text-sm border-t border-gray-200"><span className="text-gray-600">Tax</span><span className="text-gray-700">{fmtMoney(taxTotal)}</span></div>
              <div className="flex justify-between px-3 py-2.5 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const SalesInvoice: React.FC = () => {
  const queryClient = useQueryClient();
  // Opened from an activity link → pre-select that invoice.
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState(navSelectedId ?? 14);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Invoice date");
  const [sortDir, setSortDir] = useState<"Ascending" | "Descending">("Descending");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string[] | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    null | "settings" | "preview" | "email" | "payment" | "pdfSettings"
  >(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const navigate = useNavigate();
  // reference features: expandable info panel, doc-type previews, activity log, trash alerts
  const [expanded, setExpanded] = useState(true);
  const [docPreview, setDocPreview] = useState<null | "packingSlip" | "deliveryNote">(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigRequestOpen, setSigRequestOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // live from the shared datastore (customer name resolved by id)
  const dbInvoices = useCollection<any>("invoices");
  const dbCustomers = useCollection<any>("customers", "name");
  const localInvoices: Invoice[] = useMemo(
    () => dbInvoices.slice().sort((a, b) => b.id - a.id).map((inv) => ({
      id: inv.id,
      backendId: inv._id,
      name: customerDisplayName(dbCustomers.find((c) => c.id === inv.customerId)) || inv.name || "—",
      customerSubtitle: customerDisplaySubtitle(dbCustomers.find((c) => c.id === inv.customerId)),
      number: inv.number, note: inv.notes || "No Notes", date: inv.date, due: inv.due,
      amount: fmtMoney(inv.total), currency: inv.currency || "USD", status: inv.status,
    })),
    [dbInvoices, dbCustomers],
  );
  const { data: backendInvoiceList } = useQuery({
    queryKey: ["sales-invoice-backend-list", search, sortBy, sortDir, statusFilter],
    queryFn: () =>
      fetchInvoices({
        page: 1,
        limit: 200,
        searchTerm: search || undefined,
        sort: `${sortDir === "Descending" && !invoiceSortToBackend(sortBy).startsWith("-") ? "-" : ""}${invoiceSortToBackend(sortBy).replace(/^-/, "")}`,
        status: statusFilter,
      }),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    const backendRows = backendInvoiceList?.rows ?? [];
    if (backendRows.length === 0 && (search || statusFilter !== "All")) return [];

    const sourceRows = backendRows.length > 0 ? backendRows : localInvoices.map((item) => ({
      _id: item.backendId || String(item.id),
      number: item.number.replace(/^#/, ""),
      customerName: item.name,
      customerSubtitle: item.customerSubtitle || "",
      amount: Number(item.amount.replace(/[^0-9.-]/g, "")) || 0,
      dateLabel: item.date,
      status: item.status,
      currency: item.currency || "USD",
      dueAmount: 0,
      paidAmount: 0,
      customerId: "",
    }));

    return sourceRows
      .filter((row) => customerFilter === null || customerFilter.includes(row.customerName))
      .map((row) => {
        const linkedLocal =
          dbInvoices.find((item) => item._id === row._id) ||
          dbInvoices.find((item) => String(item.number).replace(/^#/, "") === row.number);
        return {
          id: linkedLocal?.id ?? (Number(row.number) || Math.abs(row._id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0))),
          backendId: row._id,
          name: row.customerName,
          customerSubtitle: row.customerSubtitle,
          number: `#${row.number}`,
          note: row.customerSubtitle || linkedLocal?.notes || "No Notes",
          date: row.dateLabel,
          due: row.dateLabel,
          amount: apiMoney(row.amount, row.currency),
          currency: row.currency,
          status: (["Draft", "Paid", "Partial", "Overdue"].includes(row.status) ? row.status : "Draft") as Status,
        } satisfies Invoice;
      });
  }, [backendInvoiceList?.rows, customerFilter, dbInvoices, localInvoices, search, statusFilter]);

  const listDue = useMemo(
    () => filtered.reduce((sum, item) => sum + (Number(item.amount.replace(/[^0-9.-]/g, "")) || 0), 0),
    [filtered],
  );

  const selected = filtered.find((i) => i.id === selectedId) || filtered[0];
  const selectedDb: any = dbInvoices.find((i) => i.id === (selected?.id ?? selectedId)) || {};
  const selectedCustomer: any = dbCustomers.find((c) => c.id === selectedDb.customerId) || {};

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);
  const { data: paymentMethodOptions = [] } = useQuery({
    queryKey: ["sales-invoice-payment-methods"],
    queryFn: fetchPaymentMethods,
    staleTime: 60_000,
  });
  const { data: selectedInvoiceDoc } = useQuery({
    queryKey: ["sales-invoice-backend-detail", selected?.backendId],
    queryFn: () => fetchInvoice(String(selected?.backendId)),
    enabled: !!selected?.backendId,
    staleTime: 30_000,
  });
  const dbPaymentsReceived = useCollection<any>("paymentsReceived");
  const invoicePayments = dbPaymentsReceived.filter((p) => p.invoiceId === selectedDb.id);

  /* ── reference actions: mark-as-paid / duplicate / trash ──────── */
  const markAsPaid = async (method: string) => {
    const ids = [...checked];
    for (const id of ids) {
      const inv = dbInvoices.find((i) => i.id === id);
      if (!inv || inv.status === "Paid") continue;
      const open = inv.amountDue ?? inv.total ?? 0;
      await repo.update("invoices", id, { status: "Paid", amountPaid: inv.total || 0, amountDue: 0 });
      if (open > 0) {
        const n = await nextNumber("paymentsReceived");
        await repo.add("paymentsReceived", {
          number: "#" + n, customerId: inv.customerId, invoiceId: id,
          date: fmtToday(), ts: Date.now(), amount: open, method, notes: "", internalNotes: "",
        });
      }
    }
    showToast(`${ids.length} ${ids.length === 1 ? "invoice" : "invoices"} marked as paid (${method})`, "success");
    exitSelect();
  };

  const trashSelectedInvoices = async () => {
    const ids = [...checked];
    await repo.removeMany("invoices", ids);
    showToast(`${ids.length} ${ids.length === 1 ? "invoice" : "invoices"} moved to trash`, "success");
    if (ids.includes(selectedId)) setSelectedId(filtered.find((i) => !ids.includes(i.id))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  const trashCurrent = async () => {
    await repo.remove("invoices", selectedDb.id);
    showToast(`Invoice ${selectedDb.number} moved to trash`, "success");
    setSelectedId(filtered.find((i) => i.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };

  /** Duplicate the selected invoice into another document collection. */
  const duplicateAs = async (label: string) => {
    const inv = selectedDb;
    if (!inv?.id) return;
    const base = {
      customerId: inv.customerId, date: inv.date, due: inv.due, ts: Date.now(),
      items: inv.items || [], subTotal: inv.subTotal || 0, tax: inv.tax || 0,
      total: inv.total || 0, notes: inv.notes || "", terms: inv.terms || "",
    };
    const create = async (col: any, extra: Record<string, any>) => {
      const n = await nextNumber(col);
      return repo.add(col, { ...base, number: "#" + n, ...extra });
    };
    switch (label) {
      case "As Invoice": {
        const id = await create("invoices", { status: "Draft", amountPaid: 0, amountDue: inv.total || 0 });
        setSelectedId(id);
        showToast("Invoice duplicated", "success");
        break;
      }
      case "As Estimate": {
        const id = await create("estimates", { status: "Draft" });
        showToast("Estimate created", "success");
        navigate("/sales/estimates", { state: { selectedId: id } });
        break;
      }
      case "As Proforma Invoice": {
        const id = await create("proformas", { status: "Draft", amountPaid: 0, amountDue: inv.total || 0 });
        showToast("Proforma invoice created", "success");
        navigate("/sales/proforma-invoices", { state: { selectedId: id } });
        break;
      }
      case "As Credit Note": {
        const id = await create("creditNotes", { status: "Unused", amountPaid: 0, amountDue: inv.total || 0 });
        showToast("Credit note created", "success");
        navigate("/sales/credit-notes", { state: { selectedId: id } });
        break;
      }
      case "As Purchase Order": {
        const vendors = await repo.getAll("vendors");
        const id = await create("purchaseOrders", { vendorId: vendors[0]?.id ?? 1, status: "Draft", billStatus: "Not Billed", amountPaid: 0, amountDue: inv.total || 0 });
        showToast("Purchase order created", "success");
        navigate("/purchase/purchase-orders", { state: { selectedId: id } });
        break;
      }
      case "As Delivery Challan": {
        const id = await create("deliveryChallans", { status: "Draft", invoiceNo: inv.number, invoiceStatus: "Invoiced", amountPaid: 0, amountDue: inv.total || 0 });
        showToast("Delivery challan created", "success");
        navigate("/sales/delivery-challan", { state: { selectedId: id } });
        break;
      }
    }
  };

  const handleMoreAction = (a: string) => {
    if (a === "whatsapp") showToast("Opening WhatsApp…", "info");
    else if (a === "packingSlip") setDocPreview("packingSlip");
    else if (a === "deliveryNote") setDocPreview("deliveryNote");
    else if (a.startsWith("dup:")) duplicateAs(a.slice(4));
    else if (a === "signature") setSigRequestOpen(true);
    else if (a === "activity") setActivityOpen(true);
    else if (a === "trash") setConfirmAction("trashOne");
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    const backendId = selectedInvoiceDoc?._id || selected?.backendId || selectedDb?._id;
    let signaturePath = data.image;

    try {
      if (backendId && data.image.startsWith("data:")) {
        const formData = new FormData();
        formData.append("files", await dataUrlToFile(data.image, `invoice-signature-${backendId}.png`));
        const uploadRes = await api.raw.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        signaturePath = uploadRes.data?.data?.file_path || uploadRes.data?.data?.path || data.image;
        await updateInvoice(String(backendId), { signature: signaturePath });
        await queryClient.invalidateQueries({ queryKey: ["sales-invoice-backend-detail", String(backendId)] });
      }
      if (selectedDb?.id) {
        await repo.update("invoices", selectedDb.id, {
          signature: signaturePath,
          signatureName: data.name,
          signatureTitle: data.title,
          signatureDate: data.date,
        });
      }
      showToast("Signature saved", "success");
    } catch {
      showToast("Could not save signature", "error");
    }
  };

  /* ── selection mode ── */
  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const selectedInvoices = filtered.filter((i) => checked.has(i.id));
  const totals = {
    total: selectedInvoices.reduce((s, i) => s + num(i.amount), 0),
    paid: selectedInvoices.filter((i) => i.status === "Paid").reduce((s, i) => s + num(i.amount), 0),
    due: selectedInvoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + num(i.amount), 0),
  };

  const exitSelect = () => {
    setSelectMode(false);
    setChecked(new Set());
  };
  const toggleRow = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) exitSelect();
    else setChecked(new Set(filtered.map((i) => i.id)));
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const actionIcons: {
    icon: React.ElementType;
    title: string;
    onClick?: () => void;
  }[] = [
    { icon: Settings, title: "Settings", onClick: () => setModal("settings") },
    { icon: expanded ? CircleChevronUp : CircleChevronDown, title: expanded ? "Collapse" : "Expand", onClick: () => setExpanded((v) => !v) },
    { icon: SlidersHorizontal, title: "PDF & Print Settings", onClick: () => setModal("pdfSettings") },
    { icon: Pencil, title: "Edit", onClick: () => setEditOpen(true) },
    { icon: PenTool, title: "Customer Signature", onClick: () => setSigOpen(true) },
    { icon: DollarSign, title: "Add Payment", onClick: () => setModal("payment") },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => setModal("preview") },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  // No invoices (e.g. after deleting them all): don't blank the page — show an
  // empty state with a working "New Invoice" action (and the create form itself
  // when the user starts one).
  if (!selected) {
    return createOpen ? (
      <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
        <CreateInvoiceForm onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center bg-[#FAFBFC] text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No invoices yet</h3>
        <p className="text-sm text-gray-500 mt-1 mb-5">Create your first invoice to get started.</p>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {/* List header — default vs. selection mode */}
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button
              onClick={toggleAll}
              className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${
                allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"
              }`}
              title="Select all"
            >
              {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            <div className="flex items-center gap-0.5">
              <button
                title="Delete"
                onClick={() => (checked.size === 0 ? showToast("Select invoices to delete", "warning") : setConfirmAction("trashSelected"))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              ><Trash2 className="w-4 h-4" /></button>
              {/* $ → Add Payment / Mark as Paid ▸ (payment-method submenu) */}
              <Dropdown
                align="right"
                trigger={
                  <span title="Payments" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer">
                    <DollarSign className="w-4 h-4" />
                  </span>
                }
              >
                {(close) => (
                  <PaidMenu
                    close={close}
                    onAddPayment={() => setModal("payment")}
                    onMarkPaid={(m) => (checked.size === 0 ? showToast("Select invoices to mark as paid", "warning") : markAsPaid(m))}
                  />
                )}
              </Dropdown>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Invoices</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md">
                <Search className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => setSelectMode(true)}
                className="p-1.5 hover:bg-gray-100 rounded-md"
                title="Select invoices"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
              </button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>
                {(close) => (
                  <>
                    <button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button>
                    <button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button>
                  </>
                )}
              </Dropdown>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-300">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Toolbar: sort + filter chips */}
        <div className="hover-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto px-3 py-2 border-b border-gray-300">
          {/* Sort by: fields + direction */}
          <Dropdown
            trigger={
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">
                Sort by | <span className="text-gray-800 font-medium">{sortBy}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </span>
            }
          >
            {() => (
              <>
                {sortFields.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSortBy(o)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    {o} {o === sortBy && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                <div className="border-t border-gray-200 my-1" />
                {(["Ascending", "Descending"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSortDir(d)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    {d} {d === sortDir && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </>
            )}
          </Dropdown>

          {/* Status filter */}
          <Dropdown
            trigger={
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400">
                <Plus className="w-3 h-3" />
                Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}
              </span>
            }
          >
            {(close) =>
              statusList.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s === "Trash" ? statusFilter : s);
                    close();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                    s === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"
                  }`}
                >
                  {s} {s === statusFilter && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))
            }
          </Dropdown>

          {/* Customer multi-select filter */}
          <CustomerFilter applied={customerFilter} onApply={setCustomerFilter} />
        </div>

        {/* List rows */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((inv) => {
            const active = !selectMode && inv.id === selectedId;
            const isChecked = checked.has(inv.id);
            const rowCustomer = dbCustomers.find((c) => c.id === inv.id || c.id === dbInvoices.find((item) => item.id === inv.id)?.customerId);
            const rowSubtitle = customerDisplaySubtitle(rowCustomer) || inv.note;
            return (
              <button
                key={inv.id}
                onClick={() => (selectMode ? toggleRow(inv.id) : setSelectedId(inv.id))}
                className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-start gap-3 transition-colors ${
                  active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                {selectMode && (
                  <span
                    className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${
                      isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{inv.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{inv.number}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{rowSubtitle || "No Notes"}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs text-gray-500">{inv.date}</span>
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{inv.amount}</span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[inv.status]}`}>
                    {inv.status}
                  </span>
                </div>
              </button>
            );
          })}
          {/* FAB → Create Invoice (live → shared datastore) */}
          {!selectMode && (
            <button onClick={() => setCreateOpen(true)} className="absolute bottom-[4.5rem] right-5 z-20 flex w-[42px] h-[42px] items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600 transition-colors"><Plus className="w-6 h-6" strokeWidth={2} /></button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{money(listDue)} Due</div>
          <div className="text-xs text-gray-500">{filtered.length} Invoices</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL: create/edit form / selection summary / detail ════════ */}
      {createOpen ? (
        <CreateInvoiceForm onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editOpen ? (
        <CreateInvoiceForm key={selectedId} invoice={dbInvoices.find((i) => i.id === selectedId)} onClose={() => setEditOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">
              {checked.size} {checked.size === 1 ? "Invoice" : "Invoices"} Selected
            </h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-900">{money(totals.total)}</span>
              <span className="text-gray-500">Paid</span>
              <span className="font-semibold text-green-500">{money(totals.paid)}</span>
              <span className="text-gray-500">Due</span>
              <span className="font-semibold text-red-500">{money(totals.due)}</span>
            </div>
          </div>
        </section>
      ) : (
      <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
              <button className="text-xs text-blue-600 hover:text-blue-700 underline">{customerDisplaySubtitle(selectedCustomer) || "View Contact"}</button>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {actionIcons.map((a) => (
                <button
                  key={a.title}
                  title={a.title}
                  onClick={a.onClick}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <a.icon className="w-4 h-4" />
                </button>
              ))}
              <Dropdown align="right" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                {(close) => <InvoiceMoreMenu close={close} onAction={handleMoreAction} />}
              </Dropdown>
            </div>
          </div>

          {/* Expandable info panel (chevron toggle in the header) */}
          {expanded && (
          <>
          {/* Meta row */}
          <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
            <div className="flex items-center gap-10">
              <div>
                <div className="text-xs text-gray-500">{selected.number}</div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedInvoiceDoc ? apiMoney(selectedInvoiceDoc.total || 0, selectedInvoiceDoc.currency) : selected.amount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Invoice date</div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedInvoiceDoc?.date ? new Date(selectedInvoiceDoc.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : selected.date}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Due</div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedInvoiceDoc?.due_date ? new Date(selectedInvoiceDoc.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : selected.due}
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>
              {selected.status}
            </span>
          </div>

          {/* Addresses + payment methods */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-5 py-4 border-b border-gray-300">
            <div>
              <div className="text-xs text-gray-500 mb-1">Billing Address</div>
              {(selectedInvoiceDoc ? invoiceAddressLines(selectedInvoiceDoc.billing_address) : [selectedCustomer.street1, selectedCustomer.street2, [selectedCustomer.city, selectedCustomer.zip].filter(Boolean).join(" "), selectedCustomer.country].filter(Boolean)).length
                ? (selectedInvoiceDoc ? invoiceAddressLines(selectedInvoiceDoc.billing_address) : [selectedCustomer.street1, selectedCustomer.street2, [selectedCustomer.city, selectedCustomer.zip].filter(Boolean).join(" "), selectedCustomer.country].filter(Boolean)).map((l: string, i: number) => (
                    <div key={i} className={`text-sm ${i === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{l}</div>
                  ))
                : <div className="text-sm text-gray-400">—</div>}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Shipping Address</div>
              {(selectedInvoiceDoc ? invoiceAddressLines(selectedInvoiceDoc.shipping_address) : [selectedCustomer.shipStreet1, selectedCustomer.shipStreet2, [selectedCustomer.shipCity, selectedCustomer.shipZip].filter(Boolean).join(" "), selectedCustomer.shipCountry].filter(Boolean)).length
                ? (selectedInvoiceDoc ? invoiceAddressLines(selectedInvoiceDoc.shipping_address) : [selectedCustomer.shipStreet1, selectedCustomer.shipStreet2, [selectedCustomer.shipCity, selectedCustomer.shipZip].filter(Boolean).join(" "), selectedCustomer.shipCountry].filter(Boolean)).map((l: string, i: number) => (
                    <div key={i} className={`text-sm ${i === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{l}</div>
                  ))
                : <div className="text-sm text-gray-400">—</div>}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                Payment Methods <Pencil className="w-3 h-3" />
              </div>
              <DynamicPaymentBadges names={selectedInvoiceDoc?.payment_method ?? []} options={paymentMethodOptions} />
            </div>
          </div>

          {/* Sub meta */}
          <div className="grid grid-cols-3 gap-6 px-5 py-3 border-b border-gray-300">
            <div>
              <div className="text-xs text-gray-500">Sub Title</div>
              <div className="text-sm font-semibold text-gray-900">{selectedInvoiceDoc?.sub_title || selectedDb.subTitle || selectedCustomer.subtitle || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Shipping Method</div>
              <div className="text-sm font-semibold text-gray-900">{selectedInvoiceDoc?.shipping_method || selectedDb.shippingMethod || "Standard Ground"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">P.O. #</div>
              <div className="text-sm font-semibold text-gray-900">{selectedInvoiceDoc?.po || selectedDb.poNo || selectedDb.id || "—"}</div>
            </div>
          </div>
          </>
          )}

          {/* Line items table */}
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
                  <tr key={idx} className="border-b border-gray-300 align-top">
                    <td className="px-5 py-3 text-gray-700">{idx + 1}</td>
                    <td className="px-2 py-3">
                      <div className="font-semibold text-gray-900">{it.name}</div>
                      {it.description && <div className="text-xs text-gray-500 mt-1">{it.description}</div>}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-800">{it.qty ?? 1}</td>
                    <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(0)}</td>
                    <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(it.rate)}</td>
                    <td className="px-2 py-3 text-gray-800">{TAX_NAME[it.taxId || 1]}</td>
                    <td className="px-2 py-3 text-right text-gray-500 text-xs">{it.discount ? fmtMoney(it.discount) : "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtMoney(it.amount ?? (it.qty || 0) * (it.rate || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Terms / Notes / Totals — live from the selected invoice */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
            <div>
              <label className="text-xs text-gray-500">Terms &amp; Conditions</label>
              <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
                {selectedDb.terms || "—"}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Notes</label>
              <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">
                {selectedDb.notes || "—"}
              </div>
            </div>
            <div className="border border-gray-200 rounded-md overflow-hidden self-start">
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-700">Sub Total</span>
                <span className="font-semibold text-gray-900">{fmtMoney(selectedDb.subTotal)}</span>
              </div>
              {Object.entries(
                (selectedDb.items || []).reduce((acc: Record<number, number>, it: any) => {
                  const base = it.amount ?? (it.qty || 0) * (it.rate || 0);
                  acc[it.taxId || 1] = (acc[it.taxId || 1] || 0) + base;
                  return acc;
                }, {}),
              ).map(([taxId, base]) => (
                <div key={taxId} className="flex justify-between px-4 py-2 text-xs text-gray-500">
                  <span>{TAX_NAME[Number(taxId)]} {TAX_RATE[Number(taxId)]}% on {fmtMoney(base as number)}</span>
                  <span>{fmtMoney(((base as number) * (TAX_RATE[Number(taxId)] || 0)) / 100)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-200">
                <span className="text-gray-700">Total</span>
                <span className="font-semibold text-gray-900">{fmtMoney(selectedDb.total)}</span>
              </div>
              {(selectedDb.amountPaid || 0) > 0 && (
                <div className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-gray-700">Amount Paid</span>
                  <span className="font-semibold text-gray-900">{fmtMoney(selectedDb.amountPaid)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 bg-gray-100">
                <span className="font-semibold text-gray-900">Amount Due</span>
                <span className="font-semibold text-gray-900">{fmtMoney(selectedDb.amountDue)}</span>
              </div>
            </div>
          </div>

          {/* Attachment */}
          <div className="px-5 pb-6">
            <label className="text-xs text-gray-500">Attachment</label>
            <div className="mt-1 grid grid-cols-2 max-w-md border border-gray-200 rounded-md divide-x divide-gray-200">
              <button className="flex flex-col items-center gap-2 py-5 hover:bg-gray-50 transition-colors">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </span>
                <span className="text-xs text-gray-600">Upload from Computer</span>
              </button>
              <button className="flex flex-col items-center gap-2 py-5 hover:bg-gray-50 transition-colors">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-xs text-gray-600">Upload from Document</span>
              </button>
            </div>
          </div>

          {/* saved signature (shows after Add Signature) */}
          <SignatureBlock
            record={{
              ...selectedDb,
              signature: selectedInvoiceDoc?.signature || selectedDb.signature,
              signatureName: selectedDb.signatureName,
              signatureTitle: selectedDb.signatureTitle,
              signatureDate: selectedDb.signatureDate,
            }}
            label="Customer Signature"
          />

          {/* Draft corner ribbon */}
          {selected.status === "Draft" && (
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className="absolute bottom-[18px] -left-[34px] w-32 rotate-45 bg-gray-600 text-white text-[10px] font-semibold py-1 text-center">
                Draft
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ════════ MODALS (opened via detail action icons) ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Invoice" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => {
        // In select mode with several rows ticked, merge them all into one PDF;
        // otherwise preview the single active record.
        const batchIds = selectMode ? [...checked] : [];
        const d: any = (batchIds.length ? dbInvoices.find((i) => i.id === batchIds[0]) : dbInvoices.find((i) => i.id === selectedId)) || {};
        const cp: any = dbCustomers.find((c) => c.id === d.customerId) || {}; const cn = cp.name || "—";
        const ht = selectMode && selectedInvoices.length ? "Invoice " + selectedInvoices.map((i) => i.number.replace("#", "")).join(", ") : `Invoice${d.number || ""}`;
        void cn; void cp;
        // Render the real backend PDF (PdfDocPreview fetches /pdf/generate for
        // the record's _id; falls back to the local render for unsaved drafts).
        return <DocTypePreview docType="invoice" title={ht} recordId={d.id} recordIds={batchIds.length > 1 ? batchIds : undefined} onClose={() => setModal(null)} />;
      })()}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} />}
      {modal === "payment" && (
        <InvoicePaymentsModal
          open
          invoice={
            selectedInvoiceDoc ?? {
              _id: String(selectedDb._id || ""),
              invoice_number: selectedDb.number?.replace(/^#/, "") || "",
              currency: selectedDb.currency || "USD",
              total: selectedDb.total || 0,
              balance_amount: selectedDb.amountDue || 0,
              customer_id: selectedCustomer._id ? { _id: String(selectedCustomer._id), name: selectedCustomer.contact || selectedCustomer.name } : undefined,
              customer_name: selected.name,
              payment_method: [],
            }
          }
          paymentMethods={paymentMethodOptions}
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
      {modal === "pdfSettings" && (
        <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="invoice" />
      )}
      {sigOpen && (
        <SignatureModal
          heading="Customer Signature"
          defaultName={
            selectedCustomer.contact ||
            selectedCustomer.name ||
            (selectedInvoiceDoc?.customer_id && typeof selectedInvoiceDoc.customer_id === "object"
              ? selectedInvoiceDoc.customer_id.name || selectedInvoiceDoc.customer_name || ""
              : selectedInvoiceDoc?.customer_name || "")
          }
          onDone={saveSignature}
          onClose={() => setSigOpen(false)}
        />
      )}
      {sigRequestOpen && (
        <SignatureRequestModal
          docLabel="Invoice"
          number={selectedDb.number || ""}
          customer={selectedCustomer}
          onClose={() => setSigRequestOpen(false)}
          onSend={() => showToast("Signature request sent", "success")}
        />
      )}
      {docPreview && (
        <DocTypePreview
          docType={docPreview}
          title={`${docPreview === "packingSlip" ? "Packing Slip" : "Delivery Note"} ${selected.number}`}
          recordId={selected.id}
          onClose={() => setDocPreview(null)}
        />
      )}
      {activityOpen && (
        <ActivityLogModal invoice={selectedDb} payments={invoicePayments} onClose={() => setActivityOpen(false)} />
      )}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this invoice?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these invoices?" onNo={() => setConfirmAction(null)} onYes={trashSelectedInvoices} />
      )}
    </div>
  );
};
