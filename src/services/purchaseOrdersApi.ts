/** Purchase Orders list — backend pagination via /purchase/invoices/all */
import { fetchPaginatedList } from "@/services/paginatedList";
import type { TPartyPagination } from "@/services/customerTypes";

export type PurchaseOrderListRow = {
  _id: string;
  number: string;
  vendorName: string;
  dateLabel: string;
  amount: number;
  currency: string;
  status: string;
};

const mapRow = (doc: any): PurchaseOrderListRow => ({
  _id: String(doc._id ?? ""),
  number: String(doc.invoice_number ?? doc.number ?? ""),
  vendorName:
    doc.vendor_id?.businessProfile?.companyName ||
    doc.vendor_id?.name ||
    doc.vendor_name ||
    "(No vendor)",
  dateLabel: doc.date
    ? new Date(doc.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—",
  amount: typeof doc.total === "number" ? doc.total : Number(doc.total) || 0,
  currency: String(doc.currency || "USD"),
  status: String(doc.status || "draft"),
});

export async function fetchPurchaseOrders(params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  status?: string;
  isDeleted?: boolean;
  vendor_id?: string;
  dateField?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ rows: PurchaseOrderListRow[]; pagination: TPartyPagination }> {
  const { rows, pagination } = await fetchPaginatedList<any>("/purchase/invoices/all", {
    page: params.page,
    limit: params.limit,
    searchTerm: params.searchTerm,
    sort: params.sort,
    status: params.status,
    isDeleted: params.isDeleted,
    vendor_id: params.vendor_id,
    dateField: params.dateField,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  return {
    rows: rows.map(mapRow),
    pagination,
  };
}
