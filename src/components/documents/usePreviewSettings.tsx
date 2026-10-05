import { useState } from "react";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { PdfPrintSettingsModal } from "@/components/modals/PdfPrintSettingsModal";
import { docTypeLabel, type PdfDocType } from "@/lib/db/pdfSettings";

/** Suspend the preview while settings are open, preserving its document and PDF. */
export function usePreviewSettings(docType: PdfDocType) {
  const [view, setView] = useState<"app" | "pdf" | null>(null);
  const dialog = view === "app"
    ? <AppSettingsModal initialTab={docTypeLabel(docType)} onClose={() => setView(null)} />
    : view === "pdf" ? <PdfPrintSettingsModal initialDocType={docType} onClose={() => setView(null)} /> : null;
  return { active: !!view, dialog, openSettings: () => setView("app"), openPdfSettings: () => setView("pdf") };
}
