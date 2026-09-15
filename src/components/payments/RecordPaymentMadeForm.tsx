/**
 * Record Payment Made — full panel (same layout as Payment Received).
 * Vendor + Bill are searchable; prefills when opened from a bill.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Upload } from "lucide-react";
import { fetchVendors, type VendorListRow } from "@/services/vendorsApi";
import { fetchBills, updateBill, type BillListRow } from "@/services/billsApi";
import { recordVendorPayment } from "@/services/vendorPaymentsApi";
import { fetchPaymentMethods } from "@/services/paymentMethodsApi";
import { showToast } from "@/utils/toast";

export type PaymentMadePrefill = {
  vendorId?: string;
  vendorName?: string;
  billId?: string;
  billNumber?: string;
  dueAmount?: number;
};

type Props = {
  onClose: () => void;
  onSaved: (id: string) => void;
  prefill?: PaymentMadePrefill;
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

export const RecordPaymentMadeForm: React.FC<Props> = ({ onClose, onSaved, prefill }) => {
  const [vendorId, setVendorId] = useState(prefill?.vendorId ?? "");
  const [vendorQuery, setVendorQuery] = useState(prefill?.vendorName ?? "");
  const [vendorOpen, setVendorOpen] = useState(false);
  const vendorRef = useRef<HTMLDivElement>(null);

  const [billId, setBillId] = useState(prefill?.billId ?? "");
  const [billQuery, setBillQuery] = useState(prefill?.billNumber ?? "");
  const [billOpen, setBillOpen] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

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
      if (vendorRef.current && !vendorRef.current.contains(e.target as Node)) setVendorOpen(false);
      if (billRef.current && !billRef.current.contains(e.target as Node)) setBillOpen(false);
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
    return names.length ? names : ["Cash", "Bank Transfer", "Cheque", "PayPal", "Stripe"];
  }, [methodsData]);

  useEffect(() => {
    if (!methods.includes(method)) setMethod(methods[0] || "Cash");
  }, [methods, method]);

  const { data: vendorsData } = useQuery({
    queryKey: ["payment-made-vendor-search", vendorQuery],
    queryFn: () => fetchVendors({ page: 1, limit: 30, searchTerm: vendorQuery.trim() || undefined }),
    staleTime: 10_000,
  });
  const vendorOptions: VendorListRow[] = vendorsData?.rows ?? [];

  const { data: billsData } = useQuery({
    queryKey: ["payment-made-bill-search", vendorId, billQuery],
    queryFn: () =>
      fetchBills({
        page: 1,
        limit: 50,
        vendor_id: vendorId || undefined,
        searchTerm: billQuery.trim() || undefined,
        sort: "-createdAt",
      }),
    staleTime: 10_000,
  });

  const unpaidBills = useMemo(() => {
    const rows = billsData?.rows ?? [];
    return rows.filter((b) => b.dueAmount > 0.001 || b._id === billId);
  }, [billsData?.rows, billId]);

  const selectedBill: BillListRow | undefined = unpaidBills.find((b) => b._id === billId);

  useEffect(() => {
    if (selectedBill && !prefill?.dueAmount) {
      setAmount(selectedBill.dueAmount > 0 ? selectedBill.dueAmount.toFixed(2) : "");
    }
  }, [billId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickVendor = (v: VendorListRow) => {
    setVendorId(v._id);
    setVendorQuery(v.name);
    setVendorOpen(false);
    if (selectedBill && selectedBill.vendorId !== v._id) {
      setBillId("");
      setBillQuery("");
      setAmount("");
    }
  };

  const pickBill = (b: BillListRow) => {
    setBillId(b._id);
    setBillQuery(b.number.startsWith("#") ? b.number : `#${b.number}`);
    setBillOpen(false);
    setAmount(b.dueAmount > 0 ? b.dueAmount.toFixed(2) : "");
    if (b.vendorId && b.vendorId !== vendorId) {
      setVendorId(b.vendorId);
      setVendorQuery(b.vendorName);
    }
  };

  const save = async () => {
    if (!vendorId) {
      showToast("Select a vendor", "warning");
      return;
    }
    if (!billId || !selectedBill) {
      showToast("Select a bill", "warning");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast("Enter a valid amount", "warning");
      return;
    }
    setSaving(true);
    try {
      const created = await recordVendorPayment({
        vendor_id: vendorId,
        payment_amount: amt,
        payment_date: date,
        payment_method: [method],
        notes: notes || undefined,
        reference_number: selectedBill.number.replace(/^#/, ""),
      });

      const paid = selectedBill.paidAmount + amt;
      const due = Math.max(0, selectedBill.amount - paid);
      await updateBill(billId, {
        paid_amount: +paid.toFixed(2),
        balance_amount: +due.toFixed(2),
        status: due <= 0 ? "Paid" : "Partial",
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

  const due = selectedBill?.dueAmount ?? prefill?.dueAmount ?? 0;

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
            disabled={saving || !vendorId || !billId}
            className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !vendorId || !billId}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save & Send"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500">Vendor *</label>
            <div className="relative" ref={vendorRef}>
              <input
                value={vendorQuery}
                onFocus={() => setVendorOpen(true)}
                onChange={(e) => {
                  setVendorQuery(e.target.value);
                  setVendorOpen(true);
                  if (!e.target.value.trim()) setVendorId("");
                }}
                placeholder="Search vendor"
                className={fieldClass}
              />
              {vendorOpen && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {vendorOptions.map((v) => (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => pickVendor(v)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {v.name}
                    </button>
                  ))}
                  {vendorOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No vendors found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Bill *</label>
            <div className="relative" ref={billRef}>
              <input
                value={billQuery}
                onFocus={() => setBillOpen(true)}
                onChange={(e) => {
                  setBillQuery(e.target.value);
                  setBillOpen(true);
                  if (!e.target.value.trim()) setBillId("");
                }}
                placeholder={vendorId ? "Search bill" : "Select vendor first (or search bill)"}
                className={fieldClass}
              />
              {billOpen && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {unpaidBills.map((b) => (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => pickBill(b)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {b.number} · {b.vendorName} · {money(b.dueAmount, b.currency)} due
                    </button>
                  ))}
                  {unpaidBills.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">No unpaid bills found</div>
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

          {selectedBill && (
            <div className="text-sm text-gray-600 border border-gray-200 rounded-md p-3">
              Outstanding on {selectedBill.number}:{" "}
              <span className="font-semibold text-gray-900">{money(selectedBill.dueAmount, selectedBill.currency)}</span>
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
