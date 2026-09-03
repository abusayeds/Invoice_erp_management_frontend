/**
 * File: src/pages/accounting/customer/Customer.tsx
 * Customers (user model) — single page: list + create/edit modal + view & delete
 * modals (matching the rest of the site — no separate routes).
 *
 * Endpoints:
 *   GET    /customer/all?page=&limit=&searchTerm=
 *   GET    /customer/single/:id
 *   POST   /customer/create
 *   POST   /customer/update        (body includes _id)
 *   DELETE /customer/delete/:id
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/ApiError";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
}
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  taxNumber: string;
  paymentTerms: string;
  billingAddress: Address;
  shippingAddress: Address;
  sameAsBilling: boolean;
  notes: string;
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;

const emptyAddress = (): Address => ({
  name: "", address_line_1: "", address_line_2: "", city: "", state: "", country: "", zip_code: "",
});
const mapAddress = (a: Partial<Address> | undefined | null): Address => ({
  name: a?.name ?? "", address_line_1: a?.address_line_1 ?? "", address_line_2: a?.address_line_2 ?? "",
  city: a?.city ?? "", state: a?.state ?? "", country: a?.country ?? "", zip_code: a?.zip_code ?? "",
});

const mapApiCustomer = (c: any): Customer => {
  const bp = c.businessProfile ?? {};
  return {
    id: c._id,
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    companyName: bp.companyName ?? bp.company_name ?? c.company_name ?? "",
    taxNumber: bp.tax_number ?? c.tax_number ?? "",
    paymentTerms: bp.payment_terms ?? c.payment_terms ?? "",
    billingAddress: mapAddress(bp.billing_address ?? c.billing_address),
    shippingAddress: mapAddress(bp.shipping_address ?? c.shipping_address),
    sameAsBilling: bp.same_as_billing ?? c.same_as_billing ?? false,
    notes: bp.notes ?? c.notes ?? "",
  };
};

interface FormState {
  company_name: string; name: string; email: string; phone: string; password: string;
  tax_number: string; payment_terms: string; billing_address: Address;
  same_as_billing: boolean; shipping_address: Address; notes: string;
}
const emptyForm = (): FormState => ({
  company_name: "", name: "", email: "", phone: "", password: "", tax_number: "", payment_terms: "",
  billing_address: emptyAddress(), same_as_billing: false, shipping_address: emptyAddress(), notes: "",
});
const formFromCustomer = (c: Customer): FormState => ({
  company_name: c.companyName, name: c.name, email: c.email, phone: c.phone, password: "",
  tax_number: c.taxNumber, payment_terms: c.paymentTerms, billing_address: { ...c.billingAddress },
  same_as_billing: c.sameAsBilling, shipping_address: { ...c.shippingAddress }, notes: c.notes,
});
const buildPayload = (f: FormState) => {
  const payload: any = {
    company_name: f.company_name, name: f.name.trim(), email: f.email.trim(), phone: f.phone,
    tax_number: f.tax_number, payment_terms: f.payment_terms, billing_address: f.billing_address,
    same_as_billing: f.same_as_billing,
    shipping_address: f.same_as_billing ? f.billing_address : f.shipping_address, notes: f.notes,
  };
  if (f.password.trim()) payload.password = f.password;
  return payload;
};

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white";

// ─── Shared bits ────────────────────────────────────────────────────────────────

const AddressFields: React.FC<{ title: string; value: Address; onChange: (a: Address) => void }> = ({ title, value, onChange }) => {
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={inputCls} placeholder="Name" value={value.name} onChange={(e) => set("name", e.target.value)} />
        <input className={inputCls} placeholder="City" value={value.city} onChange={(e) => set("city", e.target.value)} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="Address line 1" value={value.address_line_1} onChange={(e) => set("address_line_1", e.target.value)} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="Address line 2" value={value.address_line_2} onChange={(e) => set("address_line_2", e.target.value)} />
        <input className={inputCls} placeholder="State" value={value.state} onChange={(e) => set("state", e.target.value)} />
        <input className={inputCls} placeholder="Country" value={value.country} onChange={(e) => set("country", e.target.value)} />
        <input className={inputCls} placeholder="Zip code" value={value.zip_code} onChange={(e) => set("zip_code", e.target.value)} />
      </div>
    </div>
  );
};

const CustomerFormFields: React.FC<{ form: FormState; setForm: (f: FormState) => void; showPassword: boolean }> = ({ form, setForm, showPassword }) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input className={inputCls} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      {showPassword && (<div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label><input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>)}
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Tax Number</label><input className={inputCls} value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label><input className={inputCls} value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="e.g., Net 30" /></div>
    </div>
    <AddressFields title="Billing Address" value={form.billing_address} onChange={(a) => setForm({ ...form, billing_address: a })} />
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={form.same_as_billing} onChange={(e) => setForm({ ...form, same_as_billing: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
      <span className="text-sm text-gray-700">Shipping address same as billing</span>
    </label>
    {!form.same_as_billing && (<AddressFields title="Shipping Address" value={form.shipping_address} onChange={(a) => setForm({ ...form, shipping_address: a })} />)}
    <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
  </div>
);

const AddressView: React.FC<{ title: string; a: Address }> = ({ title, a }) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{title}</h4>
    <div className="text-sm text-gray-700 space-y-0.5">
      {a.name && <div>{a.name}</div>}
      {a.address_line_1 && <div>{a.address_line_1}</div>}
      {a.address_line_2 && <div>{a.address_line_2}</div>}
      <div>{[a.city, a.state, a.zip_code].filter(Boolean).join(", ")}</div>
      {a.country && <div>{a.country}</div>}
      {!a.name && !a.address_line_1 && !a.city && <div className="text-gray-400">—</div>}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════

export const AccountsCustomers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // View modal
  const [showView, setShowView] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<any[]>("/customer/all", { params: { page: 1, limit: 1000 } });
      setCustomers(Array.isArray(data) ? data.map(mapApiCustomer) : []);
    } catch (err) {
      const m = errMessage(err, "Couldn't load customers.");
      setLoadError(m);
      showToast(m, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q));
  }, [customers, searchQuery]);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setShowModal(true); };

  const openEdit = async (c: Customer) => {
    setEditingId(c.id);
    setForm(formFromCustomer(c));
    setShowModal(true);
    // refresh from single for full address data
    setFormLoading(true);
    try {
      const data = await api.get<any>(`/customer/single/${c.id}`);
      if (data) setForm(formFromCustomer(mapApiCustomer(data)));
    } catch {
      /* keep row data */
    } finally {
      setFormLoading(false);
    }
  };

  const openView = async (c: Customer) => {
    setViewCustomer(c);
    setShowView(true);
    setViewLoading(true);
    try {
      const data = await api.get<any>(`/customer/single/${c.id}`);
      if (data) setViewCustomer(mapApiCustomer(data));
    } catch (err) {
      showToast(errMessage(err, "Couldn't load customer."), "error");
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast("Please enter a contact name", "info");
    if (!form.email.trim()) return showToast("Please enter an email", "info");
    if (!editingId && !form.password.trim()) return showToast("Please enter a password", "info");
    setSaving(true);
    try {
      if (editingId) await api.post("/customer/update", { _id: editingId, ...buildPayload(form) });
      else await api.post("/customer/create", buildPayload(form));
      showToast(`Customer ${editingId ? "updated" : "created"}!`, "success");
      setShowModal(false);
      await load();
    } catch (err) {
      showToast(errMessage(err, "Couldn't save customer."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/customer/delete/${toDelete.id}`);
      showToast("Customer deleted!", "success");
      setShowDelete(false);
      setToDelete(null);
      await load();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete customer."), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span><span className="text-gray-900 font-medium">Customers</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
            <p className="text-sm text-gray-500 mt-0.5">Your customer directory</p>
          </div>
          <button onClick={openCreate} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700" title="Create Customer"><Plus className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name, email or company..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" />
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
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16"><div className="flex items-center justify-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div></td></tr>
              ) : loadError ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-red-600">{loadError}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No customers found.</td></tr>
              ) : (
                paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => openView(c)} className="flex items-center gap-2 text-left">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">{(c.name || "?").charAt(0).toUpperCase()}</div>
                        <span className="font-medium text-blue-600 hover:underline">{c.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.companyName || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { setToDelete(c); setShowDelete(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Customer" : "Create Customer"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6">
              {formLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>
              ) : (
                <CustomerFormFields form={form} setForm={setForm} showPassword={!editingId} />
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm inline-flex items-center gap-2 disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{editingId ? "Save Changes" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {showView && viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
              <button onClick={() => setShowView(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6">
              {viewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-semibold">{(viewCustomer.name || "?").charAt(0).toUpperCase()}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{viewCustomer.name}</h3>
                      {viewCustomer.companyName && <p className="text-sm text-gray-500 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{viewCustomer.companyName}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-900">{viewCustomer.email || "—"}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-900">{viewCustomer.phone || "—"}</span></div>
                    <div className="text-gray-700">Tax: {viewCustomer.taxNumber || "—"}</div>
                    <div className="text-gray-700">Payment terms: {viewCustomer.paymentTerms || "—"}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AddressView title="Billing Address" a={viewCustomer.billingAddress} />
                    <AddressView title="Shipping Address" a={viewCustomer.sameAsBilling ? viewCustomer.billingAddress : viewCustomer.shippingAddress} />
                  </div>
                  {viewCustomer.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-900">{viewCustomer.notes}</p></div>}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowView(false); openEdit(viewCustomer); }} disabled={viewLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Edit Customer</button>
              <button onClick={() => setShowView(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDelete && toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Customer</h3>
              <p className="text-gray-500 mb-6">Delete <span className="font-semibold">{toDelete.name}</span>? This action cannot be undone.</p>
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
