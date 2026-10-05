import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DollarSign, Mail, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PdfDocType } from "@/lib/db/pdfSettings";
import { ConfirmAlert } from "@/components/ui/ConfirmAlert";
import { InvoicePaymentsModal } from "@/components/modals/InvoicePaymentsModal";
import { BillPaymentsModal } from "@/components/modals/BillPaymentsModal";
import { deleteDocumentRecord } from "@/services/documentActionsApi";
import { fetchInvoice } from "@/services/invoicesApi";
import { fetchBill } from "@/services/billsApi";
import { fetchPaymentMethods } from "@/services/paymentMethodsApi";
import { showToast } from "@/utils/toast";

export function DocumentListRow({ children, className, onClick, docType, backendId, label, permanent = false, source, selectMode, onEmail, type: _type }: {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button";
  docType: PdfDocType;
  backendId: string;
  label: string;
  permanent?: boolean;
  source?: "received" | "direct";
  selectMode?: boolean;
  onEmail: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const payment = useQuery({
    queryKey: ["document-row-payment", docType, backendId],
    queryFn: () => docType === "invoice" ? fetchInvoice(backendId) : fetchBill(backendId),
    enabled: paymentOpen,
  });
  const methods = useQuery({ queryKey: ["document-row-payment-methods"], queryFn: fetchPaymentMethods, enabled: paymentOpen });
  const refresh = () => void queryClient.invalidateQueries();
  const trash = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await deleteDocumentRecord(docType, backendId, permanent, source);
      setConfirm(false);
      await queryClient.invalidateQueries();
      showToast(permanent ? "Document permanently deleted" : "Document moved to trash", "success");
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to delete document", "error"); }
    finally { deletingRef.current = false; setDeleting(false); }
  };
  const actionClass = "h-7 w-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40";
  return (
    <div className={`group relative ${className || ""}`}>
      <button type="button" aria-label={`Select ${label}`} onClick={onClick} className="absolute inset-0 w-full h-full rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" />
      <div className="contents pointer-events-none">{children}</div>
      {!selectMode && <div className="absolute right-3 bottom-1 flex gap-0.5 rounded-full bg-white shadow-sm opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto">
        <button type="button" title={permanent ? "Delete permanently" : "Trash"} aria-label={`${permanent ? "Delete permanently" : "Trash"} ${label}`} disabled={!backendId} onClick={() => setConfirm(true)} className={actionClass}><Trash2 className="h-3.5 w-3.5" /></button>
        <button type="button" title="Email" aria-label={`Email ${label}`} disabled={!backendId || permanent} onClick={onEmail} className={actionClass}><Mail className="h-3.5 w-3.5" /></button>
        {(docType === "invoice" || docType === "bill") && !permanent && <button type="button" title="Add Payment" aria-label={`Add payment to ${label}`} disabled={!backendId} onClick={() => setPaymentOpen(true)} className={actionClass}><DollarSign className="h-3.5 w-3.5" /></button>}
      </div>}
      {confirm && createPortal(<ConfirmAlert message={deleting ? "Deleting…" : permanent ? `Permanently delete ${label}? This cannot be undone.` : `Move ${label} to trash?`} onNo={() => !deleting && setConfirm(false)} onYes={() => void trash()} />, document.body)}
      {paymentOpen && createPortal(payment.data && methods.data ? (
        docType === "invoice" ? <InvoicePaymentsModal open invoice={payment.data} paymentMethods={methods.data} onClose={() => setPaymentOpen(false)} onSaved={refresh} />
          : <BillPaymentsModal open bill={payment.data} paymentMethods={methods.data} onClose={() => setPaymentOpen(false)} onSaved={refresh} />
      ) : <div className="fixed inset-0 z-[75] bg-black/50 flex items-center justify-center"><div className="bg-white rounded-lg p-6 text-gray-900"><button aria-label="Close payment" onClick={() => setPaymentOpen(false)} className="float-right"><X className="h-4 w-4" /></button><p role="status" className="pr-6">{payment.isError || methods.isError || (payment.isFetched && !payment.data) ? "Unable to load document. Please close and try again." : "Loading payment details…"}</p></div></div>, document.body)}
    </div>
  );
}
