/** Products list — backend pagination via /product/all */
import { api } from "@/lib/api/client";
import { fetchPaginatedList } from "./paginatedList";
import type { TPartyPagination } from "./customerTypes";

export type ProductListRow = {
  _id: string;
  name: string;
  category: string;
  categoryId: string;
  note: string;
  price: number;
  stock: number | null;
  sku: string;
  qty: string;
  unit: string;
  buyPrice: number;
  image: string | null;
  onHand: string;
  committed: string;
  available: string;
  toInvoiced: string;
  toBilled: string;
  currency: string;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const fixed = (v: unknown) => num(v).toFixed(2);

const categoryLabel = (doc: any): { name: string; id: string } => {
  const cat = doc?.category;
  if (cat && typeof cat === "object") {
    return {
      id: text(cat._id),
      name: text(cat.category || cat.name) || "No Category",
    };
  }
  if (typeof cat === "string" && cat) return { id: cat, name: "No Category" };
  return { id: "", name: "No Category" };
};

const mapProduct = (doc: any): ProductListRow => {
  const { name: category, id: categoryId } = categoryLabel(doc);
  const stock = doc?.stock;
  const hasStock = stock != null;
  const onHand = hasStock ? num(stock.onHandStock) : null;
  return {
    _id: String(doc._id),
    name: text(doc.productName) || "—",
    category,
    categoryId,
    note: text(doc.description) || "No Notes",
    price: num(doc?.pricing?.sellPrice ?? doc.sellPrice),
    stock: onHand,
    sku: text(doc.sku) || "—",
    qty: String(doc.quantity ?? 0),
    unit: text(doc.unitType) || "pcs",
    buyPrice: num(doc?.pricing?.buyPrice),
    image: text(doc.image) || null,
    onHand: hasStock ? fixed(stock.onHandStock) : "0.00",
    committed: hasStock ? fixed(stock.committedStock) : "0.00",
    available: hasStock ? fixed(stock.availableForSale) : "0.00",
    toInvoiced: hasStock ? fixed(stock.toBeInvoiced) : "0.00",
    toBilled: hasStock ? fixed(stock.toBeBilled) : "0.00",
    currency: text(doc?.pricing?.currency) || "USD",
  };
};

export async function fetchProducts(params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  category?: string;
  isDeleted?: boolean;
  isArchive?: boolean;
}): Promise<{ rows: ProductListRow[]; pagination: TPartyPagination }> {
  const { rows, pagination } = await fetchPaginatedList<any>("/product/all", {
    page: params.page,
    limit: params.limit,
    searchTerm: params.searchTerm,
    sort: params.sort,
    category: params.category || undefined,
    isDeleted: params.isDeleted ? "true" : undefined,
    isArchive: params.isArchive ? "true" : undefined,
  });
  return { rows: rows.map(mapProduct), pagination };
}

export async function deleteProduct(id: string): Promise<void> {
  await api.raw.delete(`/product/delete/${id}`);
}

export async function deleteProducts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await Promise.all(ids.map((id) => deleteProduct(id)));
}
