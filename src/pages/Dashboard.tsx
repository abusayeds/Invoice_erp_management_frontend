/**
 * File: src/pages/Dashboard.tsx
 * Summary dashboard — exact match to the reference (dark) design.
 * States covered (all with working event listeners):
 *   - Period dropdown (This Year ...)
 *   - Column filter panel (which summary cards show)
 *   - Collapsible summary card strip
 *   - Sales metric dropdown + Days/Currency dropdowns
 *   - Chart-type toggle: Bar <-> Donut, with pan arrows
 *   - Top Customers / Top Vendors + Top Products dropdowns
 *   - Recent Activities filter dropdown
 * Backend not wired yet -> values are hardcoded to match the design.
 */

import React, { useRef, useState, useEffect } from "react";
import { useCollection } from "@/lib/db";
import { api } from "@/lib/api/client";
import { RecentActivities } from "@/components/ui/RecentActivities";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Info,
  Check,
  BarChart3,
  CircleDot,
  Pencil,
  Plus,
  Send,
  Printer,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ─────────────────────────────────────────────────────────────────
 * Reusable outside-click hook
 * ──────────────────────────────────────────────────────────────── */
function useOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return ref;
}

/* ─────────────────────────────────────────────────────────────────
 * Caret dropdown (text trigger + menu of options)
 * ──────────────────────────────────────────────────────────────── */
const CaretMenu: React.FC<{
  value: string;
  options: string[];
  onChange: (v: string) => void;
  align?: "left" | "right";
  triggerClass?: string;
  bold?: boolean;
}> = ({ value, options, onChange, align = "left", triggerClass = "", bold }) => {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 text-sm ${
          bold ? "font-semibold text-gray-900" : "text-gray-700"
        } hover:text-gray-900 transition-colors ${triggerClass}`}
      >
        <ChevronDown className="w-4 h-4 text-gray-500" />
        <span>{value}</span>
      </button>
      {open && (
        <div
          className={`absolute z-40 mt-2 min-w-[170px] max-h-[320px] overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded-md shadow-xl py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <span>{opt}</span>
              {opt === value && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
 * Data
 * ──────────────────────────────────────────────────────────────── */
type CardColor = "red" | "green" | "orange" | "muted";
const COLOR: Record<CardColor, string> = {
  red: "text-red-500",
  green: "text-green-500",
  orange: "text-orange-500",
  muted: "text-gray-400",
};

const allCards: {
  key: string;
  label: string;
  value: string;
  color: CardColor;
  info?: boolean;
}[] = [
  { key: "Outstanding", label: "Outstanding", value: "-$24,321.70", color: "red", info: true },
  { key: "Net Profit", label: "Net Profit", value: "$13,797.78", color: "green" },
  { key: "Sales", label: "Sales", value: "$13,797.78", color: "green" },
  { key: "Proforma Invoices", label: "Proforma Invoices", value: "$140.00", color: "muted" },
  { key: "Payments", label: "Payment Received", value: "$38,276.48", color: "green" },
  { key: "Estimates", label: "Estimates", value: "$13,178.84", color: "orange" },
  { key: "Expenses", label: "Expenses", value: "$0.00", color: "orange" },
  { key: "Purchase Orders", label: "Purchase Orders", value: "$28,263.40", color: "muted" },
  { key: "Bills", label: "Bills", value: "$0.00", color: "muted" },
  { key: "Overdue", label: "Overdue", value: "$160.00", color: "red", info: true },
  { key: "Credit Notes", label: "Credit Notes", value: "$25,523.70", color: "green" },
  { key: "Debit Notes", label: "Debit Notes", value: "$0.00", color: "green" },
];
const draftCard = { label: "Draft Invoices", value: "$9,093.88" };

const filterOptions = [
  "Outstanding", "Payable Amount", "Net Profit", "Sales", "Proforma Invoices",
  "Payments", "Estimates", "Expenses", "Purchase Orders", "Bills",
  "Draft Invoices", "Payment Made", "Debit Notes", "Overdue", "Credit Notes",
];

const periodOptions = [
  "Today", "This Week", "Last Week", "This Month", "Last 30 Days", "Last Month",
  "Last 90 Days", "This Quarter", "Last Quarter", "Last 6 Months", "This Year",
  "Last 12 Months", "Last Year", "This Financial Year", "Last Financial Year",
];

// Weekly chart data (mirrors "3–29 / 52")
const chartData = Array.from({ length: 26 }, (_, i) => ({
  name: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun"][Math.floor(i / 5) % 6]} ${((i % 4) + 1) * 7}`,
  Sales: Math.round(1500 + Math.random() * 9000),
  Overdue: Math.round(Math.random() * 2500),
  Paid: Math.round(1000 + Math.random() * 6000),
}));

const donutData = [
  { name: "Sales", value: 13797, color: "#007aff" },
  { name: "Overdue", value: 160, color: "#ff3b30" },
  { name: "Paid", value: 38276, color: "#34a853" },
];

const topCustomers = [
  { name: "Dolor perspiciatis", amount: "$20,178.72" },
  { name: "Harum ut dolore aliq", amount: "$12,303.16" },
  { name: "SMT", amount: "$3,585.00" },
  { name: "STA", amount: "$2,665.00" },
  { name: "sayed cpy 1", amount: "$450.00" },
];
const topProducts = [
  { name: "Drive", amount: "$2,596.00" },
  { name: "Product 1", amount: "$2,575.00" },
  { name: "Product 2", amount: "$1,500.00" },
  { name: "cat", amount: "$321.00" },
  { name: "dwccwc", amount: "$2.00" },
];

/* ─────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────── */
export const Dashboard: React.FC = () => {
  const [cardsOpen, setCardsOpen] = useState(true);
  const [period, setPeriod] = useState("This Year");
  const [metric, setMetric] = useState("Sales");
  const [timeUnit, setTimeUnit] = useState("Days");
  const [currency, setCurrency] = useState("$ USD");
  const [chartType, setChartType] = useState<"bar" | "donut">("bar");
  const [custMode, setCustMode] = useState("Top Customers");
  const [prodMode, setProdMode] = useState("Top Products");
  const [activityFilter, setActivityFilter] = useState("All");
  const [custCurrency, setCustCurrency] = useState("All");
  const [prodCurrency, setProdCurrency] = useState("All");
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(filterOptions.map((k) => [k, true])),
  );

  /* ── exact server-computed figures (fall back to the datastore below) ── */
  const [srv, setSrv] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    api.raw.get("/dashboard/summary").then((res) => {
      const s = (res.data?.data ?? res.data)?.stats;
      if (alive && s) setSrv(s);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  /* ── live figures from the shared datastore ── */
  const dbInvoices = useCollection<any>("invoices");
  const dbCustomers = useCollection<any>("customers");
  const dbPayments = useCollection<any>("paymentsReceived");
  const dbEstimates = useCollection<any>("estimates");
  const dbExpenses = useCollection<any>("expenses");
  const dbBills = useCollection<any>("bills");
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const total = (arr: any[], pick: (x: any) => number) => arr.reduce((s, x) => s + (pick(x) || 0), 0);

  const salesTotal = total(dbInvoices, (i) => i.total);
  const outstanding = total(dbInvoices, (i) => i.amountDue);
  const received = total(dbPayments, (p) => p.amount);
  const estTotal = total(dbEstimates, (e) => e.total);
  const expTotal = total(dbExpenses, (e) => e.amount);
  const billsTotal = total(dbBills, (b) => b.total);
  const overdue = total(dbInvoices.filter((i) => i.status === "Overdue"), (i) => i.amountDue);
  const draftTotal = total(dbInvoices.filter((i) => i.status === "Draft"), (i) => i.total);

  // Prefer the exact server figure for a stat; fall back to the computed one.
  const sv = (key: string, fallback: number) =>
    srv && srv[key] != null ? Number(srv[key]) : fallback;
  const allCards: { key: string; label: string; value: string; color: CardColor; info?: boolean }[] = [
    { key: "Outstanding", label: "Outstanding", value: "-" + fmt(sv("outstanding", outstanding)), color: "red", info: true },
    { key: "Net Profit", label: "Net Profit", value: fmt(sv("net_profit", received - expTotal)), color: "green" },
    { key: "Sales", label: "Sales", value: fmt(sv("sales", salesTotal)), color: "green" },
    { key: "Proforma Invoices", label: "Proforma Invoices", value: fmt(sv("proforma_invoices", 0)), color: "muted" },
    { key: "Payments", label: "Payment Received", value: fmt(sv("payment_received", received)), color: "green" },
    { key: "Estimates", label: "Estimates", value: fmt(sv("estimates", estTotal)), color: "orange" },
    { key: "Expenses", label: "Expenses", value: fmt(sv("expenses", expTotal)), color: "orange" },
    { key: "Purchase Orders", label: "Purchase Orders", value: fmt(sv("purchase_orders", 0)), color: "muted" },
    { key: "Bills", label: "Bills", value: fmt(sv("bills", billsTotal)), color: "muted" },
    { key: "Overdue", label: "Overdue", value: fmt(sv("overdue", overdue)), color: "red", info: true },
    { key: "Credit Notes", label: "Credit Notes", value: fmt(sv("credit_notes", 0)), color: "green" },
    { key: "Debit Notes", label: "Debit Notes", value: fmt(sv("debit_notes", 0)), color: "green" },
  ];
  const draftCard = { label: "Draft Invoices", value: fmt(draftTotal) };
  const donutData = [
    { name: "Sales", value: salesTotal, color: "#007aff" },
    { name: "Overdue", value: overdue, color: "#ff3b30" },
    { name: "Paid", value: received, color: "#34a853" },
  ];

  const custAgg: Record<number, number> = {};
  dbInvoices.forEach((i) => (custAgg[i.customerId] = (custAgg[i.customerId] || 0) + (i.total || 0)));
  const topCustomers = Object.entries(custAgg)
    .map(([cid, amt]) => ({ name: dbCustomers.find((c) => c.id === Number(cid))?.name || "—", amt: amt as number }))
    .sort((a, b) => b.amt - a.amt).slice(0, 5).map((x) => ({ name: x.name, amount: fmt(x.amt) }));

  const prodAgg: Record<string, number> = {};
  dbInvoices.forEach((i) => (i.items || []).forEach((it: any) => (prodAgg[it.name] = (prodAgg[it.name] || 0) + (it.amount || it.qty * it.rate || 0))));
  const topProducts = Object.entries(prodAgg)
    .map(([name, amt]) => ({ name, amt: amt as number })).sort((a, b) => b.amt - a.amt).slice(0, 5).map((x) => ({ name: x.name, amount: fmt(x.amt) }));

  const [periodOpen, setPeriodOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const periodRef = useOutside<HTMLDivElement>(() => setPeriodOpen(false));
  const filterRef = useOutside<HTMLDivElement>(() => setFilterOpen(false));
  const scrollRef = useRef<HTMLDivElement>(null);

  const pan = (d: -1 | 1) =>
    scrollRef.current?.scrollBy({ left: d * 240, behavior: "smooth" });

  const shownCards = allCards.filter((c) => visible[c.key] !== false);

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-auto">
      {/* ── Page heading row ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-6 h-12 bg-white border-b border-gray-200">
        <h1 className="text-lg font-normal text-gray-900">Summary</h1>
        <div className="flex items-center gap-1">
          {/* Period dropdown */}
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => setPeriodOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              {period}
            </button>
            {periodOpen && (
              <div className="absolute right-0 mt-2 z-40 w-56 bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {periodOptions.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setPeriodOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <span>{p}</span>
                    {p === period && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-200 mt-1">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" /> Date Range
                  </span>
                  <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded">
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              title="Filter cards"
            >
              <ListFilter className="w-5 h-5 text-gray-600" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-2 z-40 w-64 bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="text-gray-500">Contacts</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <div className="px-3 py-1 text-sm text-gray-800">All</div>
                <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Summary
                </div>
                {filterOptions.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded-sm flex items-center justify-center border ${
                        visible[opt]
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-400"
                      }`}
                    >
                      {visible[opt] && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={!!visible[opt]}
                      onChange={() =>
                        setVisible((v) => ({ ...v, [opt]: !v[opt] }))
                      }
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* ── Summary card strip ─────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-stretch">
            {/* collapse caret */}
            <button
              onClick={() => setCardsOpen((o) => !o)}
              className="px-3 flex items-center justify-center border-r border-gray-200 hover:bg-gray-50 transition-colors text-gray-500"
              title={cardsOpen ? "Collapse" : "Expand"}
            >
              {cardsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {cardsOpen ? (
              <div className="flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  {shownCards.map((c, i) => (
                    <div
                      key={c.key}
                      className={`px-4 py-4 text-center border-gray-200 ${
                        (i + 1) % 6 !== 0 ? "lg:border-r" : ""
                      } border-b`}
                    >
                      <h5
                        className={`flex items-center justify-center gap-1 text-xs font-medium mb-2 ${COLOR[c.color]}`}
                      >
                        {c.label}
                        {c.info && <Info className="w-3.5 h-3.5 text-blue-500" />}
                      </h5>
                      <h4 className="text-base font-semibold text-gray-900">
                        {c.value}
                      </h4>
                    </div>
                  ))}
                </div>
                {/* Centered draft invoices */}
                <div className="text-center py-3">
                  <h5 className="text-xs font-medium text-gray-400 mb-1">
                    {draftCard.label}
                  </h5>
                  <h4 className="text-base font-semibold text-gray-900">
                    {draftCard.value}
                  </h4>
                </div>
              </div>
            ) : (
              <div className="flex-1 px-4 py-3 text-sm text-gray-500">
                Summary
              </div>
            )}
          </div>
        </div>

        {/* ── Chart card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
            <CaretMenu
              value={metric}
              onChange={setMetric}
              bold
              options={["Sales", "Expenses", "Payment Received", "Payment Made"]}
            />

            {/* legend */}
            <div className="hidden md:flex items-center gap-4">
              {[
                { c: "#007aff", l: "Sales" },
                { c: "#ff3b30", l: "Overdue" },
                { c: "#34a853", l: "Paid" },
              ].map((x) => (
                <span key={x.l} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-[3px]" style={{ background: x.c }} />
                  {x.l}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center rounded-full border border-gray-200">
                <button
                  onClick={() => pan(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-l-full hover:bg-gray-100"
                  aria-label="Older dates"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => pan(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-r-full hover:bg-gray-100"
                  aria-label="Newer dates"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <CaretMenu
                value={timeUnit}
                onChange={setTimeUnit}
                align="right"
                options={["Days", "Weeks", "Months", "Quarters", "Years"]}
              />
              <CaretMenu
                value={currency}
                onChange={setCurrency}
                align="right"
                options={["All", "$ USD", "€ EUR", "£ GBP"]}
              />
              <button
                onClick={() =>
                  setChartType((t) => (t === "bar" ? "donut" : "bar"))
                }
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-blue-600"
                title={chartType === "bar" ? "Donut chart" : "Bar chart"}
              >
                {chartType === "bar" ? (
                  <CircleDot className="w-5 h-5" />
                ) : (
                  <BarChart3 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* chart body */}
          <div className="p-4">
            {chartType === "bar" ? (
              <>
                <div ref={scrollRef} className="overflow-x-auto custom-scrollbar">
                  <div style={{ minWidth: chartData.length * 46 }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "var(--color-gray-500)", fontSize: 11 }} axisLine={{ stroke: "var(--color-gray-200)" }} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: "var(--color-gray-500)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "var(--color-gray-100)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--color-gray-200)", borderRadius: 8, color: "var(--color-gray-900)" }} />
                        <Bar dataKey="Sales" fill="#007aff" barSize={9} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Overdue" fill="#ff3b30" barSize={9} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Paid" fill="#34a853" barSize={9} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  3–29 / 52 · Shift+scroll or swipe to move
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center h-[270px]">
                <ResponsiveContainer width="100%" height={270}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} stroke="none">
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--color-gray-200)", borderRadius: 8, color: "var(--color-gray-900)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom report ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-5">
            {/* Top Customers */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <CaretMenu value={custMode} onChange={setCustMode} bold options={["Top Customers", "Top Vendors"]} />
                <CaretMenu value={custCurrency} onChange={setCustCurrency} align="right" options={["All", "$ USD", "€ EUR"]} />
              </div>
              <div className="divide-y divide-gray-200">
                {topCustomers.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <h4 className="text-sm text-gray-800">{c.name}</h4>
                    <span className="text-sm font-medium text-gray-900">{c.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <CaretMenu value={prodMode} onChange={setProdMode} bold options={["Top Products", "Top Services"]} />
                <CaretMenu value={prodCurrency} onChange={setProdCurrency} align="right" options={["All", "$ USD", "€ EUR"]} />
              </div>
              <div className="divide-y divide-gray-200">
                {topProducts.map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <h4 className="text-sm text-gray-800">{p.name}</h4>
                    <span className="text-sm font-medium text-gray-900">{p.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Recent Activities */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900">Recent Activities</h3>
              <CaretMenu value={activityFilter} onChange={setActivityFilter} align="right" options={["All", "Created", "Updated", "Sent", "Printed"]} />
            </div>
            <RecentActivities filter={activityFilter} />
          </div>
        </div>
      </div>
    </div>
  );
};
