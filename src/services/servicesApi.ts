/** Services list — backend pagination via /service/all */
import { api } from "@/lib/api/client";
import { fetchPaginatedList } from "./paginatedList";
import type { TPartyPagination } from "./customerTypes";

export type ServiceListRow = {
  _id: string;
  name: string;
  note: string;
  price: number;
  sac: string;
  qty: string;
  unit: string;
  tax: string;
  currency: string;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

const mapService = (doc: any): ServiceListRow => {
  const taxes = Array.isArray(doc.taxes) ? doc.taxes.map((t: unknown) => text(t)).filter(Boolean) : [];
  return {
    _id: String(doc._id),
    name: text(doc.serviceName) || "—",
    note: text(doc.description) || "",
    price: num(doc.rate),
    sac: doc.sac ? "Yes" : "—",
    qty: String(doc.quantity ?? 1),
    unit: text(doc.unitType) || "box",
    tax: taxes[0] || "—",
    currency: text(doc.currency) || "USD",
  };
};

export async function fetchServices(params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  isDeleted?: boolean;
  isArchive?: boolean;
}): Promise<{ rows: ServiceListRow[]; pagination: TPartyPagination }> {
  const { rows, pagination } = await fetchPaginatedList<any>("/service/all", {
    page: params.page,
    limit: params.limit,
    searchTerm: params.searchTerm,
    sort: params.sort,
    isDeleted: params.isDeleted ? "true" : undefined,
    isArchive: params.isArchive ? "true" : undefined,
  });
  return { rows: rows.map(mapService), pagination };
}

export async function deleteService(id: string): Promise<void> {
  await api.raw.delete(`/service/${id}`);
}

export async function deleteServices(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await Promise.all(ids.map((id) => deleteService(id)));
}
