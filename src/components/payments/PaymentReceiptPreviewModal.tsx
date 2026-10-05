import React, { useEffect, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { getPdfSettings } from "@/lib/db/pdfSettings";
import { triggerBlobDownload } from "@/lib/db/serverPdf";
import { fetchPaymentReceiptPdf, type PaymentReceiptReference } from "@/services/paymentReceiptPdfApi";
import { printPdfUrl } from "@/lib/printPdf";
import { showToast } from "@/utils/toast";

export function PaymentReceiptPreviewModal({ records, title, onClose }: {
  records: PaymentReceiptReference[];
  title: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const recordsKey = JSON.stringify(records);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setUrl(null);
    setError("");
    void (async () => {
      try {
        const references = JSON.parse(recordsKey) as PaymentReceiptReference[];
        if (!references.length) throw new Error("Select a payment to preview.");
        const settings = await getPdfSettings("paymentReceived", "normal");
        if (controller.signal.aborted) return;
        objectUrl = await fetchPaymentReceiptPdf(references, settings, controller.signal);
        if (controller.signal.aborted) { URL.revokeObjectURL(objectUrl); objectUrl = null; return; }
        setUrl(objectUrl);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load the payment receipt.");
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [recordsKey, retry]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  const print = async () => {
    if (!url) return;
    try {
      await printPdfUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to print payment receipt.", "error");
    }
  };
  return (
    <div className="fixed inset-0 z-[95] bg-black/50 flex items-start justify-center p-1 overflow-y-auto" onMouseDown={onClose}>
      <div className="w-full max-w-[660px] rounded-lg overflow-hidden shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-1 bg-[#303030] text-white">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="flex items-center gap-1">
            <button title="Download" aria-label="Download payment receipt" disabled={!url} onClick={() => url && triggerBlobDownload(url, title)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"><Download className="w-4 h-4" /></button>
            <button title="Print" aria-label="Print payment receipt" disabled={!url} onClick={() => void print()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"><Printer className="w-4 h-4" /></button>
            <button title="Close" aria-label="Close payment receipt" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
          </div>
        </div>
        {url ? <iframe src={`${url}#toolbar=0&navpanes=0&view=Fit`} title={title} style={{ display: "block", width: "100%", height: "calc(100vh - 56px)", border: "none", background: "#ffffff" }} /> : (
          <div role="status" className="flex flex-col items-center justify-center gap-3 bg-white text-gray-700" style={{ minHeight: "calc(100vh - 56px)" }}>
            {error ? <><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="text-blue-600">Retry</button></> : <><div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" /><p>Loading payment receipt…</p></>}
          </div>
        )}
      </div>
    </div>
  );
}
