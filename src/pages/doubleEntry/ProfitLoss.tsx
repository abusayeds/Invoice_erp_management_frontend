/**
 * File: src/pages/doubleEntry/ProfitLoss.tsx
 * Profit & Loss Statement — matches references/double entry/profit loss.png
 * in the Qayd blue theme: header card with date range + Generate + Download
 * PDF, Total Revenue / Total Expenses / Net Profit-or-Loss cards, and the
 * two-column Revenue / Expenses breakdown. Persists in meta row `de:profitLoss`.
 */

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { money } from "@/lib/db";
import { profitLossStore, type PLRow, type ProfitLossData } from "@/lib/db/doubleEntry";
import { HrmBreadcrumb } from "../hrm/hrmShared";
import { SummaryCard, DateField, ReportTitle, downloadTablePdf } from "./deShared";
import { showToast } from "../../utils/toast";
import { Search, Download } from "lucide-react";

function PLColumn({ heading, rows, totalLabel }: { heading: string; rows: PLRow[]; totalLabel: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{heading}</h4>
      <div className="divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.code} className="flex items-center justify-between py-3">
            <p className="text-sm text-gray-900">
              <span className="text-blue-600 font-medium">{r.code}</span> - {r.name}
            </p>
            <p className="text-sm text-gray-900">{money(r.amount)}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between py-3.5 border-t border-gray-300 mt-2">
        <p className="text-sm font-semibold text-gray-900">{totalLabel}</p>
        <p className="text-sm font-semibold text-gray-900">{money(total)}</p>
      </div>
    </div>
  );
}

export const ProfitLoss: React.FC = () => {
  const navigate = useNavigate();
  const data = profitLossStore.use();

  const pl: ProfitLossData = data || { from: "", to: "", revenue: [], expenses: [] };
  const { totalRevenue, totalExpenses } = useMemo(
    () => ({
      totalRevenue: pl.revenue.reduce((s, r) => s + r.amount, 0),
      totalExpenses: pl.expenses.reduce((s, r) => s + r.amount, 0),
    }),
    [pl],
  );
  const net = totalRevenue - totalExpenses;
  const isLoss = net < 0;

  const setRange = (patch: Partial<{ from: string; to: string }>) => profitLossStore.save({ ...pl, ...patch });

  const downloadPdf = () =>
    downloadTablePdf(
      "profit-loss.pdf",
      "Profit & Loss Statement",
      `${pl.from} - ${pl.to}`,
      ["Account", "Type", "Amount"],
      [
        ...pl.revenue.map((r) => [`${r.code} - ${r.name}`, "Revenue", money(r.amount)]),
        ...pl.expenses.map((r) => [`${r.code} - ${r.name}`, "Expense", money(r.amount)]),
        ["Total Revenue", "", money(totalRevenue)],
        ["Total Expenses", "", money(totalExpenses)],
        [isLoss ? "Net Loss" : "Net Profit", "", money(Math.abs(net))],
      ],
    );

  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-y-auto">
      <HrmBreadcrumb trail={[{ label: "Dashboard", to: "/" }, { label: "Double Entry" }]} current="Profit & Loss" onNavigate={navigate} />
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <h2 className="text-lg font-semibold text-gray-900">Profit & Loss Statement</h2>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <ReportTitle title="Profit & Loss Statement" subtitle={`${pl.from} - ${pl.to}`} />
            <div className="flex items-end gap-3 flex-wrap">
              <DateField label="From Date" value={pl.from} onChange={(v) => setRange({ from: v })} />
              <DateField label="To Date" value={pl.to} onChange={(v) => setRange({ to: v })} />
              <button
                onClick={() => showToast("Profit & loss statement generated", "success")}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <Search className="w-4 h-4" /> Generate
              </button>
              <button
                onClick={downloadPdf}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Total Revenue" value={money(totalRevenue)} tone="green" />
            <SummaryCard label="Total Expenses" value={money(totalExpenses)} tone="red" />
            <SummaryCard label={isLoss ? "Net Loss" : "Net Profit"} value={money(Math.abs(net))} tone={isLoss ? "orange" : "green"} />
          </div>
        </div>

        {/* revenue / expenses breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
            <PLColumn heading="Revenue" rows={pl.revenue} totalLabel="Total Revenue" />
            <PLColumn heading="Expenses" rows={pl.expenses} totalLabel="Total Expenses" />
          </div>
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-300">
            <p className="text-base font-semibold text-gray-900">{isLoss ? "Net Loss" : "Net Profit"}</p>
            <p className={`text-base font-bold ${isLoss ? "text-red-500" : "text-green-600"}`}>{money(Math.abs(net))}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
