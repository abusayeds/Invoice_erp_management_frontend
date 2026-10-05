import { getPdfSettings, type PdfDocType } from "@/lib/db/pdfSettings";
import { fetchServerPdfUrl } from "@/lib/db/serverPdf";
import { fetchPaymentReceiptPdf } from "@/services/paymentReceiptPdfApi";
import { printPdfUrl } from "./printPdf";
import { showToast } from "@/utils/toast";

const preparing = new Set<string>();

/** Direct normal printing from detail toolbars, through the existing PDF endpoint. */
export async function printDocumentPdf(type: PdfDocType, id: string, source: "received" | "direct" = "received") {
  const key = `${type}:${source}:${id}`;
  if (preparing.has(key)) return;
  preparing.add(key);
  try {
    if (!/^[a-f\d]{24}$/i.test(id)) throw new Error("Select a saved document to print.");
    const url = type === "paymentReceived"
      ? await fetchPaymentReceiptPdf([{ id, source }], await getPdfSettings(type, "normal"))
      : await fetchServerPdfUrl(type, id);
    if (!url) throw new Error("Unable to load the document PDF. Please try again.");
    await printPdfUrl(url, true);
  } catch (error) { showToast(error instanceof Error ? error.message : "Unable to print document", "error"); }
  finally { preparing.delete(key); }
}
