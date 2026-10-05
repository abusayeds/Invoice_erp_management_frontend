import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, X } from "lucide-react";
import { EmailTemplatesModal } from "@/components/modals/EmailTemplatesModal";
import { docTypeLabel, type PdfDocType } from "@/lib/db/pdfSettings";
import { prepareDocumentEmail, sendDocumentEmail, type DocumentEmailType } from "@/services/documentEmailApi";
import { showToast } from "@/utils/toast";

const EMAIL_TYPES: Partial<Record<PdfDocType, DocumentEmailType>> = {
  invoice: "invoice", proformaInvoice: "proforma_invoice", salesReceipt: "sales_receipt",
  estimate: "estimate", deliveryChallan: "delivery_challan", creditNote: "credit_note",
  purchaseOrder: "purchase_order", bill: "bill", debitNote: "debit_note",
};

/** Ordinary document email through the existing prepare/send APIs. */
export function DocumentEmailModal({ docType, backendId, onClose }: { docType: PdfDocType; backendId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const type = EMAIL_TYPES[docType];
  const [templates, setTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const prepared = useQuery({
    queryKey: ["ordinary-document-email", type, backendId],
    queryFn: () => prepareDocumentEmail(type!, backendId),
    enabled: !!type && !!backendId,
    staleTime: 0,
  });
  useEffect(() => {
    if (!prepared.data) return;
    const email = prepared.data.email;
    setTo(email.to.join(", ")); setCc((email.cc || []).join(", ")); setBcc((email.bcc || []).join(", "));
    setSubject(email.subject); setFrom(email.from || "");
    if (bodyRef.current) bodyRef.current.innerHTML = DOMPurify.sanitize(email.body);
  }, [prepared.data]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape" && !sending && !templates) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, sending, templates]);
  const send = async () => {
    if (!type || !prepared.data || sending) return;
    if (!to.trim() || !subject.trim()) { showToast("Add a recipient and subject", "warning"); return; }
    setSending(true);
    try {
      await sendDocumentEmail({
        type, id: backendId, attach_pdf: attachPdf,
        // The existing API requires a nonempty update. Keep this active document's status intact.
        document_update: { isDeleted: false },
        email: { to, cc: cc || undefined, bcc: bcc || undefined, from, subject, body: DOMPurify.sanitize(bodyRef.current?.innerHTML || "") },
      });
      await queryClient.invalidateQueries();
      showToast("Email sent", "success"); onClose();
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to send email", "error"); }
    finally { setSending(false); }
  };
  const templateDialog = templates && type ? <EmailTemplatesModal initialNav={type} onClose={() => { setTemplates(false); void prepared.refetch(); }} /> : null;
  const field = "w-full rounded border border-gray-300 p-2 bg-white text-gray-900 text-sm";
  return (
    <>
    {templateDialog}
    <div className={`fixed inset-0 z-[95] bg-black/50 p-4 ${templates ? "hidden" : "flex"} items-start justify-center overflow-y-auto`} onMouseDown={() => !sending && onClose()}>
      <div className="my-6 w-full max-w-2xl rounded-lg bg-white text-gray-900 shadow-xl" onMouseDown={event => event.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-gray-300 p-4">
          <h3 className="font-semibold">Email {docTypeLabel(docType)}</h3>
          <div className="flex gap-2 items-center">
            {type && <button title="Email templates" aria-label="Email templates" onClick={() => setTemplates(true)} disabled={sending}><Settings className="w-4 h-4" /></button>}
            <button title="Close" aria-label="Close email" disabled={sending} onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>
        {!type ? <p role="status" className="p-5">Emailing this payment receipt is not available yet. You can download or print the receipt.</p>
          : !backendId ? <p role="alert" className="p-5">Select a saved document to email.</p>
          : prepared.isPending ? <p role="status" className="p-5">Loading email…</p>
          : prepared.isError ? <div role="alert" className="p-5">Unable to prepare email. <button onClick={() => void prepared.refetch()} className="text-blue-600">Retry</button></div>
          : <form className="p-5 space-y-3" onSubmit={event => { event.preventDefault(); void send(); }}>
            <label className="block text-sm">To<input aria-label="To" required value={to} onChange={event => setTo(event.target.value)} className={field} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Cc<input aria-label="Cc" value={cc} onChange={event => setCc(event.target.value)} className={field} /></label>
              <label className="text-sm">Bcc<input aria-label="Bcc" value={bcc} onChange={event => setBcc(event.target.value)} className={field} /></label>
            </div>
            <label className="block text-sm">From name<input aria-label="From name" value={from} onChange={event => setFrom(event.target.value)} className={field} /></label>
            <label className="block text-sm">Subject<input aria-label="Subject" required value={subject} onChange={event => setSubject(event.target.value)} className={field} /></label>
            <div className="text-sm">Message<div role="textbox" aria-label="Email message" aria-multiline="true" contentEditable={!sending} suppressContentEditableWarning ref={bodyRef} className={`${field} min-h-48`} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={attachPdf} onChange={event => setAttachPdf(event.target.checked)} />Attach document PDF</label>
            <div className="flex justify-end gap-3"><button type="button" disabled={sending} onClick={onClose}>Cancel</button><button type="submit" disabled={sending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40">{sending ? "Sending…" : "Send"}</button></div>
          </form>}
      </div>
    </div>
    </>
  );
}
