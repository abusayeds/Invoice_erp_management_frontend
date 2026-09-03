/**
 * File: src/lib/db/PdfPreviewModal.tsx
 * Shared document preview modal that renders the REAL backend-generated PDF
 * (via PdfDocPreview → /pdf/generate) inside our own chrome — dark header with
 * Download / Print / Close. Drop-in replacement for the old local `DocPreview`
 * mock on every sales/purchase document detail page.
 */

import React, { useEffect, useState } from "react";
import { X, Download, Printer } from "lucide-react";
import { PdfDocPreview } from "./PdfDocPreview";
import { usePdfSettings, type PdfDocType } from "./pdfSettings";
import {
  downloadServerPdf,
  printServerPdf,
  downloadServerBatchPdf,
  printServerBatchPdf,
  serverBatchPdfUrlForRecords,
} from "./serverPdf";

export const PdfPreviewModal: React.FC<{
  docType: PdfDocType;
  recordId: number;
  /** When >1 id is given, all are merged into one PDF (each on its own page). */
  recordIds?: number[];
  title: string;
  onClose: () => void;
}> = ({ docType, recordId, recordIds, title, onClose }) => {
  const settings = usePdfSettings(docType, "normal");
  // Batch mode: several selected records merged into a single PDF.
  const batchIds = (recordIds ?? []).filter((n) => Number.isFinite(n));
  const isBatch = batchIds.length > 1;
  const [batchUrl, setBatchUrl] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(isBatch);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  useEffect(() => {
    if (!isBatch) return;
    let alive = true;
    let url: string | null = null;
    setBatchLoading(true);
    setBatchUrl(null);
    serverBatchPdfUrlForRecords(docType, batchIds).then((u) => {
      url = u;
      if (!alive) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      setBatchUrl(u);
      setBatchLoading(false);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, isBatch, batchIds.join(",")]);
  const onDownload = () =>
    isBatch
      ? downloadServerBatchPdf(docType, batchIds, `${title}.pdf`)
      : downloadServerPdf(docType, recordId, `${title}.pdf`);
  const onPrint = () =>
    isBatch ? printServerBatchPdf(docType, batchIds) : printServerPdf(docType, recordId);
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-3xl my-6 rounded-lg overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-3 bg-[#2a2f36] text-white">
          <h3 className="text-base font-medium">{title}</h3>
          <div className="flex items-center gap-1">
            <button
              title="Download"
              onClick={onDownload}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              title="Print"
              onClick={onPrint}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isBatch ? (
          batchLoading ? (
            <div
              style={{ width: "100%", height: "70vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div
                className="animate-spin"
                style={{ width: 44, height: 44, border: "3px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%" }}
              />
            </div>
          ) : batchUrl ? (
            <div style={{ width: "100%", height: "70vh", background: "#f3f4f6" }}>
              <iframe
                src={`${batchUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                title="Documents PDF"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          ) : (
            // Batch fetch failed → fall back to previewing the single record.
            <PdfDocPreview docType={docType} mode="normal" settings={settings} recordId={recordId} />
          )
        ) : (
          <PdfDocPreview docType={docType} mode="normal" settings={settings} recordId={recordId} />
        )}
      </div>
    </div>
  );
};
