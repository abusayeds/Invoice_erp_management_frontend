/**
 * File: src/pages/Reports.tsx
 * Reports — two-pane report browser matching the reference design.
 * Left: "Reports" nav — collapsible categories (Business Overview / Sales /
 *       Purchases & Expenses / Items / Projects & Time Sheet / Taxes) each
 *       holding report links. Right: the selected report — title bar with
 *       Eye/Download/Print/WhatsApp/Mail, a filter-pill row ("Columns: N
 *       Selected" + report-specific filters), a data grid, a totals row and
 *       pagination. Eye/Download → PDF preview / export menu (CSV/PDF/XLS/HTML).
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, downloadDocPdf } from "@/lib/db";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Eye,
  Download,
  Printer,
  MessageCircle,
  Mail,
  AlignLeft,
  X,
  XCircle,
  Settings,
} from "lucide-react";

/* ── money helpers ─────────────────────────────────────────────── */
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── normalized report shape ───────────────────────────────────── */
interface Col { label: string; right?: boolean; }
interface Report {
  name: string;
  columnsSelected: number;
  filters: string[];        // dashed filter pills (after the blue Columns pill)
  cols: Col[];
  rows: string[][];
  totals: string[];         // totals row (formatted, aligned to cols)
}

/* ── Invoice Aging Report ──────────────────────────────────────── */
const agingData: { name: string; b: [number, number, number, number] }[] = [
  { name: "rahim", b: [0, 0, 0, 0] },
  { name: "Dolore quidem nisi d", b: [0, 0, 0, 0] },
  { name: "sayed cpy 1", b: [0, 0, 0, 0] },
  { name: "STA", b: [0, 0, 52, 0] },
  { name: "Harum ut dolore aliq", b: [0, 0, 0, 0] },
  { name: "Sed aliquip eaque co", b: [0, 0, 0, 0] },
  { name: "bdcalling", b: [0, 0, 0, 0] },
  { name: "Dolor perspiciatis", b: [0, 0, 0, 0] },
  { name: "Dignissimos quae ull", b: [0, 0, 0, 0] },
  { name: "Vitae pariatur Vero", b: [0, 0, 0, 0] },
  { name: "STT", b: [0, 0, 0, 55] },
  { name: "Temporibus est dese", b: [0, 0, 0, 0] },
  { name: "sayed cpy", b: [0, 0, 0, 0] },
  { name: "SMT", b: [50, 160, 0, 0] },
  { name: "Unknown Customer", b: [0, 0, 0, 0] },
];
const buildAging = (invoices: any[], customers: any[]): Report => {
  const cols: Col[] = [{ label: "Name" }, { label: "0-30 Days", right: true }, { label: "31-60 Days", right: true }, { label: "61-90 Days", right: true }, { label: ">90 Days", right: true }, { label: "Total Outstanding", right: true }];
  const now = Date.now();
  const byCust: Record<number, number[]> = {};
  invoices.forEach((inv) => {
    const due = inv.amountDue || 0;
    if (due <= 0) return;
    const days = (now - (inv.ts || now)) / 86400000;
    const bi = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
    (byCust[inv.customerId] ||= [0, 0, 0, 0])[bi] += due;
  });
  const sums = [0, 0, 0, 0, 0];
  const rows = Object.entries(byCust).map(([cid, b]) => {
    const total = b.reduce((s, n) => s + n, 0);
    b.forEach((n, i) => (sums[i] += n));
    sums[4] += total;
    const name = customers.find((c) => c.id === Number(cid))?.name || "—";
    return [name, ...b.map(money), money(total)];
  });
  return { name: "Invoice Aging Report", columnsSelected: 6, filters: ["All Date", "Report Type: PDF", "Customers : All", "Status: All"], cols, rows, totals: [`Total (${rows.length})`, ...sums.map(money)] };
};

/* ── Sales Report ──────────────────────────────────────────────── */
const salesData = [
  { sr: 16, type: "Invoice", cust: "bdcalling", status: "Paid", date: "Jun 20, 2026", due: "Jun 27, 2026", tax: 2571.12, ship: 0, sub: 3630.4, paid: 6201.52, amtDue: 0, total: 6201.52 },
  { sr: 14, type: "Invoice", cust: "Sed aliquip eaque co", status: "Draft", date: "Jun 18, 2026", due: "Jun 18, 2026", tax: 3907.88, ship: 0, sub: 5186.0, paid: 0, amtDue: 9093.88, total: 9093.88 },
  { sr: 13, type: "Credit Note", cust: "Vitae pariatur Vero", status: "Partial", date: "Jun 17, 2026", due: "Jun 17, 2026", tax: 2811.6, ship: 0, sub: 9022.6, paid: 6201.52, amtDue: 0, total: 9022.6 },
  { sr: 12, type: "Invoice", cust: "Harum ut dolore aliq", status: "Paid", date: "Jun 15, 2026", due: "Jun 22, 2026", tax: 740.18, ship: 0, sub: 980.0, paid: 1720.18, amtDue: 0, total: 1720.18 },
  { sr: 11, type: "Sales Receipt", cust: "Dolor perspiciatis", status: "Paid", date: "Jun 14, 2026", due: "Jun 14, 2026", tax: 0, ship: 0, sub: 450.0, paid: 450.0, amtDue: 0, total: 450.0 },
  { sr: 9, type: "Estimate", cust: "Dignissimos quae ull", status: "Sent", date: "Jun 12, 2026", due: "Jun 19, 2026", tax: 312.0, ship: 0, sub: 4160.0, paid: 0, amtDue: 4472.0, total: 4472.0 },
  { sr: 8, type: "Invoice", cust: "STA", status: "Unused", date: "Jun 10, 2026", due: "Jun 17, 2026", tax: 215.0, ship: 0, sub: 2150.0, paid: 0, amtDue: 2365.0, total: 2365.0 },
  { sr: 7, type: "Credit Note", cust: "sayed cpy 1", status: "Unused", date: "Jun 08, 2026", due: "Jun 08, 2026", tax: 0, ship: 0, sub: 0.0, paid: 0, amtDue: 0, total: 0.0 },
  { sr: 6, type: "Sales Receipt", cust: "rahim", status: "Paid", date: "May 30, 2026", due: "May 30, 2026", tax: 212.0, ship: 0, sub: 1377.0, paid: 1589.0, amtDue: 0, total: 1589.0 },
  { sr: 5, type: "Invoice", cust: "SMT", status: "Due", date: "Apr 27, 2026", due: "Apr 27, 2026", tax: 0, ship: 0, sub: 160.0, paid: 0, amtDue: 160.0, total: 160.0 },
];
const buildSales = (invoices: any[], customers: any[]): Report => {
  const cols: Col[] = [
    { label: "Sr. No." }, { label: "Type" }, { label: "Customer" }, { label: "Status" }, { label: "Date" }, { label: "Due Date" },
    { label: "Tax", right: true }, { label: "Shipping Cost", right: true }, { label: "Sub Total", right: true }, { label: "Amount Paid", right: true }, { label: "Amount Due", right: true }, { label: "Total", right: true },
  ];
  const cname = (id: number) => customers.find((c) => c.id === id)?.name || "—";
  const s = { tax: 0, ship: 0, sub: 0, paid: 0, amtDue: 0, total: 0 };
  const rows = invoices.slice().sort((a, b) => b.id - a.id).map((inv) => {
    s.tax += inv.tax || 0; s.ship += inv.shipping || 0; s.sub += inv.subTotal || 0; s.paid += inv.amountPaid || 0; s.amtDue += inv.amountDue || 0; s.total += inv.total || 0;
    return [String(inv.number).replace("#", ""), "Invoice", cname(inv.customerId), inv.status, inv.date, inv.due, money(inv.tax || 0), money(inv.shipping || 0), money(inv.subTotal || 0), money(inv.amountPaid || 0), money(inv.amountDue || 0), money(inv.total || 0)];
  });
  return {
    name: "Sales Report", columnsSelected: 12,
    filters: ["Group By None", "Type : All", "All Date", "Report Type: PDF", "Salesperson : All", "Customers : All", "Products: All"],
    cols, rows,
    totals: [`Total (${rows.length})`, "", "", "", "", "", money(s.tax), money(s.ship), money(s.sub), money(s.paid), money(s.amtDue), money(s.total)],
  };
};

/* ── generic fallback report ───────────────────────────────────── */
const buildGeneric = (name: string): Report => {
  const data = [
    { n: "bdcalling", c: 4, t: 6201.52 }, { n: "Sed aliquip eaque co", c: 2, t: 9093.88 },
    { n: "Harum ut dolore aliq", c: 3, t: 1720.18 }, { n: "Dolor perspiciatis", c: 1, t: 450.0 },
    { n: "SMT", c: 1, t: 160.0 },
  ];
  let cc = 0, tt = 0;
  const rows = data.map((r) => { cc += r.c; tt += r.t; return [r.n, String(r.c), money(r.t)]; });
  return {
    name, columnsSelected: 3, filters: ["All Date", "Report Type: PDF", "Customers : All"],
    cols: [{ label: "Name" }, { label: "Count", right: true }, { label: "Total", right: true }],
    rows, totals: [`Total (${rows.length})`, String(cc), money(tt)],
  };
};

/* ── nav structure ─────────────────────────────────────────────── */
const categories: { title: string; items: string[] }[] = [
  { title: "Business Overview", items: ["Profit & Loss", "Balance Sheet", "Cash Flow"] },
  { title: "Sales", items: ["Invoice Aging Report", "Sales Report", "Estimate Report", "Payment Report", "Sales by Customer Report", "Sales by User Report", "Sales Report by Product", "Sales Report by Service", "Sales by Category Report"] },
  { title: "Purchases & Expenses", items: ["Purchase Report", "Expense Report", "Purchase by Vendor Report", "Bill Aging Report"] },
  { title: "Items", items: ["Product Report", "Service Report", "Stock Report"] },
  { title: "Projects & Time Sheet", items: ["Project Report", "Time Log Report"] },
  { title: "Taxes", items: ["Tax Summary Report"] },
];

const getReport = (name: string, invoices: any[], customers: any[]): Report =>
  name === "Invoice Aging Report" ? buildAging(invoices, customers) : name === "Sales Report" ? buildSales(invoices, customers) : buildGeneric(name);

/* ── Outside-click dropdown ────────────────────────────────────── */
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}> = ({ trigger, children, align = "left" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className={`absolute z-30 mt-2 min-w-[160px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/* ── PDF preview modal ─────────────────────────────────────────── */
const PdfPreview: React.FC<{ report: Report; onClose: () => void }> = ({ report, onClose }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  const total = report.totals[report.totals.length - 1] || "$0.00";
  const download = () => downloadDocPdf({
    filename: report.name,
    docTitle: report.name.toUpperCase(),
    partyLines: [],
    meta: [["Date", "Jun 21, 2026"], ["Total", total], ["From", "Apr 27, 2026"], ["To", "Jun 21, 2026"]],
    itemHead: report.cols.map((c) => c.label),
    itemRows: [...report.rows, report.totals],
  });
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-4xl my-6 rounded-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
          <h3 className="text-base font-medium">{report.name}</h3>
          <div className="flex items-center gap-1">
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10" title="Settings"><Settings className="w-4 h-4" /></button>
            <button onClick={download} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10" title="Download"><Download className="w-4 h-4" /></button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10" title="Print"><Printer className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10" title="Close"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-6" style={{ background: "#fff", color: "#111" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">info</div>
              <div className="text-sm text-gray-600 mt-1">Bangladesh</div>
              <div className="text-sm text-gray-600">info@inovoic.com</div>
            </div>
            <table className="text-sm border border-gray-400 border-collapse">
              <tbody>
                {[["Date", "Jun 21, 2026"], ["Total", total], ["From", "Apr 27, 2026"], ["To", "Jun 21, 2026"]].map(([k, v]) => (
                  <tr key={k}>
                    <td className="border border-gray-400 px-3 py-1 font-semibold text-right bg-gray-50">{k}</td>
                    <td className="border border-gray-400 px-4 py-1">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 className="text-center text-xl font-bold tracking-wide my-8 uppercase">{report.name}</h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>{report.cols.map((c) => <th key={c.label} className={`border border-gray-400 px-2 py-1.5 font-semibold ${c.right ? "text-right" : "text-left"}`}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={i}>{r.map((cell, j) => <td key={j} className={`border border-gray-400 px-2 py-1.5 ${report.cols[j].right ? "text-right" : "text-left"}`}>{cell}</td>)}</tr>
              ))}
              <tr className="font-semibold">{report.totals.map((cell, j) => <td key={j} className={`border border-gray-400 px-2 py-1.5 ${report.cols[j].right ? "text-right" : "text-left"}`}>{cell}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const Reports: React.FC = () => {
  const [open, setOpen] = useState<Record<string, boolean>>({ Sales: true });
  const [active, setActive] = useState("Invoice Aging Report");
  const [pdf, setPdf] = useState(false);

  const dbInvoices = useCollection<any>("invoices");
  const dbCustomers = useCollection<any>("customers");
  const report = useMemo(() => getReport(active, dbInvoices, dbCustomers), [active, dbInvoices, dbCustomers]);
  const toolbarIcons = [
    { icon: Eye, title: "Preview", onClick: () => setPdf(true) },
    { icon: Printer, title: "Print" },
    { icon: MessageCircle, title: "WhatsApp" },
    { icon: Mail, title: "Mail" },
  ];

  return (
    <div className="flex h-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ REPORT NAV ════════ */}
      <ResizableListPanel>
        <div className="h-12 flex items-center px-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Reports</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {categories.map((cat) => {
            const isOpen = !!open[cat.title];
            return (
              <div key={cat.title}>
                <button onClick={() => setOpen((o) => ({ ...o, [cat.title]: !o[cat.title] }))}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50">
                  <span className="text-sm font-bold text-gray-900">{cat.title}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                {isOpen && cat.items.map((it) => (
                  <button key={it} onClick={() => setActive(it)}
                    className={`w-full text-left px-5 py-3 border-b border-gray-200 text-sm ${it === active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>{it}</button>
                ))}
              </div>
            );
          })}
        </div>
      </ResizableListPanel>

      {/* ════════ REPORT VIEW ════════ */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {/* title bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlignLeft className="w-5 h-5 text-gray-500" />
            <h1 className="text-lg font-semibold text-gray-900">{report.name}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPdf(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Preview"><Eye className="w-4 h-4" /></button>
            <Dropdown align="right" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title="Export"><Download className="w-4 h-4" /></span>}>
              {(close) => ["CSV", "PDF", "XLS", "HTML"].map((f) => (
                <button key={f} onClick={close} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{f}</button>
              ))}
            </Dropdown>
            {toolbarIcons.slice(1).map((b) => (
              <button key={b.title} onClick={b.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600" title={b.title}><b.icon className="w-4 h-4" /></button>
            ))}
          </div>
        </div>

        {/* filter pills */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-gray-200 overflow-x-auto custom-scrollbar">
          <Dropdown trigger={
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 border border-blue-500 rounded-full px-3 py-1 whitespace-nowrap">
              <XCircle className="w-3.5 h-3.5" /> Columns: {report.columnsSelected} Selected <ChevronDown className="w-3.5 h-3.5" />
            </span>}>
            {(close) => report.cols.map((c) => (
              <button key={c.label} onClick={close} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{c.label} <Check className="w-4 h-4 text-blue-600" /></button>
            ))}
          </Dropdown>
          {report.filters.map((f) => (
            <Dropdown key={f} trigger={
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />{f}<ChevronDown className="w-3.5 h-3.5" /></span>}>
              {(close) => ["All", "Option A", "Option B"].map((o) => (
                <button key={o} onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o}</button>
              ))}
            </Dropdown>
          ))}
        </div>

        {/* data grid */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                {report.cols.map((c) => (
                  <th key={c.label} className={`px-5 py-3 text-xs font-bold text-gray-700 ${c.right ? "text-right" : "text-left"}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                  {r.map((cell, j) => (
                    <td key={j} className={`px-5 py-3 ${report.cols[j].right ? "text-right text-gray-900" : "text-left"} ${j === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{cell}</td>
                  ))}
                </tr>
              ))}
              {/* totals */}
              <tr className="border-y border-gray-300 bg-gray-50 font-semibold">
                {report.totals.map((cell, j) => (
                  <td key={j} className={`px-5 py-3 text-gray-900 ${report.cols[j].right ? "text-right" : "text-left"}`}>{cell}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* pagination footer */}
        <div className="px-6 py-2.5 border-t border-gray-200 text-right text-xs text-gray-500 bg-gray-50">
          1 – {report.rows.length} of {report.rows.length}
        </div>
      </section>

      {pdf && <PdfPreview report={report} onClose={() => setPdf(false)} />}
    </div>
  );
};

export default Reports;
