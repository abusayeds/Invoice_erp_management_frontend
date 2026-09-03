/**
 * File: src/lib/db/sync.ts
 * Backend ↔ datastore bridge. Mirrors REST collections into the local Dexie
 * tables the UI reads via `useCollection`/`useDoc`, and (for write-enabled
 * entities) routes `repo` writes back to the backend. All of this happens
 * BELOW the UI: no page, component, field, or layout changes.
 *
 * The UI keys records by a numeric `id` while the backend uses Mongo `_id`
 * strings, so each backend document gets a deterministic numeric `id` and keeps
 * its original `_id` (internal, ignored by the UI) so writes can be routed back.
 */

import { format } from "date-fns";
import { api } from "@/lib/api/client";
import { getToken } from "@/lib/api/tokenStore";
import { toArray } from "@/services/_http";
import { db, type CollectionName } from "./db";

/** Stable positive 32-bit hash of a Mongo id → the UI's numeric primary key. */
export function numericId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

const num = (v: unknown): number =>
  typeof v === "number" ? v : parseFloat(String(v ?? "")) || 0;
const str = (v: unknown): string => (v == null ? "" : String(v));
/** Name of a possibly-populated ref (`{category|name|...}`), else "" for a bare id. */
const refName = (v: any): string =>
  v && typeof v === "object" ? str(v.category ?? v.name ?? v.title) : "";
/** Id of a possibly-populated ref (`{_id}`) or a bare id string. */
const refId = (v: any): string =>
  v && typeof v === "object" ? str(v._id) : str(v);
/** Only pass through a value that looks like a Mongo ObjectId (avoids CastErrors). */
const oid = (v: unknown): string | undefined => {
  const s = str(v);
  return /^[a-f0-9]{24}$/i.test(s) ? s : undefined;
};
/** ISO date → `YYYY-MM-DD` (what the form inputs expect); "" when absent. */
const ymd = (v: unknown): string => (v ? str(v).slice(0, 10) : "");
/** Backend date → the seed's display format ("Jun 20, 2026"); "" when absent. */
const fmtDate = (v: unknown): string => {
  if (!v) return "";
  const d = new Date(str(v));
  return isNaN(d.getTime()) ? "" : format(d, "MMM d, yyyy");
};
/** Any date string the UI holds → `YYYY-MM-DD`; "" when unparseable. */
const toIso = (v: unknown): string => {
  if (!v) return "";
  const d = new Date(str(v));
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};
const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Resolve a UI numeric id back to the backend Mongo `_id` via the local table. */
export async function backendIdOf(
  collection: CollectionName,
  id: unknown,
): Promise<string | undefined> {
  if (id == null || id === "") return undefined;
  try {
    const row = await (db as any)[collection].get(Number(id));
    const _id = str(row?._id);
    return _id || undefined;
  } catch {
    return undefined;
  }
}

type MapFn = (doc: any) => Record<string, any>;

interface WriteConfig {
  create: string;
  /** Omit when the backend has no edit endpoint (update stays local-only). */
  update?: (backendId: string) => string;
  remove: (backendId: string) => string;
  /** Verb for update (some backends use POST /edit/:id). Default "patch". */
  updateMethod?: "patch" | "put" | "post";
  /** Verb for delete (some backends use POST). Default "delete". */
  removeMethod?: "delete" | "post";
  /** Body for a POST-style delete that takes the id in the body (e.g. project). */
  removeBody?: (backendId: string) => Record<string, unknown>;
  /** UI row/patch → backend request body (may resolve refs, so may be async). */
  reverse: (row: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>;
}

interface SyncSpec {
  collection: CollectionName;
  url: string;
  map: MapFn;
  write?: WriteConfig;
}

// ── Field maps: backend doc → existing seed-row shape (never changes the UI) ──

/**
 * Full customer map (backend party doc → the exact row the Customers page/detail
 * form reads). Business fields live under `businessProfile`; the address under
 * `businessProfile.billing_address`.
 */
const mapCustomer: MapFn = (d) => {
  const bp = d.businessProfile ?? {};
  const ba = bp.billing_address ?? {};
  return {
    name: str(d.name) || str(bp.companyName),
    email: str(d.email),
    phone: str(d.phone) || str(bp.business_phone),
    subtitle: str(bp.companyName) || str(d.name),
    balance: num(bp.opening_balance ?? d.balance),
    status: bp.active === false || d.isDeleted ? "Inactive" : "Active",
    regNo: str(bp.registration_number),
    taxId: str(bp.tax_number),
    fax: str(bp.fax),
    homePhone: str(bp.home_phone),
    firstName: "",
    lastName: "",
    mobile: "",
    birthday: ymd(bp.birthday),
    anniversary: ymd(bp.anniversary),
    street1: str(ba.address_line_1),
    street2: str(ba.address_line_2),
    zip: str(ba.zip_code),
    city: str(ba.city),
    state: str(ba.state),
    country: str(ba.country),
    bank: str(bp.bank_details),
    currency: str(d.currency ?? bp.currency),
    defaultTaxService: refId(bp.default_tax_service_id),
    defaultTaxProduct: refId(bp.default_tax_product_id),
    hourlyRate: num(bp.hourly_rate),
    paymentTerms: str(bp.payment_terms),
    openingBalance: num(bp.opening_balance),
    openingBalanceDate: ymd(bp.opening_balance_date),
    notes: str(bp.notes),
    paymentReminder: !!bp.payment_reminder,
    sameAsBilling: !!bp.same_as_billing,
  };
};

/** Customer row → backend create/update body (flat fields the party helper expects). */
const reverseCustomer = (r: Record<string, any>) => {
  const billing = {
    name: str(r.name),
    address_line_1: str(r.street1),
    address_line_2: str(r.street2),
    city: str(r.city),
    state: str(r.state),
    country: str(r.country),
    zip_code: str(r.zip),
  };
  const hasAddr = !!(billing.address_line_1 || billing.city || billing.country);
  return {
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    company_name: str(r.name),
    registration_number: str(r.regNo),
    tax_number: str(r.taxId),
    business_phone: str(r.phone),
    fax: str(r.fax),
    home_phone: str(r.homePhone),
    birthday: r.birthday || undefined,
    anniversary: r.anniversary || undefined,
    bank_details: str(r.bank),
    payment_terms: str(r.paymentTerms),
    default_tax_service_id: oid(r.defaultTaxService),
    default_tax_product_id: oid(r.defaultTaxProduct),
    hourly_rate: num(r.hourlyRate),
    opening_balance: num(r.openingBalance),
    opening_balance_date: r.openingBalanceDate || undefined,
    payment_reminder: !!r.paymentReminder,
    currency: str(r.currency) || undefined,
    same_as_billing: !!r.sameAsBilling,
    notes: str(r.notes),
    ...(hasAddr ? { billing_address: billing } : {}),
  };
};

const mapVendor: MapFn = (d) => ({
  name: str(d.name) || str(d.businessProfile?.companyName),
  email: str(d.email),
  phone: str(d.phone) || str(d.businessProfile?.business_phone),
  subtitle: str(d.designation) || str(d.businessProfile?.companyName),
  payable: num(d.businessProfile?.opening_balance ?? d.payable),
  status: d.isDeleted ? "Inactive" : "Active",
});

const mapProduct: MapFn = (d) => ({
  name: str(d.productName ?? d.name),
  category: refName(d.category),
  sku: str(d.sku),
  note: str(d.description),
  price: num(d.pricing?.sellPrice ?? d.price),
  buyPrice: num(d.pricing?.buyPrice ?? d.buyPrice),
  stock: num(d.stock?.quantity ?? d.quantity),
  unit: str(d.unitType ?? d.unit),
  taxId: 0,
  status: d.isDeleted ? "Inactive" : "Active",
});

const mapService: MapFn = (d) => ({
  name: str(d.serviceName ?? d.name),
  note: str(d.description ?? d.note),
  price: num(d.rate ?? d.price),
  sac: typeof d.sac === "string" ? d.sac : d.sac ? "Yes" : "",
  qty: num(d.quantity ?? d.qty ?? 1),
  unit: str(d.unitType ?? d.unit),
  taxId: 0,
  status: d.isDeleted ? "Inactive" : "Active",
});

const mapTax: MapFn = (d) => ({ name: str(d.name), rate: num(d.rate) });
const mapCategory: MapFn = (d) => ({ name: str(d.category ?? d.name) });

// ── Invoice (and its sibling sales documents) ────────────────────────────────

/** Backend status → the label the sales-doc UI expects. */
const invStatus = (s: unknown): string =>
  str(s) === "Partial" ? "Partially Paid" : str(s) || "Draft";
const invStatusOut = (s: unknown): string =>
  str(s) === "Partially Paid" ? "Partial" : str(s) || "Draft";

/** Backend product/service line arrays → the UI's flat `items` array. */
const linesIn = (d: any): any[] => {
  const out: any[] = [];
  let i = 1;
  for (const p of d.product ?? [])
    out.push({
      id: i++,
      name: str(p.product_name) || refName(p.product_id),
      description: str(p.description),
      qty: num(p.quantity),
      rate: num(p.rate),
      taxId: 0,
      discount: num(p.discount),
      amount: num(p.amount),
    });
  for (const s of d.service ?? [])
    out.push({
      id: i++,
      name: str(s.service_name) || refName(s.service_id),
      description: str(s.description),
      qty: num(s.quantity),
      rate: num(s.rate),
      taxId: 0,
      discount: num(s.discount),
      amount: num(s.amount),
    });
  return out;
};

/** Backend sales doc → the UI invoice/proforma/receipt row shape. */
const mapInvoice: MapFn = (d) => ({
  number: str(d.invoice_number),
  customerId: d.customer_id ? numericId(refId(d.customer_id)) : "",
  customerName: str(d.customer_name) || refName(d.customer_id),
  date: fmtDate(d.date ?? d.createdAt),
  due: fmtDate(d.due_date),
  ts: d.date ? new Date(str(d.date)).getTime() : Date.now(),
  status: invStatus(d.status),
  items: linesIn(d),
  subTotal: num(d.sub_total),
  tax: num(d.tax),
  shipping: num(d.shipping_cost),
  total: num(d.total),
  amountPaid: num(d.paid_amount),
  amountDue: num(d.balance_amount),
  terms: str(d.terms_and_conditions),
  notes: str(d.notes),
});

/** UI invoice row → backend create/update body (resolves customer ref + lines). */
const reverseInvoice = async (r: Record<string, any>) => {
  const customer_id = await backendIdOf("customers", r.customerId);
  const product = (r.items ?? [])
    .filter((it: any) => str(it.name))
    .map((it: any) => {
      const base = num(it.qty) * num(it.rate);
      const discFlat = num(it.discount);
      // Backend treats a line discount strictly as a percent; convert the
      // UI's flat discount and recompute amount so validateItemAmount passes.
      const discPct = base > 0 ? (discFlat / base) * 100 : 0;
      return {
        product_name: str(it.name),
        description: str(it.description),
        quantity: num(it.qty),
        rate: num(it.rate),
        tax: 0,
        discount: +discPct.toFixed(6),
        amount: +(base - (base * discPct) / 100).toFixed(2),
      };
    });
  return {
    invoice_number: str(r.number).replace(/^#/, ""),
    ...(customer_id ? { customer_id } : { customer_name: str(r.customerName) }),
    date: toIso(r.date) || todayIso(),
    due_date: toIso(r.due) || toIso(r.date) || todayIso(),
    product,
    service: [],
    sub_total: num(r.subTotal),
    shipping_cost: num(r.shipping),
    total: num(r.total),
    paid_amount: num(r.amountPaid),
    balance_amount: num(r.amountDue),
    terms_and_conditions: str(r.terms),
    notes: str(r.notes),
    status: invStatusOut(r.status),
  };
};

// ── Purchase documents (bill / purchase order / debit note) — vendor-keyed ───

/** Backend purchase doc → the UI bill/PO/debit-note row shape (vendor-keyed). */
const mapPurchase: MapFn = (d) => ({
  number: str(d.invoice_number),
  vendorId: d.vendor_id ? numericId(refId(d.vendor_id)) : "",
  vendorName: str(d.vendor_name) || refName(d.vendor_id),
  date: fmtDate(d.date ?? d.createdAt),
  due: fmtDate(d.due_date),
  ts: d.date ? new Date(str(d.date)).getTime() : Date.now(),
  status: invStatus(d.status),
  items: linesIn(d),
  subTotal: num(d.sub_total),
  tax: num(d.tax),
  shipping: num(d.shipping_cost),
  total: num(d.total),
  amountPaid: num(d.paid_amount),
  amountDue: num(d.balance_amount),
  terms: str(d.terms_and_conditions),
  notes: str(d.notes),
});

/** UI purchase row → backend body (resolves vendor ref + lines). */
const reversePurchase = async (r: Record<string, any>) => {
  const vendor_id = await backendIdOf("vendors", r.vendorId);
  const product = (r.items ?? [])
    .filter((it: any) => str(it.name))
    .map((it: any) => {
      const base = num(it.qty) * num(it.rate);
      const discPct = base > 0 ? (num(it.discount) / base) * 100 : 0;
      return {
        product_name: str(it.name),
        description: str(it.description),
        quantity: num(it.qty),
        rate: num(it.rate),
        tax: 0,
        discount: +discPct.toFixed(6),
        amount: +(base - (base * discPct) / 100).toFixed(2),
      };
    });
  return {
    invoice_number: str(r.number).replace(/^#/, ""),
    ...(vendor_id ? { vendor_id } : { vendor_name: str(r.vendorName) }),
    date: toIso(r.date) || todayIso(),
    due_date: toIso(r.due) || toIso(r.date) || todayIso(),
    product,
    service: [],
    sub_total: num(r.subTotal),
    shipping_cost: num(r.shipping),
    total: num(r.total),
    paid_amount: num(r.amountPaid),
    balance_amount: num(r.amountDue),
    terms_and_conditions: str(r.terms),
    notes: str(r.notes),
    status: invStatusOut(r.status),
  };
};

// ── Expense (vendor + category + amount) ─────────────────────────────────────

const mapExpense: MapFn = (d) => ({
  number: str(d.invoice_number),
  vendorId: d.vendor_id ? numericId(refId(d.vendor_id)) : "",
  vendorName: str(d.vendor_name) || refName(d.vendor_id),
  category: str(d.category),
  date: fmtDate(d.date ?? d.createdAt),
  ts: d.date ? new Date(str(d.date)).getTime() : Date.now(),
  amount: num(d.total),
  notes: str(d.notes),
});

const reverseExpense = async (r: Record<string, any>) => {
  const vendor_id = await backendIdOf("vendors", r.vendorId);
  const amt = num(r.amount);
  return {
    invoice_number: str(r.number).replace(/^#/, ""),
    ...(vendor_id ? { vendor_id } : { vendor_name: str(r.vendorName) }),
    category: str(r.category),
    date: toIso(r.date) || todayIso(),
    due_date: toIso(r.date) || todayIso(),
    product: [],
    service: [],
    sub_total: amt,
    total: amt,
    notes: str(r.notes),
    status: "Draft",
  };
};

// ── Full vendor (mirrors the customer party contract, keyed on `payable`) ─────

const mapVendorFull: MapFn = (d) => {
  const bp = d.businessProfile ?? {};
  const ba = bp.billing_address ?? {};
  return {
    name: str(d.name) || str(bp.companyName),
    email: str(d.email),
    phone: str(d.phone) || str(bp.business_phone),
    subtitle: str(bp.companyName) || str(d.name),
    payable: num(bp.opening_balance ?? d.payable),
    status: bp.active === false || d.isDeleted ? "Inactive" : "Active",
    regNo: str(bp.registration_number),
    taxId: str(bp.tax_number),
    fax: str(bp.fax),
    homePhone: str(bp.home_phone),
    firstName: "",
    lastName: "",
    mobile: "",
    birthday: ymd(bp.birthday),
    anniversary: ymd(bp.anniversary),
    street1: str(ba.address_line_1),
    street2: str(ba.address_line_2),
    zip: str(ba.zip_code),
    city: str(ba.city),
    state: str(ba.state),
    country: str(ba.country),
    bank: str(bp.bank_details),
    currency: str(d.currency ?? bp.currency),
    defaultTaxService: refId(bp.default_tax_service_id),
    defaultTaxProduct: refId(bp.default_tax_product_id),
    hourlyRate: num(bp.hourly_rate),
    paymentTerms: str(bp.payment_terms),
    openingBalance: num(bp.opening_balance),
    openingBalanceDate: ymd(bp.opening_balance_date),
    notes: str(bp.notes),
    paymentReminder: !!bp.payment_reminder,
    sameAsBilling: !!bp.same_as_billing,
  };
};

// vendor create/update share the customer party body; update carries `_id`
// (the /vendor/update route reads the id from the body, not the URL).
const reverseVendor = (r: Record<string, any>) => ({
  ...reverseCustomer(r),
  ...(r._id ? { _id: String(r._id) } : {}),
});

// ── Product write (pricing / stock / category ref) ───────────────────────────

async function categoryIdByName(name: unknown): Promise<string | undefined> {
  const n = str(name).trim();
  if (!n) return undefined;
  try {
    const all = await (db as any).categories.toArray();
    const hit = all.find((c: any) => str(c.name) === n);
    return hit?._id ? String(hit._id) : undefined;
  } catch {
    return undefined;
  }
}

const reverseProduct = async (r: Record<string, any>) => {
  const category = await categoryIdByName(r.category);
  return {
    productName: str(r.name),
    sku: str(r.sku),
    unitType: str(r.unit),
    quantity: num(r.stock) || 1,
    description: str(r.note),
    pricing: { buyPrice: num(r.buyPrice), sellPrice: num(r.price) },
    stock: { quantity: num(r.stock) },
    ...(category ? { category } : {}),
  };
};

// ── Payment received / made ──────────────────────────────────────────────────

const firstMethod = (d: any): string =>
  Array.isArray(d.payment_method) ? str(d.payment_method[0]) : str(d.payment_method ?? d.method);

const mapPaymentReceived: MapFn = (d) => ({
  number: str(d.invoice_number) || str(d.payment_number),
  customerId: d.customer_id ? numericId(refId(d.customer_id)) : "",
  invoiceId: d.invoice_id ? numericId(refId(d.invoice_id)) : "",
  date: fmtDate(d.date ?? d.createdAt),
  ts: d.date ? new Date(str(d.date)).getTime() : Date.now(),
  amount: num(d.total ?? d.amount),
  method: firstMethod(d),
  notes: str(d.notes),
  internalNotes: str(d.internal_notes),
});

const reversePaymentReceived = async (r: Record<string, any>) => {
  const customer_id = await backendIdOf("customers", r.customerId);
  const invoice_id = await backendIdOf("invoices", r.invoiceId);
  const amt = num(r.amount);
  return {
    ...(customer_id ? { customer_id } : {}),
    ...(invoice_id ? { invoice_id } : {}),
    date: toIso(r.date) || todayIso(),
    payment_method: r.method ? [str(r.method)] : [],
    product: [],
    service: [],
    sub_total: amt,
    total: amt,
    notes: str(r.notes),
    internal_notes: str(r.internalNotes),
  };
};

// Payment made (vendorPayment) — read + delete only; create contract (bill
// allocations) is not reproduced from the simple web row, so no write map.
// Web ProjectStatus (Ongoing|Onhold|Completed|Planning) ↔ backend (Ongoing|Onhold|Finished).
const projStatusOut = (s: unknown): string => {
  const v = str(s);
  if (v === "Onhold") return "Onhold";
  if (v === "Completed" || v === "Finished") return "Finished";
  return "Ongoing"; // Ongoing / Planning
};

const mapProject: MapFn = (d) => ({
  name: str(d.name),
  status: d.status === "Finished" ? "Completed" : str(d.status) || "Planning",
  description: str(d.description),
  budget: num(d.budget),
  startDate: ymd(d.start_date),
  endDate: ymd(d.end_date),
  members: (d.members ?? []).map((m: any) => (m && typeof m === "object" ? m.name : m)).filter(Boolean),
  clients: (d.clients ?? []).map((c: any) => (c && typeof c === "object" ? c.name : c)).filter(Boolean),
  milestones: [],
  bugs: [],
  activities: [],
  totalTasks: num(d.total_task),
  completedTasks: 0,
});

const fmtMonth = (v: unknown): string => {
  if (!v) return "";
  const d = new Date(str(v));
  return isNaN(d.getTime()) ? "" : format(d, "MMM yyyy");
};

const mapTimelog: MapFn = (d) => ({
  project: str(d.project),
  task: str(d.task),
  hours: str(d.hours) || "00:00",
  notes: str(d.notes ?? d.details),
  date: fmtDate(d.date ?? d.created_at),
  month: fmtMonth(d.date ?? d.created_at),
  ts: d.date ? new Date(str(d.date)).getTime() : Date.now(),
  dateLabel: "",
  invoiced: false,
  customerId: null,
  projectId: null,
  taskId: null,
});

const mapPaymentMade: MapFn = (d) => ({
  number: str(d.payment_number) || str(d.invoice_number),
  vendorId: d.vendor_id ? numericId(refId(d.vendor_id)) : "",
  date: fmtDate(d.payment_date ?? d.date ?? d.createdAt),
  ts: d.payment_date ? new Date(str(d.payment_date)).getTime() : Date.now(),
  amount: num(d.payment_amount ?? d.amount ?? d.total),
  method: firstMethod(d),
  notes: str(d.notes),
});

// ── Registry. Add an entry to bring a list live; add `write` for CRUD too. ────

export const SYNC_SPECS: SyncSpec[] = [
  {
    collection: "customers",
    url: "/customers",
    map: mapCustomer,
    write: {
      create: "/customers",
      update: (id) => `/customers/${id}`,
      remove: (id) => `/customers/${id}`,
      reverse: reverseCustomer,
    },
  },
  {
    collection: "invoices",
    url: "/invoices",
    map: mapInvoice,
    write: {
      create: "/invoices",
      update: (id) => `/invoices/${id}`,
      remove: (id) => `/invoices/${id}`,
      reverse: reverseInvoice,
    },
  },
  {
    collection: "proformas",
    url: "/proforma-invoice/all",
    map: mapInvoice,
    write: {
      create: "/proforma-invoice/create",
      update: (id) => `/proforma-invoice/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/proforma-invoice/delete/${id}`,
      reverse: reverseInvoice,
    },
  },
  {
    collection: "salesReceipts",
    url: "/sales-receipt/all",
    map: mapInvoice,
    write: {
      create: "/sales-receipt/create",
      update: (id) => `/sales-receipt/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/sales-receipt/delete/${id}`,
      reverse: reverseInvoice,
    },
  },
  {
    collection: "estimates",
    url: "/estimate/all",
    map: mapInvoice,
    write: {
      create: "/estimate/create",
      update: (id) => `/estimate/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/estimate/delete/${id}`,
      reverse: reverseInvoice,
    },
  },
  {
    collection: "deliveryChallans",
    url: "/delivery-challan/all",
    map: mapInvoice,
    write: {
      create: "/delivery-challan/create",
      update: (id) => `/delivery-challan/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/delivery-challan/delete/${id}`,
      reverse: reverseInvoice,
    },
  },
  {
    collection: "creditNotes",
    url: "/account/credit-notes/all",
    map: mapInvoice,
    write: {
      create: "/account/credit-notes/create",
      update: (id) => `/account/credit-notes/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/account/credit-notes/delete/${id}`,
      reverse: reverseInvoice,
    },
  },
  {
    collection: "vendors",
    url: "/vendor/all",
    map: mapVendorFull,
    write: {
      create: "/vendor/create",
      update: () => "/vendor/update", // id travels in the body (reverseVendor)
      updateMethod: "post",
      remove: (id) => `/vendor/delete/${id}`,
      reverse: reverseVendor,
    },
  },
  {
    collection: "expenses",
    url: "/expenses/all",
    map: mapExpense,
    write: {
      create: "/expenses/create",
      update: (id) => `/expenses/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/expenses/delete/${id}`,
      reverse: reverseExpense,
    },
  },
  {
    collection: "paymentsReceived",
    url: "/payment-received/all",
    map: mapPaymentReceived,
    write: {
      create: "/payment-received/create",
      update: (id) => `/payment-received/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/payment-received/delete/${id}`,
      reverse: reversePaymentReceived,
    },
  },
  // Payment made (vendorPayment): read-only — its create needs bill allocations
  // the simple web row doesn't carry, so writes stay local for now.
  {
    collection: "paymentsMade",
    url: "/account/vendor-payments/all",
    map: mapPaymentMade,
    // Bill-direct payment: /record persists the payment without the strict
    // purchase-invoice allocation contract (the bill balance is updated
    // separately via the bills spec). No edit endpoint → create-only.
    write: {
      create: "/account/vendor-payments/record",
      remove: (id) => `/account/vendor-payments/delete/${id}`,
      reverse: async (r) => ({
        vendor_id: await backendIdOf("vendors", r.vendorId),
        payment_amount: num(r.amount),
        payment_method: r.method ? [str(r.method)] : undefined,
        payment_date: toIso(r.date) || todayIso(),
        notes: str(r.notes),
      }),
    },
  },
  // Projects: create/update via the combined /project/create-update (members &
  // clients are managed by separate invite endpoints, so core fields are safe).
  {
    collection: "projects",
    url: "/project/all",
    map: mapProject,
    write: {
      create: "/project/create-update",
      update: () => "/project/create-update",
      updateMethod: "post",
      remove: () => "/project/delete",
      removeMethod: "post",
      removeBody: (id) => ({ project_id: id }),
      reverse: async (r) => {
        // Backend requires a non-empty user_ids; resolve member names → ids.
        let userIds: string[] = [];
        let clientIds: string[] = [];
        try {
          const res = await api.raw.get("/project/users");
          const users = toArray<any>(res.data);
          const byName: Record<string, string> = {};
          for (const u of users) byName[str(u.name).trim()] = str(u._id);
          userIds = (r.members ?? []).map((m: any) => byName[str(m).trim()]).filter(Boolean);
          clientIds = (r.clients ?? []).map((c: any) => byName[str(c).trim()]).filter(Boolean);
        } catch { /* leave empty */ }
        return {
          ...(r._id ? { project_id: String(r._id) } : {}),
          name: str(r.name),
          description: str(r.description),
          budget: num(r.budget),
          start_date: toIso(r.startDate) || undefined,
          end_date: toIso(r.endDate) || undefined,
          status: projStatusOut(r.status),
          ...(userIds.length ? { user_ids: userIds } : {}),
          ...(clientIds.length ? { client_ids: clientIds } : {}),
        };
      },
    },
  },
  {
    collection: "timelogs",
    url: "/time-log/all",
    map: mapTimelog,
    write: {
      create: "/time-log/create",
      update: (id) => `/time-log/${id}`,
      updateMethod: "patch",
      remove: (id) => `/time-log/delete/${id}`,
      reverse: (r) => ({
        project: str(r.project),
        task: str(r.task),
        hours: str(r.hours),
        notes: str(r.notes),
        date: toIso(r.date) || todayIso(),
      }),
    },
  },
  {
    collection: "bills",
    url: "/bill/all",
    map: mapPurchase,
    write: {
      create: "/bill/create",
      update: (id) => `/bill/edit/${id}`,
      updateMethod: "post",
      remove: (id) => `/bill/delete/${id}`,
      reverse: reversePurchase,
    },
  },
  {
    collection: "purchaseOrders",
    url: "/purchase/invoices/all",
    map: mapPurchase,
    write: {
      create: "/purchase/invoices/create",
      update: (id) => `/purchase/invoices/edit/${id}`,
      updateMethod: "patch",
      remove: (id) => `/purchase/invoices/delete/${id}`,
      reverse: reversePurchase,
    },
  },
  {
    collection: "debitNotes",
    url: "/account/debit-notes/all",
    map: mapPurchase,
    write: {
      create: "/account/debit-notes/create",
      update: (id) => `/account/debit-notes/update/${id}`,
      remove: (id) => `/account/debit-notes/delete/${id}`,
      reverse: reversePurchase,
    },
  },
  {
    collection: "products",
    url: "/product/all",
    map: mapProduct,
    write: {
      create: "/product/create",
      update: (id) => `/product/update/${id}`,
      updateMethod: "patch",
      remove: (id) => `/product/delete/${id}`,
      reverse: reverseProduct,
    },
  },
  {
    collection: "services",
    url: "/service/all",
    map: mapService,
    write: {
      create: "/service/create",
      update: (id) => `/service/${id}`,
      remove: (id) => `/service/${id}`,
      reverse: (r) => ({
        serviceName: str(r.name),
        description: str(r.note),
        rate: num(r.price),
        quantity: num(r.qty ?? 1),
        unitType: str(r.unit),
        sac: false,
        taxes: [],
      }),
    },
  },
  {
    collection: "taxes",
    url: "/tax/all",
    map: mapTax,
    write: {
      create: "/tax/create",
      update: (id) => `/tax/${id}`,
      remove: (id) => `/tax/${id}`,
      reverse: (r) => ({ name: str(r.name), rate: num(r.rate) }),
    },
  },
  {
    collection: "categories",
    url: "/category/all",
    map: mapCategory,
    write: {
      create: "/category/create",
      update: (id) => `/category/${id}`,
      remove: (id) => `/category/${id}`,
      reverse: (r) => ({ category: str(r.name ?? r.category) }),
    },
  },
];

const specByCollection = new Map(SYNC_SPECS.map((s) => [s.collection, s]));

/** Backend spec for a collection, if it is wired. */
export function specFor(name: CollectionName): SyncSpec | undefined {
  return specByCollection.get(name);
}

// ── Read sync ────────────────────────────────────────────────────────────────

async function syncSpec(spec: SyncSpec): Promise<void> {
  try {
    const res = await api.raw.get(spec.url);
    const docs = toArray<any>(res.data);
    const rows = docs.map((d) => {
      const _id = str(d._id ?? d.id);
      return { ...spec.map(d), _id, id: numericId(_id) };
    });
    // Touch the table only after a successful fetch, so an offline/401 request
    // leaves the current data intact.
    await (db as any)[spec.collection].clear();
    if (rows.length) await (db as any)[spec.collection].bulkPut(rows);
  } catch (e) {
    console.warn(`[sync] ${spec.collection} skipped:`, e);
  }
}

/** Re-pull a single collection from the backend (used after a write). */
export async function resync(name: CollectionName): Promise<void> {
  const spec = specByCollection.get(name);
  if (spec && getToken()) await syncSpec(spec);
}

let inFlight: Promise<void> | null = null;

/** Sync every wired collection (one run at a time). No-op without a token. */
export async function syncAll(): Promise<void> {
  if (!getToken()) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    for (const spec of SYNC_SPECS) await syncSpec(spec);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
