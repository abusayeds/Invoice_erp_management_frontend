import { api } from "@/lib/api/client";
import type { PdfSettings } from "@/lib/db/pdfSettings";
import { applyUiToApiDoc } from "./pdfSettingsApi";
import { ApiError } from "@/lib/api/ApiError";

export type PaymentReceiptReference = { id: string; source: "received" | "direct" };

export async function fetchPaymentReceiptPdf(
  records: PaymentReceiptReference[],
  settings?: PdfSettings,
  signal?: AbortSignal,
  opts?: { thermal?: boolean },
): Promise<string> {
  let response;
  try {
    response = await api.raw.post("/pdf/generate", {
      type: "Payment_Received",
      renderMode: "web-receipt",
      ...(opts?.thermal ? { thermal: true } : {}),
      ...(records.length === 1
        ? { id: records[0].id, source: records[0].source }
        : records.length > 1 ? { ids: records.map(record => record.id), records } : {}),
      preview: records.length === 0,
      settings: settings ? {
        ...applyUiToApiDoc(settings, null),
        payment_receipt: {
          number: settings.paymentNumber,
          methods: settings.paymentMethods !== "Hide",
          page_number: settings.pageNumber,
        },
      } : undefined,
    }, { responseType: "blob", signal, skipGlobalLoading: true });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError && error.data instanceof Blob) {
      const body = await error.data.text();
      let message = "";
      try {
        const payload = JSON.parse(body);
        message = payload?.details || payload?.message || "";
      } catch { /* Non-JSON error response. */ }
      if (message === "Payment not found" || message === "Payment amount is invalid") throw new Error(message);
    }
    throw new Error("Unable to load the payment receipt. Please try again.");
  }
  const blob = response.data as Blob;
  if (!blob.size || !blob.type.includes("application/pdf")) {
    throw new Error("Unable to generate the payment receipt.");
  }
  return URL.createObjectURL(blob);
}
