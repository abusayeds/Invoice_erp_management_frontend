/**
 * File: src/pages/accounting/bank/BankTransaction.tsx
 * Bank Transactions — read-only list (filtered by bank account) + mark reconciled.
 *
 * Endpoints (under /account):
 *   GET  bank-transactions/all?bank_account_id=&page=&limit=
 *   POST bank-transactions/mark-reconciled/:id
 *
 * Bank accounts come from /account/bank-accounts/all.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/ApiError";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  type: string; // debit | credit
  amount: number;
  runningBalance: number;
  isReconciled: boolean;
}
interface ApiTransaction {
  _id: string;
  transaction_date?: string;
  date?: string;
  description?: string;
  reference_number?: string;
  type?: string;
  transaction_type?: string;
  amount?: number;
  running_balance?: number;
  balance?: number;
  is_reconciled?: boolean;
}
interface ApiBankAccount {
  _id: string;
  account_name?: string;
  bank_name?: string;
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const money = (n: number) =>
  `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const mapApi = (t: ApiTransaction): BankTransaction => ({
  id: t._id,
  date: toDateInput(t.transaction_date ?? t.date),
  description: t.description ?? "",
  reference: t.reference_number ?? "",
  type: (t.type ?? t.transaction_type ?? "").toLowerCase(),
  amount: t.amount ?? 0,
  runningBalance: t.running_balance ?? t.balance ?? 0,
  isReconciled: !!t.is_reconciled,
});

export const BankTransactions: React.FC = () => {
  const navigate = useNavigate();

  const [bankAccounts, setBankAccounts] = useState<ApiBankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await api.get<ApiBankAccount[]>("/account/bank-accounts/all", {
        params: { page: 1, limit: 1000 },
      });
      if (Array.isArray(data)) {
        setBankAccounts(data);
        if (data[0]) setSelectedAccount(data[0]._id);
      }
    } catch {
      /* degrade */
    }
  }, []);

  const loadTransactions = useCallback(async (accountId: string) => {
    if (!accountId) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<ApiTransaction[]>("/account/bank-transactions/all", {
        params: { bank_account_id: accountId, page: 1, limit: 1000 },
      });
      setTransactions(Array.isArray(data) ? data.map(mapApi) : []);
    } catch (err) {
      const m = errMessage(err, "Couldn't load transactions.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedAccount) {
      setCurrentPage(1);
      loadTransactions(selectedAccount);
    }
  }, [selectedAccount, loadTransactions]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q),
    );
  }, [transactions, searchQuery]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleReconcile = async (t: BankTransaction) => {
    setReconcilingId(t.id);
    try {
      await api.post(`/account/bank-transactions/mark-reconciled/${t.id}`);
      showToast("Marked as reconciled!", "success");
      await loadTransactions(selectedAccount);
    } catch (err) {
      showToast(errMessage(err, "Couldn't reconcile transaction."), "error");
    } finally {
      setReconcilingId(null);
    }
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Bank Transactions</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <h2 className="text-lg font-semibold text-gray-900">Bank Transactions</h2>
        <p className="text-sm text-gray-500 mt-0.5">Transaction ledger per bank account</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
              <option value="">Select bank account</option>
              {bankAccounts.map((a) => (<option key={a._id} value={a._id}>{a.account_name || a.bank_name}</option>))}
            </select>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search description or reference..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <button onClick={() => loadTransactions(selectedAccount)} className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Refresh</button>
          </div>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
            <option value={10}>10 per page</option><option value={20}>20 per page</option><option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reconciled</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex items-center justify-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div></td></tr>
              ) : loadError ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-red-600">{loadError}</td></tr>
              ) : !selectedAccount ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Select a bank account to view its transactions.</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No transactions found.</td></tr>
              ) : (
                paginated.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{t.date}</td>
                    <td className="px-4 py-3 text-gray-900">{t.description || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{t.reference || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${t.type === "credit" ? "text-green-600" : "text-blue-600"}`}>{t.type || "—"}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${t.type === "credit" ? "text-green-600" : "text-gray-900"}`}>{money(t.amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{money(t.runningBalance)}</td>
                    <td className="px-4 py-3">
                      {t.isReconciled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Reconciled</span>
                      ) : (
                        <button onClick={() => handleReconcile(t)} disabled={reconcilingId === t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50">
                          {reconcilingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}Mark reconciled
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">Showing {filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} results</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Previous</span></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (<button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${currentPage === page ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>{page}</button>))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"><span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
