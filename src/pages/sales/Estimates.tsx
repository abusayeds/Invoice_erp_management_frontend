import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListEmptyState } from "@/components/ListEmptyState";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney, PdfPreviewModal } from "@/lib/db";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { SignatureModal } from "@/components/modals/SignatureModal";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { SignatureRequestModal } from "@/components/modals/SignatureRequestModal";
import { ActivityLogModal } from "@/components/modals/ActivityLogModal";
import { showToast } from "@/utils/toast";
import { api } from "@/lib/api/client";
import { CreateInvoiceForm } from "./CreateInvoiceForm";
import { fetchCustomers, type TCustomerRow } from "@/services/customersApi";
import { fetchEstimate, fetchEstimates, updateEstimate, deleteEstimate, type BackendEstimateDoc } from "@/services/estimatesApi";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  Settings,
  SlidersHorizontal,
  Pencil,
  PenTool,
  Eye,
  Printer,
  Mail,
  MoreVertical,
  Upload,
  FileText,
  Trash2,
  MessageCircle,
  Copy,
  Signature,
  History,
  CircleChevronUp,
  CircleChevronDown,
  Package,
} from "lucide-react";

type Status = "Draft" | "Sent" | "Approved" | "Invoiced" | "On Hold" | "Disputed" | "Declined" | "Cancelled";
type EstimateRow = { id: number | string; backendId: string; name: string; customerSubtitle: string; number: string; note: string; date: string; amount: string; status: string; currency: string };
type DetailLine = { id: string; name: string; description: string; qty: number; rate: number; tax: number; discount: number; amount: number };

const STATUS_BADGE: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700 border-gray-300",
  Sent: "bg-blue-50 text-blue-700 border-blue-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Invoiced: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "On Hold": "bg-amber-100 text-amber-700 border-amber-200",
  Disputed: "bg-orange-100 text-orange-700 border-orange-200",
  Declined: "bg-red-100 text-red-700 border-red-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};
const EST_TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const EST_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
const sortFields = ["Name", "Estimate date", "Estimate #", "Status", "Total"];
const sortDirections: Array<"Ascending" | "Descending"> = ["Ascending", "Descending"];
const statusList = ["All", "Draft", "Sent", "Approved", "Invoiced", "On Hold", "Disputed", "Declined", "Cancelled", "Trash"];
const markAsStatuses = ["Draft", "Sent", "Approved", "Invoiced", "On Hold", "Disputed", "Declined", "Cancelled"];
const duplicateAs = ["As Invoice", "As Estimate", "As Proforma Invoice", "As Purchase Order"];
const dateRanges = ["All", "Today", "This Week", "This Month", "Last 30 Days", "This Year"];

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const numberValue = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);
const nowLabel = () => "Today " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const badgeOf = (value: string) => STATUS_BADGE[value] || "bg-gray-100 text-gray-700 border-gray-300";
const customerDisplayName = (customer: any): string => apiText(customer?.businessProfile?.companyName) || apiText(customer?.company_name) || apiText(customer?.name) || "—";
const customerDisplaySubtitle = (customer: any): string => [apiText(customer?.name), apiText(customer?.email)].filter(Boolean).join(" · ");
const apiText = (value: unknown): string => text(value);
const addressLines = (address?: BackendEstimateDoc["billing_address"]) => [address?.street, address?.street2, [address?.city, address?.state, address?.zip].filter(Boolean).join(", "), address?.country].filter(Boolean);
const estimateSortToBackend = (value: string) => {
  switch (value) {
    case "Estimate #":
      return "invoice_number";
    case "Name":
      return "customer_name";
    case "Status":
      return "status";
    case "Total":
      return "total";
    default:
      return "date";
  }
};
const dateRangeFor = (option: string): { dateFrom?: string; dateTo?: string } => {
  const now = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (option === "Today") {
    const today = iso(now);
    return { dateFrom: today, dateTo: today };
  }
  if (option === "This Week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { dateFrom: iso(start), dateTo: iso(now) };
  }
  if (option === "This Month") return { dateFrom: iso(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: iso(now) };
  if (option === "Last 30 Days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return { dateFrom: iso(start), dateTo: iso(now) };
  }
  if (option === "This Year") return { dateFrom: iso(new Date(now.getFullYear(), 0, 1)), dateTo: iso(now) };
  return {};
};
const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
};

const Dropdown: React.FC<{ trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; panelClass?: string }> = ({ trigger, children, align = "left", panelClass = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && <div className={`absolute z-30 mt-2 min-w-[180px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
};

const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}><div onMouseDown={(e) => e.stopPropagation()} className="w-full flex justify-center">{children}</div></div>;
};

const EmailModal: React.FC<{ onClose: () => void; row: EstimateRow }> = ({ onClose, row }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Estimate {row.number} from info</h3>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Send</button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <input placeholder="To" className="flex-1 bg-transparent text-sm outline-none" />
          <button className="text-xs text-gray-500 hover:text-gray-700">Cc &amp; Bcc</button>
        </div>
        <input defaultValue={`Estimate ${row.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {row.name}</p>
          <p>Estimate {row.number}<br />Total Amount: {row.amount}</p>
        </div>
      </div>
    </div>
  </Overlay>
);

const PackingSlipModal: React.FC<{ onClose: () => void; row: EstimateRow }> = ({ onClose, row }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl bg-white">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
        <h3 className="text-base font-medium">Packing Slip {row.number}</h3>
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Close</button>
      </div>
      <div className="p-6 text-sm text-gray-700">
        <div className="border border-gray-300 p-5">
          <h2 className="text-center text-xl font-semibold text-gray-900 border-b border-gray-300 pb-3">PACKING SLIP</h2>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div><div className="font-semibold text-gray-900">{row.name}</div><div>{row.number}</div></div>
            <div className="text-right"><div>{row.date}</div></div>
          </div>
        </div>
      </div>
    </div>
  </Overlay>
);

const CustomerFilter: React.FC<{ applied: string | null; onApply: (customerId: string | null) => void }> = ({ applied, onApply }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const customerQuery = useQuery({
    queryKey: ["estimate-customer-filter", q],
    queryFn: async () => fetchCustomers({ page: 1, limit: 100, searchTerm: q.trim() || undefined }),
    staleTime: 30_000,
  });
  const customers = customerQuery.data?.rows ?? [];
  const updatePosition = () => {
    if (!ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    setRect({ top: bounds.bottom + 8, left: bounds.left, width: Math.max(bounds.width, 256) });
  };
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const sync = () => updatePosition();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);
  const selectedLabel = applied === null ? "All" : customers.find((item) => item._id === applied)?.name || "Selected";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400">
        <Plus className="w-3 h-3" />Customer | {selectedLabel}<ChevronDown className="w-3 h-3" />
      </button>
      {open && rect && (
        <div ref={panelRef} className="fixed z-50 flex max-h-[70vh] w-64 flex-col rounded-md border border-gray-200 bg-white shadow-xl" style={{ top: rect.top, left: rect.left, width: rect.width }}>
          <div className="p-2 border-b border-gray-300"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Customer" className="w-full px-2.5 py-1.5 text-sm bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" /></div>
          <div className="hover-scrollbar flex-1 overflow-y-auto py-1">
            <button onClick={() => { onApply(null); setOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">All Customers{applied === null && <Check className="w-4 h-4 text-blue-600" />}</button>
            {customers.map((customer: TCustomerRow) => <button key={customer._id} onClick={() => { onApply(customer._id); setOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><span className="truncate">{customer.name}</span>{applied === customer._id && <Check className="w-4 h-4 text-blue-600" />}</button>)}
          </div>
        </div>
      )}
    </div>
  );
};

export const Estimates: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const navSelectedId = (location.state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState<number | string>(navSelectedId ?? 0);
  const [sortBy, setSortBy] = useState("Estimate date");
  const [sortDir, setSortDir] = useState<"Ascending" | "Descending">("Descending");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "packing" | "email" | "pdfSettings">(null);
  const [markAsOpen, setMarkAsOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigRequestOpen, setSigRequestOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const dbEstimates = useCollection<any>("estimates");
  const dbCustomers = useCollection<any>("customers", "name");
  const localRows = useMemo<EstimateRow[]>(() => dbEstimates.slice().sort((a, b) => b.id - a.id).map((item) => ({
    id: item.id,
    backendId: item._id || String(item.id),
    name: customerDisplayName(dbCustomers.find((c) => c.id === item.customerId)) || item.customerName || "—",
    customerSubtitle: customerDisplaySubtitle(dbCustomers.find((c) => c.id === item.customerId)),
    number: item.number,
    note: item.notes || "No Notes",
    date: item.date,
    amount: fmtMoney(item.total),
    status: item.status || "Draft",
    currency: item.currency || "USD",
  })), [dbCustomers, dbEstimates]);

  const dateRange = dateRangeFor(dateFilter);
  const { data: backendList } = useQuery({
    queryKey: ["estimate-list", search, sortBy, sortDir, statusFilter, customerFilter, dateFilter],
    queryFn: () => fetchEstimates({
      page: 1,
      limit: 200,
      searchTerm: search || undefined,
      sort: `${sortDir === "Descending" ? "-" : ""}${estimateSortToBackend(sortBy).replace(/^-/, "")}`,
      status: statusFilter,
      customer_id: customerFilter || undefined,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
      dateField: "date",
    }),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  const filtered = useMemo<EstimateRow[]>(() => {
    const rows = backendList?.rows ?? [];
    if (rows.length === 0 && (search || customerFilter || dateFilter !== "All" || statusFilter !== "All")) return [];
    const source = rows.length > 0 ? rows : localRows.map((item) => ({
      _id: item.backendId,
      number: item.number.replace(/^#/, ""),
      customerName: item.name,
      customerSubtitle: item.customerSubtitle,
      amount: numberValue(item.amount.replace(/[^0-9.-]/g, "")),
      dateLabel: item.date,
      status: item.status,
      currency: item.currency,
      customerId: "",
    }));
    return source.map((row) => {
      const linkedLocal = dbEstimates.find((item) => item._id === row._id) || dbEstimates.find((item) => String(item.number).replace(/^#/, "") === row.number);
      return {
        id: linkedLocal?.id ?? (Number(row.number) || Math.abs(String(row._id).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0))),
        backendId: row._id,
        name: row.customerName || customerDisplayName(dbCustomers.find((c) => c._id === row.customerId)),
        customerSubtitle: row.customerSubtitle || "",
        number: `#${row.number}`,
        note: linkedLocal?.notes || "No Notes",
        date: row.dateLabel,
        amount: fmtMoney(row.amount),
        status: row.status || "Draft",
        currency: row.currency || "USD",
      };
    });
  }, [backendList?.rows, customerFilter, dateFilter, dbCustomers, dbEstimates, localRows, search, statusFilter]);

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((item) => item.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];
  const selectedDb = dbEstimates.find((item) => item.id === selected?.id) || dbEstimates.find((item) => item._id === selected?.backendId) || {};
  const selectedCustomer = dbCustomers.find((item) => item.id === selectedDb.customerId) || {};
  const { data: selectedDoc } = useQuery({
    queryKey: ["estimate-detail", selected?.backendId],
    queryFn: () => fetchEstimate(String(selected?.backendId)),
    enabled: !!selected?.backendId,
    staleTime: 30_000,
  });

  const lines = useMemo<DetailLine[]>(() => {
    const products = (selectedDoc?.product ?? []).map((item, index) => ({
      id: `p-${index}`,
      name: apiText(item.product_name || (typeof item.product_id === "object" ? item.product_id?.productName : "")) || "Product",
      description: apiText(item.description || (typeof item.product_id === "object" ? item.product_id?.description : "")),
      qty: numberValue(item.quantity),
      rate: numberValue(item.rate),
      tax: numberValue(item.tax),
      discount: numberValue(item.discount),
      amount: numberValue(item.amount),
    }));
    const services = (selectedDoc?.service ?? []).map((item, index) => ({
      id: `s-${index}`,
      name: apiText(item.service_name || (typeof item.service_id === "object" ? item.service_id?.serviceName : "")) || "Service",
      description: apiText(item.description || (typeof item.service_id === "object" ? item.service_id?.description : "")),
      qty: numberValue(item.quantity),
      rate: numberValue(item.rate),
      tax: numberValue(item.tax),
      discount: numberValue(item.discount),
      amount: numberValue(item.amount),
    }));
    if (products.length || services.length) return [...products, ...services];
    return (selectedDb.items || []).map((item: any, index: number) => ({ id: `l-${index}`, name: item.name || "Item", description: item.description || "", qty: numberValue(item.qty ?? 1), rate: numberValue(item.rate), tax: EST_TAX_RATE[item.taxId || 1] || 0, discount: numberValue(item.discount), amount: numberValue(item.amount ?? numberValue(item.qty) * numberValue(item.rate)) }));
  }, [selectedDb.items, selectedDoc?.product, selectedDoc?.service]);

  const logActivity = async (kind: string, message: string) => {
    if (!selectedDb?.id) return;
    const current = dbEstimates.find((item) => item.id === selectedDb.id);
    await repo.update("estimates", selectedDb.id, { activity: [...(current?.activity || []), { kind, text: message, ts: Date.now(), dateLabel: nowLabel() }] });
  };
  const markAs = async (status: string) => {
    const backendId = selectedDoc?._id || selected?.backendId;
    if (backendId) await updateEstimate(String(backendId), { status });
    if (selectedDb?.id) await repo.update("estimates", selectedDb.id, { status });
    await queryClient.invalidateQueries({ queryKey: ["estimate-list"] });
    await queryClient.invalidateQueries({ queryKey: ["estimate-detail", String(backendId)] });
    await logActivity(status === "Sent" ? "sent" : "status", `Estimate ${selectedDb.number} marked as ${status.toLowerCase()}.`);
    showToast(`Estimate marked as ${status}`, "success");
  };
  const convertToInvoice = async () => {
    const est = selectedDb;
    if (!est?.id) return;
    const number = await nextNumber("invoices");
    const id = await repo.add("invoices", {
      number: "#" + number,
      customerId: est.customerId,
      date: est.date,
      due: est.due || est.date,
      ts: Date.now(),
      status: "Draft",
      items: est.items || [],
      subTotal: est.subTotal || 0,
      tax: est.tax || 0,
      shipping: 0,
      total: est.total || 0,
      amountPaid: 0,
      amountDue: est.total || 0,
      notes: `Converted from Estimate ${est.number}`,
      terms: est.terms || "",
      currency: est.currency || "USD",
    });
    await markAs("Invoiced");
    showToast("Converted to invoice", "success");
    navigate("/sales/sales-invoice", { state: { selectedId: id } });
  };
  const duplicateEstAs = async (label: string) => {
    const base = { customerId: selectedDb.customerId, date: selectedDb.date, due: selectedDb.due, ts: Date.now(), items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0, tax: selectedDb.tax || 0, total: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "", currency: selectedDb.currency || "USD" };
    if (label === "As Invoice") {
      const number = await nextNumber("invoices");
      const id = await repo.add("invoices", { ...base, number: "#" + number, status: "Draft", amountPaid: 0, amountDue: base.total });
      showToast("Invoice created", "success");
      navigate("/sales/sales-invoice", { state: { selectedId: id } });
    } else if (label === "As Estimate") {
      const number = await nextNumber("estimates");
      const id = await repo.add("estimates", { ...base, number: "#" + number, status: "Draft" });
      setSelectedId(id);
      showToast("Estimate duplicated", "success");
    } else if (label === "As Proforma Invoice") {
      const number = await nextNumber("proformas");
      const id = await repo.add("proformas", { ...base, number: "#" + number, status: "Sent", amountPaid: 0, amountDue: base.total });
      showToast("Proforma invoice created", "success");
      navigate("/sales/proforma-invoices", { state: { selectedId: id } });
    } else if (label === "As Purchase Order") {
      const vendors = await repo.getAll("vendors");
      const number = await nextNumber("purchaseOrders");
      const id = await repo.add("purchaseOrders", { ...base, number: "#" + number, vendorId: vendors[0]?.id ?? 1, status: "Draft", billStatus: "Not Billed", amountPaid: 0, amountDue: base.total });
      showToast("Purchase order created", "success");
      navigate("/purchase/purchase-orders", { state: { selectedId: id } });
    }
  };
  const trashCurrent = async () => {
    const backendId = selectedDoc?._id || selected?.backendId;
    if (backendId) await deleteEstimate(String(backendId));
    if (selectedDb?.id) await repo.remove("estimates", selectedDb.id);
    await queryClient.invalidateQueries({ queryKey: ["estimate-list"] });
    showToast(`Estimate ${selectedDb.number} moved to trash`, "success");
    setSelectedId(filtered.find((item) => item.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };
  const trashSelectedEst = async () => {
    const ids = [...checked];
    await repo.removeMany("estimates", ids);
    showToast(`${ids.length} ${ids.length === 1 ? "estimate" : "estimates"} moved to trash`, "success");
    if (ids.includes(Number(selectedId))) setSelectedId(filtered.find((item) => !ids.includes(Number(item.id)))?.id ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    const backendId = selectedDoc?._id || selected?.backendId || selectedDb?._id;
    let signaturePath = data.image;
    try {
      if (backendId && data.image.startsWith("data:")) {
        const formData = new FormData();
        formData.append("files", await dataUrlToFile(data.image, `estimate-signature-${backendId}.png`));
        const uploadRes = await api.raw.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
        signaturePath = uploadRes.data?.data?.file_path || uploadRes.data?.data?.path || data.image;
        await updateEstimate(String(backendId), { signature: signaturePath });
        await queryClient.invalidateQueries({ queryKey: ["estimate-detail", String(backendId)] });
      }
      if (selectedDb?.id) await repo.update("estimates", selectedDb.id, { signature: signaturePath, signatureName: data.name, signatureTitle: data.title, signatureDate: data.date });
      await logActivity("status", `Customer signature added to Estimate ${selectedDb.number}.`);
      showToast("Signature saved", "success");
    } catch {
      showToast("Could not save signature", "error");
    }
  };

  const listTotal = filtered.reduce((sum, item) => sum + numberValue(item.amount.replace(/[^0-9.-]/g, "")), 0);
  const allSelected = filtered.length > 0 && filtered.every((item) => checked.has(Number(item.id)));
  const selectedTotal = filtered.filter((item) => checked.has(Number(item.id))).reduce((sum, item) => sum + numberValue(item.amount.replace(/[^0-9.-]/g, "")), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((item) => Number(item.id)))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const hasActiveFilters = !!search.trim() || !!customerFilter || dateFilter !== "All" || statusFilter !== "All";
  if (!selected) {
    return createOpen || hasActiveFilters ? (
      <div className="relative flex h-full w-full bg-[#FAFBFC] overflow-hidden">
        <ResizableListPanel>
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100"><h2 className="text-base font-semibold text-gray-900 tracking-tight">Estimates</h2></div>
          <div className="px-3 py-2 border-b border-gray-300"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search estimates..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" /></div></div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto px-3 py-2 border-b border-gray-300 hover-scrollbar">
            <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>{(close) => (<>{sortFields.map((item) => <button key={item} onClick={() => { setSortBy(item); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{item}{item === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>)}<div className="border-t border-gray-200 my-1" />{sortDirections.map((dir) => <button key={dir} onClick={() => { setSortDir(dir); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{dir}{dir === sortDir && <Check className="w-4 h-4 text-blue-600" />}</button>)}</>)}</Dropdown>
            <CustomerFilter applied={customerFilter} onApply={setCustomerFilter} />
          </div>
          <div className="flex-1 flex items-center justify-center px-6 text-center"><div><div className="text-sm font-medium text-gray-900">No matching estimates found</div><div className="mt-1 text-xs text-gray-500">Create a new estimate from the panel on the right.</div></div></div>
        </ResizableListPanel>
        <CreateInvoiceForm mode="estimate" onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      </div>
    ) : <ListEmptyState title="No estimates yet" onCreate={() => setCreateOpen(true)} createLabel="New Estimate" />;
  }

  const billing = addressLines(selectedDoc?.billing_address);
  const shipping = addressLines(selectedDoc?.shipping_address);
  const localBilling = [selectedCustomer.street1, selectedCustomer.street2, [selectedCustomer.city, selectedCustomer.zip].filter(Boolean).join(" "), selectedCustomer.country].filter(Boolean);
  const localShipping = [selectedCustomer.shipStreet1, selectedCustomer.shipStreet2, [selectedCustomer.shipCity, selectedCustomer.shipZip].filter(Boolean).join(" "), selectedCustomer.shipCountry].filter(Boolean);

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select estimates to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp...", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Estimates</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const title = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: title })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}
        <div className="px-3 py-2 border-b border-gray-300"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search estimates..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" /></div></div>
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto px-3 py-2 border-b border-gray-300 hover-scrollbar">
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>{(close) => (<>{sortFields.map((item) => <button key={item} onClick={() => { setSortBy(item); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{item} {item === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>)}<div className="border-t border-gray-200 my-1" />{sortDirections.map((dir) => <button key={dir} onClick={() => { setSortDir(dir); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{dir} {dir === sortDir && <Check className="w-4 h-4 text-blue-600" />}</button>)}</>)}</Dropdown>
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>{(close) => statusList.map((item) => <button key={item} onClick={() => { if (item !== "Trash") setStatusFilter(item); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${item === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>{item} {item === statusFilter && <Check className="w-4 h-4 text-blue-600" />}</button>)}</Dropdown>
          <CustomerFilter applied={customerFilter} onApply={setCustomerFilter} />
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Estimate date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>{(close) => dateRanges.map((item) => <button key={item} onClick={() => { setDateFilter(item); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{item} {item === dateFilter && <Check className="w-4 h-4 text-blue-600" />}</button>)}</Dropdown>
        </div>
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filtered.map((row) => {
              const active = !selectMode && !createOpen && !editOpen && row.id === selectedId;
              const isChecked = checked.has(Number(row.id));
              return (
                <button key={String(row.id)} onClick={() => (selectMode ? toggleRow(Number(row.id)) : (setSelectedId(row.id), setCreateOpen(false), setEditOpen(false)))} className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                  {selectMode && <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>}
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-gray-900 truncate">{row.name}</div><div className="text-xs text-gray-500 mt-0.5">{row.number}</div><div className="text-xs text-gray-500 mt-0.5 truncate">{row.customerSubtitle || row.note}</div></div>
                  <div className="flex flex-col items-end flex-shrink-0"><span className="text-xs text-gray-500">{row.date}</span><span className="text-sm font-semibold text-gray-900 mt-0.5">{row.amount}</span><span className={`mt-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeOf(row.status)}`}>{row.status}</span></div>
                </button>
              );
            })}
          </div>
          {!selectMode && <button onClick={() => setCreateOpen(true)} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50"><div className="text-sm font-semibold text-gray-900">{fmtMoney(listTotal)}</div><div className="text-xs text-gray-500">{filtered.length} Estimates</div></div>
      </ResizableListPanel>

      {createOpen ? (
        <CreateInvoiceForm mode="estimate" onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editOpen ? (
        <CreateInvoiceForm key={selectedDb.id || selected.backendId} mode="estimate" invoice={selectedDb} onClose={() => setEditOpen(false)} onSaved={(id) => { setEditOpen(false); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm"><div className="text-center"><h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} {checked.size === 1 ? "Estimate" : "Estimates"} Selected</h2><div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left"><span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedTotal)}</span></div></div></section>
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
              <div className="min-w-0"><h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1><button className="text-xs text-blue-600 hover:text-blue-700 underline">{selected.customerSubtitle || customerDisplaySubtitle(selectedCustomer) || "View Contact"}</button></div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {[{ icon: Settings, title: "Settings", onClick: () => setModal("settings") }, { icon: expanded ? CircleChevronUp : CircleChevronDown, title: expanded ? "Collapse" : "Expand", onClick: () => setExpanded((v) => !v) }, { icon: SlidersHorizontal, title: "PDF & Print Settings", onClick: () => setModal("pdfSettings") }, { icon: Pencil, title: "Edit", onClick: () => setEditOpen(true) }, { icon: PenTool, title: "Customer Signature", onClick: () => setSigOpen(true) }, { icon: Eye, title: "Preview", onClick: () => setModal("preview") }, { icon: Printer, title: "Print", onClick: () => { logActivity("printed", `Estimate ${selectedDb.number} printed.`); setModal("preview"); } }, { icon: Mail, title: "Email", onClick: () => setModal("email") }].map((item) => <button key={item.title} title={item.title} onClick={item.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><item.icon className="w-4 h-4" /></button>)}
                <Dropdown align="right" panelClass="min-w-[200px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>{(close) => (<div className="py-1"><button onClick={() => { showToast("Opening WhatsApp...", "info"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button><button onClick={() => { setModal("packing"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Packing Slip <Package className="w-4 h-4 text-gray-500" /></button><button onClick={() => { convertToInvoice(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Convert to Invoice</button><div className="relative" onMouseEnter={() => setMarkAsOpen(true)} onMouseLeave={() => setMarkAsOpen(false)}><button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Mark As <ChevronRight className="w-4 h-4 text-gray-400" /></button>{markAsOpen && <div className="absolute right-full top-0 mr-0.5 min-w-[150px] max-h-[60vh] overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">{markAsStatuses.map((item) => <button key={item} onClick={() => { markAs(item); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{item}</button>)}</div>}</div><div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}><button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>{dupOpen && <div className="absolute right-full top-0 mr-0.5 min-w-[190px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">{duplicateAs.map((item) => <button key={item} onClick={() => { duplicateEstAs(item); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">{item}</button>)}</div>}</div><button onClick={() => { setSigRequestOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-200">Signature Request</button><button onClick={() => { setActivityOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Activity Log</button><button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button></div>)}</Dropdown>
              </div>
            </div>
            {expanded && <>
              <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
                <div className="flex items-center gap-12"><div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{fmtMoney(numberValue(selectedDoc?.total ?? selectedDb.total))}</div></div><div><div className="text-xs text-gray-500">Estimate date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div></div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badgeOf(selectedDoc?.status || selected.status)}`}>{selectedDoc?.status || selected.status}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-5 py-4 border-b border-gray-300">
                <div><div className="text-xs text-gray-500 mb-1">Billing Address</div>{(billing.length ? billing : localBilling).length ? (billing.length ? billing : localBilling).map((line: string, index: number) => <div key={index} className={`text-sm ${index === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{line}</div>) : <div className="text-sm text-gray-400">—</div>}</div>
                <div><div className="text-xs text-gray-500 mb-1">Shipping Address</div>{(shipping.length ? shipping : localShipping).length ? (shipping.length ? shipping : localShipping).map((line: string, index: number) => <div key={index} className={`text-sm ${index === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{line}</div>) : <div className="text-sm text-gray-400">—</div>}</div>
              </div>
            </>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead><tr className="bg-gray-50 text-gray-500 text-xs"><th className="text-left font-semibold px-5 py-2.5">Sr. No.</th><th className="text-left font-semibold px-2 py-2.5">Items</th><th className="text-right font-semibold px-2 py-2.5">Quantity</th><th className="text-right font-semibold px-2 py-2.5">Rate</th><th className="text-left font-semibold px-2 py-2.5">Tax</th><th className="text-right font-semibold px-2 py-2.5">Discount</th><th className="text-right font-semibold px-5 py-2.5">Amount</th></tr></thead>
                <tbody>{lines.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No items</td></tr>}{lines.map((item, index) => <tr key={item.id} className="border-b border-gray-300 align-top"><td className="px-5 py-3 text-gray-700">{index + 1}</td><td className="px-2 py-3"><div className="font-semibold text-gray-900">{item.name}</div>{item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}</td><td className="px-2 py-3 text-right text-gray-800">{item.qty || 1}</td><td className="px-2 py-3 text-right text-gray-800">{fmtMoney(item.rate)}</td><td className="px-2 py-3 text-gray-800">{item.tax ? `${item.tax}%` : EST_TAX_NAME[1]}</td><td className="px-2 py-3 text-right text-gray-500 text-xs">{item.discount ? `${item.discount}%` : "—"}</td><td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtMoney(item.amount || item.qty * item.rate)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
              <div className="space-y-4"><div><label className="text-xs text-gray-500">Terms &amp; Conditions</label><div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{apiText(selectedDoc?.terms_and_conditions) || selectedDb.terms || "—"}</div></div><div><label className="text-xs text-gray-500">Attachment</label><div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200"><button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button><button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button></div></div></div>
              <div><label className="text-xs text-gray-500">Notes</label><div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{apiText(selectedDoc?.notes) || selectedDb.notes || "—"}</div></div>
              <div className="border border-gray-200 rounded-md overflow-hidden self-start"><div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{fmtMoney(numberValue(selectedDoc?.sub_total ?? selectedDb.subTotal))}</span></div>{Object.entries(lines.reduce((acc: Record<number, number>, item) => { const taxRate = item.tax || 0; acc[taxRate] = (acc[taxRate] || 0) + item.amount; return acc; }, {})).map(([taxId, base]: [string, number]) => <div key={taxId} className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>{EST_TAX_NAME[Number(taxId)] || "Tax"} {Number(taxId)}% on {fmtMoney(base)}</span><span>{fmtMoney((base * Number(taxId)) / 100)}</span></div>)}<div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(numberValue(selectedDoc?.total ?? selectedDb.total))}</span></div></div>
            </div>
            <SignatureBlock record={{ ...selectedDb, signature: selectedDoc?.signature || selectedDb.signature }} label="Customer Signature" />
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none"><div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 border py-1 text-center text-[10px] font-semibold ${badgeOf(selectedDoc?.status || selected.status)}`}>{selectedDoc?.status || selected.status}</div></div>
          </div>
        </section>
      )}

      {modal === "settings" && <AppSettingsModal initialTab="Estimate" onClose={() => setModal(null)} />}
      {modal === "preview" && !!selectedDb.id && <PdfPreviewModal docType="estimate" recordId={selectedDb.id} title="Estimate " onClose={() => setModal(null)} />}
      {modal === "packing" && <PackingSlipModal onClose={() => setModal(null)} row={selected} />}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} row={selected} />}
      {modal === "pdfSettings" && <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="estimate" />}
      {sigOpen && <SignatureModal heading="Customer Signature" defaultName={selectedCustomer.contact || selectedCustomer.name || ""} onDone={saveSignature} onClose={() => setSigOpen(false)} />}
      {sigRequestOpen && <SignatureRequestModal docLabel="Estimate" number={selectedDb.number || ""} customer={selectedCustomer} onClose={() => setSigRequestOpen(false)} onSend={() => { logActivity("sent", `Signature request for Estimate ${selectedDb.number} sent.`); showToast("Signature request sent", "success"); }} />}
      {activityOpen && <ActivityLogModal docLabel="Estimate" record={selectedDb} onClose={() => setActivityOpen(false)} />}
      {confirmAction === "trashOne" && <ConfirmAlert message="Are you sure want to trash this estimate?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />}
      {confirmAction === "trashSelected" && <ConfirmAlert message="Are you sure want to delete these estimates?" onNo={() => setConfirmAction(null)} onYes={trashSelectedEst} />}
    </div>
  );
};

export default Estimates;
