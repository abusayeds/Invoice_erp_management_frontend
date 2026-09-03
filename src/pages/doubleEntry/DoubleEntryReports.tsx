/**
 * File: src/pages/doubleEntry/DoubleEntryReports.tsx
 * Double Entry Reports — matches references/double entry/report.png and
 * one report expande.png in the Qayd blue theme: six report tabs, From/To +
 * Status filter row with Generate / Clear / Download PDF, and the Journal
 * Entry table whose rows expand into their debit/credit account lines.
 * The other tabs are derived from the same persisted journal (`de:journal`).
 */

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { money } from "@/lib/db";
import {
  journalStore,
  JournalEntry,
  entryTotal,
  ledgerRows,
} from "@/lib/db/doubleEntry";
import { HrmBreadcrumb } from "../hrm/hrmShared";
import { chip } from "../goal/goalShared";
import { DateField, downloadTablePdf } from "./deShared";
import { showToast } from "../../utils/toast";
import { ChevronRight, Download } from "lucide-react";

const TABS = [
  "Journal Entry",
  "General Ledger",
  "Account Statement",
  "Account Balance",
  "Cash Flow",
  "Expense Report",
] as const;
type Tab = (typeof TABS)[number];

const DEFAULT_FROM = "2026-01-01";
const DEFAULT_TO = "2026-12-31";

const th = "px-4 py-3 text-left text-xs font-medium text-gray-600";
const thRight = "px-4 py-3 text-right text-xs font-medium text-gray-600";
const td = "px-4 py-3.5 text-sm";
const amt = (n: number) => (n ? money(n) : "-");

export const DoubleEntryReports: React.FC = () => {
  const navigate = useNavigate();
  const journal = journalStore.use();

  const [tab, setTab] = useState<Tab>("Journal Entry");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [status, setStatus] = useState("All Status");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [account, setAccount] = useState("");

  const entries = useMemo(() => {
    return (journal || []).filter(
      (e) =>
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (status === "All Status" || e.status === status),
    );
  }, [journal, from, to, status]);

  const lines = useMemo(() => ledgerRows(entries), [entries]);

  /* per-account totals for General Ledger / Account Balance */
  const accounts = useMemo(() => {
    const map = new Map<string, { code: string; name: string; debit: number; credit: number }>();
    for (const l of lines) {
      const acc = map.get(l.code) || { code: l.code, name: l.name, debit: 0, credit: 0 };
      acc.debit += l.debit;
      acc.credit += l.credit;
      map.set(l.code, acc);
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [lines]);

  const cashLines = useMemo(
    () => lines.filter((l) => ["1000", "1005", "1010", "1020"].includes(l.code)),
    [lines],
  );
  const expenseEntries = useMemo(() => entries.filter((e) => e.reference === "expense"), [entries]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clear = () => {
    setFrom(DEFAULT_FROM);
    setTo(DEFAULT_TO);
    setStatus("All Status");
    showToast("Filters cleared", "info");
  };

  const downloadPdf = () => {
    const subtitle = `${from} - ${to}`;
    if (tab === "Journal Entry")
      downloadTablePdf(
        "journal-entries.pdf",
        "Journal Entry Report",
        subtitle,
        ["Journal #", "Date", "Reference", "Description", "Total Debit", "Total Credit", "Status"],
        entries.map((e) => [e.number, e.date, e.reference, e.description, money(entryTotal(e)), money(entryTotal(e)), e.status]),
      );
    else if (tab === "General Ledger" || tab === "Account Balance")
      downloadTablePdf(
        "general-ledger.pdf",
        `${tab} Report`,
        subtitle,
        ["Account Code", "Account Name", "Debit", "Credit", "Balance"],
        accounts.map((a) => [a.code, a.name, amt(a.debit), amt(a.credit), money(a.debit - a.credit)]),
      );
    else if (tab === "Account Statement")
      downloadTablePdf(
        "account-statement.pdf",
        "Account Statement",
        subtitle,
        ["Date", "Account", "Reference", "Description", "Debit", "Credit"],
        lines
          .filter((l) => !account || l.code === account)
          .map((l) => [l.date, `${l.code} ${l.name}`, l.reference, l.description, amt(l.debit), amt(l.credit)]),
      );
    else if (tab === "Cash Flow")
      downloadTablePdf(
        "cash-flow.pdf",
        "Cash Flow Report",
        subtitle,
        ["Date", "Account", "Description", "Inflow", "Outflow"],
        cashLines.map((l) => [l.date, `${l.code} ${l.name}`, l.description, amt(l.debit), amt(l.credit)]),
      );
    else
      downloadTablePdf(
        "expense-report.pdf",
        "Expense Report",
        subtitle,
        ["Journal #", "Date", "Description", "Amount"],
        expenseEntries.map((e) => [e.number, e.date, e.description, money(entryTotal(e))]),
      );
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <HrmBreadcrumb trail={[{ label: "Dashboard", to: "/" }, { label: "Double Entry" }]} current="Reports" onNavigate={navigate} />
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
      </div>

      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* tabs */}
          <div className="px-4 pt-4">
            <div className="bg-gray-100 rounded-lg p-1 flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                    tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* filters */}
          <div className="px-4 py-4 flex items-end gap-3 flex-wrap">
            <DateField label="From Date" value={from} onChange={setFrom} />
            <DateField label="To Date" value={to} onChange={setTo} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white min-w-40">
                <option>All Status</option>
                <option>Posted</option>
                <option>Draft</option>
              </select>
            </div>
            {tab === "Account Statement" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
                <select value={account} onChange={(e) => setAccount(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white min-w-52">
                  <option value="">All Accounts</option>
                  {accounts.map((a) => (
                    <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => showToast("Report generated", "success")}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Generate
            </button>
            <button onClick={clear} className="px-4 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50">
              Clear
            </button>
            <button onClick={downloadPdf} className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-md bg-white hover:bg-gray-50">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>

          {/* tab body */}
          <div className="overflow-x-auto border-t border-gray-100">
            {tab === "Journal Entry" && (
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-10" />
                    <th className={th}>Journal #</th>
                    <th className={th}>Date</th>
                    <th className={th}>Reference</th>
                    <th className={th}>Description</th>
                    <th className={thRight}>Total Debit</th>
                    <th className={thRight}>Total Credit</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e) => (
                    <JournalRow key={e.id} entry={e} open={expanded.has(e.id)} onToggle={() => toggle(e.id)} />
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">No journal entries in this range.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {(tab === "General Ledger" || tab === "Account Balance") && (
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className={th}>Account Code</th>
                    <th className={th}>Account Name</th>
                    {tab === "General Ledger" && (
                      <>
                        <th className={thRight}>Debit</th>
                        <th className={thRight}>Credit</th>
                      </>
                    )}
                    <th className={thRight}>Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accounts.map((a) => (
                    <tr key={a.code} className="hover:bg-gray-50">
                      <td className={`${td} text-blue-600 font-medium`}>{a.code}</td>
                      <td className={`${td} text-gray-900`}>{a.name}</td>
                      {tab === "General Ledger" && (
                        <>
                          <td className={`${td} text-right text-gray-900`}>{amt(a.debit)}</td>
                          <td className={`${td} text-right text-gray-900`}>{amt(a.credit)}</td>
                        </>
                      )}
                      <td className={`${td} text-right font-medium ${a.debit - a.credit < 0 ? "text-red-500" : "text-gray-900"}`}>
                        {money(a.debit - a.credit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "Account Statement" && (
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Account</th>
                    <th className={th}>Reference</th>
                    <th className={th}>Description</th>
                    <th className={thRight}>Debit</th>
                    <th className={thRight}>Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines
                    .filter((l) => !account || l.code === account)
                    .map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className={`${td} text-gray-600`}>{l.date}</td>
                        <td className={`${td} text-gray-900`}>
                          <span className="text-blue-600 font-medium">{l.code}</span> {l.name}
                        </td>
                        <td className={`${td} text-gray-600`}>{l.reference}</td>
                        <td className={`${td} text-gray-600`}>{l.description}</td>
                        <td className={`${td} text-right text-gray-900`}>{amt(l.debit)}</td>
                        <td className={`${td} text-right text-gray-900`}>{amt(l.credit)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {tab === "Cash Flow" && (
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Account</th>
                    <th className={th}>Description</th>
                    <th className={thRight}>Inflow</th>
                    <th className={thRight}>Outflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cashLines.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className={`${td} text-gray-600`}>{l.date}</td>
                      <td className={`${td} text-gray-900`}>
                        <span className="text-blue-600 font-medium">{l.code}</span> {l.name}
                      </td>
                      <td className={`${td} text-gray-600`}>{l.description}</td>
                      <td className={`${td} text-right text-green-600`}>{amt(l.debit)}</td>
                      <td className={`${td} text-right text-red-500`}>{amt(l.credit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td className={`${td} font-semibold text-gray-900`} colSpan={3}>Net Cash Flow</td>
                    <td className={`${td} text-right font-semibold text-gray-900`} colSpan={2}>
                      {money(cashLines.reduce((s, l) => s + l.debit - l.credit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {tab === "Expense Report" && (
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className={th}>Journal #</th>
                    <th className={th}>Date</th>
                    <th className={th}>Expense Account</th>
                    <th className={th}>Description</th>
                    <th className={thRight}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenseEntries.map((e) => {
                    const expLine = e.lines.find((l) => l.code.startsWith("5"));
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className={`${td} font-medium text-gray-900`}>{e.number}</td>
                        <td className={`${td} text-gray-600`}>{e.date}</td>
                        <td className={`${td} text-gray-900`}>
                          <span className="text-blue-600 font-medium">{expLine?.code}</span> {expLine?.name}
                        </td>
                        <td className={`${td} text-gray-600`}>{e.description}</td>
                        <td className={`${td} text-right text-gray-900`}>{money(entryTotal(e))}</td>
                      </tr>
                    );
                  })}
                  {expenseEntries.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">No expense entries in this range.</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td className={`${td} font-semibold text-gray-900`} colSpan={4}>Total Expenses</td>
                    <td className={`${td} text-right font-semibold text-gray-900`}>
                      {money(expenseEntries.reduce((s, e) => s + entryTotal(e), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── expandable journal row ────────────────────────────────────── */

function JournalRow({ entry, open, onToggle }: { entry: JournalEntry; open: boolean; onToggle: () => void }) {
  const total = entryTotal(entry);
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="pl-4">
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
        </td>
        <td className={`${td} font-semibold text-gray-900`}>{entry.number}</td>
        <td className={`${td} text-gray-600`}>{entry.date}</td>
        <td className={`${td} text-gray-600`}>{entry.reference}</td>
        <td className={`${td} text-gray-900`}>{entry.description}</td>
        <td className={`${td} text-right text-gray-900`}>{money(total)}</td>
        <td className={`${td} text-right text-gray-900`}>{money(total)}</td>
        <td className={td}>{chip(entry.status, entry.status === "Posted" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="bg-gray-50/70 px-6 py-4">
            <table className="w-full text-sm bg-white rounded-lg border border-gray-200 overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={th}>Account Code</th>
                  <th className={th}>Account Name</th>
                  <th className={th}>Description</th>
                  <th className={thRight}>Debit</th>
                  <th className={thRight}>Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entry.lines.map((l, i) => (
                  <tr key={i}>
                    <td className={`${td} text-blue-600 font-medium`}>{l.code}</td>
                    <td className={`${td} text-gray-900`}>{l.name}</td>
                    <td className={`${td} text-gray-600`}>{l.description}</td>
                    <td className={`${td} text-right text-gray-900`}>{amt(l.debit)}</td>
                    <td className={`${td} text-right text-gray-900`}>{amt(l.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
