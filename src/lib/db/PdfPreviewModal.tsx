import React, { useCallback, useEffect, useState } from "react";
import { PdfDocPreview } from "./PdfDocPreview";
import { usePdfSettings, type PdfDocType, type PrintMode } from "./pdfSettings";
import { fetchServerBatchPdfUrl, serverBatchPdfUrlForRecords, triggerBlobDownload, supportsThermalPdf } from "./serverPdf";
import { DocumentPreviewToolbar } from "@/components/documents/DocumentPreviewToolbar";
import { usePreviewSettings } from "@/components/documents/usePreviewSettings";
import { printPdfUrl } from "@/lib/printPdf";
import { showToast } from "@/utils/toast";

export const PdfPreviewModal: React.FC<{
  docType: PdfDocType;
  recordId?: number;
  recordIds?: number[];
  backendId?: string;
  backendIds?: string[];
  title: string;
  onClose: () => void;
  onEmail?: () => void;
  onSettings?: () => void;
}> = ({ docType, recordId = 0, recordIds, backendId, backendIds, title, onClose, onEmail, onSettings }) => {
  const [mode, setMode] = useState<PrintMode>("normal");
  const settings = usePdfSettings(docType, mode);
  const settingsView = usePreviewSettings(docType);
  const batchIds = recordIds ?? [];
  const explicitIds = backendIds ?? [];
  const isBatch = explicitIds.length > 1 || batchIds.length > 1;
  const [batchUrl, setBatchUrl] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const onPdfUrl = useCallback((url: string | null) => setPreviewUrl(url), []);
  const idsKey = JSON.stringify(explicitIds);
  const localIdsKey = JSON.stringify(batchIds);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !settingsView.active) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, settingsView.active]);

  useEffect(() => {
    if (!isBatch || settingsView.active) return;
    let alive = true;
    let objectUrl: string | null = null;
    setBatchLoading(true);
    setBatchUrl(null);
    const ids = JSON.parse(idsKey) as string[];
    const request = ids.length
      ? (ids.every(Boolean) ? fetchServerBatchPdfUrl(docType, ids, { thermal: mode === "thermal" }) : Promise.resolve(null))
      : serverBatchPdfUrlForRecords(docType, JSON.parse(localIdsKey), { thermal: mode === "thermal" });
    void request.then(url => {
      objectUrl = url;
      if (!alive) { if (url) URL.revokeObjectURL(url); return; }
      setBatchUrl(url);
      setBatchLoading(false);
    });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [docType, isBatch, idsKey, localIdsKey, mode, settingsView.active]);

  const url = isBatch ? batchUrl : previewUrl;
  const print = async () => {
    if (!url || printing) return;
    setPrinting(true);
    try { await printPdfUrl(url); }
    catch (error) { showToast(error instanceof Error ? error.message : "Unable to print PDF", "error"); }
    finally { setPrinting(false); }
  };
  if (settingsView.active) return settingsView.dialog;
  return (
    <div className="fixed inset-0 z-[95] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <DocumentPreviewToolbar
          title={title} mode={mode} thermalSupported={supportsThermalPdf(docType)}
          ready={!!url && !printing} busy={printing}
          onModeChange={next => { setPreviewUrl(null); setBatchUrl(null); setMode(next); }}
          onDownload={() => url && triggerBlobDownload(url, title)}
          onPrint={() => void print()}
          onSettings={onSettings || settingsView.openSettings}
          onPdfSettings={settingsView.openPdfSettings}
          onEmail={onEmail ? () => {
            if (isBatch) showToast("Open one document to email its PDF.", "info");
            else onEmail();
          } : undefined} onClose={onClose}
        />
        {isBatch ? (
          <div className="bg-white flex items-center justify-center" style={{ height: "70vh" }}>
            {batchLoading ? <p role="status">Loading PDF?</p> : batchUrl
              ? <iframe src={batchUrl + "#toolbar=0&navpanes=0&view=FitH"} title={title} className="w-full h-full border-0" />
              : <p role="alert">Unable to load all selected documents. Please reopen the preview to retry.</p>}
          </div>
        ) : backendId || explicitIds[0] || recordId > 0 ? (
          <PdfDocPreview docType={docType} mode={mode} settings={settings} recordId={recordId}
            backendId={backendId || explicitIds[0]} onPdfUrl={onPdfUrl} />
        ) : <div role="alert" className="bg-white p-8">Select a saved document to preview.</div>}
      </div>
    </div>
  );
};
