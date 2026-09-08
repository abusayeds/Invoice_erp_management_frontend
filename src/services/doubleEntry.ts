/**
 * File: src/services/doubleEntry.ts
 * Double-Entry module: balance sheets (CRUD + lifecycle) and the read-only
 * financial reports (trial balance, P&L, ledger summary, general ledger,
 * account balance, cash flow, journal entry, expense report).
 */

import { createResourceHooks } from "@/hooks/useResource";
import type { Entity } from "@/lib/api/types";
import { getList, getOne, postJson, deleteJson, makeResource, buildQuery } from "./_http";

const BASE = "/double-entry";

export interface DateRange {
  from_date?: string;
  to_date?: string;
  as_of_date?: string;
  status?: string;
  account_id?: string;
  [key: string]: unknown;
}

// ─── Balance Sheets ─────────────────────────────────────────────────────────

export interface BalanceSheet extends Entity {
  balance_sheet_date: string;
  financial_year: string;
  status?: "draft" | "finalized" | string;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  notes?: Array<{ _id?: string; id?: string; note_title: string; note_content: string }>;
  createdAt?: string;
}

/** Balance sheets: list at `/balance-sheets/list`, create at `/balance-sheets`. */
export const balanceSheetsService = makeResource<BalanceSheet>({
  list: `${BASE}/balance-sheets/list`,
  single: (id) => `${BASE}/balance-sheets/${id}`,
  create: `${BASE}/balance-sheets`,
  update: (id) => `${BASE}/balance-sheets/${id}`,
  remove: (id) => `${BASE}/balance-sheets/${id}`,
});

export const balanceSheetHooks = createResourceHooks("balance-sheets", balanceSheetsService);

export const balanceSheetActions = {
  latest: () => getOne<BalanceSheet>(`${BASE}/balance-sheets/latest`),
  show: (id: string) => getOne<BalanceSheet>(`${BASE}/balance-sheets/${id}`),
  finalize: (id: string) => postJson(`${BASE}/balance-sheets/${id}/finalize`),
  addNote: (id: string, body: { note_title: string; note_content: string }) =>
    postJson(`${BASE}/balance-sheets/${id}/notes`, body),
  deleteNote: (id: string, noteId: string) =>
    deleteJson(`${BASE}/balance-sheets/${id}/notes/${noteId}`),
  compare: (body: { current_period_id: string; previous_period_id: string }) =>
    postJson(`${BASE}/balance-sheets/compare`, body),
  comparisons: () => getList(`${BASE}/balance-sheets/comparisons`),
  showComparison: (comparisonId: string) =>
    getOne(`${BASE}/balance-sheets/comparison/${comparisonId}`),
  comparisonPrintUrl: (currentId: string, previousId: string) =>
    `${BASE}/balance-sheets/comparison/print${buildQuery({
      current_id: currentId,
      previous_id: previousId,
    })}`,
  yearEndClose: (body: { financial_year: string; closing_date: string }) =>
    postJson(`${BASE}/balance-sheets/year-end-close`, body),
  printUrl: (id: string) => `${BASE}/balance-sheets/${id}/print`,
};

// ─── Reports (read-only) ────────────────────────────────────────────────────

export const doubleEntryReports = {
  index: () => getOne(`${BASE}/reports`),
  trialBalance: (p: DateRange) => getOne(`${BASE}/trial-balance`, p),
  trialBalancePrint: (p: DateRange) =>
    `${BASE}/trial-balance/print${buildQuery({ from_date: p.from_date, to_date: p.to_date })}`,
  profitLoss: (p: DateRange) => getOne(`${BASE}/profit-loss`, p),
  profitLossPrint: (p: DateRange) =>
    `${BASE}/profit-loss/print${buildQuery({ from_date: p.from_date, to_date: p.to_date })}`,
  ledgerSummary: (p: DateRange) => getOne(`${BASE}/ledger-summary`, p),
  ledgerSummaryPrint: (p: DateRange) =>
    `${BASE}/ledger-summary/print${buildQuery({ from_date: p.from_date, to_date: p.to_date })}`,
  generalLedger: (p: DateRange) => getOne(`${BASE}/reports/general-ledger`, p),
  generalLedgerPrint: (p: DateRange) =>
    `${BASE}/reports/general-ledger/print${buildQuery({
      account_id: p.account_id,
      from_date: p.from_date,
      to_date: p.to_date,
    })}`,
  accountStatement: (p: DateRange) => getOne(`${BASE}/reports/account-statement`, p),
  accountStatementPrint: (p: DateRange) =>
    `${BASE}/reports/account-statement/print${buildQuery({ account_id: p.account_id })}`,
  journalEntry: (p: DateRange) => getOne(`${BASE}/reports/journal-entry`, p),
  journalEntryPrint: (p: DateRange) =>
    `${BASE}/reports/journal-entry/print${buildQuery({
      from_date: p.from_date,
      to_date: p.to_date,
      status: p.status,
    })}`,
  accountBalance: (p: DateRange) => getOne(`${BASE}/reports/account-balance`, p),
  accountBalancePrint: (p: DateRange) =>
    `${BASE}/reports/account-balance/print${buildQuery({ as_of_date: p.as_of_date })}`,
  cashFlow: (p: DateRange) => getOne(`${BASE}/reports/cash-flow`, p),
  cashFlowPrint: (p: DateRange) =>
    `${BASE}/reports/cash-flow/print${buildQuery({ from_date: p.from_date, to_date: p.to_date })}`,
  expenseReport: (p: DateRange) => getOne(`${BASE}/reports/expense-report`, p),
  expenseReportPrint: (p: DateRange) =>
    `${BASE}/reports/expense-report/print${buildQuery({ from_date: p.from_date, to_date: p.to_date })}`,
};

// ─── Shared: Chart of Accounts (used by reports + budget allocations) ───────

export interface ChartAccount extends Entity {
  name?: string;
  account_name?: string;
  account_code?: string;
  account_type?: string;
}

export const fetchChartOfAccounts = (params?: { limit?: number; page?: number; searchTerm?: string }) =>
  getList<ChartAccount>(`/account/chart-of-accounts/all`, { limit: 100, ...params });
