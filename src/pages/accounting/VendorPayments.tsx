/**
 * File: src/pages/accounting/VendorPayments.tsx
 * Vendor Payments — list, create (with bill allocations), mark-cleared, delete.
 *
 * Endpoints (under /account):
 *   GET    vendor-payments/all?page=&limit=
 *   GET    vendor-payments/vendors/:id/outstanding
 *   POST   vendor-payments/create
 *   PATCH  vendor-payments/update-status/:id   { status }
 *   DELETE vendor-payments/delete/:id
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { api } from "../../lib/api/client";
import { ApiError } from "../../lib/api/ApiError";
import {
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface Payment {
  id: string;
  date: string;
  vendorId: string;
  vendorName: string;
  bankAccountId: string;
  referenceNumber: string;
  amount: number;
  status: string;
  notes: string;
}
interface Allocation {
  invoiceId: string;
  invoiceNumber: string;
  outstanding: number;
  allocated: number;
}
interface Named {
  _id: string;
  name?: string;
  account_name?: string;
  bank_name?: string;
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const refId = (v: any): string => (typeof v === "object" && v ? v._id : (v ?? ""));
const refName = (v: any): string => (typeof v === "object" && v ? (v.name ?? "") : "");
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const money = (n: number) =>
  `$${(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const mapApi = (p: any): Payment => ({
  id: p._id,
  date: toDateInput(p.payment_date),
  vendorId: refId(p.vendor_id),
  vendorName: refName(p.vendor_id),
  bankAccountId: refId(p.bank_account_id),
  referenceNumber: p.reference_number ?? "",
  amount: p.payment_amount ?? 0,
  status: (p.status ?? "pending").toLowerCase(),
  notes: p.notes ?? "",
});

const statusColor = (s: string) =>
  s === "cleared" ? "bg-green-100 text-green-700" : s === "bounced" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";

export const VendorPayments: React.FC = () => {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Named[]>([]);
  const [banks, setBanks] = useState<Named[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    vendor_id: "",
    bank_account_id: "",
    reference_number: "",
    payment_amount: 0,
    notes: "",
  });
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const vName = (id: string, fallback: string) =>
    fallback || vendors.find((c) => c._id === id)?.name || "—";
  const bankName = (id: string) => {
    const b = banks.find((x) => x._id === id);
    return b ? b.account_name || b.bank_name || "—" : "—";
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<any[]>("/account/vendor-payments/all", { params: { page: 1, limit: 1000 } });
      setPayments(Array.isArray(data) ? data.map(mapApi) : []);
    } catch (err) {
      const m = errMessage(err, "Couldn't load vendor payments.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadOptions = useCallback(async () => {
    const [v, b] = await Promise.allSettled([
      api.get<Named[]>("/vendor/all", { params: { page: 1, limit: 1000 } }),
      api.get<Named[]>("/account/bank-accounts/all", { params: { page: 1, limit: 1000 } }),
    ]);
    if (v.status === "fulfilled" && Array.isArray(v.value)) setVendors(v.value);
    if (b.status === "fulfilled" && Array.isArray(b.value)) setBanks(b.value);
  }, []);

  useEffect(() => { load(); loadOptions(); }, [load, loadOptions]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter((p) => p.referenceNumber.toLowerCase().includes(q) || vName(p.vendorId, p.vendorName).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, searchQuery, vendors]);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openCreate = () => {
    setForm({ payment_date: new Date().toISOString().split("T")[0], vendor_id: "", bank_account_id: "", reference_number: "", payment_amount: 0, notes: "" });
    setAllocations([]);
    setShowModal(true);
  };

  const onVendorChange = async (vendorId: string) => {
    setForm((f) => ({ ...f, vendor_id: vendorId }));
    setAllocations([]);
    if (!vendorId) return;
    setLoadingOutstanding(true);
    try {
      const data = await api.get<any[]>(`/account/vendor-payments/vendors/${vendorId}/outstanding`);
      const list = (Array.isArray(data) ? data : []).map((o) => ({
        invoiceId: o._id ?? o.invoice_id ?? "",
        invoiceNumber: o.invoice_number ?? o.invoiceNumber ?? "",
        outstanding: o.balance_amount ?? o.outstanding ?? o.total ?? 0,
        allocated: 0,
      }));
      setAllocations(list);
    } catch (err) {
      showToast(errMessage(err, "Couldn't load outstanding bills."), "error");
    } finally {
      setLoadingOutstanding(false);
    }
  };

  const setAlloc = (invoiceId: string, val: number) =>
    setAllocations((prev) => prev.map((a) => (a.invoiceId === invoiceId ? { ...a, allocated: val } : a)));
  const allocatedTotal = allocations.reduce((s, a) => s + (a.allocated || 0), 0);

  const handleCreate = async () => {
    if (!form.vendor_id) return showToast("Select a vendor", "info");
    if (!form.payment_amount || form.payment_amount <= 0) return showToast("Enter a valid payment amount", "info");
    const used = allocations.filter((a) => a.allocated > 0);
    setSaving(true);
    try {
      await api.post("/account/vendor-payments/create", {
        payment_date: form.payment_date,
        vendor_id: form.vendor_id,
        bank_account_id: form.bank_account_id || undefined,
        reference_number: form.reference_number,
        payment_amount: form.payment_amount,
        notes: form.notes,
        allocations: used.map((a) => ({ invoice_id: a.invoiceId, allocated_amount: a.allocated })),
        debit_notes: [],
      });
      showToast("Vendor payment created!", "success");
      setShowModal(false);
      await load();
    } catch (err) {
      showToast(errMessage(err, "Couldn't create payment."), "error");
    } finally {
      setSaving(false);
    }
  };

  const markCleared = async (p: Payment) => {
    setProcessingId(p.id);
    try {
      await api.patch(`/account/vendor-payments/update-status/${p.id}`, { status: "cleared" });
      showToast("Payment marked cleared!", "success");
      await load();
    } catch (err) {
      showToast(errMessage(err, "Couldn't update status."), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/account/vendor-payments/delete/${toDelete.id}`);
      showToast("Payment deleted!", "success");
      setShowDelete(false);
      setToDelete(null);
      await load();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete payment."), "error");
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
          <span>›</span><span className="text-gray-900 font-medium">Vendor Payments</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Vendor Payments</h2>
            <p className="text-sm text-gray-500 mt-0.5">Bill payments and allocations</p>
          </div>
          <button onClick={openCreate} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700" title="Record Payment"><Plus className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by reference or vendor..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
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
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Vendor</th>
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No payments found.</td></tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.referenceNumber || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.date}</td>
                    <td className="px-4 py-3 text-gray-600">{vName(p.vendorId, p.vendorName)}</td>
                    <td className="px-4 py-3 text-gray-600">{bankName(p.bankAccountId)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{money(p.amount)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.status !== "cleared" ? (
                          <button onClick={() => markCleared(p)} disabled={processingId === p.id} className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg disabled:opacity-50" title="Mark cleared">{processingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}</button>
                        ) : (
                          <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */
                        )}
                        <button onClick={() => { setToDelete(p); setShowDelete(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">Record Vendor Payment</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="date" className={`${inputCls} pl-10`} value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label><input className={inputCls} value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="VP-001" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                  <select className={inputCls} value={form.vendor_id} onChange={(e) => onVendorChange(e.target.value)}>
                    <option value="">Select vendor</option>
                    {vendors.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <select className={inputCls} value={form.bank_account_id} onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}>
                    <option value="">Select bank account</option>
                    {banks.map((b) => (<option key={b._id} value={b._id}>{b.account_name || b.bank_name}</option>))}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label><input type="number" min={0} step="0.01" className={inputCls} value={form.payment_amount} onChange={(e) => setForm({ ...form, payment_amount: parseFloat(e.target.value) || 0 })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Outstanding Bills</h4>
                {loadingOutstanding ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading outstanding bills…</div>
                ) : !form.vendor_id ? (
                  <p className="text-sm text-gray-400 py-2">Select a vendor to view outstanding bills.</p>
                ) : allocations.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No outstanding bills for this vendor.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Bill</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Outstanding</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 w-32">Allocate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allocations.map((a) => (
                          <tr key={a.invoiceId}>
                            <td className="px-3 py-2 text-gray-900">{a.invoiceNumber || a.invoiceId}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{money(a.outstanding)}</td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" min={0} step="0.01" max={a.outstanding} value={a.allocated} onChange={(e) => setAlloc(a.invoiceId, parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-gray-50 text-right text-sm text-gray-700">Allocated: <span className="font-semibold">{money(allocatedTotal)}</span></div>
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm inline-flex items-center gap-2 disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Create</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Payment</h3>
              <p className="text-gray-500 mb-6">Delete payment <span className="font-semibold">{toDelete.referenceNumber || ""}</span> ({money(toDelete.amount)})? This action cannot be undone.</p>
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
