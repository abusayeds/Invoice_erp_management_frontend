import { DocumentIconButton } from "@/components/documents/DocumentIconButton";
import { DocumentPrintModeMenu } from "./DocumentPrintModeMenu";
import { Download, Mail, Printer, Settings, SlidersHorizontal, X } from "lucide-react";
import type { PrintMode } from "@/lib/db/pdfSettings";

export function DocumentPreviewToolbar({ title, mode, thermalSupported, ready, busy = false, onModeChange, onDownload, onPrint, onSettings, onPdfSettings, onEmail, onClose }: {
  title: string;
  mode: PrintMode;
  thermalSupported: boolean;
  ready: boolean;
  busy?: boolean;
  onModeChange: (mode: PrintMode) => void;
  onDownload: () => void;
  onPrint: () => void;
  onSettings: () => void;
  onPdfSettings: () => void;
  onEmail?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#303030] text-white">
      <h3 className="text-sm font-medium truncate">{title}</h3>
      <div className="flex flex-wrap items-center gap-1">
        <DocumentPrintModeMenu mode={mode} thermalSupported={thermalSupported} busy={busy} onModeChange={onModeChange} />
        <DocumentIconButton type="button" title="Settings" aria-label="Document settings" onClick={onSettings} ><Settings className="w-4 h-4" /></DocumentIconButton>
        <DocumentIconButton type="button" title="PDF & Print Settings" aria-label="PDF and print settings" onClick={onPdfSettings} ><SlidersHorizontal className="w-4 h-4" /></DocumentIconButton>
        {onEmail && <DocumentIconButton type="button" title="Email" aria-label="Email document" onClick={onEmail} ><Mail className="w-4 h-4" /></DocumentIconButton>}
        <DocumentIconButton type="button" title="Download" aria-label="Download PDF" disabled={!ready} onClick={onDownload} ><Download className="w-4 h-4" /></DocumentIconButton>
        <DocumentIconButton type="button" title={mode === "thermal" ? "Thermal Print" : "Print"} aria-label={mode === "thermal" ? "Print thermal PDF" : "Print PDF"} disabled={!ready} onClick={onPrint} ><Printer className="w-4 h-4" /></DocumentIconButton>
        <DocumentIconButton type="button" title="Close" aria-label="Close PDF preview" onClick={onClose} ><X className="w-4 h-4" /></DocumentIconButton>
      </div>
    </div>
  );
}
