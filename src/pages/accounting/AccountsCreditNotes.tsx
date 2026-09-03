/**
 * File: src/pages/accounting/AccountsCreditNotes.tsx
 * Credit Notes (accounting) — list, view (single), approve, delete (draft).
 * Credit notes are auto-created from sales returns, so there is no create form.
 *
 * Endpoints (under /account):
 *   GET    credit-notes/all?page=&limit=
 *   GET    credit-notes/single/:id
 *   POST   credit-notes/approve/:id
 *   DELETE credit-notes/delete/:id
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { api } from "../../lib/api/client";
import { ApiError } from "../../lib/api/ApiError";
import {
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface NoteProduct {
  productId: string;
  quantity: number;
  rate: number;
  amount: number;
}
interface CreditNote {
  id: string;
  invoiceNumber: string;
  customerId: string;
  date: string;
  total: number;
  appliedAmount: number;
  balanceAmount: number;
  status: string;
  returnReason: string;
  notes: string;
  products: NoteProduct[];
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const refId = (v: any): string => (typeof v === "object" && v ? v._id : (v ?? ""));
const refName = (v: any): string => (typeof v === "object" && v ? (v.name ?? "") : "");
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const money = (n: number) =>
  `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const mapApi = (n: any): CreditNote => ({
  id: n._id,
  invoiceNumber: n.invoice_number ?? "",
  customerId: refId(n.customer_id),
  date: toDateInput(n.date),
  total: n.total ?? 0,
  appliedAmount: n.applied_amount ?? 0,
  balanceAmount: n.balance_amount ?? 0,
  status: (n.status ?? "Draft"),
  returnReason: n.return_reason ?? "",
  notes: n.notes ?? "",
  products: (n.product ?? []).map((p: any) => ({
    productId: refId(p.product_id),
    quantity: p.quantity ?? 0,
    rate: p.rate ?? 0,
    amount: p.amount ?? 0,
  })),
});

const statusColor = (s: string) => {
  switch (s.toLowerCase()) {
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "applied":
    case "closed":
      return "bg-green-100 text-green-700";
    case "draft":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const AccountsCreditNotes: React.FC = () => {
  const navigate = useNavigate();

  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showView, setShowView] = useState(false);
  const [viewNote, setViewNote] = useState<CreditNote | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<CreditNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const custName = (id: string) => customerNames[id] || id || "—";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<any[]>("/account/credit-notes/all", { params: { page: 1, limit: 1000 } });
      const mapped = Array.isArray(data) ? data.map(mapApi) : [];
      setNotes(mapped);
      // capture any populated customer names
      const names: Record<string, string> = {};
      (Array.isArray(data) ? data : []).forEach((n) => {
        const nm = refName(n.customer_id);
        if (nm) names[refId(n.customer_id)] = nm;
      });
      setCustomerNames(names);
    } catch (err) {
      const m = errMessage(err, "Couldn't load credit notes.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadCustomers = useCallback(async () => {
    try {
      const data = await api.get<any[]>("/customer/all", { params: { page: 1, limit: 1000 } });
      if (Array.isArray(data)) {
        const m: Record<string, string> = {};
        data.forEach((c) => (m[c._id] = c.name ?? ""));
        setCustomerNames((prev) => ({ ...m, ...prev }));
      }
    } catch {
      /* degrade */
    }
  }, []);

  useEffect(() => { load(); loadCustomers(); }, [load, loadCustomers]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((n) => n.invoiceNumber.toLowerCase().includes(q) || custName(n.customerId).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, searchQuery, customerNames]);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const canApprove = (s: string) => s.toLowerCase() === "draft";
  const canDelete = (s: string) => s.toLowerCase() === "draft";

  const openView = async (n: CreditNote) => {
    setViewNote(n);
    setShowView(true);
    setViewLoading(true);
    try {
      const data = await api.get<any>(`/account/credit-notes/single/${n.id}`);
      if (data) setViewNote(mapApi(data));
    } catch (err) {
      showToast(errMessage(err, "Couldn't load credit note."), "error");
    } finally {
      setViewLoading(false);
    }
  };

  const handleApprove = async (n: CreditNote) => {
    setProcessingId(n.id);
    try {
      await api.post(`/account/credit-notes/approve/${n.id}`);
      showToast("Credit note approved!", "success");
      await load();
    } catch (err) {
      showToast(errMessage(err, "Couldn't approve credit note."), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/account/credit-notes/delete/${toDelete.id}`);
      showToast("Credit note deleted!", "success");
      setShowDelete(false);
      setToDelete(null);
      await load();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete credit note."), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span><span className="text-gray-900 font-medium">Credit Notes</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <h2 className="text-lg font-semibold text-gray-900">Credit Notes</h2>
        <p className="text-sm text-gray-500 mt-0.5">Auto-created from sales returns · approve to apply</p>
      </div>

      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by number or customer..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <button onClick={() => load()} className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Refresh</button>
          </div>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
            <option value={5}>5 per page</option><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Balance</th>
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No credit notes found.</td></tr>
              ) : (
                paginated.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => openView(n)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">{n.invoiceNumber || "—"}</button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{custName(n.customerId)}</td>
                    <td className="px-4 py-3 text-gray-600">{n.date}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{money(n.total)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{money(n.balanceAmount)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(n.status)}`}>{n.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(n)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="View"><Eye className="w-4 h-4" /></button>
                        {canApprove(n.status) ? (
                          <button onClick={() => handleApprove(n)} disabled={processingId === n.id} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg disabled:opacity-50" title="Approve">{processingId === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                          ) : <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */}
                        <button onClick={() => { setToDelete(n); setShowDelete(true); }} disabled={!canDelete(n.status)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400" title={canDelete(n.status) ? "Delete" : "Only draft can be deleted"}><Trash2 className="w-4 h-4" /></button>
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

      {showView && viewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{viewNote.invoiceNumber || "Credit Note"}</h2>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(viewNote.status)}`}>{viewNote.status}</span>
              </div>
              <button onClick={() => setShowView(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6">
              {viewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                    <div><p className="text-xs text-gray-500">Customer</p><p className="text-gray-900">{custName(viewNote.customerId)}</p></div>
                    <div><p className="text-xs text-gray-500">Date</p><p className="text-gray-900">{viewNote.date || "—"}</p></div>
                    <div><p className="text-xs text-gray-500">Return Reason</p><p className="text-gray-900">{viewNote.returnReason || "—"}</p></div>
                    <div><p className="text-xs text-gray-500">Notes</p><p className="text-gray-900">{viewNote.notes || "—"}</p></div>
                  </div>
                  {viewNote.products.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg mb-6">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-300"><tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Product</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Rate</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Amount</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {viewNote.products.map((p, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-gray-900">{p.productId}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{p.quantity}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{money(p.rate)}</td>
                              <td className="px-3 py-2 text-right text-gray-900">{money(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <div className="w-full sm:w-64 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-semibold text-gray-900">{money(viewNote.total)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Applied</span><span className="text-gray-900">{money(viewNote.appliedAmount)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Balance</span><span className="text-gray-900">{money(viewNote.balanceAmount)}</span></div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              {!viewLoading && canApprove(viewNote.status) && (
                <button onClick={() => { setShowView(false); handleApprove(viewNote); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm inline-flex items-center gap-2"><Check className="w-4 h-4" />Approve</button>
              )}
              <button onClick={() => setShowView(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Credit Note</h3>
              <p className="text-gray-500 mb-6">Delete <span className="font-semibold">{toDelete.invoiceNumber || ""}</span>? This action cannot be undone.</p>
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
