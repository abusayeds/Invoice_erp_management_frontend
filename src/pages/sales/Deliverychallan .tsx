import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListEmptyState } from "@/components/ListEmptyState";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, nextNumber, money as fmtMoney, CreateDocForm, PdfPreviewModal } from "@/lib/db";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { SignatureModal } from "@/components/modals/SignatureModal";
import { SignatureBlock } from "@/components/ui/SignatureBlock";
import { SignatureRequestModal } from "@/components/modals/SignatureRequestModal";
import { ActivityLogModal } from "@/components/modals/ActivityLogModal";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { showToast } from "@/utils/toast";
import { api } from "@/lib/api/client";
import { fetchCustomers, type TCustomerRow } from "@/services/customersApi";
import { deleteDeliveryChallan, fetchDeliveryChallan, fetchDeliveryChallans, updateDeliveryChallan, type BackendDeliveryChallanDoc } from "@/services/deliveryChallansApi";
import { Search, Plus, ChevronDown, ChevronRight, Check, Settings, SlidersHorizontal, Pencil, PenTool, Eye, Printer, Mail, MoreVertical, Upload, FileText, Trash2, MessageCircle, CircleChevronUp, CircleChevronDown } from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
type Status = "Draft" | "Open" | "Delivered" | "Cancelled";
type ChallanRow = {
  id: number | string;
  backendId: string;
  name: string;
  customerSubtitle: string;
  number: string;
  note: string;
  date: string;
  amount: string;
  status: string;
  currency: string;
};

const sortFields = ["Name", "Delivery Challan date", "Delivery Challan #", "Status", "Total"];
const sortDirections: Array<"Ascending" | "Descending"> = ["Ascending", "Descending"];
const statusList = ["All", "Draft", "Open", "Delivered", "Cancelled", "Trash"];
const markAsStatuses = ["Open", "Draft", "Delivered", "Cancelled"];
const duplicateAs = ["As Invoice", "As Delivery Challan"];
const CH_TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
const nowLabel = () => "Today " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const dateRanges = ["All", "Today", "This Week", "This Month", "Last 30 Days", "This Year"];
const STATUS_BADGE: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700 border-gray-300",
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  Delivered: "bg-green-100 text-green-700 border-green-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const numberValue = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);
const badgeOf = (value: string) => STATUS_BADGE[value] || "bg-gray-100 text-gray-700 border-gray-300";
const apiText = (value: unknown): string => text(value);
const customerDisplayName = (customer: any): string => apiText(customer?.businessProfile?.companyName) || apiText(customer?.company_name) || apiText(customer?.name) || "—";
const customerDisplaySubtitle = (customer: any): string => [apiText(customer?.name), apiText(customer?.email)].filter(Boolean).join(" · ");
const addressLines = (address?: BackendDeliveryChallanDoc["billing_address"]) => [address?.street, address?.street2, [address?.city, address?.state, address?.zip].filter(Boolean).join(", "), address?.country].filter(Boolean);
const challanSortToBackend = (value: string) => {
  switch (value) {
    case "Delivery Challan #":
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

/* ── Outside-click dropdown ────────────────────────────────────── */
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

/* ── Modal shell ───────────────────────────────────────────────── */
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

/* ── DELIVERY CHALLAN preview (white document) ─────────────────── */
const EmailModal: React.FC<{ onClose: () => void; row: ChallanRow }> = ({ onClose, row }) => (
  <Overlay onClose={onClose}>
    <div className="w-full max-w-2xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
        <h3 className="text-base font-medium text-gray-900">Delivery Challan {row.number} from info</h3>
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
        <input defaultValue={`Delivery Challan ${row.number} from info`} className="w-full border-b border-gray-300 pb-2 text-sm outline-none bg-transparent text-gray-900" />
        <div className="text-sm text-gray-700 border-b border-gray-300 pb-2">From: info@inovoic.com</div>
        <div className="text-sm text-gray-800 space-y-2 min-h-[120px]">
          <p>Dear {row.name}</p>
          <p>Delivery Challan {row.number}<br />Total Amount: {row.amount}</p>
          <span className="inline-block px-4 py-2 bg-gray-100 rounded text-blue-600 font-semibold">Delivery Challan {row.number}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input type="checkbox" defaultChecked className="accent-blue-600" /> Powered by Moon Invoice
        </label>
      </div>
    </div>
  </Overlay>
);

/* ── Component ──────────────────────────────────────────────────── */
const CustomerFilter: React.FC<{ applied: string | null; onApply: (customerId: string | null) => void }> = ({ applied, onApply }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const customerQuery = useQuery({
    queryKey: ["delivery-challan-customer-filter", q],
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

export const DeliveryChallan: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const navSelectedId = (location.state as { selectedId?: number } | null)?.selectedId;
  const [selectedId, setSelectedId] = useState<number | string>(navSelectedId ?? 0);
  useEffect(() => { if (navSelectedId != null) setSelectedId(navSelectedId); }, [navSelectedId]);
  const [sortBy, setSortBy] = useState("Delivery Challan date");
  const [sortDir, setSortDir] = useState<"Ascending" | "Descending">("Descending");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "settings" | "preview" | "email" | "pdfSettings">(null);
  const [markAsOpen, setMarkAsOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigRequestOpen, setSigRequestOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "trashOne" | "trashSelected">(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const dbChallans = useCollection<any>("deliveryChallans");
  const dbCustomers = useCollection<any>("customers", "name");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const range = useMemo(() => dateRangeFor(dateFilter), [dateFilter]);
  const listQuery = useQuery({
    queryKey: ["delivery-challans", search, sortBy, sortDir, statusFilter, customerFilter, dateFilter],
    queryFn: async () => fetchDeliveryChallans({
      page: 1,
      limit: 100,
      searchTerm: search || undefined,
      sort: `${sortDir === "Descending" ? "-" : ""}${challanSortToBackend(sortBy)}`,
      status: statusFilter,
      customer_id: customerFilter || undefined,
      dateField: "date",
      ...range,
    }),
    staleTime: 10_000,
  });
  const challans: ChallanRow[] = useMemo(
    () => (listQuery.data?.rows ?? []).map((row) => {
      const linkedLocal = dbChallans.find((item) => String(item._id) === row._id);
      return {
        id: linkedLocal?.id ?? row._id,
        backendId: row._id,
        name: row.customerName,
        customerSubtitle: row.customerSubtitle,
        number: row.number,
        note: linkedLocal?.notes || "No Notes",
        date: row.dateLabel,
        amount: fmtMoney(row.amount, row.currency || "USD"),
        status: row.status,
        currency: row.currency || "USD",
      };
    }),
    [dbChallans, listQuery.data?.rows],
  );
  useEffect(() => {
    if (challans.length === 0) return;
    const active = challans.find((item) => item.backendId === String(selectedId) || String(item.id) === String(selectedId));
    if (!active) setSelectedId(challans[0].backendId);
  }, [challans, selectedId]);
  const selected = challans.find((item) => item.backendId === String(selectedId) || String(item.id) === String(selectedId)) || challans[0];
  const selectedDb: any = dbChallans.find((item) => String(item._id) === selected?.backendId || String(item.id) === String(selectedId)) || {};
  const detailQuery = useQuery({
    queryKey: ["delivery-challan", selected?.backendId],
    queryFn: async () => (selected?.backendId ? fetchDeliveryChallan(selected.backendId) : null),
    enabled: !!selected?.backendId && !createOpen && !editOpen,
    staleTime: 10_000,
  });
  const selectedDoc = detailQuery.data;
  const selectedCustomer: any = selectedDb.customerId ? dbCustomers.find((c) => c.id === selectedDb.customerId) : null;

  /* Append an event to the challan's activity log. */
  const logActivity = async (kind: string, text: string) => {
    const rec = dbChallans.find((d) => d.id === selectedDb.id);
    await repo.update("deliveryChallans", selectedDb.id, { activity: [...(rec?.activity || []), { kind, text, ts: Date.now(), dateLabel: nowLabel() }] });
  };
  const markAs = async (status: string) => {
    if (selected?.backendId) {
      await updateDeliveryChallan(selected.backendId, { status });
      await queryClient.invalidateQueries({ queryKey: ["delivery-challans"] });
      await queryClient.invalidateQueries({ queryKey: ["delivery-challan", selected.backendId] });
    }
    if (selectedDb?.id) await repo.update("deliveryChallans", selectedDb.id, { status });
    await logActivity(status === "Open" ? "sent" : "status", `Delivery Challan ${selectedDb.number} mark as ${status.toLowerCase()}.`);
    showToast(`Delivery challan marked as ${status}`, "success");
  };
  const convertToInvoice = async () => {
    if (!selectedDb?.id) return;
    const n = await nextNumber("invoices");
    const id = await repo.add("invoices", {
      number: "#" + n, customerId: selectedDb.customerId, date: selectedDb.date, due: selectedDb.due || selectedDb.date,
      ts: Date.now(), status: "Draft", items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0,
      tax: selectedDb.tax || 0, shipping: 0, total: selectedDb.total || 0, amountPaid: 0,
      amountDue: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "",
    });
    await repo.update("deliveryChallans", selectedDb.id, { invoiceNo: "#" + n, invoiceStatus: "Invoiced" });
    await logActivity("sent", `Delivery Challan ${selectedDb.number} converted to invoice.`);
    showToast("Converted to invoice", "success");
    navigate("/sales/sales-invoice", { state: { selectedId: id } });
  };
  const duplicateChAs = async (label: string) => {
    const base = {
      customerId: selectedDb.customerId, date: selectedDb.date, due: selectedDb.due, ts: Date.now(),
      items: selectedDb.items || [], subTotal: selectedDb.subTotal || 0, tax: selectedDb.tax || 0,
      total: selectedDb.total || 0, notes: selectedDb.notes || "", terms: selectedDb.terms || "",
    };
    if (label === "As Invoice") {
      const n = await nextNumber("invoices");
      const id = await repo.add("invoices", { ...base, number: "#" + n, status: "Draft", amountPaid: 0, amountDue: base.total });
      showToast("Invoice created", "success");
      navigate("/sales/sales-invoice", { state: { selectedId: id } });
    } else if (label === "As Delivery Challan") {
      const n = await nextNumber("deliveryChallans");
      const id = await repo.add("deliveryChallans", { ...base, number: "#" + n, status: "Draft", invoiceNo: "-", invoiceStatus: "Not Invoiced", amountPaid: 0, amountDue: base.total });
      setSelectedId(id);
      showToast("Delivery challan duplicated", "success");
    }
  };
  const trashCurrent = async () => {
    if (selected?.backendId) await deleteDeliveryChallan(selected.backendId);
    showToast(`Delivery Challan ${selectedDb.number} moved to trash`, "success");
    await queryClient.invalidateQueries({ queryKey: ["delivery-challans"] });
    setSelectedId(challans.find((c) => c.backendId !== selected?.backendId)?.backendId ?? 0);
    setConfirmAction(null);
  };
  const trashSelectedCh = async () => {
    const ids = [...checked];
    await Promise.all(ids.map((id) => deleteDeliveryChallan(id)));
    showToast(`${ids.length} delivery ${ids.length === 1 ? "challan" : "challans"} moved to trash`, "success");
    await queryClient.invalidateQueries({ queryKey: ["delivery-challans"] });
    if (selected?.backendId && ids.includes(selected.backendId)) setSelectedId(challans.find((c) => !ids.includes(c.backendId))?.backendId ?? 0);
    setConfirmAction(null);
    exitSelect();
  };
  const saveSignature = async (data: { image: string; name: string; title: string; date: string }) => {
    let signatureValue = data.image;
    if (selected?.backendId) {
      const file = await dataUrlToFile(data.image, `delivery-challan-signature-${selected.backendId}.png`);
      const formData = new FormData();
      formData.append("file", file);
      const upload = await api.raw.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      signatureValue = text(upload.data?.data?.[0]?.path || upload.data?.data?.path || upload.data?.path) || data.image;
      await updateDeliveryChallan(selected.backendId, { signature: signatureValue });
      await queryClient.invalidateQueries({ queryKey: ["delivery-challan", selected.backendId] });
    }
    if (selectedDb?.id) await repo.update("deliveryChallans", selectedDb.id, { signature: signatureValue, signatureName: data.name, signatureTitle: data.title, signatureDate: data.date });
    await logActivity("status", `Customer signature added to Delivery Challan ${selectedDb.number}.`);
    showToast("Signature saved", "success");
  };

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filtered = challans;
  const listTotal = filtered.reduce((s, i) => s + num(i.amount), 0);
  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.backendId));
  const selectedTotal = challans.filter((i) => checked.has(i.backendId)).reduce((s, i) => s + num(i.amount), 0);
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: string) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.backendId))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  const actionIcons: { icon: React.ElementType; title: string; onClick?: () => void }[] = [
    { icon: Settings, title: "Settings", onClick: () => setModal("settings") },
    { icon: expanded ? CircleChevronUp : CircleChevronDown, title: expanded ? "Collapse" : "Expand", onClick: () => setExpanded((v) => !v) },
    { icon: SlidersHorizontal, title: "PDF & Print Settings", onClick: () => setModal("pdfSettings") },
    { icon: Pencil, title: "Edit", onClick: () => setEditOpen(true) },
    { icon: PenTool, title: "Customer Signature", onClick: () => setSigOpen(true) },
    { icon: Eye, title: "Preview", onClick: () => setModal("preview") },
    { icon: Printer, title: "Print", onClick: () => { logActivity("printed", `Delivery Challan ${selectedDb.number} printed.`); setModal("preview"); } },
    { icon: Mail, title: "Email", onClick: () => setModal("email") },
  ];

  if (!selected && !createOpen && !search && statusFilter === "All" && !customerFilter) return <ListEmptyState title="No delivery challans yet" onCreate={() => setCreateOpen(true)} createLabel="New Delivery Challan" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              <button title="Delete" onClick={() => (checked.size === 0 ? showToast("Select delivery challans to delete", "warning") : setConfirmAction("trashSelected"))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Trash2 className="w-4 h-4" /></button>
              <button title="WhatsApp" onClick={() => showToast("Opening WhatsApp…", "info")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><MessageCircle className="w-4 h-4" /></button>
              <button title="Email" onClick={() => setModal("email")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Mail className="w-4 h-4" /></button>
              <button title="Preview" onClick={() => setModal("preview")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
              <button title="Done" onClick={exitSelect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Check className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Delivery Challans</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}

        {/* search */}
        <div className="px-3 py-2 border-b border-gray-300">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search delivery challans..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="hover-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto px-3 py-2 border-b border-gray-300">
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
            {(close) => (
              <>
                {sortFields.map((o) => (
                  <button key={o} onClick={() => { setSortBy(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
                <div className="border-t border-gray-200 my-1" />
                {sortDirections.map((d) => (
                  <button key={d} onClick={() => { setSortDir(d); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{d} {d === sortDir && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
              </>
            )}
          </Dropdown>
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>
            {(close) => statusList.map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s === "Trash" ? statusFilter : s); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${s === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>{s} {s === statusFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <CustomerFilter applied={customerFilter} onApply={setCustomerFilter} />
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Delivery Challan date | {dateFilter}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => dateRanges.map((d) => (
              <button key={d} onClick={() => { setDateFilter(d); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{d} {d === dateFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((p) => {
            const active = !selectMode && !createOpen && !editOpen && p.backendId === selected?.backendId;
            const isChecked = checked.has(p.backendId);
            return (
              <button key={p.backendId} onClick={() => (selectMode ? toggleRow(p.backendId) : (setSelectedId(p.backendId), setCreateOpen(false), setEditOpen(false)))}
                className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.number}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{p.note}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs text-gray-500">{p.date}</span>
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">{p.amount}</span>
                  <span className={`mt-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeOf(p.status)}`}>{p.status}</span>
                </div>
              </button>
            );
          })}
          </div>
          {/* FAB */}
          {!selectMode && (
            <button onClick={() => setCreateOpen(true)} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{money(listTotal)}</div>
          <div className="text-xs text-gray-500">{filtered.length} Delivery Challans</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {createOpen || (!selected && (search || statusFilter !== "All" || customerFilter)) ? (
        <CreateDocForm collection="deliveryChallans" title="New Delivery Challan" party="customers" onClose={() => setCreateOpen(false)} onSaved={(id) => setSelectedId(id)} />
      ) : editOpen ? (
        <CreateDocForm key={selectedId} collection="deliveryChallans" title="Edit Delivery Challan" party="customers" record={selectedDb} onClose={() => setEditOpen(false)} onSaved={(id) => { setEditOpen(false); setSelectedId(id); }} />
      ) : selectMode ? (
        <section className="flex-1 flex items-center justify-center m-2 bg-white border border-gray-300 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900 mb-8">{checked.size} Delivery {checked.size === 1 ? "Challan" : "Challans"} Selected</h2>
            <div className="inline-grid grid-cols-[auto_auto] gap-x-10 gap-y-3 text-left">
              <span className="text-gray-500">Total</span><span className="font-semibold text-gray-900">{money(selectedTotal)}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col m-2 bg-white border border-gray-300 shadow-sm">
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between gap-3 px-6 border-b border-gray-300 bg-gray-100">
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
                <button className="text-xs text-blue-600 hover:text-blue-700 underline">View Contact</button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {actionIcons.map((a) => (
                  <button key={a.title} title={a.title} onClick={a.onClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><a.icon className="w-4 h-4" /></button>
                ))}
                {/* ⋮ menu (reference: WhatsApp / Convert to Invoice / Mark As ▸ / Duplicate ▸ / Signature Request / Activity Log / Trash) */}
                <Dropdown align="right" panelClass="min-w-[200px]" trigger={<span title="More" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 cursor-pointer"><MoreVertical className="w-4 h-4" /></span>}>
                  {(close) => (
                    <div className="py-1">
                      <button onClick={() => { showToast("Opening WhatsApp…", "info"); close(); }} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">WhatsApp <MessageCircle className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => { convertToInvoice(); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Convert to Invoice</button>
                      <div className="relative" onMouseEnter={() => setMarkAsOpen(true)} onMouseLeave={() => setMarkAsOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Mark As <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {markAsOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[150px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {markAsStatuses.map((st) => (
                              <button key={st} onClick={() => { markAs(st); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{st}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative" onMouseEnter={() => setDupOpen(true)} onMouseLeave={() => setDupOpen(false)}>
                        <button className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Duplicate <ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        {dupOpen && (
                          <div className="absolute right-full top-0 mr-0.5 min-w-[190px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40">
                            {duplicateAs.map((st) => (
                              <button key={st} onClick={() => { duplicateChAs(st); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left whitespace-nowrap">{st}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setSigRequestOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-200">Signature Request</button>
                      <button onClick={() => { setActivityOpen(true); close(); }} className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">Activity Log</button>
                      <button onClick={() => { setConfirmAction("trashOne"); close(); }} className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200">Trash</button>
                    </div>
                  )}
                </Dropdown>
              </div>
            </div>

            {/* Expandable info panel (chevron toggle) */}
            {expanded && (
            <>
            {/* meta row — #, date, Invoice #, Invoice Status, status badge */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-300">
              <div className="flex items-center gap-10">
                <div><div className="text-xs text-gray-500">{selected.number}</div><div className="text-sm font-semibold text-gray-900">{selected.amount}</div></div>
                <div><div className="text-xs text-gray-500">Delivery Challan date</div><div className="text-sm font-semibold text-gray-900">{selected.date}</div></div>
                <div><div className="text-xs text-gray-500">Invoice #</div><div className="text-sm font-semibold text-gray-900">{apiText(selectedDoc?.invoice_number) || "—"}</div></div>
                <div><div className="text-xs text-gray-500">Currency</div><div className="text-sm font-semibold text-gray-900">{selected.currency}</div></div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badgeOf(selected.status)}`}>{selected.status}</span>
            </div>

            {/* billing address + sub title (live from the customer / record) */}
            <div className="px-5 py-4 border-b border-gray-300 space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Billing Address</div>
                {addressLines(selectedDoc?.billing_address).length
                  ? addressLines(selectedDoc?.billing_address).map((l: string, i: number) => (
                      <div key={i} className={`text-sm ${i === 0 ? "font-semibold text-gray-900" : "text-gray-700"}`}>{l}</div>
                    ))
                  : <div className="text-sm text-gray-400">—</div>}
              </div>
              <div>
                <div className="text-xs text-gray-500">Sub Title</div>
                <div className="text-sm font-semibold text-gray-900">{apiText(selectedDoc?.sub_title) || selectedDb.subTitle || "—"}</div>
              </div>
            </div>
            </>
            )}

            {/* line items */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left font-semibold px-5 py-2.5">Sr. No.</th>
                    <th className="text-left font-semibold px-2 py-2.5">Items</th>
                    <th className="text-right font-semibold px-2 py-2.5">Quantity</th>
                    <th className="text-right font-semibold px-2 py-2.5">Rate</th>
                    <th className="text-left font-semibold px-2 py-2.5">Tax</th>
                    <th className="text-right font-semibold px-2 py-2.5">Discount</th>
                    <th className="text-right font-semibold px-5 py-2.5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(((selectedDoc?.product ?? []) as any[]).length === 0) && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No items</td></tr>
                  )}
                  {((selectedDoc?.product ?? []) as any[]).map((it: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-300 align-top">
                      <td className="px-5 py-3 text-gray-700">{idx + 1}</td>
                      <td className="px-2 py-3"><div className="font-semibold text-gray-900">{apiText(it.product_name) || apiText(it.service_name) || "Item"}</div>{it.description && <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{numberValue(it.quantity) || 1}</td>
                      <td className="px-2 py-3 text-right text-gray-800">{fmtMoney(numberValue(it.rate), selected.currency)}</td>
                      <td className="px-2 py-3 text-gray-800">{CH_TAX_NAME[numberValue(it.tax) || 1]}</td>
                      <td className="px-2 py-3 text-right text-gray-500 text-xs">{numberValue(it.discount) ? `${numberValue(it.discount)}%` : "—"}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtMoney(numberValue(it.amount), selected.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* terms + notes + attachment + totals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 py-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500">Terms &amp; Conditions</label>
                  <div className="mt-1 min-h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{apiText(selectedDoc?.terms_and_conditions) || selectedDb.terms || "—"}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Attachment</label>
                  <div className="mt-1 grid grid-cols-2 border border-gray-200 rounded-md divide-x divide-gray-200">
                    <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Upload className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Computer</span></button>
                    <button className="flex flex-col items-center gap-2 py-4 hover:bg-gray-50"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-xs text-gray-600">Upload from Document</span></button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Notes</label>
                <div className="mt-1 h-24 border border-gray-200 rounded-md p-3 text-sm text-gray-700">{apiText(selectedDoc?.notes) || selected.note}</div>
              </div>
              <div className="border border-gray-200 rounded-md overflow-hidden self-start">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{fmtMoney(numberValue(selectedDoc?.sub_total ?? selectedDb.subTotal), selected.currency)}</span></div>
                <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{fmtMoney(numberValue(selectedDoc?.total ?? selectedDb.total), selected.currency)}</span></div>
              </div>
            </div>

            {/* saved signature (shows after Add Signature) */}
            <SignatureBlock record={{ ...selectedDb, signature: selectedDoc?.signature || selectedDb.signature }} label="Customer Signature" />

            {/* status corner ribbon */}
            <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
              <div className={`absolute bottom-[18px] -left-[34px] w-32 rotate-45 border text-[10px] font-semibold py-1 text-center ${badgeOf(selected.status)}`}>{selected.status}</div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "settings" && <AppSettingsModal initialTab="Delivery Challan" onClose={() => setModal(null)} />}
      {modal === "preview" && (() => { const d: any = dbChallans.find((x) => String(x._id) === selected?.backendId || String(x.id) === String(selectedId)) || {}; return <PdfPreviewModal docType="deliveryChallan" recordId={d.id} title={`Delivery Challan `} onClose={() => setModal(null)} />; })()}
      {modal === "email" && selected && <EmailModal onClose={() => setModal(null)} row={selected} />}
      {modal === "pdfSettings" && (
        <PdfPrintSettingsModal onClose={() => setModal(null)} initialDocType="deliveryChallan" />
      )}
      {sigOpen && (
        <SignatureModal
          heading="Customer Signature"
          defaultName={selectedCustomer?.contact || selectedCustomer?.name || customerDisplayName(selectedDoc?.customer_id) || ""}
          onDone={saveSignature}
          onClose={() => setSigOpen(false)}
        />
      )}
      {sigRequestOpen && (
        <SignatureRequestModal
          docLabel="Delivery Challan"
          number={selectedDb.number || selected?.number || ""}
          customer={selectedCustomer || selectedDoc?.customer_id}
          onClose={() => setSigRequestOpen(false)}
          onSend={() => { logActivity("sent", `Signature request for Delivery Challan ${selectedDb.number} sent.`); showToast("Signature request sent", "success"); }}
        />
      )}
      {activityOpen && <ActivityLogModal docLabel="Delivery Challan" record={selectedDb} onClose={() => setActivityOpen(false)} />}
      {confirmAction === "trashOne" && (
        <ConfirmAlert message="Are you sure want to trash this delivery challan?" onNo={() => setConfirmAction(null)} onYes={trashCurrent} />
      )}
      {confirmAction === "trashSelected" && (
        <ConfirmAlert message="Are you sure want to delete these delivery challans?" onNo={() => setConfirmAction(null)} onYes={trashSelectedCh} />
      )}
      
    </div>
  );
};

export default DeliveryChallan;
