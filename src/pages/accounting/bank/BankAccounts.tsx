/**
 * File: src/pages/accounting/bank/BankAccounts.tsx
 * Bank Accounts — list, create/edit modal, delete.
 *
 * Endpoints (under /account):
 *   GET    bank-accounts/all?page=&limit=
 *   POST   bank-accounts/create
 *   PATCH  bank-accounts/edit/:id
 *   DELETE bank-accounts/delete/:id
 *
 * gl_account_id references a chart-of-account (/account/chart-of-accounts/all).
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/ApiError";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Landmark,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  branchName: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  glAccountId: string;
}
interface ApiBankAccount {
  _id: string;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
  branch_name?: string;
  account_type?: string;
  opening_balance?: number;
  current_balance?: number;
  is_active?: boolean;
  gl_account_id?: string | { _id: string };
}
interface ApiCoa {
  _id: string;
  account_code?: string;
  account_name?: string;
}

const ACCOUNT_TYPES = ["checking", "savings", "credit_card", "cash", "other"];
const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const refId = (v: { _id: string } | string | null | undefined): string =>
  typeof v === "object" && v ? v._id : (v ?? "");
const money = (n: number) =>
  `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const mapApi = (a: ApiBankAccount): BankAccount => ({
  id: a._id,
  accountNumber: a.account_number ?? "",
  accountName: a.account_name ?? "",
  bankName: a.bank_name ?? "",
  branchName: a.branch_name ?? "",
  accountType: a.account_type ?? "",
  openingBalance: a.opening_balance ?? 0,
  currentBalance: a.current_balance ?? 0,
  isActive: a.is_active ?? true,
  glAccountId: refId(a.gl_account_id),
});

const emptyForm = {
  account_number: "",
  account_name: "",
  bank_name: "",
  branch_name: "",
  account_type: "checking",
  opening_balance: 0,
  current_balance: 0,
  is_active: true,
  gl_account_id: "",
};

export const BankAccounts: React.FC = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [coa, setCoa] = useState<ApiCoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<BankAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coaLabel = (id: string) => {
    const a = coa.find((x) => x._id === id);
    return a ? `${a.account_code} · ${a.account_name}` : "—";
  };

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<ApiBankAccount[]>("/account/bank-accounts/all", {
        params: { page: 1, limit: 1000 },
      });
      setAccounts(Array.isArray(data) ? data.map(mapApi) : []);
    } catch (err) {
      const m = errMessage(err, "Couldn't load bank accounts.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadCoa = useCallback(async () => {
    try {
      const data = await api.get<ApiCoa[]>("/account/chart-of-accounts/all", {
        params: { page: 1, limit: 1000 },
      });
      if (Array.isArray(data)) setCoa(data);
    } catch {
      /* degrade gracefully */
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadCoa();
  }, [loadAccounts, loadCoa]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (a) =>
        a.accountName.toLowerCase().includes(q) ||
        a.bankName.toLowerCase().includes(q) ||
        a.accountNumber.toLowerCase().includes(q),
    );
  }, [accounts, searchQuery]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };
  const openEdit = (a: BankAccount) => {
    setForm({
      account_number: a.accountNumber,
      account_name: a.accountName,
      bank_name: a.bankName,
      branch_name: a.branchName,
      account_type: a.accountType || "checking",
      opening_balance: a.openingBalance,
      current_balance: a.currentBalance,
      is_active: a.isActive,
      gl_account_id: a.glAccountId,
    });
    setEditingId(a.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.account_name.trim()) return showToast("Please enter an account name", "info");
    if (!form.account_number.trim()) return showToast("Please enter an account number", "info");
    if (!form.bank_name.trim()) return showToast("Please enter a bank name", "info");
    setSaving(true);
    try {
      const payload = { ...form, gl_account_id: form.gl_account_id || undefined };
      if (editingId) await api.patch(`/account/bank-accounts/edit/${editingId}`, payload);
      else await api.post("/account/bank-accounts/create", payload);
      showToast(`Bank account ${editingId ? "updated" : "created"}!`, "success");
      setShowModal(false);
      await loadAccounts();
    } catch (err) {
      showToast(errMessage(err, "Couldn't save bank account."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/account/bank-accounts/delete/${toDelete.id}`);
      showToast("Bank account deleted!", "success");
      setShowDelete(false);
      setToDelete(null);
      await loadAccounts();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete bank account."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white";

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Bank Accounts</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
            <p className="text-sm text-gray-500 mt-0.5">Company bank and cash accounts</p>
          </div>
          <button onClick={openCreate} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700" title="Create Bank Account">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name, bank or number..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <button onClick={() => loadAccounts()} className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Refresh</button>
          </div>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Bank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">GL Account</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Current Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex items-center justify-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div></td></tr>
              ) : loadError ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-red-600">{loadError}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No bank accounts found.</td></tr>
              ) : (
                paginated.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{a.accountName}</div>
                          <div className="text-xs text-gray-500">{a.accountNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.bankName}{a.branchName ? ` · ${a.branchName}` : ""}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{a.accountType.replace("_", " ") || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{a.glAccountId ? coaLabel(a.glAccountId) : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{money(a.currentBalance)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {a.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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

      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">Showing {filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} results</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Previous</span></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${currentPage === page ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"><span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Bank Account" : "Create Bank Account"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label><input className={inputCls} value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label><input className={inputCls} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label><input className={inputCls} value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label><input className={inputCls} value={form.branch_name} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select className={inputCls} value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
                  {ACCOUNT_TYPES.map((t) => (<option key={t} value={t} className="capitalize">{t.replace("_", " ")}</option>))}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">GL Account</label>
                <select className={inputCls} value={form.gl_account_id} onChange={(e) => setForm({ ...form, gl_account_id: e.target.value })}>
                  <option value="">Select GL Account</option>
                  {coa.map((a) => (<option key={a._id} value={a._id}>{a.account_code} · {a.account_name}</option>))}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label><input type="number" step="0.01" className={inputCls} value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: parseFloat(e.target.value) || 0 })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label><input type="number" step="0.01" className={inputCls} value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: parseFloat(e.target.value) || 0 })} /></div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm text-gray-700">Is Active</span>
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm inline-flex items-center gap-2 disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{editingId ? "Save Changes" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Bank Account</h3>
              <p className="text-gray-500 mb-6">Delete <span className="font-semibold">{toDelete.accountName}</span>? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 inline-flex items-center justify-center gap-2 disabled:opacity-50">{deleting && <Loader2 className="w-4 h-4 animate-spin" />}{deleting ? "Deleting…" : "Delete"}</button>
                <button onClick={() => setShowDelete(false)} disabled={deleting} className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
