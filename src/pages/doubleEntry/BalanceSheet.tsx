/**
 * File: src/pages/doubleEntry/BalanceSheet.tsx
 * Balance Sheets — matches references/double entry/balance sheet.png and
 * generate balance shee.png in the Qayd blue theme: header card with sheet
 * selector, Add Note / Compare / Download PDF / Finalize actions, Balanced +
 * status chips, Assets–Liabilities–Equity cards and the two-column statement.
 * Generated sheets persist in meta row `de:balanceSheets`.
 */

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { money } from "@/lib/db";
import {
  balanceSheetStore,
  BalanceSheetRec,
  BS_ASSET_GROUPS,
  BS_LIABILITY_GROUPS,
  BS_EQUITY_LINES,
  BsLine,
  deUid,
} from "@/lib/db/doubleEntry";
import { HrmBreadcrumb } from "../hrm/hrmShared";
import { SummaryCard, ReportTitle, downloadTablePdf } from "./deShared";
import { chip, ModalShell } from "../goal/goalShared";
import { showToast } from "../../utils/toast";
import { Plus, StickyNote, GitCompareArrows, Download, CheckCircle2 } from "lucide-react";

const sum = (lines: BsLine[]) => lines.reduce((s, l) => s + l.amount, 0);

function LineRow({ line, indent }: { line: BsLine; indent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${indent ? "pl-4" : ""}`}>
      <p className="text-sm text-blue-600">{line.name}</p>
      <div className="flex items-center gap-6">
        {line.code && <span className="text-sm text-gray-500 w-12 text-right">{line.code}</span>}
        <span className="text-sm text-blue-600 w-28 text-right">{money(line.amount)}</span>
      </div>
    </div>
  );
}

function TotalRow({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 border-t ${strong ? "border-gray-300" : "border-gray-200"}`}>
      <p className={`text-sm font-semibold text-gray-900 ${strong ? "text-base" : ""}`}>{label}</p>
      <p className={`text-sm font-semibold text-gray-900 ${strong ? "text-base" : ""}`}>{money(amount)}</p>
    </div>
  );
}

export const BalanceSheet: React.FC = () => {
  const navigate = useNavigate();
  const sheets = balanceSheetStore.use();

  const list = useMemo(() => sheets || [], [sheets]);
  const [selectedId, setSelectedId] = useState<string>("");
  const sheet = list.find((s) => s.id === selectedId) || list[0];

  const [modal, setModal] = useState<"generate" | "note" | "compare" | null>(null);
  const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));
  const [noteText, setNoteText] = useState("");

  const totalAssets = useMemo(() => BS_ASSET_GROUPS.reduce((s, g) => s + sum(g.lines), 0), []);
  const totalLiabilities = useMemo(() => BS_LIABILITY_GROUPS.reduce((s, g) => s + sum(g.lines), 0), []);
  const totalEquity = sum(BS_EQUITY_LINES);
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.005;

  const saveSheet = (patch: Partial<BalanceSheetRec>) => {
    if (!sheet) return;
    balanceSheetStore.save(list.map((s) => (s.id === sheet.id ? { ...s, ...patch } : s)));
  };

  const generate = () => {
    if (!genDate || !genYear.trim()) {
      showToast("Balance sheet date and financial year are required", "error");
      return;
    }
    const rec: BalanceSheetRec = { id: deUid(), date: genDate, year: genYear.trim(), status: "Draft", notes: [] };
    balanceSheetStore.save([...list, rec]);
    setSelectedId(rec.id);
    setModal(null);
    showToast("Balance sheet generated successfully", "success");
  };

  const downloadPdf = async () => {
    if (!sheet) return;
    const rows: (string | number)[][] = [];
    for (const g of BS_ASSET_GROUPS) {
      for (const l of g.lines) rows.push([`Assets / ${g.label}`, `${l.code} ${l.name}`, money(l.amount)]);
      rows.push([`Total ${g.label.toLowerCase()}`, "", money(sum(g.lines))]);
    }
    for (const g of BS_LIABILITY_GROUPS) {
      for (const l of g.lines) rows.push([`Liabilities / ${g.label}`, `${l.code} ${l.name}`, money(l.amount)]);
      rows.push([`Total ${g.label.toLowerCase()}`, "", money(sum(g.lines))]);
    }
    for (const l of BS_EQUITY_LINES) rows.push(["Equity", l.name, money(l.amount)]);
    rows.push(["Total Assets", "", money(totalAssets)]);
    rows.push(["Total Liabilities", "", money(totalLiabilities)]);
    rows.push(["Total Equity", "", money(totalEquity)]);
    downloadTablePdf(
      `balance-sheet-${sheet.date}.pdf`,
      `Balance Sheet - ${sheet.date}`,
      `As of ${sheet.date} | Financial Year: ${sheet.year}`,
      ["Section", "Account", "Amount"],
      rows,
    );
  };

  if (!sheet) return <div className="flex-1 bg-[#FAFBFC]" />;

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <HrmBreadcrumb
        trail={[{ label: "Dashboard", to: "/" }, { label: "Double Entry" }, { label: "Balance Sheets" }]}
        current={`Balance Sheet - ${sheet.date}`}
        onNavigate={navigate}
      />
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Balance Sheet - {sheet.date}</h2>
        <button
          onClick={() => setModal("generate")}
          title="Generate balance sheet"
          className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <ReportTitle title="Balance Sheet" subtitle={`As of ${sheet.date} | Financial Year: ${sheet.year}`} />
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={sheet.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
              >
                {list.map((s) => (
                  <option key={s.id} value={s.id}>{s.date}</option>
                ))}
              </select>
              <button onClick={() => { setNoteText(""); setModal("note"); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50">
                <StickyNote className="w-4 h-4" /> Add Note
              </button>
              <button onClick={() => setModal("compare")} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50">
                <GitCompareArrows className="w-4 h-4" /> Compare
              </button>
              <button onClick={downloadPdf} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              {sheet.status === "Draft" && (
                <button
                  onClick={() => { saveSheet({ status: "Finalized" }); showToast("Balance sheet finalized", "success"); }}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-4 h-4" /> Finalize
                </button>
              )}
              {balanced && chip("Balanced", "bg-green-100 text-green-700")}
              {chip(sheet.status === "Draft" ? "Draft" : "Finalized", sheet.status === "Draft" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Total Assets" value={money(totalAssets)} tone="green" />
            <SummaryCard label="Total Liabilities" value={money(totalLiabilities)} tone="red" />
            <SummaryCard label="Total Equity" value={money(totalEquity)} tone="blue" />
          </div>

          {sheet.notes.length > 0 && (
            <div className="rounded-lg bg-blue-50/60 border border-blue-100 px-4 py-3 space-y-1">
              {sheet.notes.map((n, i) => (
                <p key={i} className="text-sm text-gray-700">• {n}</p>
              ))}
            </div>
          )}
        </div>

        {/* statement */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Balance Sheet of {sheet.date}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
            {/* liabilities & equity */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Liabilities &amp; Equity</h4>
              <p className="text-sm font-semibold text-gray-900 mb-1">Equity</p>
              {BS_EQUITY_LINES.map((l) => (
                <LineRow key={l.name} line={l} />
              ))}
              <TotalRow label="Total for Equity" amount={totalEquity} />

              <p className="text-sm font-semibold text-gray-900 mt-8 mb-1">Liabilities</p>
              {BS_LIABILITY_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="text-sm font-medium text-gray-700 mt-2">{g.label}</p>
                  {g.lines.map((l) => (
                    <LineRow key={l.code} line={l} indent />
                  ))}
                  <TotalRow label={`Total ${g.label.toLowerCase()}`} amount={sum(g.lines)} />
                </div>
              ))}
              <div className="mt-6">
                <TotalRow label="Total for Liabilities" amount={totalLiabilities} strong />
              </div>
            </div>

            {/* assets */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Assets</h4>
              {BS_ASSET_GROUPS.map((g) => (
                <div key={g.label} className={g.label === "Other Assets" ? "mt-8" : ""}>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{g.label}</p>
                  {g.lines.map((l) => (
                    <LineRow key={l.code} line={l} indent />
                  ))}
                  <TotalRow label={`Total ${g.label.toLowerCase()}`} amount={sum(g.lines)} />
                </div>
              ))}
              <div className="mt-6">
                <TotalRow label="Total Assets" amount={totalAssets} strong />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* generate modal */}
      {modal === "generate" && (
        <ModalShell title="Generate Balance Sheet" onClose={() => setModal(null)} onSubmit={generate} submitLabel="Generate">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Balance Sheet Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={genDate} onChange={(e) => setGenDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
              <p className="text-xs text-gray-400 mt-1">Select the date for which you want to generate the balance sheet</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Financial Year <span className="text-red-500">*</span>
              </label>
              <input value={genYear} onChange={(e) => setGenYear(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
              <p className="text-xs text-gray-400 mt-1">Enter the financial year (e.g., 2026)</p>
            </div>
            <div className="rounded-lg bg-blue-50/70 border border-blue-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">How it works</p>
              {[
                "System will calculate balances for all accounts up to the selected date",
                "Accounts will be automatically categorized into Assets, Liabilities, and Equity",
                "Balance sheet will be validated to ensure Assets = Liabilities + Equity",
                "You can review and finalize the balance sheet after generation",
              ].map((t) => (
                <p key={t} className="text-xs text-blue-700 py-0.5">• {t}</p>
              ))}
            </div>
          </div>
        </ModalShell>
      )}

      {/* add note modal */}
      {modal === "note" && (
        <ModalShell
          title="Add Note"
          onClose={() => setModal(null)}
          onSubmit={() => {
            if (!noteText.trim()) {
              showToast("Enter a note first", "error");
              return;
            }
            saveSheet({ notes: [...sheet.notes, noteText.trim()] });
            setModal(null);
            showToast("Note added to balance sheet", "success");
          }}
          submitLabel="Add Note"
        >
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            placeholder="Write a note for this balance sheet..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none"
          />
        </ModalShell>
      )}

      {/* compare modal */}
      {modal === "compare" && (
        <ModalShell title="Compare Balance Sheets" onClose={() => setModal(null)} onSubmit={() => setModal(null)} submitLabel="Done" wide>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300">
              <tr>
                {["Date", "Financial Year", "Total Assets", "Total Liabilities", "Total Equity", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((s) => (
                <tr key={s.id} className={s.id === sheet.id ? "bg-blue-50/50" : ""}>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{s.date}</td>
                  <td className="px-3 py-2.5 text-gray-600">{s.year}</td>
                  <td className="px-3 py-2.5 text-gray-900">{money(totalAssets)}</td>
                  <td className="px-3 py-2.5 text-gray-900">{money(totalLiabilities)}</td>
                  <td className="px-3 py-2.5 text-gray-900">{money(totalEquity)}</td>
                  <td className="px-3 py-2.5">
                    {chip(s.status, s.status === "Draft" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ModalShell>
      )}
    </div>
  );
};
