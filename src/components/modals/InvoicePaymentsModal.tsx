import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Plus, Upload, X } from "lucide-react";
import { showToast } from "@/utils/toast";
import type { BackendInvoiceDoc } from "@/services/invoicesApi";
import { createPaymentReceived, fetchPaymentReceived, type BackendPaymentReceivedDoc } from "@/services/paymentReceivedApi";
import type { PaymentMethodOption } from "@/services/paymentMethodsApi";

interface InvoicePaymentsModalProps {
  open: boolean;
  invoice: BackendInvoiceDoc | null;
  paymentMethods: PaymentMethodOption[];
  onClose: () => void;
  onSaved?: () => void;
}

const text = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const numberValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;

const dateLabel = (value?: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const todayInput = () => new Date().toISOString().slice(0, 10);

const currencyLabel = (amount: number, currency?: string) => {
  const cur = text(currency) || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toFixed(2)}`;
  }
};

const customerName = (invoice: BackendInvoiceDoc | null) => {
  if (!invoice) return "No Customer";
  const customer = invoice.customer_id;
  if (customer && typeof customer === "object") {
    return customer.businessProfile?.companyName?.trim() || customer.name?.trim() || text(invoice.customer_name) || "No Customer";
  }
  return text(invoice.customer_name) || "No Customer";
};

const customerSubtitle = (invoice: BackendInvoiceDoc | null) => {
  const customer = invoice?.customer_id;
  if (customer && typeof customer === "object") return text(customer.name);
  return "";
};

const firstPaymentMethod = (payment: BackendPaymentReceivedDoc) =>
  Array.isArray(payment.payment_method) && payment.payment_method.length > 0
    ? text(payment.payment_method[0]) || "Cash"
    : "Cash";

export const InvoicePaymentsModal: React.FC<InvoicePaymentsModalProps> = ({
  open,
  invoice,
  paymentMethods,
  onClose,
  onSaved,
}) => {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [showForm, setShowForm] = useState(true);
  const [paymentDate, setPaymentDate] = useState(todayInput());
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const invoiceId = invoice?._id ?? "";
  const dueAmount = numberValue(invoice?.balance_amount ?? invoice?.total);
  const preferredMethods = useMemo(() => {
    const configured = paymentMethods.map((item) => item.name).filter(Boolean);
    const invoiceSpecific = Array.isArray(invoice?.payment_method) ? invoice.payment_method.filter(Boolean) : [];
    return [...new Set([...invoiceSpecific, ...configured])];
  }, [invoice?.payment_method, paymentMethods]);

  useEffect(() => {
    if (!open) return;
    setShowForm(true);
    setSelectedPaymentId("");
    setPaymentDate(todayInput());
    setMethod(preferredMethods[0] || "Cash");
    setAmount(dueAmount > 0 ? dueAmount.toFixed(2) : "0.00");
    setNotes("");
    setInternalNotes("");
  }, [open, preferredMethods, dueAmount, invoiceId]);

  const { data: paymentsData, isFetching } = useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: () => fetchPaymentReceived({ invoice_id: invoiceId, limit: 100, sort: "-date" }),
    enabled: open && !!invoiceId,
    placeholderData: (prev) => prev,
  });

  const payments = paymentsData?.rows ?? [];
  const selectedPayment =
    payments.find((payment) => payment._id === selectedPaymentId) ?? payments[0] ?? null;

  const createPaymentMut = useMutation({
    mutationFn: async () =>
      createPaymentReceived({
        customer_id:
          invoice?.customer_id && typeof invoice.customer_id === "object"
            ? text(invoice.customer_id._id)
            : typeof invoice?.customer_id === "string"
              ? invoice.customer_id
              : undefined,
        customer_name: text(invoice?.customer_name) || customerName(invoice),
        invoice_id: invoiceId || undefined,
        invoice_number: text(invoice?.invoice_number),
        currency: text(invoice?.currency) || "USD",
        date: paymentDate,
        payment_method: [method || "Cash"],
        notes,
        internal_notes: internalNotes,
        product: [],
        service: [],
        sub_total: Math.max(0, Number(amount) || 0),
        total: Math.max(0, Number(amount) || 0),
        status: "Paid",
      }),
    onSuccess: () => {
      showToast("Payment saved", "success");
      onSaved?.();
      onClose();
    },
    onError: () => {
      showToast("Payment save failed", "error");
    },
  });

  if (!open || !invoice) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 p-4" onMouseDown={onClose}>
      <div className="h-full w-full flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
        <div className="w-full max-w-6xl h-[86vh] overflow-hidden rounded-2xl border border-gray-700 bg-[#1f1f1f] text-white shadow-2xl">
          <div className="flex h-full">
            <aside className="flex w-full max-w-sm flex-col border-r border-gray-700 bg-[#262626]">
              <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                <h2 className="text-lg font-semibold">Payment Received</h2>
                <button onClick={onClose} className="rounded-md p-1.5 text-gray-300 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-gray-700 px-4 py-3">
                <button
                  onClick={() => {
                    setShowForm(true);
                    setSelectedPaymentId("");
                    setAmount(dueAmount.toFixed(2));
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-500 px-3 py-1 text-xs text-gray-200 hover:border-gray-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record Payment
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {payments.map((payment) => {
                  const active = !showForm && selectedPayment?._id === payment._id;
                  return (
                    <button
                      key={payment._id}
                      onClick={() => {
                        setSelectedPaymentId(payment._id);
                        setShowForm(false);
                      }}
                      className={`w-full border-b border-gray-700 px-4 py-3 text-left transition-colors ${active ? "bg-[#333333]" : "hover:bg-[#2e2e2e]"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{customerName(invoice)}</div>
                          <div className="mt-0.5 text-sm text-gray-300">#{text(payment.invoice_number || invoice.invoice_number)}</div>
                          <div className="mt-0.5 truncate text-xs text-gray-400">{text(payment.notes) || "No Notes"}</div>
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="text-xs text-gray-400">{dateLabel(payment.date ?? payment.createdAt)}</div>
                          <div className="mt-0.5 text-sm font-semibold">
                            {currencyLabel(numberValue(payment.total ?? payment.sub_total), text(payment.currency) || text(invoice.currency))}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-gray-400">{firstPaymentMethod(payment)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!isFetching && payments.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-gray-400">No payments recorded yet.</div>
                )}
              </div>

              <div className="border-t border-gray-700 bg-[#303030] px-4 py-3 text-center">
                <div className="text-lg font-semibold">
                  {currencyLabel(
                    payments.reduce((sum, item) => sum + numberValue(item.total ?? item.sub_total), 0),
                    text(invoice.currency),
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {payments.length} {payments.length === 1 ? "Payment" : "Payments"}
                </div>
              </div>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col bg-[#1f1f1f]">
              <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-semibold">{customerName(invoice)}</h3>
                  {customerSubtitle(invoice) && <p className="truncate text-sm text-gray-400">{customerSubtitle(invoice)}</p>}
                </div>
                {!showForm && selectedPayment && (
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setSelectedPaymentId("");
                    }}
                    className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-100 hover:bg-white/10"
                  >
                    New Payment
                  </button>
                )}
              </div>

              {showForm ? (
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-200">Customer</label>
                      <input value={customerName(invoice)} readOnly className="w-full rounded-md border border-gray-600 bg-[#262626] px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-200">Invoice #</label>
                      <input value={text(invoice.invoice_number)} readOnly className="w-full rounded-md border border-gray-600 bg-[#262626] px-3 py-2 text-sm text-white" />
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-200">Payment Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full rounded-md border border-gray-600 bg-[#262626] px-3 py-2 pr-10 text-sm text-white"
                        />
                        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-200">Type</label>
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-full rounded-md border border-gray-600 bg-[#262626] px-3 py-2 text-sm text-white"
                      >
                        {preferredMethods.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                        {preferredMethods.length === 0 && <option value="Cash">Cash</option>}
                      </select>
                    </div>
                  </div>

                  <div className="mb-5 rounded-md border border-gray-700 bg-[#262626] p-4">
                    <div className="mb-3 text-sm text-gray-400">
                      {currencyLabel(dueAmount, text(invoice.currency))} Due
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-200">Amount</label>
                        <input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full rounded-md border border-gray-600 bg-[#1f1f1f] px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-200">Full payment</label>
                        <button
                          onClick={() => setAmount(dueAmount.toFixed(2))}
                          className="w-full rounded-md border border-gray-600 bg-[#1f1f1f] px-3 py-2 text-left text-sm text-white hover:bg-[#303030]"
                        >
                          {currencyLabel(dueAmount, text(invoice.currency))}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-200">Notes</label>
                      <textarea
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-md border border-gray-600 bg-[#262626] px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-200">Internal Notes</label>
                      <textarea
                        rows={4}
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        className="w-full rounded-md border border-gray-600 bg-[#262626] px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="mb-2 text-sm font-medium text-gray-200">Attachment</div>
                    <div className="grid grid-cols-1 divide-y divide-gray-700 overflow-hidden rounded-md border border-gray-700 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                      <button className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-gray-300 hover:bg-white/5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                          <Upload className="h-4 w-4" />
                        </span>
                        Upload from Computer
                      </button>
                      <button className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-gray-300 hover:bg-white/5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                          <FileText className="h-4 w-4" />
                        </span>
                        Upload from Document
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button onClick={onClose} className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-100 hover:bg-white/10">
                      Cancel
                    </button>
                    <button
                      onClick={() => createPaymentMut.mutate()}
                      disabled={createPaymentMut.isPending || !amount}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {createPaymentMut.isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : selectedPayment ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-0 border-b border-gray-700 md:grid-cols-3">
                    <div className="px-5 py-4">
                      <div className="text-xs text-gray-400">#{text(selectedPayment.invoice_number || invoice.invoice_number)}</div>
                      <div className="mt-1 text-2xl font-semibold">
                        {currencyLabel(numberValue(selectedPayment.total ?? selectedPayment.sub_total), text(selectedPayment.currency) || text(invoice.currency))}
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="text-xs text-gray-400">Payment date</div>
                      <div className="mt-1 text-base font-semibold">{dateLabel(selectedPayment.date ?? selectedPayment.createdAt)}</div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="text-xs text-gray-400">Payment Type</div>
                      <div className="mt-1 text-base font-semibold">{firstPaymentMethod(selectedPayment)}</div>
                    </div>
                  </div>

                  <div className="border-b border-gray-700">
                    <div className="border-b border-gray-700 px-5 py-3 text-sm font-semibold">Invoices</div>
                    <div className="flex items-center justify-between px-5 py-4 text-sm">
                      <span>#{text(invoice.invoice_number)}</span>
                      <span className="font-semibold">
                        {currencyLabel(numberValue(selectedPayment.total ?? selectedPayment.sub_total), text(selectedPayment.currency) || text(invoice.currency))}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 border-b border-gray-700 md:grid-cols-2">
                    <div className="border-b border-gray-700 px-5 py-4 md:border-b-0 md:border-r md:border-gray-700">
                      <div className="mb-2 text-sm font-semibold">Notes</div>
                      <div className="text-sm text-gray-300">{text(selectedPayment.notes) || "No Notes"}</div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="mb-2 text-sm font-semibold">Internal Notes</div>
                      <div className="text-sm text-gray-300">{text(selectedPayment.internal_notes) || "No Internal Notes"}</div>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="mb-2 text-sm font-semibold">Attachment</div>
                    <div className="grid grid-cols-1 divide-y divide-gray-700 overflow-hidden rounded-md border border-gray-700 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                      <button className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-gray-300 hover:bg-white/5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                          <Upload className="h-4 w-4" />
                        </span>
                        Upload from Computer
                      </button>
                      <button className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-gray-300 hover:bg-white/5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                          <FileText className="h-4 w-4" />
                        </span>
                        Upload from Document
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Select a payment from the left side.</div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePaymentsModal;
