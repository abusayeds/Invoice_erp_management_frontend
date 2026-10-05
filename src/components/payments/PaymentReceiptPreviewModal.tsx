import React, { useEffect, useRef, useState } from "react";
import { DocumentPreviewToolbar } from "@/components/documents/DocumentPreviewToolbar";
import { usePreviewSettings } from "@/components/documents/usePreviewSettings";
import { supportsThermalPdf } from "@/lib/db/serverPdf";
import type { PrintMode } from "@/lib/db/pdfSettings";
import { getPdfSettings } from "@/lib/db/pdfSettings";
import { triggerBlobDownload } from "@/lib/db/serverPdf";
import { fetchPaymentReceiptPdf, type PaymentReceiptReference } from "@/services/paymentReceiptPdfApi";
import { printPdfUrl } from "@/lib/printPdf";
import { showToast } from "@/utils/toast";

export function PaymentReceiptPreviewModal({ records, title, onClose, onEmail }: {
  records: PaymentReceiptReference[];
  title: string;
  onClose: () => void;
  onEmail?: () => void;
}) {
  const [mode, setMode] = useState<PrintMode>("normal");
  const [printing, setPrinting] = useState(false);
  const printingRef = useRef(false);
  const settingsView = usePreviewSettings("paymentReceived");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const recordsKey = JSON.stringify(records);
  useEffect(() => {
    if (settingsView.active) return;
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
        objectUrl = await fetchPaymentReceiptPdf(references, settings, controller.signal, { thermal: mode === "thermal" });
        if (controller.signal.aborted) { URL.revokeObjectURL(objectUrl); objectUrl = null; return; }
        setUrl(objectUrl);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load the payment receipt.");
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [recordsKey, retry, mode, settingsView.active]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape" && !settingsView.active) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, settingsView.active]);
  const print = async () => {
    if (!url || printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    try {
      await printPdfUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to print payment receipt.", "error");
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  };
  if (settingsView.active) return settingsView.dialog;
  return (
    <div className="fixed inset-0 z-[95] bg-black/50 flex items-start justify-center p-1 overflow-y-auto" onMouseDown={onClose}>
      <div className="w-full max-w-[660px] rounded-lg overflow-hidden shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <DocumentPreviewToolbar title={title} mode={mode} thermalSupported={supportsThermalPdf("paymentReceived")} ready={!!url && !printing} busy={printing}
          onModeChange={next => { setUrl(null); setMode(next); }}
          onDownload={() => url && triggerBlobDownload(url, title)}
          onPrint={() => void print()} onSettings={settingsView.openSettings} onPdfSettings={settingsView.openPdfSettings}
          onEmail={onEmail ? () => {
            if (records.length > 1) showToast("Open one payment to email its receipt.", "info");
            else onEmail();
          } : undefined} onClose={onClose} />
        {url ? <iframe src={`${url}#toolbar=0&navpanes=0&view=Fit`} title={title} style={{ display: "block", width: "100%", height: "calc(100vh - 56px)", border: "none", background: "#ffffff" }} /> : (
          <div role="status" className="flex flex-col items-center justify-center gap-3 bg-white text-gray-700" style={{ minHeight: "calc(100vh - 56px)" }}>
            {error ? <><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="text-blue-600">Retry</button></> : <><div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" /><p>Loading payment receipt…</p></>}
          </div>
        )}
      </div>
    </div>
  );
}
