/**
 * Record Payment Received — full panel with searchable Customer + Invoice.
 * Prefills when opened from an invoice.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Upload } from "lucide-react";
import { fetchCustomers, type TCustomerRow } from "@/services/customersApi";
import { fetchInvoices, type InvoiceListRow } from "@/services/invoicesApi";
import { createPaymentReceived } from "@/services/paymentReceivedApi";
import { fetchPaymentMethods } from "@/services/paymentMethodsApi";
import { showToast } from "@/utils/toast";

export type PaymentReceivedPrefill = {
  customerId?: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  dueAmount?: number;
  currency?: string;
};

type Props = {
  onClose: () => void;
  onSaved: (id: string) => void;
  prefill?: PaymentReceivedPrefill;
};

const fieldClass =
  "w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";

const todayInput = () => new Date().toISOString().slice(0, 10);

const money = (n: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

export const RecordPaymentReceivedForm: React.FC<Props> = ({ onClose, onSaved, prefill }) => {
  const [customerId, setCustomerId] = useState(prefill?.customerId ?? "");
  const [customerQuery, setCustomerQuery] = useState(prefill?.customerName ?? "");
  const [customerOpen, setCustomerOpen] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const [invoiceId, setInvoiceId] = useState(prefill?.invoiceId ?? "");
  const [invoiceQuery, setInvoiceQuery] = useState(prefill?.invoiceNumber ?? "");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [amount, setAmount] = useState(
    prefill?.dueAmount != null && prefill.dueAmount > 0 ? prefill.dueAmount.toFixed(2) : "",
  );
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setCustomerOpen(false);
      if (invoiceRef.current && !invoiceRef.current.contains(e.target as Node)) setInvoiceOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const { data: methodsData } = useQuery({
    queryKey: ["payment-methods-options"],
    queryFn: fetchPaymentMethods,
    staleTime: 60_000,
  });
  const methods = useMemo(() => {
    const names = (methodsData ?? []).map((m) => m.name).filter(Boolean);
    return names.length ? names : ["Cash", "Master Card", "Stripe", "PayPal", "Bank Transfer"];
  }, [methodsData]);

  useEffect(() => {
    if (!methods.includes(method)) setMethod(methods[0] || "Cash");
  }, [methods, method]);

  const { data: customersData } = useQuery({
    queryKey: ["payment-received-customer-search", customerQuery],
    queryFn: () => fetchCustomers({ page: 1, limit: 30, searchTerm: customerQuery.trim() || undefined }),
    staleTime: 10_000,
  });
  const customerOptions: TCustomerRow[] = customersData?.rows ?? [];

  const { data: invoicesData } = useQuery({
    queryKey: ["payment-received-invoice-search", customerId, invoiceQuery],
    queryFn: () =>
      fetchInvoices({
        page: 1,
        limit: 50,
        customer_id: customerId || undefined,
        searchTerm: invoiceQuery.trim() || undefined,
        sort: "-createdAt",
      }),
    staleTime: 10_000,
  });

  const unpaidInvoices = useMemo(() => {
    const rows = invoicesData?.rows ?? [];
    return rows.filter((inv) => inv.dueAmount > 0.001 || inv._id === invoiceId);
  }, [invoicesData?.rows, invoiceId]);

  const selectedInvoice: InvoiceListRow | undefined = unpaidInvoices.find((i) => i._id === invoiceId);

  useEffect(() => {
    if (selectedInvoice && !prefill?.dueAmount) {
      setAmount(selectedInvoice.dueAmount > 0 ? selectedInvoice.dueAmount.toFixed(2) : "");
    }
  }, [invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickCustomer = (c: TCustomerRow) => {
    setCustomerId(c._id);
    setCustomerQuery(c.name);
    setCustomerOpen(false);
    if (selectedInvoice && selectedInvoice.customerId !== c._id) {
      setInvoiceId("");
      setInvoiceQuery("");
      setAmount("");
    }
  };

  const pickInvoice = (inv: InvoiceListRow) => {
    setInvoiceId(inv._id);
    setInvoiceQuery(inv.number.startsWith("#") ? inv.number : `#${inv.number}`);
    setInvoiceOpen(false);
    setAmount(inv.dueAmount > 0 ? inv.dueAmount.toFixed(2) : "");
    if (inv.customerId && inv.customerId !== customerId) {
      setCustomerId(inv.customerId);
      setCustomerQuery(inv.customerName);
    }
  };

  const save = async () => {
    if (!customerId) {
      showToast("Select a customer", "warning");
      return;
    }
    if (!invoiceId || !selectedInvoice) {
      showToast("Select an invoice", "warning");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast("Enter a valid amount", "warning");
      return;
    }
    setSaving(true);
    try {
      const created = await createPaymentReceived({
        customer_id: customerId,
        customer_name: customerQuery,
        invoice_id: invoiceId,
        invoice_number: selectedInvoice.number.replace(/^#/, ""),
        currency: selectedInvoice.currency || prefill?.currency || "USD",
        date,
        payment_method: [method],
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        product: [],
        service: [],
        sub_total: amt,
        total: amt,
        status: "Paid",
      });
      showToast("Payment recorded", "success");
      onSaved(String(created._id));
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Couldn't save payment", "error");
    } finally {
      setSaving(false);
    }
  };

  const due = selectedInvoice?.dueAmount ?? prefill?.dueAmount ?? 0;
  const currency = selectedInvoice?.currency || prefill?.currency || "USD";

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar m-2 bg-white border border-gray-300 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300 sticky top-0 bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-900">Add Payment</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !customerId || !invoiceId}
            className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !customerId || !invoiceId}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save & Send"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500">Customer *</label>
            <div className="relative" ref={customerRef}>
              <input
                value={customerQuery}
                onFocus={() => setCustomerOpen(true)}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setCustomerOpen(true);
                  if (!e.target.value.trim()) setCustomerId("");
                }}
                placeholder="Search customer"
                className={fieldClass}
              />
              {customerOpen && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {customerOptions.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {c.name}
                    </button>
                  ))}
                  {customerOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No customers found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Invoice *</label>
            <div className="relative" ref={invoiceRef}>
              <input
                value={invoiceQuery}
                onFocus={() => setInvoiceOpen(true)}
                onChange={(e) => {
                  setInvoiceQuery(e.target.value);
                  setInvoiceOpen(true);
                  if (!e.target.value.trim()) setInvoiceId("");
                }}
                placeholder={customerId ? "Search invoice" : "Select customer first (or search invoice)"}
                className={fieldClass}
              />
              {invoiceOpen && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {unpaidInvoices.map((inv) => (
                    <button
                      key={inv._id}
                      type="button"
                      onClick={() => pickInvoice(inv)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {inv.number} · {inv.customerName} · {money(inv.dueAmount, inv.currency)} due
                    </button>
                  ))}
                  {unpaidInvoices.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No unpaid invoices found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Payment date</label>
              <div className="relative">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${fieldClass} pr-10`} />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Payment Type</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={fieldClass}>
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Amount</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setAmount(due > 0 ? due.toFixed(2) : "0.00")}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
              >
                Full Payment
              </button>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm text-right bg-white text-gray-900"
              />
            </div>
          </div>

          {selectedInvoice && (
            <div className="text-sm text-gray-600 border border-gray-200 rounded-md p-3">
              Outstanding on {selectedInvoice.number}:{" "}
              <span className="font-semibold text-gray-900">{money(selectedInvoice.dueAmount, currency)}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full h-20 border border-gray-300 rounded-md p-3 text-sm outline-none resize-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500">Internal Notes</label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal Notes"
              className="mt-1 w-full h-20 border border-gray-300 rounded-md p-3 text-sm outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Attachment</label>
            <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
              <button type="button" className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </span>
                <span className="text-xs text-gray-600">Upload from Computer</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-xs text-gray-600">Upload from Document</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
