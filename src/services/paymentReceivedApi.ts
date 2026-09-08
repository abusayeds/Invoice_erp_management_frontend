import { api } from "@/lib/api/client";
import type { TPartyPagination } from "./customerTypes";

export interface BackendPaymentReceivedDoc {
  _id: string;
  customer_id?: string | { _id?: string; name?: string; businessProfile?: { companyName?: string } } | null;
  invoice_id?: string | { _id?: string; invoice_number?: string } | null;
  invoice_number?: string;
  currency?: string;
  date?: string;
  payment_method?: string[];
  notes?: string;
  internal_notes?: string;
  Attachment?: string;
  total?: number;
  sub_total?: number;
  status?: string;
  createdAt?: string;
}

export interface PaymentReceivedListParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sort?: string;
  invoice_id?: string;
}

export interface PaymentReceivedListResult {
  rows: BackendPaymentReceivedDoc[];
  pagination: TPartyPagination;
}

const FALLBACK_PAGINATION: TPartyPagination = {
  totalPage: 1,
  currentPage: 1,
  prevPage: 1,
  nextPage: 1,
  totalData: 0,
};

export async function fetchPaymentReceived(
  params: PaymentReceivedListParams,
): Promise<PaymentReceivedListResult> {
  const query: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  };
  if (params.searchTerm?.trim()) query.searchTerm = params.searchTerm.trim();
  if (params.sort) query.sort = params.sort;
  if (params.invoice_id) query.invoice_id = params.invoice_id;

  const res = await api.raw.get("/payment-received/all", { params: query });
  const body = res.data ?? {};
  const rows: BackendPaymentReceivedDoc[] = Array.isArray(body.data) ? body.data : [];
  return {
    rows,
    pagination: body.pagination ?? { ...FALLBACK_PAGINATION, totalData: rows.length },
  };
}

export interface CreatePaymentReceivedPayload {
  customer_id?: string;
  customer_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  currency?: string;
  date?: string;
  payment_method?: string[];
  notes?: string;
  internal_notes?: string;
  Attachment?: string;
  product: [];
  service: [];
  sub_total: number;
  total: number;
  status?: string;
}

export async function createPaymentReceived(
  payload: CreatePaymentReceivedPayload,
): Promise<BackendPaymentReceivedDoc> {
  const res = await api.raw.post("/payment-received/create", payload);
  return (res.data?.data ?? res.data) as BackendPaymentReceivedDoc;
}
