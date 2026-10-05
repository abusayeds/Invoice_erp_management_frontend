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
  const buttonClass = "w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#303030] text-white">
      <h3 className="text-sm font-medium truncate">{title}</h3>
      <div className="flex flex-wrap items-center gap-1">
        <select aria-label="Print format" value={mode} disabled={busy} onChange={event => onModeChange(event.target.value as PrintMode)} className="keep-box ua-field rounded border border-white/30 px-2 py-1 text-xs">
          <option value="normal">Normal Print</option>
          <option value="thermal" disabled={!thermalSupported}>Thermal Print{thermalSupported ? " (80 mm)" : " — unavailable"}</option>
        </select>
        <button type="button" title="Settings" aria-label="Document settings" onClick={onSettings} className={buttonClass}><Settings className="w-4 h-4" /></button>
        <button type="button" title="PDF & Print Settings" aria-label="PDF and print settings" onClick={onPdfSettings} className={buttonClass}><SlidersHorizontal className="w-4 h-4" /></button>
        {onEmail && <button type="button" title="Email" aria-label="Email document" onClick={onEmail} className={buttonClass}><Mail className="w-4 h-4" /></button>}
        <button type="button" title="Download" aria-label="Download PDF" disabled={!ready} onClick={onDownload} className={buttonClass}><Download className="w-4 h-4" /></button>
        <button type="button" title={mode === "thermal" ? "Thermal Print" : "Print"} aria-label={mode === "thermal" ? "Print thermal PDF" : "Print PDF"} disabled={!ready} onClick={onPrint} className={buttonClass}><Printer className="w-4 h-4" /></button>
        <button type="button" title="Close" aria-label="Close PDF preview" onClick={onClose} className={buttonClass}><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
