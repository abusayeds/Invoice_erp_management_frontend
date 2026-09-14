/** Vendors list — backend pagination via /vendor/all */
import { fetchPaginatedList } from "./paginatedList";
import type { TPartyPagination } from "./customerTypes";

export type VendorListRow = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  opening_balance?: number;
  isArchive?: boolean;
  isDeleted?: boolean;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

const mapVendor = (doc: any): VendorListRow => ({
  _id: String(doc._id),
  name: text(doc?.businessProfile?.companyName) || text(doc?.company_name) || text(doc?.name) || "—",
  email: text(doc?.email) || undefined,
  phone: text(doc?.phone) || undefined,
  company_name: text(doc?.businessProfile?.companyName) || text(doc?.company_name) || undefined,
  opening_balance: typeof doc?.opening_balance === "number" ? doc.opening_balance : Number(doc?.opening_balance) || 0,
  isArchive: !!doc?.isArchive,
  isDeleted: !!doc?.isDeleted,
});

export async function fetchVendors(params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  isArchive?: boolean;
  isDeleted?: boolean;
}): Promise<{ rows: VendorListRow[]; pagination: TPartyPagination }> {
  const { rows, pagination } = await fetchPaginatedList<any>("/vendor/all", {
    page: params.page,
    limit: params.limit,
    searchTerm: params.searchTerm,
    sort: params.sort,
    isArchive: params.isArchive ? "true" : undefined,
    isDeleted: params.isDeleted ? "true" : undefined,
  });
  return { rows: rows.map(mapVendor), pagination };
}
