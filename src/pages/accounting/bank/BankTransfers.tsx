/**
 * File: src/pages/accounting/bank/BankTransfers.tsx
 * Bank Transfers — list, create/edit modal, process, delete.
 *
 * Endpoints (under /account):
 *   GET    bank-transfers/all?page=&limit=
 *   POST   bank-transfers/create
 *   POST   bank-transfers/process/:id
 *   PATCH  bank-transfers/edit/:id
 *   DELETE bank-transfers/delete/:id
 *
 * from_account_id / to_account_id reference bank accounts (/account/bank-accounts/all).
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
  ArrowRight,
  X,
  Send,
  Calendar,
  Loader2,
} from "lucide-react";

interface BankTransfer {
  id: string;
  transferDate: string;
  fromAccountId: string;
  toAccountId: string;
  transferAmount: number;
  transferCharges: number;
  referenceNumber: string;
  description: string;
  status: string;
}
interface ApiTransfer {
  _id: string;
  transfer_date?: string;
  from_account_id?: string | { _id: string };
  to_account_id?: string | { _id: string };
  transfer_amount?: number;
  transfer_charges?: number;
  reference_number?: string;
  description?: string;
  status?: string;
}
interface ApiBankAccount {
  _id: string;
  account_name?: string;
  bank_name?: string;
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const refId = (v: { _id: string } | string | null | undefined): string =>
  typeof v === "object" && v ? v._id : (v ?? "");
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const money = (n: number) =>
  `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const mapApi = (t: ApiTransfer): BankTransfer => ({
  id: t._id,
  transferDate: toDateInput(t.transfer_date),
  fromAccountId: refId(t.from_account_id),
  toAccountId: refId(t.to_account_id),
  transferAmount: t.transfer_amount ?? 0,
  transferCharges: t.transfer_charges ?? 0,
  referenceNumber: t.reference_number ?? "",
  description: t.description ?? "",
  status: t.status ?? "pending",
});

const emptyForm = {
  transfer_date: new Date().toISOString().split("T")[0],
  from_account_id: "",
  to_account_id: "",
  transfer_amount: 0,
  transfer_charges: 0,
  reference_number: "",
  description: "",
};

const statusColor = (s: string) => {
  switch (s.toLowerCase()) {
    case "completed":
    case "processed":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const BankTransfers: React.FC = () => {
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<ApiBankAccount[]>([]);
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
  const [toDelete, setToDelete] = useState<BankTransfer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const acctName = (id: string) => {
    const a = bankAccounts.find((x) => x._id === id);
    return a ? a.account_name || a.bank_name || id : id || "—";
  };

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<ApiTransfer[]>("/account/bank-transfers/all", {
        params: { page: 1, limit: 1000 },
      });
      setTransfers(Array.isArray(data) ? data.map(mapApi) : []);
    } catch (err) {
      const m = errMessage(err, "Couldn't load bank transfers.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadAccounts = useCallback(async () => {
    try {
      const data = await api.get<ApiBankAccount[]>("/account/bank-accounts/all", {
        params: { page: 1, limit: 1000 },
      });
      if (Array.isArray(data)) setBankAccounts(data);
    } catch {
      /* degrade */
    }
  }, []);

  useEffect(() => {
    loadTransfers();
    loadAccounts();
  }, [loadTransfers, loadAccounts]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return transfers;
    const q = searchQuery.toLowerCase();
    return transfers.filter(
      (t) =>
        t.referenceNumber.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [transfers, searchQuery]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const canEdit = (s: string) => s.toLowerCase() === "pending";

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };
  const openEdit = (t: BankTransfer) => {
    setForm({
      transfer_date: t.transferDate,
      from_account_id: t.fromAccountId,
      to_account_id: t.toAccountId,
      transfer_amount: t.transferAmount,
      transfer_charges: t.transferCharges,
      reference_number: t.referenceNumber,
      description: t.description,
    });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.from_account_id) return showToast("Select the source account", "info");
    if (!form.to_account_id) return showToast("Select the destination account", "info");
    if (form.from_account_id === form.to_account_id) return showToast("Accounts must differ", "info");
    if (!form.transfer_amount || form.transfer_amount <= 0) return showToast("Enter a valid amount", "info");
    setSaving(true);
    try {
      if (editingId) await api.patch(`/account/bank-transfers/edit/${editingId}`, form);
      else await api.post("/account/bank-transfers/create", form);
      showToast(`Transfer ${editingId ? "updated" : "created"}!`, "success");
      setShowModal(false);
      await loadTransfers();
    } catch (err) {
      showToast(errMessage(err, "Couldn't save transfer."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleProcess = async (t: BankTransfer) => {
    setProcessingId(t.id);
    try {
      await api.post(`/account/bank-transfers/process/${t.id}`);
      showToast("Transfer processed!", "success");
      await loadTransfers();
    } catch (err) {
      showToast(errMessage(err, "Couldn't process transfer."), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/account/bank-transfers/delete/${toDelete.id}`);
      showToast("Transfer deleted!", "success");
      setShowDelete(false);
      setToDelete(null);
      await loadTransfers();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete transfer."), "error");
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
          <span className="text-gray-900 font-medium">Bank Transfers</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bank Transfers</h2>
            <p className="text-sm text-gray-500 mt-0.5">Move funds between bank accounts</p>
          </div>
          <button onClick={openCreate} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700" title="Create Transfer"><Plus className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by reference or note..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <button onClick={() => loadTransfers()} className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Refresh</button>
          </div>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
            <option value={5}>5 per page</option><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">From → To</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Charges</th>
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No transfers found.</td></tr>
              ) : (
                paginated.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.referenceNumber || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{t.transferDate}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span>{acctName(t.fromAccountId)}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <span>{acctName(t.toAccountId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{money(t.transferAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{money(t.transferCharges)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(t.status)}`}>{t.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canEdit(t.status) ? (
                          <button onClick={() => handleProcess(t)} disabled={processingId === t.id} className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg disabled:opacity-50" title="Process">
                            {processingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */
                        )}
                        <button onClick={() => openEdit(t)} disabled={!canEdit(t.status)} className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400" title={canEdit(t.status) ? "Edit" : "Only pending transfers can be edited"}><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { setToDelete(t); setShowDelete(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Transfer" : "Create Transfer"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date</label>
                <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="date" className={`${inputCls} pl-10`} value={form.transfer_date} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label><input className={inputCls} value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="TRF-001" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Account *</label>
                <select className={inputCls} value={form.from_account_id} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}>
                  <option value="">Select account</option>
                  {bankAccounts.map((a) => (<option key={a._id} value={a._id}>{a.account_name || a.bank_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Account *</label>
                <select className={inputCls} value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}>
                  <option value="">Select account</option>
                  {bankAccounts.filter((a) => a._id !== form.from_account_id).map((a) => (<option key={a._id} value={a._id}>{a.account_name || a.bank_name}</option>))}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label><input type="number" min={0} step="0.01" className={inputCls} value={form.transfer_amount} onChange={(e) => setForm({ ...form, transfer_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Charges</label><input type="number" min={0} step="0.01" className={inputCls} value={form.transfer_charges} onChange={(e) => setForm({ ...form, transfer_charges: parseFloat(e.target.value) || 0 })} /></div>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Transfer</h3>
              <p className="text-gray-500 mb-6">Delete transfer <span className="font-semibold">{toDelete.referenceNumber || ""}</span>? This action cannot be undone.</p>
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
