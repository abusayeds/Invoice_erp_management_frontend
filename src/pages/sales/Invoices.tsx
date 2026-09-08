import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  FileText,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { showToast } from "@/utils/toast";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { fetchCustomers } from "@/services/customersApi";
import {
  deleteInvoice,
  fetchInvoice,
  fetchInvoices,
  formatDateLabel,
  invoiceCustomerName,
  invoiceCustomerSubtitle,
  mapInvoiceRow,
  updateInvoice,
  type BackendInvoiceDoc,
} from "@/services/invoicesApi";
import { fetchPaymentMethods, type PaymentMethodOption } from "@/services/paymentMethodsApi";
import { fetchServerPdfUrl } from "@/lib/db/serverPdf";
import { InvoicePaymentsModal } from "@/components/modals/InvoicePaymentsModal";

const PAGE_SIZE = 20;
const sortFields = ["Invoice date", "Invoice #", "Customer", "Amount", "Status"];
const statusOptions = ["All", "Draft", "Open", "Partial", "Paid", "Overdue", "Void", "CreditNotesApplied"];
const dateOptions = ["All", "Today", "This Week", "This Month", "This Year"];

const text = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const numberValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;

const formatMoney = (amount: number, currency?: string) => {
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

const dateRangeForFilter = (value: string) => {
  if (value === "All") return {};
  const now = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (value === "Today") {
    const today = iso(now);
    return { dateFrom: today, dateTo: today };
  }
  if (value === "This Week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { dateFrom: iso(start), dateTo: iso(now) };
  }
  if (value === "This Month") {
    return { dateFrom: iso(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: iso(now) };
  }
  if (value === "This Year") {
    return { dateFrom: iso(new Date(now.getFullYear(), 0, 1)), dateTo: iso(now) };
  }
  return {};
};

const sortToBackend = (sortBy: string) => {
  switch (sortBy) {
    case "Invoice #":
      return "invoice_number";
    case "Customer":
      return "customer_name";
    case "Amount":
      return "-total";
    case "Status":
      return "status";
    default:
      return "-date";
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-green-100 border-green-200 text-green-700";
    case "Partial":
      return "bg-amber-100 border-amber-200 text-amber-700";
    case "Overdue":
      return "bg-red-100 border-red-200 text-red-700";
    case "Void":
      return "bg-gray-100 border-gray-300 text-gray-700";
    default:
      return "bg-blue-50 border-blue-200 text-blue-700";
  }
};

const addressLines = (address?: BackendInvoiceDoc["billing_address"]) =>
  [address?.street, address?.street2, [address?.city, address?.state, address?.zip].filter(Boolean).join(", "), address?.country]
    .filter(Boolean);

type InvoiceLineView = {
  srNo: number;
  name: string;
  description: string;
  quantity: number;
  rate: number;
  tax: number;
  discount: number;
  amount: number;
};

const invoiceLines = (doc: BackendInvoiceDoc | null): InvoiceLineView[] => {
  if (!doc) return [];
  const products = (doc.product ?? []).map((item, index) => ({
    srNo: index + 1,
    name:
      (item.product_id && typeof item.product_id === "object" ? text(item.product_id.productName) : "") ||
      text(item.product_name) ||
      "Product",
    description:
      text(item.description) ||
      (item.product_id && typeof item.product_id === "object" ? text(item.product_id.description) : ""),
    quantity: numberValue(item.quantity),
    rate: numberValue(item.rate),
    tax: numberValue(item.tax),
    discount: numberValue(item.discount),
    amount: numberValue(item.amount),
  }));
  const services = (doc.service ?? []).map((item, index) => ({
    srNo: products.length + index + 1,
    name:
      (item.service_id && typeof item.service_id === "object" ? text(item.service_id.serviceName) : "") ||
      text(item.service_name) ||
      "Service",
    description:
      text(item.description) ||
      (item.service_id && typeof item.service_id === "object" ? text(item.service_id.description) : ""),
    quantity: numberValue(item.quantity),
    rate: numberValue(item.rate),
    tax: numberValue(item.tax),
    discount: numberValue(item.discount),
    amount: numberValue(item.amount),
  }));
  return [...products, ...services];
};

const PaymentMethodBadges: React.FC<{
  names: string[];
  paymentMethods: PaymentMethodOption[];
  currency?: string;
}> = ({ names, paymentMethods, currency }) => {
  const chosen = names.filter(Boolean);
  if (chosen.length === 0) {
    return <p className="text-sm text-gray-500">No payment methods configured.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chosen.map((name) => {
        const meta = paymentMethods.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
        return (
          <div
            key={name}
            className="flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            title={currency ? `${name} (${currency})` : name}
          >
            {meta?.logo ? (
              <img src={meta.logo} alt={name} className="h-4 max-w-14 object-contain" />
            ) : (
              <span className="font-medium">{name}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const InvoicePreviewModal: React.FC<{
  backendId: string;
  title: string;
  onClose: () => void;
}> = ({ backendId, title, onClose }) => {
  const { data: pdfUrl, isLoading } = useQuery({
    queryKey: ["invoice-pdf", backendId],
    queryFn: () => fetchServerPdfUrl("invoice", backendId),
    enabled: !!backendId,
  });

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 p-4" onMouseDown={onClose}>
      <div className="flex h-full items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              Close
            </button>
          </div>
          <div className="flex-1 bg-gray-100">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                title={title}
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Could not load backend PDF preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Invoice date");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [showMobileList, setShowMobileList] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const dateRange = dateRangeForFilter(dateFilter);

  const { data: customerList } = useQuery({
    queryKey: ["invoice-filter-customers"],
    queryFn: () => fetchCustomers({ page: 1, limit: 1000 }),
    staleTime: 60_000,
  });

  const { data: methodOptions = [] } = useQuery({
    queryKey: ["payment-method-options"],
    queryFn: fetchPaymentMethods,
    staleTime: 60_000,
  });

  const { data: invoiceList, isLoading, isFetching } = useQuery({
    queryKey: ["invoices-live", page, searchTerm, sortBy, statusFilter, customerFilter, dateFilter],
    queryFn: () =>
      fetchInvoices({
        page,
        limit: PAGE_SIZE,
        searchTerm: searchTerm || undefined,
        sort: sortToBackend(sortBy),
        status: statusFilter,
        customer_id: customerFilter || undefined,
        dateField: "date",
        ...dateRange,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = invoiceList?.rows ?? [];
  const pagination = invoiceList?.pagination;

  useEffect(() => {
    if (rows.length > 0 && !rows.some((row) => row._id === selectedId)) {
      setSelectedId(rows[0]._id);
    }
    if (rows.length === 0) {
      setSelectedId("");
    }
  }, [rows, selectedId]);

  const { data: selectedInvoice, refetch: refetchInvoice } = useQuery({
    queryKey: ["invoice-detail", selectedId],
    queryFn: () => fetchInvoice(selectedId),
    enabled: !!selectedId,
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices-live"] });
      showToast("Invoice moved to trash", "success");
      setShowMoreMenu(false);
    },
    onError: () => showToast("Could not delete invoice", "error"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateInvoice(id, { status }),
    onSuccess: async (doc) => {
      qc.invalidateQueries({ queryKey: ["invoices-live"] });
      qc.setQueryData(["invoice-detail", doc._id], doc);
      await refetchInvoice();
      showToast("Invoice status updated", "success");
      setShowMoreMenu(false);
    },
    onError: () => showToast("Could not update invoice status", "error"),
  });

  const selectedRow = rows.find((row) => row._id === selectedId) ?? null;
  const effectiveRow = selectedInvoice ? mapInvoiceRow(selectedInvoice) : selectedRow;
  const listTotal = rows.reduce((sum, item) => sum + item.amount, 0);
  const billing = addressLines(selectedInvoice?.billing_address);
  const shipping = addressLines(selectedInvoice?.shipping_address);
  const lines = invoiceLines(selectedInvoice ?? null);

  if (!isLoading && rows.length === 0) {
    return (
      <div className="module-detail-panel flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <FileText className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No invoices found</h3>
          <p className="mt-1 text-sm text-gray-500">Adjust search or filters to load invoices from the backend.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-detail-panel overflow-hidden p-0">
      <div className="module-title-bar px-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">Invoices</h2>
          {effectiveRow && (
            <p className="truncate text-sm text-gray-500">
              {effectiveRow.customerName}
              {effectiveRow.customerSubtitle ? ` · ${effectiveRow.customerSubtitle}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowPaymentModal(true)} title="Add payment" className="rounded-md p-2 hover:bg-gray-200">
            <DollarSign className="h-5 w-5 text-gray-600" />
          </button>
          <button onClick={() => setShowPreview(true)} title="Preview PDF" className="rounded-md p-2 hover:bg-gray-200">
            <Eye className="h-5 w-5 text-gray-600" />
          </button>
          <button onClick={() => setShowPreview(true)} title="Print PDF" className="rounded-md p-2 hover:bg-gray-200">
            <Printer className="h-5 w-5 text-gray-600" />
          </button>
          <button onClick={() => showToast("Email flow not connected yet", "info")} title="Email" className="rounded-md p-2 hover:bg-gray-200">
            <Mail className="h-5 w-5 text-gray-600" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMoreMenu((open) => !open)} title="More options" className="rounded-md p-2 hover:bg-gray-200">
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>
            {showMoreMenu && selectedId && (
              <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                <button onClick={() => statusMut.mutate({ id: selectedId, status: "Paid" })} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                  Mark as Paid
                </button>
                <button onClick={() => statusMut.mutate({ id: selectedId, status: "Partial" })} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                  Mark as Partial
                </button>
                <button onClick={() => statusMut.mutate({ id: selectedId, status: "Void" })} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                  Mark as Void
                </button>
                <button
                  onClick={() => deleteMut.mutate(selectedId)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Trash
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden border-b border-gray-300 bg-white px-4 py-2">
        <button
          onClick={() => setShowMobileList((value) => !value)}
          className="rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600"
        >
          {showMobileList ? "Back to Details" : "View Invoices"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ResizableListPanel className={`${showMobileList ? "flex" : "hidden"} lg:flex`}>
          <div className="h-12 border-b border-gray-300 bg-gray-100 px-4">
            <div className="flex h-full items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Invoice List</h3>
              <button onClick={() => showToast("Create flow is not part of this update", "info")} className="rounded-md p-1.5 hover:bg-gray-200">
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="border-b border-gray-300 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search invoices..."
                className="w-full rounded-md bg-gray-100 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-gray-300 px-3 py-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
            >
              {sortFields.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
            >
              {statusOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
            >
              <option value="">All Customers</option>
              {(customerList?.rows ?? []).map((row) => (
                <option key={row._id} value={row._id}>{row.name}</option>
              ))}
            </select>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
            >
              {dateOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>

          <div className="relative flex-1 overflow-y-auto">
            {(isLoading || isFetching) && <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-blue-500" />}
            {rows.map((row) => {
              const active = row._id === selectedId;
              return (
                <button
                  key={row._id}
                  onClick={() => {
                    setSelectedId(row._id);
                    setShowMobileList(false);
                    setShowMoreMenu(false);
                  }}
                  className={`w-full border-b border-gray-300 px-4 py-3 text-left transition-colors ${active ? "bg-gray-100" : "hover:bg-gray-50"}`}
                >
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">#{row.number}</div>
                      <div className="truncate text-xs text-gray-500">{row.customerName}</div>
                    </div>
                    <span className={`rounded border px-2 py-0.5 text-[11px] ${statusColor(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-gray-500">{row.dateLabel}</span>
                    <span className="text-sm font-semibold text-gray-900">{formatMoney(row.amount, row.currency)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-center text-sm font-semibold text-gray-900">{formatMoney(listTotal, effectiveRow?.currency)}</div>
            <div className="text-center text-xs text-gray-500">{pagination?.totalData ?? rows.length} Invoices</div>
            {pagination && pagination.totalPage > 1 && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-200 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-600">{page} / {pagination.totalPage}</span>
                <button
                  onClick={() => setPage((current) => Math.min(pagination.totalPage, current + 1))}
                  disabled={page >= pagination.totalPage}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-200 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </ResizableListPanel>

        <section className={`${showMobileList ? "hidden" : "flex"} min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:flex`}>
          {!selectedInvoice ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
              Select an invoice from the list.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-6 grid grid-cols-1 gap-4 border-b border-gray-300 pb-4 md:grid-cols-4">
                <div>
                  <div className="text-xs text-gray-500">Invoice #</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">#{text(selectedInvoice.invoice_number)}</div>
                  <div className="text-sm text-gray-600">{formatMoney(numberValue(selectedInvoice.total), text(selectedInvoice.currency))}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Invoice date</div>
                  <div className="mt-1 text-sm font-medium text-gray-900">{formatDateLabel(selectedInvoice.date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Due date</div>
                  <div className="mt-1 text-sm font-medium text-gray-900">{formatDateLabel(selectedInvoice.due_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Outstanding</div>
                  <div className="mt-1 text-sm font-semibold text-red-600">
                    {formatMoney(numberValue(selectedInvoice.balance_amount ?? selectedInvoice.total), text(selectedInvoice.currency))}
                  </div>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs text-gray-500">Billing Address</div>
                  <div className="text-sm text-gray-900">
                    <div className="font-semibold">{invoiceCustomerName(selectedInvoice)}</div>
                    {invoiceCustomerSubtitle(selectedInvoice) && (
                      <div className="text-gray-600">{invoiceCustomerSubtitle(selectedInvoice)}</div>
                    )}
                    {billing.length > 0 ? billing.map((line) => <div key={line}>{line}</div>) : <div className="text-gray-500">No billing address</div>}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Payment Methods</span>
                    <button onClick={() => navigate("/settings")} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit payment methods">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <PaymentMethodBadges
                    names={selectedInvoice.payment_method ?? []}
                    paymentMethods={methodOptions}
                    currency={text(selectedInvoice.currency)}
                  />
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs text-gray-500">Sub Title</div>
                  <div className="mt-1 text-sm text-gray-900">{text(selectedInvoice.sub_title) || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Shipping Method</div>
                  <div className="mt-1 text-sm text-gray-900">{text(selectedInvoice.shipping_method) || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">P.O. #</div>
                  <div className="mt-1 text-sm text-gray-900">{text(selectedInvoice.po) || "—"}</div>
                </div>
              </div>

              {shipping.length > 0 && (
                <div className="mb-6">
                  <div className="mb-2 text-xs text-gray-500">Shipping Address</div>
                  <div className="text-sm text-gray-900">
                    {shipping.map((line) => <div key={line}>{line}</div>)}
                  </div>
                </div>
              )}

              <div className="mb-6 flex flex-col gap-6 xl:flex-row">
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <table className="min-w-[620px] w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Sr. No.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Item</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Rate</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Tax</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Discount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={`${line.srNo}-${line.name}`} className="border-b border-gray-100 align-top">
                          <td className="px-3 py-3 text-gray-900">{line.srNo}</td>
                          <td className="px-3 py-3 text-gray-900">
                            <div className="font-medium">{line.name}</div>
                            {line.description && <div className="mt-1 text-xs text-gray-500">{line.description}</div>}
                          </td>
                          <td className="px-3 py-3 text-gray-900">{line.quantity}</td>
                          <td className="px-3 py-3 text-gray-900">{formatMoney(line.rate, text(selectedInvoice.currency))}</td>
                          <td className="px-3 py-3 text-gray-900">{line.tax}%</td>
                          <td className="px-3 py-3 text-gray-900">{line.discount}%</td>
                          <td className="px-3 py-3 text-gray-900">{formatMoney(line.amount, text(selectedInvoice.currency))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="w-full xl:w-72">
                  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Sub Total</span><span className="font-medium text-gray-900">{formatMoney(numberValue(selectedInvoice.sub_total), text(selectedInvoice.currency))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Shipping Cost</span><span className="font-medium text-gray-900">{formatMoney(numberValue(selectedInvoice.shipping_cost), text(selectedInvoice.currency))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="font-medium text-gray-900">{formatMoney(numberValue(selectedInvoice.tax), text(selectedInvoice.currency))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="font-medium text-green-600">{formatMoney(numberValue(selectedInvoice.paid_amount), text(selectedInvoice.currency))}</span></div>
                    <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{formatMoney(numberValue(selectedInvoice.total), text(selectedInvoice.currency))}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-gray-900">Due</span><span className="font-semibold text-red-600">{formatMoney(numberValue(selectedInvoice.balance_amount ?? selectedInvoice.total), text(selectedInvoice.currency))}</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-gray-500">Terms & Conditions</div>
                  <p className="text-sm text-gray-900">{text(selectedInvoice.terms_and_conditions) || "—"}</p>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-500">Notes</div>
                  <p className="text-sm text-gray-900">{text(selectedInvoice.notes) || "—"}</p>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-500">Internal Notes</div>
                  <p className="text-sm text-gray-900">{text(selectedInvoice.internal_notes) || "—"}</p>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-500">Attachment</div>
                  <button
                    onClick={() => showToast("Attachment viewer not connected yet", "info")}
                    className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-gray-400"
                  >
                    No attachment
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <InvoicePaymentsModal
        open={showPaymentModal}
        invoice={selectedInvoice ?? null}
        paymentMethods={methodOptions}
        onClose={() => setShowPaymentModal(false)}
        onSaved={async () => {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["invoice-payments", selectedId] }),
            qc.invalidateQueries({ queryKey: ["invoices-live"] }),
            qc.invalidateQueries({ queryKey: ["invoice-detail", selectedId] }),
          ]);
          await refetchInvoice();
        }}
      />

      {showPreview && selectedInvoice?._id && (
        <InvoicePreviewModal
          backendId={selectedInvoice._id}
          title={`Invoice #${text(selectedInvoice.invoice_number)}`}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};
