/**
 * Report export helpers — CSV, XLSX, XLS, PDF, HTML from a normalized grid.
 */
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportGrid = {
  name: string;
  cols: string[];
  rows: string[][];
  totals?: string[];
  metaLines?: string[];
};

const safeName = (name: string) => name.replace(/[^\w\-]+/g, "_").slice(0, 80) || "report";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const sheetMatrix = (grid: ExportGrid): string[][] => {
  const matrix: string[][] = [];
  if (grid.metaLines?.length) {
    grid.metaLines.forEach((line) => matrix.push([line]));
    matrix.push([]);
  }
  matrix.push(grid.cols);
  grid.rows.forEach((r) => matrix.push(r));
  if (grid.totals?.length) matrix.push(grid.totals);
  return matrix;
};

export function exportReportCsv(grid: ExportGrid) {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = sheetMatrix(grid).map((row) => row.map(escape).join(","));
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${safeName(grid.name)}.csv`);
}

export function exportReportXlsx(grid: ExportGrid, bookType: "xlsx" | "xls" = "xlsx") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetMatrix(grid));
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  // Community SheetJS: "xls" maps to BIFF; fall back to xlsx bytes if write returns empty.
  const primary = XLSX.write(wb, { bookType: bookType === "xls" ? "biff8" : "xlsx", type: "array" });
  const out =
    primary && (primary as ArrayBuffer | Uint8Array).byteLength
      ? primary
      : XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const mime =
    bookType === "xls"
      ? "application/vnd.ms-excel"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  downloadBlob(new Blob([out], { type: mime }), `${safeName(grid.name)}.${bookType}`);
}

export function exportReportHtml(grid: ExportGrid) {
  const th = grid.cols.map((c) => `<th style="border:1px solid #ccc;padding:6px;text-align:left">${escapeHtml(c)}</th>`).join("");
  const body = grid.rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="border:1px solid #ccc;padding:6px">${escapeHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  const tot =
    grid.totals?.length
      ? `<tr style="font-weight:700">${grid.totals.map((c) => `<td style="border:1px solid #ccc;padding:6px">${escapeHtml(c)}</td>`).join("")}</tr>`
      : "";
  const meta = (grid.metaLines || []).map((l) => `<p style="margin:2px 0;color:#555">${escapeHtml(l)}</p>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(grid.name)}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px">
<h1>${escapeHtml(grid.name)}</h1>${meta}
<table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr>${th}</tr></thead><tbody>${body}${tot}</tbody></table>
</body></html>`;
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${safeName(grid.name)}.html`);
}

export function exportReportPdf(grid: ExportGrid) {
  const doc = new jsPDF({ orientation: grid.cols.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(grid.name, 14, 16);
  let startY = 22;
  if (grid.metaLines?.length) {
    doc.setFontSize(9);
    grid.metaLines.forEach((line) => {
      doc.text(line, 14, startY);
      startY += 5;
    });
    startY += 2;
  }
  const body = [...grid.rows];
  if (grid.totals?.length) body.push(grid.totals);
  autoTable(doc, {
    startY,
    head: [grid.cols],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [42, 47, 54] },
  });
  doc.save(`${safeName(grid.name)}.pdf`);
}

const escapeHtml = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
