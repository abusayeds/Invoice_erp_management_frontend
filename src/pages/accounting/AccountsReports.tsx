/**
 * File: src/pages/accounting/AccountsReports.tsx
 * Accounting Reports — runs the read-only report endpoints and renders results.
 *
 * Endpoints (under /account):
 *   GET reports/                 (hub)
 *   GET reports/invoice-aging?as_of_date=
 *   GET reports/bill-aging?as_of_date=
 *   GET reports/tax-summary?from_date=&to_date=
 *   GET reports/customer-balance?as_of_date=&show_zero_balances=
 *   GET reports/vendor-balance?as_of_date=&show_zero_balances=
 *
 * Report shapes vary, so results render generically (arrays → tables,
 * objects → key/value cards).
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { api } from "../../lib/api/client";
import { ApiError } from "../../lib/api/ApiError";
import {
  FileBarChart,
  Loader2,
  RefreshCw,
  Clock,
  Receipt,
  Users,
  Building2,
  Calculator,
} from "lucide-react";

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const today = () => new Date().toISOString().split("T")[0];

type ParamKind = "as_of_date" | "date_range" | "as_of_zero";

interface ReportDef {
  key: string;
  label: string;
  path: string;
  params: ParamKind | "none";
  icon: React.ElementType;
}

const REPORTS: ReportDef[] = [
  { key: "hub", label: "Summary Hub", path: "/account/reports/", params: "none", icon: FileBarChart },
  { key: "invoice-aging", label: "Invoice Aging", path: "/account/reports/invoice-aging", params: "as_of_date", icon: Clock },
  { key: "bill-aging", label: "Bill Aging", path: "/account/reports/bill-aging", params: "as_of_date", icon: Receipt },
  { key: "tax-summary", label: "Tax Summary", path: "/account/reports/tax-summary", params: "date_range", icon: Calculator },
  { key: "customer-balance", label: "Customer Balance", path: "/account/reports/customer-balance", params: "as_of_zero", icon: Users },
  { key: "vendor-balance", label: "Vendor Balance", path: "/account/reports/vendor-balance", params: "as_of_zero", icon: Building2 },
];

const prettyKey = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtCell = (v: any): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return Array.isArray(v) ? `${v.length} item(s)` : "{…}";
  return String(v);
};

// Generic renderer for an unknown report payload.
const ResultView: React.FC<{ data: any }> = ({ data }) => {
  if (data === null || data === undefined)
    return <p className="text-sm text-gray-500">No data.</p>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-sm text-gray-500">No rows.</p>;
    if (typeof data[0] !== "object" || data[0] === null)
      return (
        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
          {data.map((v, i) => (<li key={i}>{fmtCell(v)}</li>))}
        </ul>
      );
    const columns = Array.from(new Set(data.flatMap((r) => Object.keys(r))));
    return (
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{columns.map((c) => (<th key={c} className="px-3 py-2 text-left text-xs font-medium text-gray-600 whitespace-nowrap">{prettyKey(c)}</th>))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {columns.map((c) => (<td key={c} className="px-3 py-2 text-gray-800 whitespace-nowrap">{fmtCell(row[c])}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data);
    const scalars = entries.filter(([, v]) => typeof v !== "object" || v === null);
    const nested = entries.filter(([, v]) => typeof v === "object" && v !== null);
    return (
      <div className="space-y-6">
        {scalars.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {scalars.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">{prettyKey(k)}</div>
                <div className="text-base font-semibold text-gray-900 break-words">{fmtCell(v)}</div>
              </div>
            ))}
          </div>
        )}
        {nested.map(([k, v]) => (
          <div key={k}>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">{prettyKey(k)}</h4>
            <ResultView data={v} />
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-gray-800">{fmtCell(data)}</p>;
};

export const AccountsReports: React.FC = () => {
  const navigate = useNavigate();

  const [selected, setSelected] = useState<ReportDef>(REPORTS[0]);
  const [asOfDate, setAsOfDate] = useState(today());
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(`${new Date().getFullYear()}-12-31`);
  const [showZero, setShowZero] = useState(false);

  const [result, setResult] = useState<any>(null);
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (def: ReportDef) => {
    setLoading(true);
    setError(null);
    setHasRun(true);
    try {
      const params: Record<string, string | boolean> = {};
      if (def.params === "as_of_date") params.as_of_date = asOfDate;
      if (def.params === "as_of_zero") { params.as_of_date = asOfDate; params.show_zero_balances = showZero; }
      if (def.params === "date_range") { params.from_date = fromDate; params.to_date = toDate; }
      const data = await api.get<any>(def.path, { params });
      setResult(data);
    } catch (err) {
      const m = errMessage(err, "Couldn't run report.");
      setError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, [asOfDate, fromDate, toDate, showZero]);

  const inputCls =
    "px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white";

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-auto">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span><span className="text-gray-900 font-medium">Accounting Reports</span>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Reports</h1>
        <p className="text-sm text-gray-500 mb-6">Aging, balances and tax summaries</p>

        {/* Report picker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => { setSelected(r); setResult(null); setHasRun(false); setError(null); }}
              className={`rounded-lg border p-3 text-left transition-colors ${selected.key === r.key ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
            >
              <r.icon className={`w-5 h-5 mb-2 ${selected.key === r.key ? "text-blue-600" : "text-gray-400"}`} />
              <div className="text-sm font-medium text-gray-900">{r.label}</div>
            </button>
          ))}
        </div>

        {/* Params + run */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            {(selected.params === "as_of_date" || selected.params === "as_of_zero") && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">As of date</label>
                <input type="date" className={inputCls} value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
              </div>
            )}
            {selected.params === "date_range" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}
            {selected.params === "as_of_zero" && (
              <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                <span className="text-sm text-gray-700">Show zero balances</span>
              </label>
            )}
            <button onClick={() => run(selected)} disabled={loading} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm inline-flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run Report
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><selected.icon className="w-5 h-5 text-gray-400" />{selected.label}</h3>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Running report…</span></div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-600">{error}</div>
          ) : !hasRun ? (
            <div className="py-12 text-center text-gray-400 text-sm">Choose options and click “Run Report”.</div>
          ) : (
            <ResultView data={result} />
          )}
        </div>
      </div>
    </div>
  );
};
