/**
 * File: src/pages/accounting/ChartOfAccounts.tsx
 * Chart of Accounts — list, create/edit modal, view & delete modals.
 *
 * Endpoints (under /account):
 *   GET    chart-of-accounts/all?page=&limit=
 *   GET    chart-of-accounts/single/:id
 *   POST   chart-of-accounts/create
 *   PATCH  chart-of-accounts/edit/:id
 *   DELETE chart-of-accounts/delete/:id
 *
 * account_type_id references an account type (/account/account-types/all).
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { api } from "../../lib/api/client";
import { ApiError } from "../../lib/api/ApiError";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Eye,
  BookOpen,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coa {
  id: string;
  accountCode: string;
  accountName: string;
  accountTypeId: string;
  normalBalance: string; // debit | credit
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
}
interface ApiCoa {
  _id: string;
  account_code?: string;
  account_name?: string;
  account_type_id?: string | { _id: string; name?: string };
  normal_balance?: string;
  opening_balance?: number;
  current_balance?: number;
  is_active?: boolean;
}
interface ApiAccountType {
  _id: string;
  name?: string;
  code?: string;
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const refId = (v: { _id: string } | string | null | undefined): string =>
  typeof v === "object" && v ? v._id : (v ?? "");
const money = (n: number) =>
  `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const mapApiCoa = (a: ApiCoa): Coa => ({
  id: a._id,
  accountCode: a.account_code ?? "",
  accountName: a.account_name ?? "",
  accountTypeId: refId(a.account_type_id),
  normalBalance: a.normal_balance ?? "",
  openingBalance: a.opening_balance ?? 0,
  currentBalance: a.current_balance ?? 0,
  isActive: a.is_active ?? true,
});

const emptyForm = {
  account_code: "",
  account_name: "",
  account_type_id: "",
  normal_balance: "debit",
  opening_balance: 0,
  current_balance: 0,
  is_active: true,
};

type SortField = "accountCode" | "accountName" | "currentBalance";
type SortDir = "asc" | "desc";

// ─── Component ────────────────────────────────────────────────────────────────

export const ChartOfAccounts: React.FC = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Coa[]>([]);
  const [accountTypes, setAccountTypes] = useState<ApiAccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("accountCode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showView, setShowView] = useState(false);
  const [viewAccount, setViewAccount] = useState<Coa | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<Coa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const typeNameById = useMemo(() => {
    const m: Record<string, string> = {};
    accountTypes.forEach((t) => (m[t._id] = t.name ?? ""));
    return m;
  }, [accountTypes]);

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<ApiCoa[]>("/account/chart-of-accounts/all", {
        params: { page: 1, limit: 1000 },
      });
      setAccounts(Array.isArray(data) ? data.map(mapApiCoa) : []);
    } catch (err) {
      const m = errMessage(err, "Couldn't load chart of accounts.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTypes = useCallback(async () => {
    try {
      const data = await api.get<ApiAccountType[]>("/account/account-types/all");
      if (Array.isArray(data)) setAccountTypes(data);
    } catch {
      /* dropdown degrades gracefully */
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadTypes();
  }, [loadAccounts, loadTypes]);

  // ─── Sort / filter ─────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    let result = [...accounts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.accountCode.toLowerCase().includes(q) ||
          a.accountName.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [accounts, searchQuery, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };
  const openEdit = (a: Coa) => {
    setForm({
      account_code: a.accountCode,
      account_name: a.accountName,
      account_type_id: a.accountTypeId,
      normal_balance: a.normalBalance || "debit",
      opening_balance: a.openingBalance,
      current_balance: a.currentBalance,
      is_active: a.isActive,
    });
    setEditingId(a.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.account_code.trim()) return showToast("Please enter an account code", "info");
    if (!form.account_name.trim()) return showToast("Please enter an account name", "info");
    if (!form.account_type_id) return showToast("Please select an account type", "info");
    setSaving(true);
    try {
      if (editingId) await api.patch(`/account/chart-of-accounts/edit/${editingId}`, form);
      else await api.post("/account/chart-of-accounts/create", form);
      showToast(`Account ${editingId ? "updated" : "created"}!`, "success");
      setShowModal(false);
      await loadAccounts();
    } catch (err) {
      showToast(errMessage(err, "Couldn't save account."), "error");
    } finally {
      setSaving(false);
    }
  };

  const openView = async (a: Coa) => {
    setViewAccount(a);
    setShowView(true);
    setViewLoading(true);
    try {
      const data = await api.get<ApiCoa>(`/account/chart-of-accounts/single/${a.id}`);
      if (data) setViewAccount(mapApiCoa(data));
    } catch (err) {
      showToast(errMessage(err, "Couldn't load account details."), "error");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/account/chart-of-accounts/delete/${toDelete.id}`);
      showToast("Account deleted!", "success");
      setShowDelete(false);
      setToDelete(null);
      await loadAccounts();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete account."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-50 whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-gray-900" : "text-gray-400"}`} />
      </div>
    </th>
  );

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white";

  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Chart of Accounts</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chart of Accounts</h2>
            <p className="text-sm text-gray-500 mt-0.5">General ledger accounts and balances</p>
          </div>
          <button onClick={openCreate} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700" title="Create Account">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button onClick={() => loadAccounts()} className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">
              Refresh
            </button>
          </div>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <SortHeader field="accountCode" label="Code" />
                <SortHeader field="accountName" label="Account Name" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Account Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Normal Balance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Opening</th>
                <SortHeader field="currentBalance" label="Current" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16"><div className="flex items-center justify-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading accounts…</span></div></td></tr>
              ) : loadError ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-red-600">{loadError}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No accounts found.</td></tr>
              ) : (
                paginated.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.accountCode}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openView(a)} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                        {a.accountName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{typeNameById[a.accountTypeId] || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${a.normalBalance === "debit" ? "text-blue-600" : "text-green-600"}`}>
                        {a.normalBalance || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{money(a.openingBalance)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{money(a.currentBalance)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {a.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(a)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { setToDelete(a); setShowDelete(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} results
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Previous</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${currentPage === page ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Account" : "Create Account"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Code *</label>
                <input className={inputCls} value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value })} placeholder="e.g., 2288" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                <input className={inputCls} value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="e.g., Cash on Hand" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
                <select className={inputCls} value={form.account_type_id} onChange={(e) => setForm({ ...form, account_type_id: e.target.value })}>
                  <option value="">Select Account Type</option>
                  {accountTypes.map((t) => (<option key={t._id} value={t._id}>{t.name}{t.code ? ` (${t.code})` : ""}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Normal Balance</label>
                <select className={inputCls} value={form.normal_balance} onChange={(e) => setForm({ ...form, normal_balance: e.target.value })}>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                <input type="number" step="0.01" className={inputCls} value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
                <input type="number" step="0.01" className={inputCls} value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm text-gray-700">Is Active</span>
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editingId ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && viewAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
              <button onClick={() => setShowView(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6">
              {viewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center"><BookOpen className="w-6 h-6 text-blue-600" /></div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{viewAccount.accountName}</h3>
                      <p className="text-xs text-gray-500">Code: {viewAccount.accountCode} · {typeNameById[viewAccount.accountTypeId] || "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-100 rounded-md p-4">
                      <div className="text-xs text-gray-500 mb-1">Opening Balance</div>
                      <div className="text-xl font-bold text-gray-900">{money(viewAccount.openingBalance)}</div>
                    </div>
                    <div className="border border-gray-100 rounded-md p-4">
                      <div className="text-xs text-gray-500 mb-1">Current Balance</div>
                      <div className="text-xl font-bold text-blue-600">{money(viewAccount.currentBalance)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-xs text-gray-500">Normal Balance</p><p className="capitalize text-gray-900">{viewAccount.normalBalance || "—"}</p></div>
                    <div><p className="text-xs text-gray-500">Status</p><p className="text-gray-900">{viewAccount.isActive ? "Active" : "Inactive"}</p></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowView(false); openEdit(viewAccount); }} disabled={viewLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Edit</button>
              <button onClick={() => setShowView(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
              <p className="text-gray-500 mb-6">Delete <span className="font-semibold">{toDelete.accountName}</span>? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}{deleting ? "Deleting…" : "Delete"}
                </button>
                <button onClick={() => setShowDelete(false)} disabled={deleting} className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
