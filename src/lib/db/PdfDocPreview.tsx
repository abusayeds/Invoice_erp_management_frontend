/**
 * File: src/lib/db/PdfDocPreview.tsx
 * Live PDF/print preview for every document type (invoice, receipt, proforma,
 * estimate, challan, bill, PO, credit/debit note, payments, statement, packing
 * slip, delivery note) in Normal or Thermal mode. Renders REAL records from the
 * datastore and reacts to every PdfSettings field — the same component backs
 * the PDF & Print Settings modal preview, the statement preview and printing.
 */

import React, { useMemo, useState, useEffect } from "react";
import { useCollection } from "./hooks";
import { fetchServerPdfUrl } from "./serverPdf";
import { money } from "./format";
import {
  type PdfDocType,
  type PdfSettings,
  type PrintMode,
  docTypeTitle,
  docTypeLabel,
  formatPdfDate,
  PDF_FONT_PX,
  PDF_FONT_STACK,
  PDF_LOGO_PX,
} from "./pdfSettings";
import Logo from "../../assets/logo.png";

/* ── demo company profile (backs the header block toggles) ─────── */
const COMPANY = {
  name: "info",
  country: "Bangladesh",
  email: "info@inovoic.com",
  address: "Tower-2, Plot-844, Road-14, Block-I, Dhaka 1229",
  phone: "+880 9611 800000",
  mobile: "+880 9611 800005",
  fax: "+880 2 8432196",
  website: "www.qayd.com",
  regNo: "C-24705(539)/93",
  taxId: "553569813119",
};

const PAY_BADGES = [
  { label: "VISA", bg: "#ffffff", fg: "#1a1f71" },
  { label: "Mastercard", bg: "#ffffff", fg: "#eb001b" },
  { label: "AmEx", bg: "#006fcf", fg: "#ffffff" },
  { label: "Discover", bg: "#ffffff", fg: "#f76b1c" },
  { label: "PayPal", bg: "#003087", fg: "#ffffff" },
  { label: "Stripe", bg: "#635bff", fg: "#ffffff" },
  { label: "iZettle", bg: "#1d1d1b", fg: "#ffffff" },
  { label: "Zelle", bg: "#6d1ed4", fg: "#ffffff" },
  { label: "Cash App", bg: "#00d632", fg: "#ffffff" },
  { label: "M-PESA", bg: "#ffffff", fg: "#43b02a" },
];

/* ── deterministic fake QR (no network) ────────────────────────── */
export const FakeQR: React.FC<{ size?: number; seed?: string }> = ({ size = 84, seed = "qayd" }) => {
  const n = 21;
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; cells.push((h >>> 0) % 100 < 46); }
  const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const s = size / n;
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x * s} y={y * s} width={7 * s} height={7 * s} fill="#000" />
      <rect x={(x + 1) * s} y={(y + 1) * s} width={5 * s} height={5 * s} fill="#fff" />
      <rect x={(x + 2) * s} y={(y + 2) * s} width={3 * s} height={3 * s} fill="#000" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <rect width={size} height={size} fill="#fff" />
      {cells.map((on, i) => {
        const r = Math.floor(i / n), c = i % n;
        if (!on || inFinder(r, c)) return null;
        return <rect key={i} x={c * s} y={r * s} width={s} height={s} fill="#000" />;
      })}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
};

/* ── signature squiggle ────────────────────────────────────────── */
const SIGN_W: Record<PdfSettings["signatureSize"], number> = { Small: 70, Medium: 100, Large: 140 };
const Squiggle: React.FC<{ w: number }> = ({ w }) => (
  <svg width={w} height={w * 0.4} viewBox="0 0 100 40">
    <path d="M8 30 C 20 5, 30 38, 42 18 S 62 8, 68 24 S 88 34, 94 14" fill="none" stroke="#333" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ── data plumbing ─────────────────────────────────────────────── */
interface DocData {
  record: any;
  party: any;
  partyLabel: string;   // "Invoice To:" …
  items: any[];
  paymentsFor: any[];   // payment history rows for the record
}

const latest = (rows: any[]) => [...rows].sort((a, b) => (b.ts || b.id || 0) - (a.ts || a.id || 0))[0];

function useDocData(docType: PdfDocType, fixedPartyId?: number, recordId?: number): DocData {
  const customers = useCollection<any>("customers");
  const vendors = useCollection<any>("vendors");
  const invoices = useCollection<any>("invoices");
  const estimates = useCollection<any>("estimates");
  const proformas = useCollection<any>("proformas");
  const salesReceipts = useCollection<any>("salesReceipts");
  const creditNotes = useCollection<any>("creditNotes");
  const deliveryChallans = useCollection<any>("deliveryChallans");
  const paymentsReceived = useCollection<any>("paymentsReceived");
  const bills = useCollection<any>("bills");
  const purchaseOrders = useCollection<any>("purchaseOrders");
  const debitNotes = useCollection<any>("debitNotes");
  const paymentsMade = useCollection<any>("paymentsMade");

  return useMemo(() => {
    const cust = (id: any) => customers.find((c) => c.id === id) || customers[0] || {};
    const vend = (id: any) => vendors.find((v) => v.id === id) || vendors[0] || {};
    const withItems = (r: any) => (r?.items?.length ? r.items : latest(invoices)?.items || []);
    /** Locked record when recordId is given, newest otherwise. */
    const pick = (rows: any[]) => (recordId != null ? rows.find((r) => r.id === recordId) ?? latest(rows) : latest(rows));

    const make = (record: any, party: any, partyLabel: string, paymentsFor: any[] = []): DocData => ({
      record: record || {}, party: party || {}, partyLabel, items: withItems(record), paymentsFor,
    });

    switch (docType) {
      case "invoice": {
        const r = pick(invoices);
        return make(r, cust(fixedPartyId ?? r?.customerId), "Invoice To:", paymentsReceived.filter((p) => p.invoiceId === r?.id));
      }
      case "salesReceipt": { const r = pick(salesReceipts); return make(r, cust(r?.customerId), "Sales Receipt To:"); }
      case "proformaInvoice": { const r = pick(proformas); return make(r, cust(r?.customerId), "Proforma Invoice To:"); }
      case "estimate": { const r = pick(estimates); return make(r, cust(r?.customerId), "Estimate To:"); }
      case "deliveryChallan": { const r = pick(deliveryChallans); return make(r, cust(r?.customerId), "Delivery Challan To:"); }
      case "creditNote": { const r = pick(creditNotes); return make(r, cust(r?.customerId), "Credit To:"); }
      case "bill": { const r = pick(bills); return make(r, vend(r?.vendorId), "Bill To:", paymentsMade.filter((p) => p.billId === r?.id)); }
      case "purchaseOrder": { const r = pick(purchaseOrders); return make(r, vend(r?.vendorId), "Vendor To:"); }
      case "debitNote": { const r = pick(debitNotes); return make(r, vend(r?.vendorId), "Debit Note To:"); }
      case "paymentReceived": { const r = pick(paymentsReceived); return make(r, cust(r?.customerId), "Received From:"); }
      case "paymentMade": { const r = pick(paymentsMade); return make(r, vend(r?.vendorId), "Payment To:"); }
      case "statement": {
        const party = cust(fixedPartyId);
        const inv = invoices.filter((i) => i.customerId === party.id);
        const pays = paymentsReceived.filter((p) => p.customerId === party.id);
        return { record: { invoices: inv, payments: pays }, party, partyLabel: "Statement To:", items: [], paymentsFor: pays };
      }
      case "packingSlip": { const r = pick(invoices); return make(r, cust(r?.customerId), "Invoice To:"); }
      case "deliveryNote": { const r = pick(invoices); return make(r, cust(r?.customerId), "Debit Note To:"); }
    }
  }, [docType, fixedPartyId, recordId, customers, vendors, invoices, estimates, proformas, salesReceipts, creditNotes, deliveryChallans, paymentsReceived, bills, purchaseOrders, debitNotes, paymentsMade]);
}

/* ── line builders (respect the toggles) ───────────────────────── */
function companyLines(s: PdfSettings): { bold: boolean; text: string }[] {
  const out: { bold: boolean; text: string }[] = [];
  if (s.companyName) out.push({ bold: true, text: COMPANY.name });
  const regTax: string[] = [];
  if (s.companyRegNo) regTax.push(`Reg. No : ${COMPANY.regNo}`);
  if (s.companyTaxId) regTax.push(`Tax ID: ${COMPANY.taxId}`);
  if (s.companyRegTaxAlignBelow === "Name") regTax.forEach((t) => out.push({ bold: false, text: t }));
  if (s.companyCountry) out.push({ bold: false, text: COMPANY.country });
  if (s.companyAddress) out.push({ bold: false, text: COMPANY.address });
  if (s.companyEmail) out.push({ bold: false, text: COMPANY.email });
  if (s.companyPhone) out.push({ bold: false, text: `Phone: ${COMPANY.phone}` });
  if (s.companyMobile) out.push({ bold: false, text: `Mobile: ${COMPANY.mobile}` });
  if (s.companyFax) out.push({ bold: false, text: `Fax: ${COMPANY.fax}` });
  if (s.companyWebsite) out.push({ bold: false, text: COMPANY.website });
  if (s.companyRegTaxAlignBelow === "Address") regTax.forEach((t) => out.push({ bold: false, text: t }));
  return out;
}

function contactLines(s: PdfSettings, party: any): { bold: boolean; text: string }[] {
  const out: { bold: boolean; text: string }[] = [];
  out.push({ bold: true, text: party.name || "—" });
  if (s.contactFirstLastName && party.contact) out.push({ bold: false, text: party.contact });
  if (s.contactEmail && party.email && s.contactEmailBelow === "Name") out.push({ bold: false, text: party.email });
  if (s.contactMobile && (party.mobile || party.phone) && s.contactMobileBelow === "Name") out.push({ bold: false, text: `Mobile: ${party.mobile || party.phone}` });
  if (s.contactBusinessPhone && party.phone) out.push({ bold: false, text: `Business Phone: ${party.phone}` });
  if (s.contactHomePhone && party.homePhone) out.push({ bold: false, text: `Home No: ${party.homePhone}` });
  if (s.contactFax && party.fax) out.push({ bold: false, text: `Fax: ${party.fax}` });
  const addr = [party.street1, party.street2, [party.city, party.zip].filter(Boolean).join(" "), party.state, party.country].filter(Boolean);
  addr.forEach((l) => out.push({ bold: false, text: l }));
  if (s.contactEmail && party.email && s.contactEmailBelow === "Address") out.push({ bold: false, text: party.email });
  if (s.contactMobile && (party.mobile || party.phone) && s.contactMobileBelow === "Address") out.push({ bold: false, text: `Mobile: ${party.mobile || party.phone}` });
  if (s.contactRegNo && party.regNo) out.push({ bold: false, text: `Reg. No : ${party.regNo}` });
  if (s.contactTaxId && party.taxId) out.push({ bold: false, text: `Tax ID: ${party.taxId}` });
  return out;
}

const TAXES: Record<number, { name: string; rate: number }> = {
  1: { name: "new test tax", rate: 58 }, 2: { name: "Test Tax", rate: 72 }, 3: { name: "VAT", rate: 15 }, 4: { name: "GST", rate: 5 },
};

/* ── main component ────────────────────────────────────────────── */
export const PdfDocPreview: React.FC<{
  docType: PdfDocType;
  mode: PrintMode;
  settings: PdfSettings;
  /** lock the party (e.g. a specific customer's statement) */
  partyId?: number;
  /** lock the document (e.g. packing slip for one selected invoice) */
  recordId?: number;
  className?: string;
}> = ({ docType, mode, settings: s, partyId, recordId, className = "" }) => {
  const { record, party, partyLabel, items, paymentsFor } = useDocData(docType, partyId, recordId);

  // Prefer the real backend-rendered PDF for this record; fall back to the
  // local render below if there's no backend id / it fails (keeps working
  // offline and for unsaved drafts — no regression).
  const backendId = record?._id ? String(record._id) : "";
  const [serverPdfUrl, setServerPdfUrl] = useState<string | null>(null);
  // Loading while the backend PDF is being fetched (so we show a spinner, not
  // the local mock). Only drops to the mock when there's no backend id or the
  // request fails.
  const [pdfLoading, setPdfLoading] = useState<boolean>(!!backendId);
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    if (backendId) {
      setPdfLoading(true);
      setServerPdfUrl(null);
      fetchServerPdfUrl(docType, backendId).then((u) => {
        url = u;
        if (!alive) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        setServerPdfUrl(u);
        setPdfLoading(false);
      });
    } else {
      setPdfLoading(false);
      setServerPdfUrl(null);
    }
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [docType, backendId]);

  // While the real PDF is loading, show a spinner — never the mock.
  if (backendId && pdfLoading) {
    return (
      <div
        className={className}
        style={{ width: "100%", height: "100%", minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}
      >
        <div
          className="animate-spin"
          style={{ width: 44, height: 44, border: "3px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%" }}
        />
      </div>
    );
  }

  if (serverPdfUrl) {
    // `#toolbar=0…` hides the browser's native PDF chrome so the document sits
    // inside our own modal header/controls.
    return (
      <div className={className} style={{ width: "100%", height: "100%", minHeight: "70vh", background: "#f3f4f6" }}>
        <iframe
          src={`${serverPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title="Document PDF"
          style={{ width: "100%", height: "100%", minHeight: "70vh", border: "none" }}
        />
      </div>
    );
  }

  const fmt = (d: any) => formatPdfDate(d, s.dateFormat);
  const fontPx = PDF_FONT_PX[s.fontSize];
  const family = PDF_FONT_STACK[s.font] || PDF_FONT_STACK.Arial;
  const accent = s.textColor;
  const bc = s.borderColor;
  const pad = s.compactMode ? 0.6 : 1;

  const cellBorder: React.CSSProperties = {
    borderTop: s.horizontalLines === "Show" ? `1px solid ${bc}` : "none",
    borderBottom: s.horizontalLines === "Show" ? `1px solid ${bc}` : "none",
    borderLeft: s.verticalLines === "Show" ? `1px solid ${bc}` : "none",
    borderRight: s.verticalLines === "Show" ? `1px solid ${bc}` : "none",
    padding: `${4 * pad}px ${6 * pad}px`,
  };
  const gridBorder: React.CSSProperties = { border: `1px solid ${bc}`, padding: `${3 * pad}px ${8 * pad}px` };

  const isPayment = docType === "paymentReceived" || docType === "paymentMade";
  const isStatement = docType === "statement";
  const isPacking = docType === "packingSlip";
  const isDeliveryNote = docType === "deliveryNote";
  const hasPayBadges = (docType === "invoice" || docType === "bill") && s.paymentMethods === "Show";
  const showDue = docType === "invoice" || docType === "bill" || docType === "packingSlip";

  /* meta table rows */
  const numberLabelMap: Partial<Record<PdfDocType, string>> = {
    invoice: "Invoice #", salesReceipt: "Invoice #", bill: "Bill #", purchaseOrder: "P.O. #",
    packingSlip: "Bill #", deliveryNote: "Bill #", deliveryChallan: "Invoice #",
  };
  const meta: [string, React.ReactNode][] = [];
  if (isPayment) {
    if (s.paymentNumber) meta.push(["Payment #", String(record.number || "").replace("#", "") || "—"]);
    meta.push(["Date", fmt(record.ts || record.date)]);
    meta.push(["Payment Type", record.method || "Cash"]);
    if (s.totalAmount) meta.push(["Amount", money(record.amount)]);
  } else if (isStatement) {
    const inv = record.invoices || [], pays = record.payments || [];
    const amount = inv.reduce((t: number, i: any) => t + (i.total || 0), 0);
    const paid = pays.reduce((t: number, p: any) => t + (p.amount || 0), 0);
    meta.push(["Date", fmt(Date.now())]);
    if (s.totalAmount) meta.push(["Amount", money(amount)]);
    if (s.paidAmount) meta.push(["Paid", money(paid)]);
    meta.push(["Balance", money(amount - paid)]);
    meta.push(["From", fmt(Date.now())]);
    meta.push(["To", fmt(Date.now())]);
  } else {
    if (s.numberNo) meta.push([numberLabelMap[docType] || "Number", String(record.number || "").replace("#", "") || "—"]);
    if (s.poNo && (docType === "invoice" || docType === "bill" || docType === "purchaseOrder" || isPacking)) meta.push(["P.O. #", String(record.id ?? "—")]);
    meta.push(["Date", fmt(record.ts || record.date)]);
    if (s.dueDate && record.due && showDue) meta.push(["Due Date", fmt(record.due)]);
    if (s.totalAmount && !isPacking) meta.push(["Total", money(record.total)]);
  }

  /* items + totals */
  const subTotal = record.subTotal ?? items.reduce((t: number, it: any) => t + (it.amount ?? (it.qty || 0) * (it.rate || 0)), 0);
  const taxTotal = record.tax ?? 0;
  const total = record.total ?? subTotal + taxTotal;
  const amountPaid = record.amountPaid || 0;
  const amountDue = record.amountDue ?? total - amountPaid;

  const totalsRows: [string, string, boolean][] = [];
  totalsRows.push(["Sub Total", money(subTotal), false]);
  if (s.summaryTax === "Group" || !s.summaryTaxPercent) { if (taxTotal) totalsRows.push(["Tax", money(taxTotal), false]); }
  else if (taxTotal) totalsRows.push([`Tax (${TAXES[items[0]?.taxId || 1]?.rate ?? 0}% on ${money(subTotal)})`, money(taxTotal), false]);
  if (record.shipping) totalsRows.push(["Shipping Cost", money(record.shipping), false]);
  if (s.summaryTotal) totalsRows.push(["Total", money(total), true]);
  if (s.summaryReturnOrder && docType === "invoice" && amountPaid > 0) totalsRows.push(["Amount Paid", money(amountPaid), true]);
  if (showDue && s.summaryTotal && !isPacking) totalsRows.push(["Amount Due", money(amountDue), true]);

  const notes = record.notes || "";
  const terms = record.terms || "";

  /* ── shared fragments ──────────────────────────────────────── */
  const logoEl = s.logo && (
    <img src={Logo} alt="logo" style={{ width: PDF_LOGO_PX[s.logoSize], height: PDF_LOGO_PX[s.logoSize], objectFit: "contain" }} />
  );

  const payBadges = hasPayBadges && (
    <div style={{ textAlign: "right", margin: `${6 * pad}px 0` }}>
      {s.payNowAlignment === "Up" && (
        <button style={{ background: "#2563eb", color: "#fff", fontSize: fontPx - 2, padding: "3px 14px", borderRadius: 3, border: "none" }}>Pay Now</button>
      )}
      <div style={{ fontSize: fontPx - 3, color: "#555", margin: "4px 0 3px" }}>We accept payment by</div>
      <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 3, maxWidth: 190, marginLeft: "auto" }}>
        {PAY_BADGES.map((b) => (
          <span key={b.label} style={{ background: b.bg, color: b.fg, border: "1px solid #ddd", borderRadius: 2, fontSize: 6.5, fontWeight: 700, padding: "2px 4px", whiteSpace: "nowrap" }}>{b.label}</span>
        ))}
      </div>
      {s.payNowAlignment === "Down" && (
        <button style={{ background: "#2563eb", color: "#fff", fontSize: fontPx - 2, padding: "3px 14px", borderRadius: 3, border: "none", marginTop: 4 }}>Pay Now</button>
      )}
    </div>
  );

  const signature = (s.companySign === "Company" || s.contactSign) && !isStatement && (
    <div style={{ display: "flex", justifyContent: "space-between", padding: `${16 * pad}px ${8 * pad}px ${6 * pad}px` }}>
      {s.companySign === "Company" ? (
        <div style={{ textAlign: "center", order: s.companySignAlignment === "Left" ? 0 : 2 }}>
          <Squiggle w={SIGN_W[s.signatureSize]} />
          <div style={{ borderTop: `1px solid ${bc}`, fontSize: fontPx - 2, paddingTop: 3 }}>Company Signature</div>
        </div>
      ) : <span />}
      <span style={{ order: 1 }} />
      {s.contactSign ? (
        <div style={{ textAlign: "center", alignSelf: "flex-end", order: s.contactSignAlignment === "Right" ? 2 : 0 }}>
          <div style={{ height: SIGN_W[s.signatureSize] * 0.4 }} />
          <div style={{ borderTop: `1px solid ${bc}`, fontSize: fontPx - 2, paddingTop: 3 }}>Contact Signature</div>
        </div>
      ) : <span />}
    </div>
  );

  const footer = (s.createdHyperlink || s.pageNumber) && (
    <div style={{ display: "flex", alignItems: "center", marginTop: 10 * pad, fontSize: fontPx - 3, color: "#666" }}>
      <span style={{ flex: 1, textAlign: s.pageNumberAlignment === "Left" ? "left" : "center" }}>
        {s.createdHyperlink && <span>Created by <span style={{ color: accent, fontWeight: 700 }}>Qayd</span></span>}
      </span>
      {s.pageNumber && <span style={{ textAlign: s.pageNumberAlignment.toLowerCase() as any, minWidth: 40 }}>Page 1 of 1</span>}
    </div>
  );

  /* ════════ THERMAL MODE ════════ */
  if (mode === "thermal") {
    const line = <div style={{ borderTop: `1px solid ${bc}`, margin: `${5 * pad}px 0` }} />;
    return (
      <div className={className} style={{ background: "#fff", color: "#111", width: 320, margin: "0 auto", fontFamily: family, fontSize: fontPx, padding: `${12 * pad}px ${10 * pad}px`, boxShadow: "0 1px 8px rgba(0,0,0,.25)" }}>
        <div style={{ textAlign: s.titleAlignment.toLowerCase() as any, fontWeight: 700, fontSize: fontPx + 7 }}>{docTypeLabel(docType)}</div>
        {s.header && (
          <div style={{ textAlign: "center", marginTop: 6 }}>
            {s.logo && <div style={{ display: "flex", justifyContent: "center" }}>{logoEl}</div>}
            {companyLines(s).map((l, i) => (
              <div key={i} style={{ fontWeight: l.bold ? 700 : 400 }}>{l.bold ? l.text : l.text.replace(/^Phone:/, "Phone:").replace(COMPANY.email, `Email: ${COMPANY.email}`)}</div>
            ))}
          </div>
        )}
        {line}
        {!isStatement && (
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              {s.numberNo && <div>{(numberLabelMap[docType] || "Number").replace(" #", "")} #: {String(record.number || "").replace("#", "")}</div>}
              <div>Date: {fmt(record.ts || record.date)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {s.totalAmount && <div>Total: {money(record.total ?? record.amount)}</div>}
              {s.dueDate && record.due && showDue && <div>Due Date: {fmt(record.due)}</div>}
            </div>
          </div>
        )}
        {hasPayBadges && (
          <div style={{ margin: "6px 0" }}>
            <div>We accept payment by:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
              {PAY_BADGES.map((b) => (
                <span key={b.label} style={{ background: b.bg, color: b.fg, border: "1px solid #ddd", borderRadius: 2, fontSize: 6.5, fontWeight: 700, padding: "2px 4px" }}>{b.label}</span>
              ))}
            </div>
          </div>
        )}
        {line}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{partyLabel}</div>
            {contactLines(s, party).map((l, i) => <div key={i} style={{ fontWeight: l.bold ? 700 : 400 }}>{l.text}</div>)}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>Ship To</div>
            {[party.street1 || party.subtitle, party.city, party.country].filter(Boolean).map((t: string, i: number) => <div key={i}>{t}</div>)}
          </div>
        </div>
        {s.subTitle && <div style={{ textAlign: "center", fontWeight: 700, margin: `${5 * pad}px 0` }}>Qayd - Invoice &amp; Accounting</div>}
        {line}
        {!isPayment && !isStatement && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Items</span><span>Qty{isPacking ? "" : " / Amount"}</span>
            </div>
            {line}
            {items.map((it: any, i: number) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{it.name}</span>
                  <span>{isPacking ? (it.qty ?? 1) : money(it.amount ?? (it.qty || 0) * (it.rate || 0))}</span>
                </div>
                {!isPacking && <div style={{ color: "#444" }}>{it.qty ?? 1} × {money(it.rate)}{s.summaryTaxPercent && it.taxId ? ` · ${TAXES[it.taxId]?.name} ${TAXES[it.taxId]?.rate}%` : ""}</div>}
              </div>
            ))}
            {line}
            {!isPacking && (
              <div>
                {totalsRows.map(([k, v, strong], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontWeight: strong ? 700 : 400 }}><span>{k}</span><span>{v}</span></div>
                ))}
              </div>
            )}
          </>
        )}
        {isPayment && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div>Amount {docType === "paymentMade" ? "Paid" : "Received"}</div>
            <div style={{ fontWeight: 700, fontSize: fontPx + 6 }}>{money(record.amount)}</div>
          </div>
        )}
        {(s.showTerms && terms) && (<><div style={{ fontWeight: 700, marginTop: 5 }}>Terms &amp; Conditions:</div><div>{terms}</div></>)}
        {(s.showNotes && notes) && (<><div style={{ fontWeight: 700, marginTop: 5 }}>Notes:</div><div>{notes}</div></>)}
        {!isPayment && !isStatement && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>Scan QR To Pay</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}><FakeQR seed={`${docType}-${record.id}`} /></div>
            <div style={{ fontWeight: 700 }}>Thank You!</div>
          </div>
        )}
      </div>
    );
  }

  /* ════════ NORMAL MODE ════════ */
  const pageStyle: React.CSSProperties = {
    background: "#fff", color: "#111", fontFamily: family, fontSize: fontPx,
    padding: `${s.margin.top}px ${s.margin.right}px ${s.margin.bottom}px ${s.margin.left}px`,
    width: "100%", minHeight: s.paper === "A4 Paper" ? 760 : 700, boxShadow: "0 1px 8px rgba(0,0,0,.25)",
    display: "flex", flexDirection: "column",
  };
  const frameStyle: React.CSSProperties = { border: s.outerBorder === "Show" ? `1px solid ${bc}` : "none", flex: 1, display: "flex", flexDirection: "column" };

  const itemCols: string[] = isPacking
    ? ["Sr. No.", "Products", "Quantity"]
    : isDeliveryNote
      ? ["Sr. No.", "Products", "HSN", "Quantity"]
      : ["Sr. No.", "Products", "Quantity", "Unit Price", "Discount", "Amount"];

  const itemRow = (it: any, i: number) => {
    const amount = it.amount ?? (it.qty || 0) * (it.rate || 0);
    const cells: React.ReactNode[] = isPacking
      ? [i + 1, itemName(it), it.qty ?? 1]
      : isDeliveryNote
        ? [i + 1, itemName(it), `HSN000${(it.taxId || 1)}`, it.qty ?? 1]
        : [i + 1, itemName(it), it.qty ?? 1, money(it.rate), money(it.discount || 0), money(amount)];
    return (
      <tr key={i}>
        {cells.map((c, j) => (
          <td key={j} style={{ ...cellBorder, textAlign: j >= 2 ? "right" : "left", color: j === 1 ? accent : "#111", verticalAlign: "top" }}>{c}</td>
        ))}
      </tr>
    );
  };
  const itemName = (it: any) => (
    <span>
      <span style={{ fontWeight: 700 }}>{it.name}</span>
      {it.description ? <span style={{ color: "#555" }}><br />{it.description}</span> : null}
      {s.summaryTaxPercent && it.taxId && !isPacking && !isDeliveryNote ? <span style={{ color: "#555" }}><br />{TAXES[it.taxId]?.name} ({TAXES[it.taxId]?.rate}%)</span> : null}
    </span>
  );

  return (
    <div className={className} style={pageStyle}>
      {s.documentCopyLabel && !isStatement && !isPayment && (
        <div style={{ textAlign: "right", fontStyle: "italic", color: "#777", fontSize: fontPx - 1, paddingBottom: 2 }}>(Original)</div>
      )}
      <div style={frameStyle}>
        {/* title */}
        <div style={{ textAlign: s.titleAlignment.toLowerCase() as any, fontWeight: 700, fontSize: fontPx + 9, color: accent, padding: `${8 * pad}px ${10 * pad}px`, borderBottom: s.outerBorder === "Show" ? `1px solid ${bc}` : "none", letterSpacing: 0.5 }}>
          {docTypeTitle(docType)}
        </div>

        {/* header: company block + meta table */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: `${10 * pad}px ${10 * pad}px 0` }}>
          <div style={{ maxWidth: "55%" }}>
            {s.header && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {logoEl}
                  {s.companyName && <span style={{ fontWeight: 700, fontSize: fontPx + 4, color: accent }}>{COMPANY.name}</span>}
                </div>
                {companyLines(s).slice(1).map((l, i) => (
                  <div key={i} style={{ color: l.bold ? "#111" : "#333", fontWeight: l.bold ? 700 : 400 }}>{l.text}</div>
                ))}
              </>
            )}
            <div style={{ marginTop: 8 * pad }}>
              <div style={{ fontWeight: 700 }}>{partyLabel}</div>
              {contactLines(s, party).map((l, i) => (
                <div key={i} style={{ fontWeight: l.bold ? 700 : 400, color: l.bold ? accent : "#333", textAlign: s.contactAddressAlignment === "Right" ? "right" : "left" }}>{l.text}</div>
              ))}
            </div>
          </div>
          <div>
            <table style={{ borderCollapse: "collapse", fontSize: fontPx - 0.5 }}>
              <tbody>
                {meta.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ ...gridBorder, fontWeight: 700, textAlign: "right", background: s.fillColor, color: s.fillTextColor }}>{k}</td>
                    <td style={{ ...gridBorder, minWidth: 90, color: accent }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payBadges}
          </div>
        </div>

        {/* sub title */}
        {s.subTitle && (
          <div style={{ textAlign: s.subTitleAlignment.toLowerCase() as any, fontWeight: 700, color: accent, padding: `${8 * pad}px 10px ${4 * pad}px` }}>
            Qayd - Invoice &amp; Accounting
          </div>
        )}

        {/* body per doc kind */}
        {isPayment ? (
          <div style={{ padding: `${8 * pad}px ${10 * pad}px` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[s.paymentNumber ? "Payment #" : null, "Date", "Amount", "Payment Type"].filter(Boolean).map((h) => (
                    <th key={h as string} style={{ ...cellBorder, background: s.fillColor, color: s.fillTextColor, textAlign: "left", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {s.paymentNumber && <td style={{ ...cellBorder }}>{String(record.number || "").replace("#", "")}</td>}
                  <td style={{ ...cellBorder }}>{fmt(record.ts || record.date)}</td>
                  <td style={{ ...cellBorder, color: accent }}>{money(record.amount)}</td>
                  <td style={{ ...cellBorder }}>{record.method || "Cash"}</td>
                </tr>
              </tbody>
            </table>
            <table style={{ width: "60%", borderCollapse: "collapse", marginTop: 10 * pad }}>
              <thead>
                <tr>
                  <th style={{ ...cellBorder, background: s.fillColor, color: s.fillTextColor, textAlign: "left", fontWeight: 700 }}>{docType === "paymentMade" ? "Bill #" : "Invoice #"}</th>
                  <th style={{ ...cellBorder, background: s.fillColor, color: s.fillTextColor, textAlign: "left", fontWeight: 700 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...cellBorder, color: accent }}>{String(record.invoiceId ?? record.billId ?? "—")}</td>
                  <td style={{ ...cellBorder, color: accent }}>{money(record.amount)}</td>
                </tr>
              </tbody>
            </table>
            {s.paymentNote && notes && <div style={{ marginTop: 10 }}><b>Payment Note:</b> {notes}</div>}
          </div>
        ) : isStatement ? (
          <div style={{ padding: `${8 * pad}px ${10 * pad}px`, flex: 1 }}>
            <StatementTable record={record} s={s} cellBorder={cellBorder} accent={accent} fmt={fmt} />
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 * pad }}>
              <thead>
                <tr>{itemCols.map((h, j) => <th key={h} style={{ ...cellBorder, background: s.fillColor, color: s.fillTextColor, textAlign: j >= 2 ? "right" : "left", fontWeight: 700 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.length === 0
                  ? <tr><td colSpan={itemCols.length} style={{ ...cellBorder, textAlign: "center", color: "#999", padding: 18 }}>No items</td></tr>
                  : items.map(itemRow)}
              </tbody>
            </table>

            {!isPacking && (
              <div style={{ display: "flex", justifyContent: "flex-end", padding: `${8 * pad}px ${10 * pad}px` }}>
                <table style={{ borderCollapse: "collapse", minWidth: 220 }}>
                  <tbody>
                    {totalsRows.map(([k, v, strong], i) => (
                      <tr key={i}>
                        <td style={{ padding: `${2.5 * pad}px 10px`, fontWeight: strong ? 700 : 400, textAlign: "right" }}>{k}</td>
                        <td style={{ padding: `${2.5 * pad}px 0`, fontWeight: strong ? 700 : 400, textAlign: "right", color: accent, borderTop: strong ? `1px solid ${bc}` : "none" }}>{v}</td>
                      </tr>
                    ))}
                    {s.summaryTotal && (
                      <tr><td style={{ padding: "3px 10px", fontWeight: 700, textAlign: "right" }}>Total in Words</td><td style={{ padding: "3px 0", textAlign: "right", color: accent, fontSize: fontPx - 2 }}>{inWords(total)}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {isDeliveryNote && (
              <div style={{ padding: `0 ${10 * pad}px ${8 * pad}px` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: fontPx - 1 }}>
                  <thead>
                    <tr>
                      {["HSN/SAC", "Taxable Value", "Central Tax Rate", "Central Tax Amount", "State Tax Rate", "State Tax Amount", "Total Tax Amount"].map((h) => (
                        <th key={h} style={{ ...cellBorder, background: s.fillColor, color: s.fillTextColor, fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>{["1115542", money(subTotal), "—", money(0), "9%", money(taxTotal / 2), money(taxTotal)].map((c, i) => <td key={i} style={{ ...cellBorder, textAlign: i ? "right" : "left", color: accent }}>{c}</td>)}</tr>
                    <tr>{["Total", money(subTotal), "", money(0), "", money(taxTotal / 2), money(taxTotal)].map((c, i) => <td key={i} style={{ ...cellBorder, textAlign: i ? "right" : "left", fontWeight: 700 }}>{c}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* notes / terms */}
        {!isStatement && (s.showTerms && terms || s.showNotes && notes) ? (
          <div style={{ padding: `${4 * pad}px ${10 * pad}px`, borderTop: s.horizontalLines === "Show" ? `1px solid ${bc}` : "none" }}>
            {s.showTerms && terms && (<><div style={{ fontWeight: 700 }}>Terms &amp; Conditions</div><div style={{ color: "#333" }}>{terms}</div></>)}
            {s.showNotes && notes && (<><div style={{ fontWeight: 700, marginTop: 4 }}>Notes</div><div style={{ color: "#333" }}>{notes}</div></>)}
          </div>
        ) : null}

        {/* QR + payment history (invoice-family bottom) */}
        {!isStatement && !isPayment && !isPacking && !isDeliveryNote && (
          <div style={{ padding: `${6 * pad}px ${10 * pad}px` }}>
            <div style={{ display: "flex", justifyContent: "center" }}><FakeQR size={64} seed={`${docType}-${record.id}`} /></div>
            {s.paymentHistory && paymentsFor.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr>
                    <th colSpan={4} style={{ ...cellBorder, background: s.fillColor, color: s.fillTextColor, fontWeight: 700, textAlign: "center" }}>Payment Details</th>
                  </tr>
                  <tr>{["Payment #", "Date", "Amount", "Payment Type"].map((h) => <th key={h} style={{ ...cellBorder, textAlign: "left", fontWeight: 700 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {paymentsFor.map((p: any, i: number) => (
                    <tr key={i}>
                      <td style={cellBorder}>{String(p.number || "").replace("#", "")}</td>
                      <td style={cellBorder}>{fmt(p.ts || p.date)}</td>
                      <td style={{ ...cellBorder, color: accent }}>{money(p.amount)}</td>
                      <td style={cellBorder}>{p.method || "Cash"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div style={{ flex: 1 }} />
        {signature}
      </div>
      {footer}
    </div>
  );
};

/* ── statement body table ──────────────────────────────────────── */
const StatementTable: React.FC<{ record: any; s: PdfSettings; cellBorder: React.CSSProperties; accent: string; fmt: (d: any) => string }> = ({ record, s, cellBorder, accent, fmt }) => {
  const inv: any[] = record.invoices || [];
  const pays: any[] = record.payments || [];
  const tx = [
    ...inv.map((i) => ({ ts: i.ts || 0, date: i.date, details: `Invoice ${i.number}`, amount: i.total || 0, paid: 0 })),
    ...pays.map((p) => ({ ts: p.ts || 0, date: p.date, details: `Payment ${p.number}`, amount: 0, paid: p.amount || 0 })),
  ].sort((a, b) => a.ts - b.ts);
  let bal = 0;
  const rows = tx.map((t) => { bal += t.amount - t.paid; return { ...t, balance: bal }; });
  const totals = {
    amount: tx.reduce((t, x) => t + x.amount, 0),
    paid: tx.reduce((t, x) => t + x.paid, 0),
  };
  const cols = ["Date", "Details", "Amount", ...(s.paidAmount ? ["Paid"] : []), "Balance"];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>{cols.map((h) => <th key={h} style={{ ...cellBorder, background: s.fillColor, color: s.fillTextColor, textAlign: "left", fontWeight: 700 }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        <tr>
          <td style={cellBorder} />
          <td style={cellBorder}>Opening Balance</td>
          <td style={{ ...cellBorder, color: accent }}>{money(0)}</td>
          {s.paidAmount && <td style={cellBorder} />}
          <td style={{ ...cellBorder, color: accent }}>{money(0)}</td>
        </tr>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={cellBorder}>{fmt(r.ts || r.date)}</td>
            <td style={{ ...cellBorder, color: accent }}>{r.details}</td>
            <td style={{ ...cellBorder, color: accent }}>{r.amount ? money(r.amount) : ""}</td>
            {s.paidAmount && <td style={{ ...cellBorder, color: accent }}>{r.paid ? money(r.paid) : ""}</td>}
            <td style={{ ...cellBorder, color: accent }}>{money(r.balance)}</td>
          </tr>
        ))}
        {s.summaryTotal && (
          <tr>
            <td style={{ ...cellBorder, fontWeight: 700 }}>Total</td>
            <td style={cellBorder} />
            <td style={{ ...cellBorder, fontWeight: 700 }}>{money(totals.amount)}</td>
            {s.paidAmount && <td style={{ ...cellBorder, fontWeight: 700 }}>{money(totals.paid)}</td>}
            <td style={{ ...cellBorder, fontWeight: 700 }}>{money(totals.amount - totals.paid)}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

/* ── number → words (for "Total in Words") ─────────────────────── */
function inWords(n: number): string {
  if (!Number.isFinite(n)) return "";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const chunk = (x: number): string =>
    x === 0 ? "" :
    x < 20 ? ones[x] :
    x < 100 ? `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}` :
    `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? " " + chunk(x % 100) : ""}`;
  const int = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - int) * 100);
  const parts: string[] = [];
  const scales: [number, string][] = [[1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"], [1, ""]];
  let rest = int;
  for (const [v, name] of scales) {
    const q = Math.floor(rest / v);
    if (q) { parts.push(`${chunk(q)}${name ? " " + name : ""}`); rest %= v; }
  }
  const words = parts.join(" ") || "Zero";
  return `${words} Dollars${cents ? ` and ${chunk(cents)} Cents` : ""}`;
}

export default PdfDocPreview;
