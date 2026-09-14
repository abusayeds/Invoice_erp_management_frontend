/** Bills list — backend pagination via /bill/all */
import { fetchPaginatedList } from "./paginatedList";
import type { TPartyPagination } from "./customerTypes";

export type BillListRow = {
  _id: string;
  number: string;
  vendorName: string;
  amount: number;
  dateLabel: string;
  status: string;
  currency: string;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const mapBill = (doc: any): BillListRow => ({
  _id: String(doc._id),
  number: text(doc.invoice_number || doc.bill_number || doc.number) || "—",
  vendorName: text(doc?.vendor_id?.businessProfile?.companyName) || text(doc?.vendor_id?.name) || text(doc?.vendor_name) || "—",
  amount: num(doc.total ?? doc.grand_total),
  dateLabel: formatDate(doc.date || doc.bill_date || doc.createdAt),
  status: text(doc.status) || "Draft",
  currency: text(doc.currency) || "USD",
});

export async function fetchBills(params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  status?: string;
  isDeleted?: boolean;
}): Promise<{ rows: BillListRow[]; pagination: TPartyPagination }> {
  const { rows, pagination } = await fetchPaginatedList<any>("/bill/all", {
    page: params.page,
    limit: params.limit,
    searchTerm: params.searchTerm,
    sort: params.sort,
    status: params.status && params.status !== "All" ? params.status : undefined,
    isDeleted: params.isDeleted ? "true" : undefined,
  });
  return { rows: rows.map(mapBill), pagination };
}
