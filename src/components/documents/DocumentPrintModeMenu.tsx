import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, FileText, Printer } from "lucide-react";
import type { PrintMode } from "@/lib/db/pdfSettings";
import { DocumentIconButton } from "./DocumentIconButton";

export function DocumentPrintModeMenu({ mode, thermalSupported, busy, onModeChange }: {
  mode: PrintMode;
  thermalSupported: boolean;
  busy: boolean;
  onModeChange: (mode: PrintMode) => void;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const open = position !== null;
  const restoreFocus = () => anchor.current?.querySelector("button")?.focus();
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setPosition(null);
    };
    const dismiss = () => setPosition(null);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(); restoreFocus(); }
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape, true);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);
  const toggle = () => {
    if (open) { setPosition(null); return; }
    const rect = anchor.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.max(8, Math.min(window.innerWidth - 216, rect.right - 208)), top: Math.max(8, Math.min(window.innerHeight - 160, rect.bottom + 8)) });
  };
  const choose = (next: PrintMode) => {
    setPosition(null);
    restoreFocus();
    if (next !== mode) onModeChange(next);
  };
  return <>
    <span ref={anchor} className="inline-flex items-center gap-1.5 mr-1">
      <DocumentIconButton title="Print options" aria-haspopup="true" aria-expanded={open} aria-controls={open ? id : undefined} disabled={busy} onClick={toggle}><FileText /></DocumentIconButton>
      <span className="text-xs text-white">{mode === "normal" ? "Normal Print" : "Thermal Print"}</span>
    </span>
    {position && createPortal(<div ref={menu} id={id} role="radiogroup" aria-label="Print mode" className="document-print-mode-menu" style={position} onKeyDown={event => {
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const options = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
      const current = options.indexOf(document.activeElement as HTMLButtonElement);
      const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      options[(current + direction + options.length) % options.length]?.focus();
    }}>
      <button type="button" role="radio" aria-checked={mode === "normal"} className="document-print-mode-option" onClick={() => choose("normal")}><FileText /><span className="flex-1">Normal Print</span>{mode === "normal" && <Check />}</button>
      <button type="button" role="radio" aria-checked={mode === "thermal"} disabled={!thermalSupported} className="document-print-mode-option" onClick={() => choose("thermal")}><Printer /><span className="flex-1">Thermal Print</span>{mode === "thermal" && <Check />}</button>
      {!thermalSupported && <p className="document-print-mode-note">Thermal printing is unavailable for this document.</p>}
    </div>, document.body)}
  </>;
}
