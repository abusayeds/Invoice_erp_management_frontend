import { api } from "@/lib/api/client";
import type { PdfDocType } from "@/lib/db/pdfSettings";
import { deleteInvoice, hardDeleteInvoice } from "./invoicesApi";
import { deleteProformaInvoice, hardDeleteProformaInvoice } from "./proformaInvoicesApi";
import { deleteSalesReceipt, hardDeleteSalesReceipt } from "./salesReceiptsApi";
import { deleteEstimate, hardDeleteEstimate } from "./estimatesApi";
import { deleteDeliveryChallan, hardDeleteDeliveryChallan } from "./deliveryChallansApi";
import { deleteCreditNote, hardDeleteCreditNote } from "./creditNotesApi";
import { deleteDebitNote, hardDeleteDebitNotes } from "./debitNotesApi";
import { deleteVendorPayment, hardDeleteVendorPayments } from "./vendorPaymentsApi";
import { deletePaymentReceived, hardDeletePaymentReceivedMany, deleteDirectPayment } from "./paymentReceivedApi";
import { hardDeleteBills } from "./billsApi";
import { hardDeletePurchaseOrders } from "./purchaseOrdersApi";

/** Dispatch row actions to existing APIs without relying on the active detail selection. */
export async function deleteDocumentRecord(type: PdfDocType, id: string, permanent: boolean, source?: "received" | "direct") {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new Error("Select a saved document to delete.");
  switch (type) {
    case "invoice": return permanent ? hardDeleteInvoice(id) : deleteInvoice(id);
    case "proformaInvoice": return permanent ? hardDeleteProformaInvoice(id) : deleteProformaInvoice(id);
    case "salesReceipt": return permanent ? hardDeleteSalesReceipt(id) : deleteSalesReceipt(id);
    case "estimate": return permanent ? hardDeleteEstimate(id) : deleteEstimate(id);
    case "deliveryChallan": return permanent ? hardDeleteDeliveryChallan(id) : deleteDeliveryChallan(id);
    case "creditNote": return permanent ? hardDeleteCreditNote(id) : deleteCreditNote(id);
    case "debitNote": return permanent ? hardDeleteDebitNotes([id]) : deleteDebitNote(id);
    case "paymentMade": return permanent ? hardDeleteVendorPayments([id]) : deleteVendorPayment(id);
    case "paymentReceived": return source === "direct" ? deleteDirectPayment(id) : permanent ? hardDeletePaymentReceivedMany([id]) : deletePaymentReceived(id);
    case "bill": return permanent ? hardDeleteBills([id]) : api.raw.delete(`/bill/delete/${id}`);
    case "purchaseOrder": return permanent ? hardDeletePurchaseOrders([id]) : api.raw.delete(`/purchase/invoices/delete/${id}`);
    default: throw new Error("This document does not support deletion.");
  }
}
