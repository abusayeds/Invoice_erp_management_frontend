/**
 * File: src/pages/sales/Proformainvoices.tsx
 * Proforma Invoice — backend-driven master/detail layout.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ListEmptyState } from "@/components/ListEmptyState";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { SignatureModal } from "@/components/modals/SignatureModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { useCollection, repo, nextNumber, money as fmtMoney, PdfPreviewModal } from "@/lib/db";
import { api } from "@/lib/api/client";
import { showToast } from "@/utils/toast";
import { CreateInvoiceForm } from "./CreateInvoiceForm";
import { fetchCustomers, type TCustomerRow } from "@/services/customersApi";
import {
  fetchProformaInvoice,
  fetchProformaInvoices,
  updateProformaInvoice,
  type BackendProformaInvoiceDoc,
} from "@/services/proformaInvoicesApi";
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
  X,
  Trash2,
  MessageCircle,
  CircleChevronUp,
  CircleChevronDown,
} from "lucide-react";

type Status = "Draft" | "Sent" | "Invoiced" | "Cancelled";
type ProformaRow = {
  id: number | string;
  backendId: string;
  name: string;
  customerSubtitle: string;
  number: string;
  note: string;
  date: string;
  amount: string;
  currency: string;
  status: string;
};

type DetailLine = {
  id: string;
  name: string;
  description: string;
  qty: number;
  rate: number;
  tax: number;
  discount: number;
  amount: number;
};

const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
};

const sortFields = ["Proforma Invoice date", "Amount", "Proforma Invoice #", "Status", "Customer"];
const statusList = ["All", "Draft", "Sent", "Invoiced", "Cancelled", "Trash"];
const PF_TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const PF_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };

const apiText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const numberValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;

const statusBadge = (status: string) => {
  switch (status) {
    case "Sent":
      return "bg-gray-900 text-white";
    case "Invoiced":
      return "bg-green-500 text-white";
    case "Cancelled":
    case "Void":
      return "bg-red-500 text-white";
    case "Paid":
      return "bg-green-500 text-white";
    case "Partial":
      return "bg-orange-500 text-white";
    default:
      return "bg-gray-600 text-white";
  }
};

const proformaSortToBackend = (value: string) => {
  switch (value) {
    case "Proforma Invoice #":
      return "invoice_number";
    case "Status":
      return "status";
    case "Customer":
      return "customer_name";
    case "Amount":
      return "total";
    default:
      return "date";
  }
};

const customerDisplayName = (customer: any): string =>
  apiText(customer?.businessProfile?.companyName) ||
  apiText(customer?.company_name) ||
  apiText(customer?.name) ||
  apiText(customer?.contact) ||
  "—";

const customerDisplaySubtitle = (customer: any): string =>
  [apiText(customer?.name), apiText(customer?.email)].filter(Boolean).join(" · ");

const addressLines = (address?: {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}) => [address?.street, address?.street2, [address?.city, address?.state, address?.zip].filter(Boolean).join(", "), address?.country].filter(Boolean);

const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClass?: string;
}> = ({ trigger, children, align = "left", panelClass = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className={`absolute z-30 mt-2 min-w-[180px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full flex justify-center">{children}</div>
    </div>
  );
};

const EmailModal: React.FC<{ onClose: () => void; row: ProformaRow }> = ({ onClose, row }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Proforma Invoice {row.number} from info</h3>
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
        <input defaultValue={`Proforma Invoice ${row.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {row.name}</p>
          <p>Proforma Invoice {row.number}<br />Total Amount: {row.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Proforma Invoice {row.number}</span>
        </div>
      </div>
    </div>
  </Overlay>
);

const CustomerFilter: React.FC<{
  applied: string | null;
  onApply: (customerId: string | null) => void;
}> = ({ applied, onApply }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const customerQuery = useQuery({
    queryKey: ["proforma-customer-filter", q],
    queryFn: async () => fetchCustomers({ page: 1, limit: 100, searchTerm: q.trim() || undefined }),
    staleTime: 30_000,
  });

  const customerOptions = customerQuery.data?.rows ?? [];

  const updatePosition = () => {
    const node = ref.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
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

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const selectedLabel =
    applied === null
      ? "All"
      : customerOptions.find((row) => row._id === applied)?.name || "Selected";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400">
        <Plus className="w-3 h-3" />
        Customer | {selectedLabel}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && rect && (
        <div ref={panelRef} className="fixed z-50 flex max-h-[70vh] w-64 flex-col rounded-md border border-gray-200 bg-white shadow-xl" style={{ top: rect.top, left: rect.left, width: rect.width }}>
          <div className="p-2 border-b border-gray-300">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Customer" className="w-full px-2.5 py-1.5 text-sm bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
          <div className="hover-scrollbar flex-1 overflow-y-auto py-1">
            <button onClick={() => { onApply(null); setOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
              All Customers
              {applied === null && <Check className="w-4 h-4 text-blue-600" />}
            </button>
            {customerOptions.map((customer: TCustomerRow) => (
              <button key={customer._id} onClick={() => { onApply(customer._id); setOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <span className="truncate">{customer.name}</span>
                {applied === customer._id && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
            {customerOptions.length === 0 && <div className="px-3 py-2.5 text-sm text-gray-400">No customer found</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProformaInvoices: React.FC = () => {
  const queryClient = useQueryClient();
  const navSelectedId = (useLocation().state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState<number | string>(navSelectedId ?? 0);
  const [sortBy, setSortBy] = useState("Proforma Invoice date");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "pdfSettings">(null);
  const [markAsOpen, setMarkAsOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (navSelectedId != null) setSelectedId(navSelectedId);
  }, [navSelectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const dbProformas = useCollection<any>("proformas");
  const dbCustomers = useCollection<any>("customers", "name");

  const localProformas = useMemo<ProformaRow[]>(
    () =>
      dbProformas.slice().sort((a, b) => b.id - a.id).map((item) => ({
        id: item.id,
        backendId: item._id || String(item.id),
        name: customerDisplayName(dbCustomers.find((c) => c.id === item.customerId)) || item.customerName || "—",
        customerSubtitle: customerDisplaySubtitle(dbCustomers.find((c) => c.id === item.customerId)),
        number: item.number,
        note: item.notes || "No Notes",
        date: item.date,
        amount: fmtMoney(item.total),
        currency: item.currency || "USD",
        status: item.status || "Draft",
      })),
    [dbCustomers, dbProformas],
  );

  const { data: backendList } = useQuery({
    queryKey: ["proforma-backend-list", search, sortBy, statusFilter, customerFilter],
    queryFn: () =>
      fetchProformaInvoices({
        page: 1,
        limit: 200,
        searchTerm: search || undefined,
        sort: `-${proformaSortToBackend(sortBy).replace(/^-/, "")}`,
        status: statusFilter,
        customer_id: customerFilter || undefined,
      }),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });

  const filtered = useMemo<ProformaRow[]>(() => {
    const backendRows = backendList?.rows ?? [];
    if (backendRows.length === 0 && (search || statusFilter !== "All" || customerFilter)) return [];
    const source = backendRows.length > 0 ? backendRows : localProformas.map((item) => ({
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
      const linkedLocal =
        dbProformas.find((item) => item._id === row._id) ||
        dbProformas.find((item) => String(item.number).replace(/^#/, "") === row.number);
      return {
        id: linkedLocal?.id ?? (Number(row.number) || Math.abs(String(row._id).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0))),
        backendId: row._id,
        name: row.customerName || customerDisplayName(dbCustomers.find((c) => c._id === row.customerId)),
        customerSubtitle: row.customerSubtitle || "",
        number: `#${row.number}`,
        note: linkedLocal?.notes || "No Notes",
        date: row.dateLabel,
        amount: fmtMoney(row.amount),
        currency: row.currency || "USD",
        status: row.status || "Draft",
      };
    });
  }, [backendList?.rows, customerFilter, dbCustomers, dbProformas, localProformas, search, statusFilter]);

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];
  const selectedDb =
    dbProformas.find((item) => item.id === selected?.id) ||
    dbProformas.find((item) => item._id === selected?.backendId) ||
    {};
  const selectedCustomer = dbCustomers.find((item) => item.id === selectedDb.customerId) || {};

  const { data: selectedDoc } = useQuery({
    queryKey: ["proforma-backend-detail", selected?.backendId],
    queryFn: () => fetchProformaInvoice(String(selected?.backendId)),
    enabled: !!selected?.backendId,
    staleTime: 30_000,
  });

  const lines = useMemo<DetailLine[]>(() => {
    const productLines = (selectedDoc?.product ?? []).map((item, index) => ({
      id: `p-${index}`,
      name: apiText(item.product_name || (typeof item.product_id === "object" ? item.product_id?.productName : "")) || "Product",
      description: apiText(item.description || (typeof item.product_id === "object" ? item.product_id?.description : "")),
      qty: numberValue(item.quantity),
      rate: numberValue(item.rate),
      tax: numberValue(item.tax),
      discount: numberValue(item.discount),
      amount: numberValue(item.amount),
    }));
    const serviceLines = (selectedDoc?.service ?? []).map((item, index) => ({
      id: `s-${index}`,
      name: apiText(item.service_name || (typeof item.service_id === "object" ? item.service_id?.serviceName : "")) || "Service",
      description: apiText(item.description || (typeof item.service_id === "object" ? item.service_id?.description : "")),
      qty: numberValue(item.quantity),
      rate: numberValue(item.rate),
      tax: numberValue(item.tax),
      discount: numberValue(item.discount),
      amount: numberValue(item.amount),
    }));
    if (productLines.length || serviceLines.length) return [...productLines, ...serviceLines];
    return (selectedDb.items || []).map((item: any, index: number) => ({
      id: `l-${index}`,
      name: item.name || "Item",
      description: item.description || "",
      qty: numberValue(item.qty ?? 1),
      rate: numberValue(item.rate),
      tax: 0,
      discount: numberValue(item.discount),
      amount: numberValue(item.amount ?? numberValue(item.qty) * numberValue(item.rate)),
    }));
  }, [selectedDb.items, selectedDoc?.product, selectedDoc?.service]);

  const listTotal = useMemo(
    () => filtered.reduce((sum, item) => sum + numberValue(item.amount.replace(/[^0-9.-]/g, "")), 0),
    [filtered],
  );

  const allSelected = filtered.length > 0 && filtered.every((item) => checked.has(Number(item.id)));
  const selectedTotal = filtered
    .filter((item) => checked.has(Number(item.id)))
    .reduce((sum, item) => sum + numberValue(item.amount.replace(/[^0-9.-]/g, "")), 0);

  const exitSelect = () => {
    setSelectMode(false);
    setChecked(new Set());
  };

  const toggleRow = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (allSelected) exitSelect();
    else setChecked(new Set(filtered.map((item) => Number(item.id))));
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const markAs = async (status: Status) => {
    try {
      if (selected?.backendId) {
        await updateProformaInvoice(selected.backendId, { status });
      }
      if (selectedDb?.id) {
        await repo.update("proformas", selectedDb.id, { status });
      }
      showToast(`Proforma invoice marked as ${status}`, "success");
    } catch {
      showToast("Could not update status", "error");
    }
  };

  const convertToInvoice = async () => {
    if (!selectedDb?.id) return;
    const n = await nextNumber("invoices");
    const id = await repo.add("invoices", {
      number: "#" + n,
      customerId: selectedDb.customerId,
      date: selectedDb.date,
      due: selectedDb.due || selectedDb.date,
      ts: Date.now(),
      status: "Draft",
      items: selectedDb.items || [],
      subTotal: selectedDb.subTotal || numberValue(selectedDoc?.sub_total),
      tax: selectedDb.tax || numberValue(selectedDoc?.tax),
      shipping: 0,
      total: selectedDb.total || numberValue(selectedDoc?.total),
      amountPaid: 0,
      amountDue: selectedDb.total || numberValue(selectedDoc?.total),
      notes: selectedDb.notes || apiText(selectedDoc?.notes),
      terms: selectedDb.terms || apiText(selectedDoc?.terms_and_conditions),
      paymentMethod: selectedDb.paymentMethod || selectedDoc?.payment_method || [],
    });
    await markAs("Invoiced");
    showToast("Converted to invoice", "success");
    navigate("/sales/sales-invoice", { state: { selectedId: id } });
  };

  const duplicateAs = async (label: string) => {
    if (!selectedDb?.id) return;
    const base = {
      customerId: selectedDb.customerId,
      date: selectedDb.date,
      due: selectedDb.due,
      ts: Date.now(),
      items: selectedDb.items || [],
      subTotal: selectedDb.subTotal || 0,
      tax: selectedDb.tax || 0,
      total: selectedDb.total || 0,
      notes: selectedDb.notes || "",
      terms: selectedDb.terms || "",
      paymentMethod: selectedDb.paymentMethod || [],
    };
    if (label === "As Invoice") {
      const n = await nextNumber("invoices");
      const id = await repo.add("invoices", { ...base, number: "#" + n, status: "Draft", amountPaid: 0, amountDue: base.total });
      showToast("Invoice created", "success");
      navigate("/sales/sales-invoice", { state: { selectedId: id } });
    } else if (label === "As Proforma Invoice") {
      const n = await nextNumber("proformas");
      const id = await repo.add("proformas", { ...base, number: "#" + n, status: "Draft", amountPaid: 0, amountDue: base.total });
      setSelectedId(id);
      showToast("Proforma invoice duplicated", "success");
    } else if (label === "As Purchase Order") {
      const vendors = await repo.getAll("vendors");
      const n = await nextNumber("purchaseOrders");
      const id = await repo.add("purchaseOrders", { ...base, number: "#" + n, vendorId: vendors[0]?.id ?? 1, status: "Draft", billStatus: "Not Billed", amountPaid: 0, amountDue: base.total });
      showToast("Purchase order created", "success");
      navigate("/purchase/purchase-orders", { state: { selectedId: id } });
    }
  };

  const trashCurrent = async () => {
    if (!selectedDb?.id) return;
    await repo.remove("proformas", selectedDb.id);
    showToast(`Proforma invoice ${selectedDb.number} moved to trash`, "success");
    setSelectedId(filtered.find((item) => item.id !== selectedDb.id)?.id ?? 0);
    setConfirmAction(null);
  };

  const trashSelected = async () => {
    const ids = [...checked];
    await repo.removeMany("proformas", ids);
    showToast(`${ids.length} proforma ${ids.length === 1 ? "invoice" : "invoices"} moved to trash`, "success");
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
        formData.append("files", await dataUrlToFile(data.image, `proforma-signature-${backendId}.png`));
        const uploadRes = await api.raw.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        signaturePath = uploadRes.data?.data?.file_path || uploadRes.data?.data?.path || data.image;
        await updateProformaInvoice(String(backendId), { signature: signaturePath });
        await queryClient.invalidateQueries({ queryKey: ["proforma-backend-detail", String(backendId)] });
      }

      if (selectedDb?.id) {
        await repo.update("proformas", selectedDb.id, {
          signature: signaturePath,
          signatureName: data.name,
          signatureTitle: data.title,
          signatureDate: data.date,
        });
      }

      showToast("Signature saved", "success");
    } catch {
      showToast("Could not save signature", "error");
    }
  };

  const hasActiveListFilters = !!search.trim() || statusFilter !== "All" || !!customerFilter;

  if (!selected) {
    return createOpen || hasActiveListFilters ? (
      <div className="relative flex h-full w-full bg-[#FAFBFC] overflow-hidden">
        <ResizableListPanel>
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Proforma Invoices</h2>
          </div>
          <div className="px-3 py-2 border-b border-gray-300">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search proforma invoices..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
            </div>
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto px-3 py-2 border-b border-gray-300 hover-scrollbar">
            <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
              {(close) => sortFields.map((item) => (
                <button key={item} onClick={() => { setSortBy(item); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                  {item} {item === sortBy && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </Dropdown>
            <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>
              {(close) => statusList.map((item) => (
                <button key={item} onClick={() => { if (item !== "Trash") setStatusFilter(item); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${item === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>
                  {item} {item === statusFilter && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </Dropdown>
            <CustomerFilter applied={customerFilter} onApply={setCustomerFilter} />
          </div>
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <div>
              <div className="text-sm font-medium text-gray-900">No matching proforma invoices found</div>
              <div className="mt-1 text-xs text-gray-500">Create a new proforma invoice from the panel on the right.</div>
            </div>
          </div>
        </ResizableListPanel>
        <CreateInvoiceForm mode="proforma" onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      </div>
    ) : (
      <ListEmptyState title="No proforma invoices yet" onCreate={() => setCreateOpen(true)} createLabel="New Proforma Invoice" />
    );
  }

  const billingLines = addressLines(selectedDoc?.billing_address);
  const shippingLines = addressLines(selectedDoc?.shipping_address);
  const localBillingLines = [selectedCustomer.street1, selectedCustomer.street2, [selectedCustomer.city, selectedCustomer.zip].filter(Boolean).join(" "), selectedCustomer.country].filter(Boolean);
  const localShippingLines = [selectedCustomer.shipStreet1, selectedCustomer.shipStreet2, [selectedCustomer.shipCity, selectedCustomer.shipZip].filter(Boolean).join(" "), selectedCustomer.shipCountry].filter(Boolean);
  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select proforma invoices to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp...", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Proforma Invoices</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>
                {(close) => (
                  <>
                    <button onClick={(e) => { const title = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: title })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button>
                    <button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button>
                  </>
                )}
              </Dropdown>
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-b border-gray-300">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search proforma invoices..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto px-3 py-2 border-b border-gray-300 hover-scrollbar">
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
            {(close) => sortFields.map((item) => (
              <button key={item} onClick={() => { setSortBy(item); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                {item} {item === sortBy && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </Dropdown>
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>
            {(close) => statusList.map((item) => (
              <button key={item} onClick={() => { if (item !== "Trash") setStatusFilter(item); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${item === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>
                {item} {item === statusFilter && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </Dropdown>
          <CustomerFilter applied={customerFilter} onApply={setCustomerFilter} />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((row) => {
            const active = !selectMode && row.id === selectedId;
            const isChecked = checked.has(Number(row.id));
            return (
              <button key={String(row.id)} onClick={() => (selectMode ? toggleRow(Number(row.id)) : setSelectedId(row.id))} className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{row.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{row.number}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{row.customerSubtitle || row.note}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs text-gray-500">{row.date}</span>
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{row.amount}</span>
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(row.status)}`}>{row.status}</span>
                </div>
              </button>
            );
          })}
          {!selectMode && (
            <button onClick={() => setCreateOpen(true)} className="absolute bottom-[4.5rem] right-5 z-20 flex w-[42px] h-[42px] items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600 transition-colors"><Plus className="w-6 h-6" strokeWidth={2} /></button>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{fmtMoney(listTotal)}</div>
          <div className="text-xs text-gray-500">{filtered.length} Proforma Invoices</div>
        </div>
      </ResizableListPanel>

      {createOpen ? (
        <CreateInvoiceForm mode="proforma" onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editRecord ? (
        <CreateInvoiceForm key={selectedDb.id || selected.backendId} mode="proforma" invoice={editRecord} onClose={() => setEditRecord(null)} onSaved={(id) => { setEditRecord(null); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} Proforma {checked.size === 1 ? "Invoice" : "Invoices"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{fmtMoney(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
                <button className="text-xs text-blue-600 hover:text-blue-700 underline">{selected.customerSubtitle || customerDisplaySubtitle(selectedCustomer) || "View Contact"}</button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {[
                  { icon: Settings, title: "Settings", onClick: () => setModal("settings") },
                  { icon: expanded ? CircleChevronUp : CircleChevronDown, title: expanded ? "Collapse" : "Expand", onClick: () => setExpanded((v) => !v) },
                  { icon: SlidersHorizontal, title: "PDF & Print Settings", onClick: () => setModal("pdfSettings") },
                  { icon: Pencil, title: "Edit", onClick: () => selectedDb?.id && setEditRecord(selectedDb) },
                  { icon: PenTool, title: "Customer Signature", onClick: () => setSigOpen(true) },
                  { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
                  { icon: Printer, title: "Print", onClick: () => setModal("preview") },
                  { icon: Mail, title: "Email", onClick: () => setModal("email") },
                ].map((item) => (
                  <button key={item.title} title={item.title} onClick={item.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><item.icon className="w-4 h-4" /></button>
                ))}
                <Dropdown align="right" panelClass="min-w-[200px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <div className="py-1">
                      <button onClick={() => { showToast("Opening WhatsApp...", "info"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => { convertToInvoice(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Convert to Invoice</button>
                      <div className="relative" onMouseEnter={() => setMarkAsOpen(true)} onMouseLeave={() => setMarkAsOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Mark As <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {markAsOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[150px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {(["Draft", "Sent", "Invoiced", "Cancelled"] as Status[]).map((item) => (
                              <button key={item} onClick={() => { markAs(item); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{item}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {dupOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[190px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {["As Invoice", "As Proforma Invoice", "As Purchase Order"].map((item) => (
                              <button key={item} onClick={() => { duplicateAs(item); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">{item}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { showToast("Signature request sent", "success"); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-200">Signature Request</button>
                      <button onClick={() => { setActivityOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Activity Log</button>
                      <button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button>
                    </div>
                  )}
                </Dropdown>
              </div>
            </div>

            {expanded && (
              <>
                <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
                  <div className="flex items-center gap-10">
                    <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                    <div><div className="text-xs text-gray-500">Proforma Invoice date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(selected.status)}`}>{selected.status}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-5 py-4 border-b border-gray-300">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Billing Address</div>
                    {(billingLines.length ? billingLines : localBillingLines).length
                      ? (billingLines.length ? billingLines : localBillingLines).map((line: string, index: number) => (
                          <div key={index} className={`text-sm ${index === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{line}</div>
                        ))
                      : <div className="text-sm text-gray-400">—</div>}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Shipping Address</div>
                    {(shippingLines.length ? shippingLines : localShippingLines).length
                      ? (shippingLines.length ? shippingLines : localShippingLines).map((line: string, index: number) => (
                          <div key={index} className={`text-sm ${index === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{line}</div>
                        ))
                      : <div className="text-sm text-gray-400">—</div>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 px-5 py-3 border-b border-gray-300">
                  <div>
                    <div className="text-xs text-gray-500">Sub Title</div>
                    <div className="text-sm font-semibold text-gray-900">{apiText(selectedDoc?.sub_title) || selectedDb.subTitle || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Shipping Method</div>
                    <div className="text-sm font-semibold text-gray-900">{apiText(selectedDoc?.shipping_method) || selectedDb.shippingMethod || "—"}</div>
                  </div>
                </div>
              </>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left font-semibold px-5 py-2.5">Sr. No.</th>
                    <th className="text-left font-semibold px-2 py-2.5">Items</th>
                    <th className="text-right font-semibold px-2 py-2.5">Quantity</th>
                    <th className="text-right font-semibold px-2 py-2.5">MRP</th>
                    <th className="text-right font-semibold px-2 py-2.5">Rate</th>
                    <th className="text-left font-semibold px-2 py-2.5">Tax</th>
                    <th className="text-right font-semibold px-2 py-2.5">Discount</th>
                    <th className="text-right font-semibold px-5 py-2.5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">No items</td></tr>}
                  {lines.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-300 align-top">
                      <td className="px-5 py-3 text-gray-700">{index + 1}</td>
                      <td className="px-2 py-3"><div className="font-semibold text-gray-900">{item.name}</div>{item.description && <div className="text-xs text-gray-500 mt-1">{item.description}</div>}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{item.qty || 1}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(0)}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(item.rate)}</td>
                      <td className="px-2 py-3 text-gray-800">{item.tax ? `${item.tax}%` : PF_TAX_NAME[1]}</td>
                      <td className="px-2 py-3 text-right text-gray-500 text-xs">{item.discount ? fmtMoney(item.discount) : "—"}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtMoney(item.amount || item.qty * item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
              <div>
                <label className="text-xs text-gray-500">Notes</label>
                <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{apiText(selectedDoc?.notes) || selectedDb.notes || "—"}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Attachment</label>
                <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                  <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                  <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-md overflow-hidden self-start">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{fmtMoney(numberValue(selectedDoc?.sub_total ?? selectedDb.subTotal))}</span></div>
                <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Total Qty</span><span>{lines.reduce((sum, item) => sum + item.qty, 0).toFixed(2)}</span></div>
                {Object.entries(
                  lines.reduce((acc: Record<number, number>, item) => {
                    const rate = item.tax || 0;
                    acc[rate] = (acc[rate] || 0) + item.amount;
                    return acc;
                  }, {}),
                ).map(([rate, base]: [string, number]) => (
                  <div key={rate} className="flex justify-between px-4 py-2 text-xs text-gray-500">
                    <span>{(PF_TAX_NAME[Number(rate)] || "Tax")} {Number(rate)}% on {fmtMoney(base)}</span>
                    <span>{fmtMoney((base * Number(rate)) / 100)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(numberValue(selectedDoc?.total ?? selectedDb.total))}</span></div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <label className="text-xs text-gray-500">Terms &amp; Conditions</label>
              <div className="mt-1 min-h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{apiText(selectedDoc?.terms_and_conditions) || selectedDb.terms || "—"}</div>
            </div>

            <SignatureBlock
              record={{
                ...selectedDb,
                signature: selectedDoc?.signature || selectedDb.signature,
                signatureName: selectedDb.signatureName,
                signatureTitle: selectedDb.signatureTitle,
                signatureDate: selectedDb.signatureDate,
              }}
              label="Customer Signature"
            />

            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 text-[10px] font-semibold py-1 text-center ${statusBadge(selected.status)}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {modal === "settings" && <AppSettingsModal initialTab="Proforma Invoice" onClose={() => setModal(null)} />}
      {modal === "preview" && !!selectedDb.id && <PdfPreviewModal docType="proformaInvoice" recordId={selectedDb.id} title="Proforma Invoice " onClose={() => setModal(null)} />}
      {modal === "email" && <EmailModal onClose={() => setModal(null)} row={selected} />}
      {modal === "pdfSettings" && <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="proformaInvoice" />}
      {sigOpen && <SignatureModal heading="Customer Signature" defaultName={selectedCustomer.contact || selectedCustomer.name || ""} onDone={saveSignature} onClose={() => setSigOpen(false)} />}
      {activityOpen && (
        <Overlay onClose={() => setActivityOpen(false)}>
          <div className="w-full max-w-md my-16 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
              <h3 className="text-base font-semibold text-gray-900">Activity Log — Proforma Invoice {selected.number}</h3>
              <button onClick={() => setActivityOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {[
                ...(selectedDb.signatureDate ? [{ text: `Customer signature added by ${selectedDb.signatureName || "customer"}.`, date: selectedDb.signatureDate }] : []),
                ...(selected.status && selected.status !== "Draft" ? [{ text: `Marked as ${selected.status}.`, date: selected.date }] : []),
                { text: `Proforma Invoice ${selected.number} created.`, date: selected.date },
              ].map((row, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0"><Plus className="w-4 h-4" /></div>
                  <div>
                    <div className="text-sm text-gray-800">{row.text}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{row.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Overlay>
      )}
      {confirmAction === "trashOne" && <ConfirmAlert message="Are you sure want to trash this proforma invoice?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />}
      {confirmAction === "trashSelected" && <ConfirmAlert message="Are you sure want to delete these proforma invoices?" onNo={() => setConfirmAction(null)} onYes={trashSelected} />}
    </div>
  );
};

export default ProformaInvoices;
