/**
 * File: src/pages/doubleEntry/deShared.tsx
 * Shared bits for the Double Entry pages — summary amount cards, labeled
 * date inputs, report header shell and a jsPDF+autotable download helper —
 * matching references/double entry/* in the Qayd blue theme.
 */

import React from "react";
import { FileText } from "lucide-react";

/* ── summary cards (Total Debit / Total Assets / Net Loss …) ───── */

const TONES = {
  green: "text-green-700",
  red: "text-red-600",
  blue: "text-blue-700",
  orange: "text-orange-600",
} as const;
export type CardTone = keyof typeof TONES;

export function SummaryCard({ label, value, tone }: { label: string; value: string; tone: CardTone }) {
  return (
    <div className={`rounded-xl border border-gray-200 px-6 py-6 text-center ${TONES[tone]}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
    </div>
  );
}

/* ── labeled date input ────────────────────────────────────────── */

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
      />
    </div>
  );
}

/* ── report title block (doc icon + title + subtitle) ──────────── */

export function ReportTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

/* ── PDF download (jsPDF + autotable, dynamic import) ──────────── */

export async function downloadTablePdf(
  filename: string,
  title: string,
  subtitle: string,
  head: string[],
  rows: (string | number)[][],
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 105, 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, 105, 23, { align: "center" });
  autoTable(doc, {
    startY: 30,
    head: [head],
    body: rows,
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [0, 122, 255] },
  });
  doc.save(filename);
}

/** "2026-07-07" → "Jul 7, 2026" */
export const prettyDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
