/**
 * File: src/lib/db/serverPdf.ts
 * Fetches the REAL backend-rendered PDF (POST /pdf/generate) for a document, so
 * the preview/download shows the server's template + live data instead of the
 * browser-drawn jsPDF mock. Falls back to null (→ caller keeps its local render)
 * when there's no backend id, no token, or the request fails.
 */

import { api } from "@/lib/api/client";
import { getToken } from "@/lib/api/tokenStore";
import { db } from "./db";
import type { PdfDocType } from "./pdfSettings";

/** Web preview doc-type → backend `/pdf/generate` `type` (DOC_CONFIG key). */
const WEB_TO_PDF_TYPE: Partial<Record<PdfDocType, string>> = {
  invoice: "Invoice",
  salesReceipt: "Sales_Receipt",
  proformaInvoice: "Proforma_Invoice",
  estimate: "Estimate",
  deliveryChallan: "Delivery_Challan",
  bill: "Bill",
  creditNote: "Credit_Note",
  purchaseOrder: "Purchase_Order",
  debitNote: "Debit_Note",
  paymentReceived: "Payment_Received",
  paymentMade: "Payment_Made",
  // The packing slip / delivery note reuse their source document's PDF.
  packingSlip: "Invoice",
  deliveryNote: "Delivery_Challan",
};

export function backendPdfType(docType: PdfDocType): string | undefined {
  return WEB_TO_PDF_TYPE[docType];
}

/** Fetch the backend PDF as a blob object URL, or null if unavailable. */
export async function fetchServerPdfUrl(
  docType: PdfDocType,
  id: string | undefined,
): Promise<string | null> {
  const type = WEB_TO_PDF_TYPE[docType];
  if (!type || !id || !getToken()) return null;
  try {
    const res = await api.raw.post(
      "/pdf/generate",
      { type, id },
      { responseType: "blob" },
    );
    return URL.createObjectURL(res.data as Blob);
  } catch {
    return null;
  }
}

/**
 * Fetch a MERGED backend PDF for several documents (each rendered on its own
 * page[s]) as a blob object URL, or null. The backend `/pdf/generate` accepts
 * `{ type, ids: [...] }` and returns one combined PDF.
 */
export async function fetchServerBatchPdfUrl(
  docType: PdfDocType,
  ids: string[],
): Promise<string | null> {
  const type = WEB_TO_PDF_TYPE[docType];
  const clean = ids.filter(Boolean);
  if (!type || clean.length === 0 || !getToken()) return null;
  if (clean.length === 1) return fetchServerPdfUrl(docType, clean[0]);
  try {
    const res = await api.raw.post(
      "/pdf/generate",
      { type, ids: clean },
      { responseType: "blob" },
    );
    return URL.createObjectURL(res.data as Blob);
  } catch {
    return null;
  }
}

/** Local Dexie table backing each preview doc-type (to resolve the record `_id`). */
const WEB_TO_COLLECTION: Partial<Record<PdfDocType, string>> = {
  invoice: "invoices",
  salesReceipt: "salesReceipts",
  proformaInvoice: "proformas",
  estimate: "estimates",
  deliveryChallan: "deliveryChallans",
  bill: "bills",
  creditNote: "creditNotes",
  purchaseOrder: "purchaseOrders",
  debitNote: "debitNotes",
  paymentReceived: "paymentsReceived",
  paymentMade: "paymentsMade",
  packingSlip: "invoices",
  deliveryNote: "deliveryChallans",
};

/** Backend PDF blob URL for a UI record (numeric id), or null. */
export async function serverPdfUrlForRecord(
  docType: PdfDocType,
  recordId: number,
): Promise<string | null> {
  const col = WEB_TO_COLLECTION[docType];
  if (!col) return null;
  try {
    const row = await (db as any)[col].get(Number(recordId));
    return fetchServerPdfUrl(docType, row?._id ? String(row._id) : undefined);
  } catch {
    return null;
  }
}

/** Resolve several UI records (numeric ids) → their backend `_id`s, in order. */
async function backendIdsForRecords(
  docType: PdfDocType,
  recordIds: number[],
): Promise<string[]> {
  const col = WEB_TO_COLLECTION[docType];
  if (!col) return [];
  const out: string[] = [];
  for (const rid of recordIds) {
    try {
      const row = await (db as any)[col].get(Number(rid));
      if (row?._id) out.push(String(row._id));
    } catch {
      /* skip unresolved */
    }
  }
  return out;
}

/** Merged backend PDF blob URL for several UI records (numeric ids), or null. */
export async function serverBatchPdfUrlForRecords(
  docType: PdfDocType,
  recordIds: number[],
): Promise<string | null> {
  const ids = await backendIdsForRecords(docType, recordIds);
  return fetchServerBatchPdfUrl(docType, ids);
}

/** Download a merged backend PDF for several records. Returns false if unavailable. */
export async function downloadServerBatchPdf(
  docType: PdfDocType,
  recordIds: number[],
  filename?: string,
): Promise<boolean> {
  const url = await serverBatchPdfUrlForRecords(docType, recordIds);
  if (!url) return false;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${docType}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

/** Print a merged backend PDF for several records via a hidden iframe. */
export async function printServerBatchPdf(
  docType: PdfDocType,
  recordIds: number[],
): Promise<boolean> {
  const url = await serverBatchPdfUrlForRecords(docType, recordIds);
  if (!url) return false;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.src = url;
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  };
  document.body.appendChild(iframe);
  return true;
}

/** Download the backend PDF for a record. Returns false if unavailable. */
export async function downloadServerPdf(
  docType: PdfDocType,
  recordId: number,
  filename?: string,
): Promise<boolean> {
  const url = await serverPdfUrlForRecord(docType, recordId);
  if (!url) return false;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${docType}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

/** Print the backend PDF for a record via a hidden iframe. Returns false if unavailable. */
export async function printServerPdf(
  docType: PdfDocType,
  recordId: number,
): Promise<boolean> {
  const url = await serverPdfUrlForRecord(docType, recordId);
  if (!url) return false;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  };
  document.body.appendChild(iframe);
  return true;
}
