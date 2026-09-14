/**
 * File: src/pages/Reports.tsx
 * Reports hub — Business Overview matches client Bill Report UI:
 * flush left, borderless table, pill filters (Label | Value), live backend data.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import {
  loadReportView,
  reportFilterKind,
  today,
  yearStart,
  yearEnd,
  type ReportView,
} from "@/services/reportsApi";
import type { BusinessOverviewView } from "@/services/businessOverviewApi";
import type { DatePeriodKey, ReportFilters } from "@/services/reportTypes";
import {
  exportReportCsv,
  exportReportHtml,
  exportReportPdf,
  exportReportXlsx,
  type ExportGrid,
} from "@/lib/reportExport";
import { fetchCustomers } from "@/services/customersApi";
import { fetchVendors } from "@/services/vendorsApi";
import { fetchProducts } from "@/services/productsApi";
import { api } from "@/lib/api/client";
import {
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
  Loader2,
  Plus,
} from "lucide-react";

const categories: { title: string; items: string[] }[] = [
  {
    title: "Business Overview",
    items: ["Summary Report", "Quarters Report", "Profit by Product Report", "Profit & Loss"],
  },
  {
    title: "Sales",
    items: [
      "Invoice Aging Report",
      "Sales Report",
      "Estimate Report",
      "Payment Report",
      "Sales by Customer Report",
      "Sales by User Report",
      "Sales Report by Product",
      "Sales Report by Service",
      "Sales by Category Report",
    ],
  },
  {
    title: "Purchases & Expenses",
    items: ["Purchase Report", "Expense Report", "Purchase by Vendor Report", "Bill Aging Report"],
  },
  { title: "Items", items: ["Product Report", "Service Report", "Stock Report"] },
  { title: "Projects & Time Sheet", items: ["Project Report", "Time Log Report"] },
  { title: "Taxes", items: ["Tax Summary Report"] },
];

const DATE_OPTIONS: DatePeriodKey[] = ["All", "This Month", "Last 30 Days", "This Year", "Custom"];
const REPORT_TYPES = ["PDF", "CSV", "XLSX", "XLS", "HTML"] as const;
const PRODUCT_TYPES = ["All", "Standard", "Multi-variant"] as const;

const isBoReport = (name: string) =>
  name === "Summary Report" ||
  name === "Quarters Report" ||
  name === "Profit by Product Report" ||
  name === "Profit & Loss";

/* ── Pill dropdown ─────────────────────────────────────────────── */
const PillDropdown: React.FC<{
  label: string;
  value: string;
  accent?: boolean;
  children: (close: () => void) => React.ReactNode;
}> = ({ label, value, accent, children }) => {
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs whitespace-nowrap ${
          accent
            ? "border-blue-500 text-blue-500"
            : "border-gray-500/70 text-gray-200 hover:border-gray-400"
        }`}
      >
        {accent && <XCircle className="w-3.5 h-3.5" />}
        <span className={accent ? "text-blue-500" : "text-gray-400"}>{label}</span>
        <span className="text-gray-500">|</span>
        <span className={accent ? "text-blue-500 font-medium" : "text-white"}>{value}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <div className="absolute z-40 mt-2 min-w-[220px] max-h-72 overflow-y-auto rounded-md border border-gray-700 bg-[#1a1d22] shadow-xl py-1">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-white/5 ${
      active ? "text-blue-400" : "text-gray-200"
    }`}
  >
    <span className="truncate">{children}</span>
    {active && <Check className="w-4 h-4 flex-shrink-0" />}
  </button>
);

const IconBtn: React.FC<{
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ title, disabled, onClick, children }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 disabled:opacity-40"
  >
    {children}
  </button>
);

const asBo = (report: ReportView | undefined): BusinessOverviewView | null => {
  if (!report || report.source !== "backend") return null;
  const bo = report as BusinessOverviewView;
  if (bo.layout === "summary" || bo.layout === "quarters" || bo.layout === "pnl" || bo.layout === "table") return bo;
  return null;
};

const toExportGrid = (report: ReportView): ExportGrid => ({
  name: report.name,
  cols: report.cols.map((c) => c.label),
  rows: report.rows,
  totals: report.totals,
  metaLines: [
    report.meta?.from && report.meta?.to ? `Period: ${report.meta.from} → ${report.meta.to}` : "",
    report.meta?.asOf ? `As of: ${report.meta.asOf}` : "",
  ].filter(Boolean),
});

/* ── Dark borderless layouts ───────────────────────────────────── */
const SummaryDark: React.FC<{ report: BusinessOverviewView }> = ({ report }) => {
  const blocks = report.summaryBlocks || [];
  return (
    <div className="w-full">
      {blocks.map((block) => (
        <div key={block.title} className="mb-6">
          <div className="px-3 py-2 text-sm font-bold text-white bg-[#2a2f36]">{block.title}</div>
          <table className="w-full text-sm">
            <tbody>
              {block.lines.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-gray-500">No data</td>
                </tr>
              ) : (
                block.lines.map((line) => (
                  <tr key={`${block.title}-${line.label}`} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2.5 text-gray-200 font-medium align-top w-[40%]">{line.label}</td>
                    <td className="px-3 py-2.5 text-right text-white align-top">
                      {line.values.map((v, i) => (
                        <div key={i} className={v.includes("Paid") || i === 0 ? "" : "text-gray-300"}>
                          {v}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

const QuartersDark: React.FC<{ report: BusinessOverviewView; visibleCols: Set<string> }> = ({
  report,
  visibleCols,
}) => {
  const blocks = report.quarterBlocks || [];
  const show = (label: string) => visibleCols.has(label);
  return (
    <div className="w-full">
      {blocks.length === 0 ? (
        <div className="px-3 py-8 text-sm text-gray-500">No quarter data for the selected filters.</div>
      ) : (
        blocks.map((q) => (
          <div key={q.title} className="mb-8">
            <div className="px-3 py-2 text-sm font-bold text-white">{q.title}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#2a2f36] text-white">
                  {show("Month") && <th className="px-3 py-2.5 text-left text-xs font-bold">Month</th>}
                  {show("Paid") && <th className="px-3 py-2.5 text-right text-xs font-bold">Paid</th>}
                  {show("Due") && <th className="px-3 py-2.5 text-right text-xs font-bold">Due</th>}
                  {show("Overdue") && <th className="px-3 py-2.5 text-right text-xs font-bold">Overdue</th>}
                  {show("Total") && <th className="px-3 py-2.5 text-right text-xs font-bold">Total</th>}
                </tr>
              </thead>
              <tbody>
                {q.months.map((m) => (
                  <tr key={m.label} className="hover:bg-white/[0.03]">
                    {show("Month") && <td className="px-3 py-2.5 text-white font-semibold">{m.label}</td>}
                    {show("Paid") && <td className="px-3 py-2.5 text-right text-gray-200">{m.paid}</td>}
                    {show("Due") && <td className="px-3 py-2.5 text-right text-gray-200">{m.due}</td>}
                    {show("Overdue") && <td className="px-3 py-2.5 text-right text-gray-200">{m.overdue}</td>}
                    {show("Total") && <td className="px-3 py-2.5 text-right text-white font-medium">{m.total}</td>}
                  </tr>
                ))}
                <tr className="font-semibold text-white">
                  {show("Month") && <td className="px-3 py-2.5">Total</td>}
                  {show("Paid") && <td className="px-3 py-2.5 text-right">{q.totals.paid}</td>}
                  {show("Due") && <td className="px-3 py-2.5 text-right">{q.totals.due}</td>}
                  {show("Overdue") && <td className="px-3 py-2.5 text-right">{q.totals.overdue}</td>}
                  {show("Total") && <td className="px-3 py-2.5 text-right">{q.totals.total}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

const TableDark: React.FC<{ report: ReportView; visibleCols: Set<string> }> = ({ report, visibleCols }) => {
  const cols = report.cols.filter((c) => visibleCols.has(c.label));
  const idx = report.cols.map((c, i) => (visibleCols.has(c.label) ? i : -1)).filter((i) => i >= 0);
  const rows = report.rows.map((r) => idx.map((i) => r[i] ?? ""));
  const totals = idx.map((i) => report.totals[i] ?? "");

  return (
    <table className="w-full text-sm whitespace-nowrap">
      <thead>
        <tr className="bg-[#2a2f36] text-white">
          {cols.map((c) => (
            <th key={c.label} className={`px-3 py-2.5 text-xs font-bold ${c.right ? "text-right" : "text-left"}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={cols.length} className="px-3 py-10 text-center text-gray-500">
              No rows for the selected filters.
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className="hover:bg-white/[0.03]">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2.5 ${cols[j]?.right ? "text-right" : "text-left"} ${
                    j === 0 ? "text-white font-semibold" : "text-gray-200"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
        {rows.length > 0 && (
          <tr className="font-semibold text-white">
            {totals.map((cell, j) => (
              <td key={j} className={`px-3 py-2.5 ${cols[j]?.right ? "text-right" : "text-left"}`}>
                {cell}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const Reports: React.FC = () => {
  const [open, setOpen] = useState<Record<string, boolean>>({ "Business Overview": true });
  const [active, setActive] = useState("Summary Report");
  const [pdf, setPdf] = useState(false);

  // Shared / legacy filters
  const [asOfDate, setAsOfDate] = useState(today());
  const [fromDate, setFromDate] = useState(yearStart());
  const [toDate, setToDate] = useState(yearEnd());
  const [showZero, setShowZero] = useState(false);

  // BO pill filters
  const [period, setPeriod] = useState<DatePeriodKey>("All");
  const [contactId, setContactId] = useState("");
  const [contactRole, setContactRole] = useState<"customer" | "vendor" | "">("");
  const [contactLabel, setContactLabel] = useState("All");
  const [customerId, setCustomerId] = useState("");
  const [customerLabel, setCustomerLabel] = useState("All");
  const [categoryId, setCategoryId] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("All");
  const [productId, setProductId] = useState("");
  const [productLabel, setProductLabel] = useState("All");
  const [productType, setProductType] = useState<string>("All");
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]>("PDF");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set());

  const boMode = isBoReport(active);
  const filterKind = reportFilterKind(active);

  const boFilters: ReportFilters = useMemo(
    () => ({
      period,
      fromDate: period === "Custom" ? fromDate : undefined,
      toDate: period === "Custom" ? toDate : undefined,
      contactId: contactId || undefined,
      contactRole: contactRole || undefined,
      customerId: customerId || undefined,
      categoryId: categoryId || undefined,
      productId: productId || undefined,
      productType,
      reportType,
      showZero,
      asOfDate,
    }),
    [
      period,
      fromDate,
      toDate,
      contactId,
      contactRole,
      customerId,
      categoryId,
      productId,
      productType,
      reportType,
      showZero,
      asOfDate,
    ],
  );

  const { data: report, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["main-reports", active, boMode ? boFilters : null, asOfDate, fromDate, toDate, showZero],
    queryFn: () =>
      loadReportView(
        active,
        boMode
          ? boFilters
          : { asOfDate, fromDate, toDate, showZero },
      ),
    staleTime: 15_000,
  });

  // Option lists from backend
  const { data: contactOptions = [] } = useQuery({
    queryKey: ["report-contacts"],
    queryFn: async () => {
      const [cust, vend] = await Promise.all([
        fetchCustomers({ page: 1, limit: 200 }),
        fetchVendors({ page: 1, limit: 200 }),
      ]);
      return [
        ...cust.rows.map((c) => ({
          id: c._id,
          label: c.name || "Customer",
          role: "customer" as const,
        })),
        ...vend.rows.map((v) => ({
          id: v._id,
          label: v.company_name || v.name || "Vendor",
          role: "vendor" as const,
        })),
      ];
    },
    enabled: active === "Summary Report",
    staleTime: 60_000,
  });

  const { data: customerOptions = [] } = useQuery({
    queryKey: ["report-customers"],
    queryFn: async () => {
      const r = await fetchCustomers({ page: 1, limit: 200 });
      return r.rows.map((c) => ({ id: c._id, label: c.name || "Customer" }));
    },
    enabled: active === "Quarters Report",
    staleTime: 60_000,
  });

  const { data: categoryOptions = [] } = useQuery({
    queryKey: ["report-categories"],
    queryFn: async () => {
      const data = await api.get<any[]>("/category/all");
      const list = Array.isArray(data) ? data : [];
      return list.map((c) => ({ id: String(c._id), label: String(c.category || c.name || "—") }));
    },
    enabled: active === "Profit by Product Report",
    staleTime: 60_000,
  });

  const { data: productOptions = [] } = useQuery({
    queryKey: ["report-products", categoryId],
    queryFn: async () => {
      const r = await fetchProducts({ page: 1, limit: 200, category: categoryId || undefined });
      return r.rows.map((p) => ({ id: p._id, label: p.name }));
    },
    enabled: active === "Profit by Product Report",
    staleTime: 60_000,
  });

  useEffect(() => {
    if (report?.cols?.length) {
      setVisibleCols(new Set(report.cols.map((c) => c.label)));
    }
  }, [report?.name, report?.cols]);

  // Reset party filters when switching reports
  useEffect(() => {
    setContactId("");
    setContactRole("");
    setContactLabel("All");
    setCustomerId("");
    setCustomerLabel("All");
    setCategoryId("");
    setCategoryLabel("All");
    setProductId("");
    setProductLabel("All");
    setProductType("All");
    setPeriod("All");
    setReportType("PDF");
  }, [active]);

  const display = useMemo(() => {
    if (!report) return null;
    return report;
  }, [report]);

  const bo = asBo(display || undefined);

  const toggleCol = (label: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        if (next.size > 1) next.delete(label);
      } else next.add(label);
      return next;
    });
  };

  const runExport = (kind?: string) => {
    if (!display || display.source === "unavailable") return;
    const grid = toExportGrid(display);
    const k = (kind || reportType).toUpperCase();
    if (k === "CSV") exportReportCsv(grid);
    else if (k === "XLSX") exportReportXlsx(grid, "xlsx");
    else if (k === "XLS") exportReportXlsx(grid, "xls");
    else if (k === "HTML") exportReportHtml(grid);
    else exportReportPdf(grid);
  };

  const colCountLabel =
    visibleCols.size === (report?.cols.length || 0) ? "All" : `${visibleCols.size} Selected`;

  return (
    <div className="flex h-full bg-[#0f1114] overflow-hidden text-white">
      <ResizableListPanel>
        <div className="h-12 flex items-center px-4 border-b border-white/10 bg-[#15181d]">
          <h2 className="text-base font-semibold text-white">Reports</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#15181d]">
          {categories.map((cat) => {
            const isOpen = !!open[cat.title];
            return (
              <div key={cat.title}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [cat.title]: !o[cat.title] }))}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10 hover:bg-white/5"
                >
                  <span className="text-sm font-bold text-white">{cat.title}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isOpen &&
                  cat.items.map((it) => (
                    <button
                      key={it}
                      type="button"
                      onClick={() => setActive(it)}
                      className={`w-full text-left px-5 py-3 border-b border-white/10 text-sm ${
                        it === active ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      {it}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </ResizableListPanel>

      <section className="flex-1 flex flex-col overflow-hidden bg-[#0f1114] min-w-0">
        {/* Header — flush */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <AlignLeft className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <h1 className="text-lg font-semibold text-white truncate">{active}</h1>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          <div className="flex items-center gap-0.5">
            <IconBtn
              title="Preview"
              disabled={!display || display.source === "unavailable"}
              onClick={() => setPdf(true)}
            >
              <Eye className="w-4 h-4" />
            </IconBtn>
            <IconBtn
              title={`Export ${reportType}`}
              disabled={!display || display.source === "unavailable"}
              onClick={() => runExport()}
            >
              <Download className="w-4 h-4" />
            </IconBtn>
            <IconBtn title="Print" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
            </IconBtn>
            <IconBtn title="WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </IconBtn>
            <IconBtn title="Mail">
              <Mail className="w-4 h-4" />
            </IconBtn>
          </div>
        </div>

        {/* Filter pills — flush left, no extra margin */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-white/10">
          {boMode && (
            <>
              <PillDropdown label="Date" value={period}>
                {(close) =>
                  DATE_OPTIONS.map((opt) => (
                    <MenuItem
                      key={opt}
                      active={period === opt}
                      onClick={() => {
                        setPeriod(opt);
                        close();
                      }}
                    >
                      {opt}
                    </MenuItem>
                  ))
                }
              </PillDropdown>

              {period === "Custom" && (
                <>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300 border border-gray-600 rounded-full px-2.5 py-1">
                    From
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="bg-transparent outline-none text-white"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-300 border border-gray-600 rounded-full px-2.5 py-1">
                    To
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="bg-transparent outline-none text-white"
                    />
                  </label>
                </>
              )}

              {active === "Summary Report" && (
                <PillDropdown label="Contacts" value={contactLabel}>
                  {(close) => (
                    <>
                      <MenuItem
                        active={!contactId}
                        onClick={() => {
                          setContactId("");
                          setContactRole("");
                          setContactLabel("All");
                          close();
                        }}
                      >
                        All
                      </MenuItem>
                      {contactOptions.map((c) => (
                        <MenuItem
                          key={`${c.role}-${c.id}`}
                          active={contactId === c.id}
                          onClick={() => {
                            setContactId(c.id);
                            setContactRole(c.role);
                            setContactLabel(c.label);
                            close();
                          }}
                        >
                          {c.label}
                          <span className="ml-2 text-[10px] text-gray-500 uppercase">{c.role}</span>
                        </MenuItem>
                      ))}
                    </>
                  )}
                </PillDropdown>
              )}

              {active === "Quarters Report" && (
                <PillDropdown label="Customers" value={customerLabel}>
                  {(close) => (
                    <>
                      <MenuItem
                        active={!customerId}
                        onClick={() => {
                          setCustomerId("");
                          setCustomerLabel("All");
                          close();
                        }}
                      >
                        All
                      </MenuItem>
                      {customerOptions.map((c) => (
                        <MenuItem
                          key={c.id}
                          active={customerId === c.id}
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerLabel(c.label);
                            close();
                          }}
                        >
                          {c.label}
                        </MenuItem>
                      ))}
                    </>
                  )}
                </PillDropdown>
              )}

              {active === "Profit by Product Report" && (
                <>
                  <PillDropdown label="Category" value={categoryLabel}>
                    {(close) => (
                      <>
                        <MenuItem
                          active={!categoryId}
                          onClick={() => {
                            setCategoryId("");
                            setCategoryLabel("All");
                            setProductId("");
                            setProductLabel("All");
                            close();
                          }}
                        >
                          All
                        </MenuItem>
                        {categoryOptions.map((c) => (
                          <MenuItem
                            key={c.id}
                            active={categoryId === c.id}
                            onClick={() => {
                              setCategoryId(c.id);
                              setCategoryLabel(c.label);
                              setProductId("");
                              setProductLabel("All");
                              close();
                            }}
                          >
                            {c.label}
                          </MenuItem>
                        ))}
                      </>
                    )}
                  </PillDropdown>

                  <PillDropdown label="Products" value={productLabel}>
                    {(close) => (
                      <>
                        <MenuItem
                          active={!productId}
                          onClick={() => {
                            setProductId("");
                            setProductLabel("All");
                            close();
                          }}
                        >
                          All
                        </MenuItem>
                        {productOptions.map((p) => (
                          <MenuItem
                            key={p.id}
                            active={productId === p.id}
                            onClick={() => {
                              setProductId(p.id);
                              setProductLabel(p.label);
                              close();
                            }}
                          >
                            {p.label}
                          </MenuItem>
                        ))}
                      </>
                    )}
                  </PillDropdown>

                  <PillDropdown label="Product Type" value={productType}>
                    {(close) =>
                      PRODUCT_TYPES.map((t) => (
                        <MenuItem
                          key={t}
                          active={productType === t}
                          onClick={() => {
                            setProductType(t);
                            close();
                          }}
                        >
                          {t}
                        </MenuItem>
                      ))
                    }
                  </PillDropdown>
                </>
              )}

              {(active === "Quarters Report" || active === "Profit by Product Report") && (
                <>
                  <div className="w-px h-5 bg-white/20 mx-1" />
                  <PillDropdown label="Columns" value={colCountLabel} accent>
                    {(close) =>
                      (report?.cols ?? []).map((c) => (
                        <MenuItem
                          key={c.label}
                          active={visibleCols.has(c.label)}
                          onClick={() => {
                            toggleCol(c.label);
                            close();
                          }}
                        >
                          {c.label}
                        </MenuItem>
                      ))
                    }
                  </PillDropdown>
                </>
              )}

              <div className="w-px h-5 bg-white/20 mx-1" />
              <PillDropdown label="Report Type" value={reportType}>
                {(close) =>
                  REPORT_TYPES.map((t) => (
                    <MenuItem
                      key={t}
                      active={reportType === t}
                      onClick={() => {
                        setReportType(t);
                        close();
                      }}
                    >
                      {t}
                    </MenuItem>
                  ))
                }
              </PillDropdown>
            </>
          )}

          {/* Non-BO legacy filters */}
          {!boMode && filterKind === "as_of" && (
            <label className="inline-flex items-center gap-2 text-xs text-gray-300 border border-gray-600 rounded-full px-2.5 py-1">
              As of
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="bg-transparent outline-none text-white"
              />
            </label>
          )}
          {!boMode && filterKind === "range" && (
            <>
              <label className="inline-flex items-center gap-2 text-xs text-gray-300 border border-gray-600 rounded-full px-2.5 py-1">
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent outline-none text-white"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-gray-300 border border-gray-600 rounded-full px-2.5 py-1">
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent outline-none text-white"
                />
              </label>
            </>
          )}
          {!boMode && (
            <PillDropdown label="Report Type" value={reportType}>
              {(close) =>
                REPORT_TYPES.map((t) => (
                  <MenuItem
                    key={t}
                    active={reportType === t}
                    onClick={() => {
                      setReportType(t);
                      close();
                    }}
                  >
                    {t}
                  </MenuItem>
                ))
              }
            </PillDropdown>
          )}

          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1 text-xs text-gray-200 border border-gray-600 rounded-full px-3 py-1 hover:bg-white/5"
          >
            <Plus className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Body — no left margin padding beyond px-0 flush */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {isError && <div className="p-4 text-sm text-red-400">{(error as Error)?.message || "Failed to load report"}</div>}
          {!isError && display?.source === "unavailable" && (
            <div className="p-8 text-center text-sm text-amber-400/90">{display.message}</div>
          )}

          {display && display.source === "backend" && bo?.layout === "summary" && <SummaryDark report={bo} />}
          {display && display.source === "backend" && bo?.layout === "pnl" && <SummaryDark report={bo} />}
          {display && display.source === "backend" && bo?.layout === "quarters" && (
            <QuartersDark report={bo} visibleCols={visibleCols} />
          )}
          {display && display.source === "backend" && (!bo || bo.layout === "table") && (
            <TableDark report={display} visibleCols={visibleCols} />
          )}
        </div>

        <div className="px-3 py-2 border-t border-white/10 text-right text-xs text-gray-500">
          {display?.source === "backend" ? `1 – ${display.rows.length} of ${display.rows.length}` : "—"}
        </div>
      </section>

      {pdf && display && display.source === "backend" && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center overflow-y-auto p-4" onMouseDown={() => setPdf(false)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-4xl my-6 rounded-lg overflow-hidden shadow-2xl bg-white text-gray-900">
            <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
              <h3 className="text-base font-medium">{display.name}</h3>
              <div className="flex items-center gap-1">
                <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10" title="Settings">
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => runExport(reportType)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setPdf(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[80vh]">
              <h2 className="text-center text-xl font-bold mb-6 uppercase">{display.name}</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {display.cols.map((c) => (
                      <th key={c.label} className={`border border-gray-400 px-2 py-1.5 ${c.right ? "text-right" : "text-left"}`}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {display.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((cell, j) => (
                        <td key={j} className={`border border-gray-400 px-2 py-1.5 ${display.cols[j]?.right ? "text-right" : "text-left"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
