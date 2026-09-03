/**
 * File: src/pages/accounting/Expense.tsx
 * Expenses (accounting) — list, create/edit modal, approve, post, delete.
 *
 * Endpoints (under /account):
 *   GET    expenses/all?page=&limit=
 *   POST   expenses/create
 *   PATCH  expenses/edit/:id
 *   POST   expenses/approve/:id
 *   POST   expenses/post/:id
 *   DELETE expenses/delete/:id
 *
 * Dropdowns: expense-categories/all, bank-accounts/all, chart-of-accounts/all.
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
  X,
  Calendar,
  Check,
  Send,
  Loader2,
} from "lucide-react";

interface Expense {
  id: string;
  date: string;
  categoryId: string;
  bankAccountId: string;
  chartOfAccountId: string;
  amount: number;
  description: string;
  referenceNumber: string;
  status: string;
}
interface ApiExpense {
  _id: string;
  expense_date?: string;
  category_id?: string | { _id: string };
  bank_account_id?: string | { _id: string };
  chart_of_account_id?: string | { _id: string };
  amount?: number;
  description?: string;
  reference_number?: string;
  status?: string;
}
interface Named {
  _id: string;
  category_name?: string;
  account_name?: string;
  account_code?: string;
  bank_name?: string;
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const refId = (v: { _id: string } | string | null | undefined): string =>
  typeof v === "object" && v ? v._id : (v ?? "");
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const money = (n: number) =>
  `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const mapApi = (r: ApiExpense): Expense => ({
  id: r._id,
  date: toDateInput(r.expense_date),
  categoryId: refId(r.category_id),
  bankAccountId: refId(r.bank_account_id),
  chartOfAccountId: refId(r.chart_of_account_id),
  amount: r.amount ?? 0,
  description: r.description ?? "",
  referenceNumber: r.reference_number ?? "",
  status: (r.status ?? "draft").toLowerCase(),
});

const emptyForm = {
  expense_date: new Date().toISOString().split("T")[0],
  category_id: "",
  bank_account_id: "",
  chart_of_account_id: "",
  amount: 0,
  description: "",
  reference_number: "",
};

const statusColor = (s: string) => {
  switch (s) {
    case "posted":
      return "bg-green-100 text-green-700";
    case "approved":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const Expense: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Named[]>([]);
  const [banks, setBanks] = useState<Named[]>([]);
  const [coa, setCoa] = useState<Named[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const catName = (id: string) => categories.find((c) => c._id === id)?.category_name || "—";
  const bankName = (id: string) => {
    const b = banks.find((x) => x._id === id);
    return b ? b.account_name || b.bank_name || "—" : "—";
  };

  const loadRows = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<ApiExpense[]>("/account/expenses/all", {
        params: { page: 1, limit: 1000 },
      });
      setRows(Array.isArray(data) ? data.map(mapApi) : []);
    } catch (err) {
      const m = errMessage(err, "Couldn't load expenses.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadOptions = useCallback(async () => {
    const [c, b, a] = await Promise.allSettled([
      api.get<Named[]>("/account/expense-categories/all"),
      api.get<Named[]>("/account/bank-accounts/all", { params: { page: 1, limit: 1000 } }),
      api.get<Named[]>("/account/chart-of-accounts/all", { params: { page: 1, limit: 1000 } }),
    ]);
    if (c.status === "fulfilled" && Array.isArray(c.value)) setCategories(c.value);
    if (b.status === "fulfilled" && Array.isArray(b.value)) setBanks(b.value);
    if (a.status === "fulfilled" && Array.isArray(a.value)) setCoa(a.value);
  }, []);

  useEffect(() => {
    loadRows();
    loadOptions();
  }, [loadRows, loadOptions]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.referenceNumber.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        catName(r.categoryId).toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchQuery, categories]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const canEdit = (s: string) => s === "draft";
  const canApprove = (s: string) => s === "draft";
  const canPost = (s: string) => s === "approved";

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (r: Expense) => {
    setForm({
      expense_date: r.date,
      category_id: r.categoryId,
      bank_account_id: r.bankAccountId,
      chart_of_account_id: r.chartOfAccountId,
      amount: r.amount,
      description: r.description,
      reference_number: r.referenceNumber,
    });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.category_id) return showToast("Select an expense category", "info");
    if (!form.amount || form.amount <= 0) return showToast("Enter a valid amount", "info");
    setSaving(true);
    try {
      if (editingId) await api.patch(`/account/expenses/edit/${editingId}`, form);
      else await api.post("/account/expenses/create", form);
      showToast(`Expense ${editingId ? "updated" : "created"}!`, "success");
      setShowModal(false);
      await loadRows();
    } catch (err) {
      showToast(errMessage(err, "Couldn't save expense."), "error");
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (id: string, action: "approve" | "post") => {
    setProcessingId(id);
    try {
      await api.post(`/account/expenses/${action}/${id}`);
      showToast(`Expense ${action === "approve" ? "approved" : "posted"}!`, "success");
      await loadRows();
    } catch (err) {
      showToast(errMessage(err, `Couldn't ${action} expense.`), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/account/expenses/delete/${toDelete.id}`);
      showToast("Expense deleted!", "success");
      setShowDelete(false);
      setToDelete(null);
      await loadRows();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete expense."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white";

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span><span className="text-gray-900 font-medium">Expenses</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
            <p className="text-sm text-gray-500 mt-0.5">Record and post expense entries</p>
          </div>
          <button onClick={openCreate} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700" title="Create Expense"><Plus className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by reference, note or category..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <button onClick={() => loadRows()} className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Refresh</button>
          </div>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
            <option value={5}>5 per page</option><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Bank</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex items-center justify-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div></td></tr>
              ) : loadError ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-red-600">{loadError}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No expenses found.</td></tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{r.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.referenceNumber || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{catName(r.categoryId)}</td>
                    <td className="px-4 py-3 text-gray-600">{bankName(r.bankAccountId)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{money(r.amount)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(r.status)}`}>{r.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canApprove(r.status) ? (
                          <button onClick={() => doAction(r.id, "approve")} disabled={processingId === r.id} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg disabled:opacity-50" title="Approve">{processingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                          ) : <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */}
                        {canPost(r.status) ? (
                          <button onClick={() => doAction(r.id, "post")} disabled={processingId === r.id} className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg disabled:opacity-50" title="Post">{processingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                          ) : <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */}
                        <button onClick={() => openEdit(r)} disabled={!canEdit(r.status)} className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400" title={canEdit(r.status) ? "Edit" : "Only draft can be edited"}><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { setToDelete(r); setShowDelete(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (<button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${currentPage === page ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>{page}</button>))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"><span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Expense" : "Create Expense"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="date" className={`${inputCls} pl-10`} value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label><input className={inputCls} value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="EXP-REF-1" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category *</label>
                <select className={inputCls} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map((c) => (<option key={c._id} value={c._id}>{c.category_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                <select className={inputCls} value={form.bank_account_id} onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}>
                  <option value="">Select bank account</option>
                  {banks.map((b) => (<option key={b._id} value={b._id}>{b.account_name || b.bank_name}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">GL Account</label>
                <select className={inputCls} value={form.chart_of_account_id} onChange={(e) => setForm({ ...form, chart_of_account_id: e.target.value })}>
                  <option value="">Select GL account</option>
                  {coa.map((a) => (<option key={a._id} value={a._id}>{a.account_code} · {a.account_name}</option>))}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label><input type="number" min={0} step="0.01" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea rows={2} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Expense</h3>
              <p className="text-gray-500 mb-6">Delete this expense entry ({money(toDelete.amount)})? This action cannot be undone.</p>
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
