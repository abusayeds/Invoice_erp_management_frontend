/**
 * File: src/lib/db/appSettings.ts
 * App Settings persistence — one Dexie `meta` row per settings section.
 * Each of the 9 document types gets its OWN row (`app:doc:<key>`) cloned
 * from DOC_DEFAULTS, so changing e.g. Invoice's "Inline Discount" can never
 * leak into Estimate's. Mirrors the pdfSettings.ts pattern (meta + liveQuery).
 */

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

/* ── per-document settings (identical shape for all 9 doc types) ── */
export interface DocSettings {
  fieldVisibility: Record<string, boolean>;
  general: { lineOption: "Both" | "Service" | "Product" };
  columns: Record<string, boolean>;
  columnsQuantity: "Show for Both" | "Show for Product" | "Show for Service";
  summary: Record<string, boolean>;
  summarySubtotalWithTax: "Default" | "Including Tax" | "Excluding Tax";
  printEmail: Record<string, boolean>;
  printCopies: "Single Copy" | "Two Copies" | "Three Copies";
}

export const DOC_DEFAULTS: DocSettings = {
  fieldVisibility: {
    "Due Date": true,
    "Shipping Address": true,
    "Street 1": true,
    "Street 2": true,
    "Zip Code": true,
    City: true,
    State: true,
    Country: true,
    "Sub Title": true,
    "PO #": true,
    "Recipient name": false,
    "Shipping Cost And Method": true,
    Salesperson: false,
    "Payment Methods": true,
    "Apply discount before tax": false,
    "Terms & Conditions": true,
    Notes: true,
    Attachment: true,
  },
  general: { lineOption: "Both" },
  columns: {
    "Service name": true,
    "Product Name": true,
    Description: true,
    Discount: true,
    MRP: true,
    Tax: true,
    "Line description full width": true,
    "Stock In Suggestion List": false,
    "Description In Suggestion List": false,
    "Buy Price in Suggestion List": true,
    "Item Code in Suggestion List": true,
    "Auto Fit": true,
  },
  columnsQuantity: "Show for Both",
  summary: {
    "Total Quantity": false,
    "Round Off": false,
    "Negative Value format with ( )": false,
    "Contact Note as Default Note": false,
    "Inline Discount": true,
    "Show Line Total with Tax": false,
  },
  summarySubtotalWithTax: "Default",
  printEmail: {
    "Mark as Sent on Print": true,
    "Mark as Sent on Email/WhatsApp": true,
    "Combine PDF in Email": true,
  },
  printCopies: "Single Copy",
};

/* ── document tab registry (label ↔ storage key) ───────────────── */
export const DOC_TYPES = [
  { key: "invoice", label: "Invoice" },
  { key: "proformaInvoice", label: "Proforma Invoice" },
  { key: "salesReceipt", label: "Sales Receipt" },
  { key: "estimate", label: "Estimate" },
  { key: "deliveryChallan", label: "Delivery Challan" },
  { key: "purchaseOrder", label: "Purchase Order" },
  { key: "bill", label: "Bill" },
  { key: "creditNote", label: "Credit Note" },
  { key: "debitNote", label: "Debit Note" },
] as const;

/* ── non-document sections ─────────────────────────────────────── */
// POS intentionally omitted from the modules list (per reference instruction).
export const MODULE_NAMES = [
  "Invoice", "Proforma Invoice", "Estimate", "Delivery Challan", "Bill", "Credit Note",
  "Debit Note", "Expense", "Sales Receipt", "Packing Slip", "Delivery Note", "Time Log",
  "Purchase Order", "Project", "Team", "Payment Received", "Payment Made", "Integrations",
  "Banking", "Rewards", "Product", "Service", "Report", "My Documents",
] as const;

export const SECTION_DEFAULTS: Record<string, any> = {
  general: { chat: true, publicUrl: true, appearance: "Dark", defaultMail: "Qayd Mail Server" },
  modules: Object.fromEntries(MODULE_NAMES.map((m) => [m, true])),
  currencyFormat: {
    currency: "$ USD",
    currencySymbol: true,
    currencyCode: true,
    multiCurrency: false,
    decimalPlaces: "2",
    dateFormat: "English (United States)",
    language: "English",
    timezone: "(GMT-7:00) America/Los_Angeles",
  },
  printer: { printMode: "Normal" },
  whatsapp: { whatsapp: true, sendVia: "Qayd", terms: true, notes: true },
  expense: { roundOff: false, paymentType: true },
  product: {
    fieldVisibility: { HSN: true, Inventory: true, MRP: false },
    productImage: false,
    zeroStock: "Yes, Allow",
    productStock: true,
  },
  service: { sac: true },
  timeLog: {
    columns: { "Include Project in Create Invoice": true, "Include Date in Create Invoice": true, "Include Notes in Create Invoice": true },
    rounding: "0 mins",
  },
};
for (const d of DOC_TYPES) SECTION_DEFAULTS[`doc:${d.key}`] = DOC_DEFAULTS;

/* ── exchange rates (base: US Dollar = 1) ──────────────────────── */
export interface ExchangeRate { name: string; symbol: string; code: string; rate: number }
export const DEFAULT_EXCHANGE_RATES: ExchangeRate[] = [
  { name: "Albanian Lek", symbol: "ALL", code: "ALL", rate: 92.65 },
  { name: "Arubaanse gulden", symbol: "Afl.", code: "AWG", rate: 1.79 },
  { name: "Australian Dollar", symbol: "$", code: "AUD", rate: 1.52 },
  { name: "Azərbaycan Manatı", symbol: "₼", code: "AZN", rate: 1.7 },
  { name: "Bahamian Dollar", symbol: "$", code: "BSD", rate: 1.0 },
  { name: "balboa panameño", symbol: "B/.", code: "PAB", rate: 1.0 },
  { name: "Bangladeshi Taka", symbol: "৳", code: "BDT", rate: 122.53 },
  { name: "Barbadian Dollar", symbol: "$", code: "BBD", rate: 2.0 },
  { name: "British Pound", symbol: "£", code: "GBP", rate: 0.79 },
  { name: "Euro", symbol: "€", code: "EUR", rate: 0.92 },
  { name: "Indian Rupee", symbol: "₹", code: "INR", rate: 85.6 },
  { name: "Japanese Yen", symbol: "¥", code: "JPY", rate: 155.8 },
];

/* ── read / write ──────────────────────────────────────────────── */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const metaKey = (section: string) => `app:${section}`;

export async function getAppSettings(section: string): Promise<any> {
  try {
    const row = await db.meta.get(metaKey(section));
    return { ...clone(SECTION_DEFAULTS[section] ?? {}), ...(row?.value || {}) };
  } catch {
    return clone(SECTION_DEFAULTS[section] ?? {});
  }
}

export async function saveAppSettings(section: string, value: any): Promise<void> {
  await db.meta.put({ key: metaKey(section), value });
}

export async function resetAppSettings(section: string): Promise<void> {
  await db.meta.delete(metaKey(section));
}

/** Live settings for one section (re-renders on save). */
export function useAppSettings(section: string): any {
  const row = useLiveQuery(() => db.meta.get(metaKey(section)), [section]);
  return { ...clone(SECTION_DEFAULTS[section] ?? {}), ...(row?.value || {}) };
}

export async function getExchangeRates(): Promise<{ rates: ExchangeRate[]; lastUpdated: number }> {
  try {
    const row = await db.meta.get("app:exchangeRates");
    if (row?.value?.rates) return row.value;
  } catch { /* fall through to defaults */ }
  return { rates: clone(DEFAULT_EXCHANGE_RATES), lastUpdated: Date.now() };
}

export async function saveExchangeRates(rates: ExchangeRate[]): Promise<void> {
  await db.meta.put({ key: "app:exchangeRates", value: { rates, lastUpdated: Date.now() } });
}
