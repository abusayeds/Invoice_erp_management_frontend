/** Vendor payments (Payment Made) — backend pagination via /account/vendor-payments/all */
import { fetchPaginatedList } from "./paginatedList";
import type { TPartyPagination } from "./customerTypes";

export type VendorPaymentListRow = {
  _id: string;
  number: string;
  vendorName: string;
  note: string;
  amount: number;
  dateLabel: string;
  method: string;
  billNo: string;
  status: string;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const mapVendorPayment = (doc: any): VendorPaymentListRow => {
  const methods = Array.isArray(doc.payment_method) ? doc.payment_method : [];
  const firstAlloc = Array.isArray(doc.allocations) ? doc.allocations[0] : null;
  const billRef =
    text(firstAlloc?.invoice_id?.invoice_number) ||
    text(firstAlloc?.invoice_number) ||
    text(doc.reference_number) ||
    "—";
  return {
    _id: String(doc._id),
    number: text(doc.payment_number) || "—",
    vendorName:
      text(doc?.vendor_id?.businessProfile?.companyName) ||
      text(doc?.vendor_id?.name) ||
      text(doc?.vendor_name) ||
      "—",
    note: text(doc.notes) || "No Notes",
    amount: num(doc.payment_amount ?? doc.total ?? doc.amount),
    dateLabel: formatDate(doc.payment_date || doc.date || doc.createdAt),
    method: methods[0] ? String(methods[0]) : "Cash",
    billNo: billRef.startsWith("#") || billRef === "—" ? billRef : `#${billRef}`,
    status: text(doc.status) || "pending",
  };
};

export async function fetchVendorPayments(params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  status?: string;
  isDeleted?: boolean;
}): Promise<{ rows: VendorPaymentListRow[]; pagination: TPartyPagination }> {
  const { rows, pagination } = await fetchPaginatedList<any>("/account/vendor-payments/all", {
    page: params.page,
    limit: params.limit,
    searchTerm: params.searchTerm,
    sort: params.sort,
    status: params.status && params.status !== "All" ? params.status : undefined,
    isDeleted: params.isDeleted ? "true" : undefined,
  });
  return { rows: rows.map(mapVendorPayment), pagination };
}
