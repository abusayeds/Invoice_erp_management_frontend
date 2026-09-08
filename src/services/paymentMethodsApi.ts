import { api } from "@/lib/api/client";

export interface PaymentMethodOption {
  _id: string;
  name: string;
  logo?: string;
}

export async function fetchPaymentMethods(): Promise<PaymentMethodOption[]> {
  const res = await api.raw.get("/setting/payment-methods/all");
  const body = res.data ?? {};
  return Array.isArray(body.data) ? body.data : [];
}
