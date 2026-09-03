/**
 * File: src/lib/db/pos.ts
 * POS module data — completed sales persisted in the Dexie `meta` table
 * (key `pos:orders`), same liveQuery store pattern as lib/db/goal.ts.
 * Products/prices come from the shared Dexie `products` collection
 * (Items > Products), per the reference instruction. GST is 18%.
 */

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { api } from "@/lib/api/client";
import { getToken } from "@/lib/api/tokenStore";
import { toArray } from "@/services/_http";

/* ── types ─────────────────────────────────────────────────────── */

export interface PosItem {
  productId: number;
  name: string;
  sku: string;
  qty: number;
  price: number;
  taxRate: number; // percent
}

export interface PosOrder {
  id: string;
  number: string; // #POS00040
  date: string; // yyyy-mm-dd
  customer: string;
  warehouse: string;
  bankAccount: string;
  items: PosItem[];
  discount: number;
  status: "Completed";
  createdAt: number;
}

/* ── store ─────────────────────────────────────────────────────── */

const KEY = "pos:orders";

/* ── backend mapping (source of truth once authenticated) ──────────── */

const ymd = (v: unknown): string => {
  if (!v) return new Date().toISOString().slice(0, 10);
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
};

/** Backend POS order → the UI PosOrder shape. `id` carries the Mongo _id. */
const mapPosOrder = (d: any): PosOrder => ({
  id: String(d._id ?? d.id ?? ""),
  number: String(d.order_number ?? ""),
  date: ymd(d.date ?? d.createdAt),
  customer: String(d.customer_name ?? "Walk-in Customer"),
  warehouse: String(d.warehouse ?? ""),
  bankAccount: String(d.bank_account ?? ""),
  items: (d.items ?? []).map((i: any) => ({
    productId: Number(i.product_id_num) || 0,
    name: String(i.name ?? ""),
    sku: String(i.sku ?? ""),
    qty: Number(i.quantity) || 0,
    price: Number(i.price) || 0,
    taxRate: Number(i.tax_rate) || 0,
  })),
  discount: Number(d.discount) || 0,
  status: "Completed",
  createdAt: new Date(d.createdAt ?? d.date ?? Date.now()).getTime(),
});

/** UI PosOrder → backend create body. */
const reversePosOrder = (o: PosOrder) => ({
  order_number: o.number,
  customer_name: o.customer,
  warehouse: o.warehouse,
  bank_account: o.bankAccount,
  discount: o.discount || 0,
  date: new Date(o.date + "T00:00:00").toISOString(),
  items: o.items.map((i) => ({
    name: i.name,
    sku: i.sku,
    quantity: i.qty,
    price: i.price,
    tax_rate: i.taxRate,
  })),
});

export const posOrderStore = {
  save: async (orders: PosOrder[]) => {
    await db.meta.put({ key: KEY, value: orders });
  },
  use: (): PosOrder[] | null | undefined =>
    useLiveQuery(async () => {
      const row = await db.meta.get(KEY);
      return row === undefined ? null : (row.value as PosOrder[]);
    }, []),
  /** Pull orders from the backend into the local cache (called on login). */
  hydrate: async () => {
    if (!getToken()) return;
    try {
      const res = await api.raw.get("/pos/order/all");
      const rows = toArray<any>(res.data).map(mapPosOrder);
      await db.meta.put({ key: KEY, value: rows });
    } catch {
      /* keep whatever is cached locally */
    }
  },
  /** Persist a completed sale — backend when authed, else local-only. */
  create: async (order: PosOrder) => {
    if (getToken()) {
      try {
        await api.raw.post("/pos/order/create", reversePosOrder(order));
        await posOrderStore.hydrate();
        return;
      } catch {
        /* fall through to local cache so the sale isn't lost */
      }
    }
    const row = await db.meta.get(KEY);
    const cur = (row?.value as PosOrder[]) || [];
    await db.meta.put({ key: KEY, value: [order, ...cur] });
  },
};

/* ── catalogs / helpers ────────────────────────────────────────── */

export const POS_WAREHOUSES = [
  "Central Distribution Center - 1250 Industrial Blvd",
  "West Coast Storage Facility",
  "Midwest Regional Warehouse",
];

export const GST_RATE = 18;

export const warehouseShort = (w: string) => w.split(" - ")[0];

export const orderSubtotal = (o: Pick<PosOrder, "items">) =>
  o.items.reduce((s, i) => s + i.qty * i.price, 0);
export const orderTax = (o: Pick<PosOrder, "items">) =>
  +o.items.reduce((s, i) => s + (i.qty * i.price * i.taxRate) / 100, 0).toFixed(2);
export const orderTotal = (o: Pick<PosOrder, "items" | "discount">) =>
  +(orderSubtotal(o) + orderTax(o) - (o.discount || 0)).toFixed(2);

/** Next sale number: seeds end at #POS00039, new sales continue from there. */
export const nextPosNumber = (orders: PosOrder[]) => {
  const max = orders.reduce((m, o) => Math.max(m, parseInt(o.number.replace(/\D/g, ""), 10) || 0), 0);
  return `#POS${String(max + 1).padStart(5, "0")}`;
};

export const posUid = () => "pos" + Math.random().toString(36).slice(2, 8);

/* ── seed orders (references/pos/pos order.png — sale numbers,
   Walk-in customers and warehouses; line items use the products from
   Items > Products, which is where POS products come from) ── */

const I = (productId: number, name: string, sku: string, qty: number, price: number): PosItem => ({
  productId,
  name,
  sku,
  qty,
  price,
  taxRate: GST_RATE,
});

const O = (
  n: number,
  customer: string,
  warehouse: string,
  date: string,
  items: PosItem[],
  discount = 0,
): PosOrder => ({
  id: `seed${n}`,
  number: `#POS${String(n).padStart(5, "0")}`,
  date,
  customer,
  warehouse,
  bankAccount: "Cash",
  items,
  discount,
  status: "Completed",
  createdAt: new Date(date + "T10:00:00").getTime() + n,
});

const CDC = POS_WAREHOUSES[0];
const WCS = POS_WAREHOUSES[1];
const MRW = POS_WAREHOUSES[2];

export const SEED_POS_ORDERS: PosOrder[] = [
  O(39, "Walk-in Customer", CDC, "2026-07-07", [I(4, "Widget A", "WID-A", 1, 45)]),
  O(38, "Walk-in Customer", CDC, "2026-07-06", [I(6, "Gadget Pro", "GAD-PRO", 1, 160), I(2, "demo product", "DMO-01", 3, 12)]),
  O(37, "Walk-in Customer", CDC, "2026-07-05", [I(5, "Widget B", "WID-B", 1, 65)]),
  O(36, "Walk-in Customer", CDC, "2026-07-05", [I(4, "Widget A", "WID-A", 2, 45), I(5, "Widget B", "WID-B", 1, 65)]),
  O(35, "Walk-in Customer", CDC, "2026-07-04", [I(2, "demo product", "DMO-01", 3, 12)]),
  O(34, "bdcalling", CDC, "2026-07-03", [I(6, "Gadget Pro", "GAD-PRO", 5, 160), I(4, "Widget A", "WID-A", 4, 45)]),
  O(33, "Walk-in Customer", CDC, "2026-07-02", [I(3, "Officiis ullam labor", "OFF-01", 1, 236), I(4, "Widget A", "WID-A", 2, 45)]),
  O(32, "Walk-in Customer", CDC, "2026-07-01", [I(4, "Widget A", "WID-A", 1, 45)]),
  O(31, "Walk-in Customer", CDC, "2026-06-29", [I(6, "Gadget Pro", "GAD-PRO", 2, 160)]),
  O(30, "Walk-in Customer", MRW, "2026-06-27", [I(3, "Officiis ullam labor", "OFF-01", 4, 236)]),
  O(29, "rahim", WCS, "2026-06-24", [I(5, "Widget B", "WID-B", 6, 65)]),
  O(28, "Walk-in Customer", CDC, "2026-06-20", [I(2, "demo product", "DMO-01", 10, 12), I(4, "Widget A", "WID-A", 1, 45)]),
];

/* ── barcode helper: real Code 128 (code set B) ─────────────────── */

/** Code 128 bar/space patterns, values 0–106 (103–105 = start A/B/C,
 *  106 = stop). Each digit is a module width; entries alternate
 *  bar,space,bar,space,… starting with a bar. */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

/** Encode text as a real, scannable Code 128-B symbol.
 *  Returns module widths alternating bar,space,bar,… (starts and ends
 *  with a bar). Renderers must lay these out back-to-back with NO
 *  extra gaps or the symbol stops being decodable. */
export function code128Modules(text: string): number[] {
  const values = [104]; // Start Code B
  for (const ch of text || "SKU") {
    const c = ch.charCodeAt(0);
    values.push(c >= 32 && c <= 126 ? c - 32 : 0); // unsupported → space
  }
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103); // checksum symbol
  values.push(106); // stop
  const out: number[] = [];
  for (const v of values) for (const d of CODE128_PATTERNS[v]) out.push(Number(d));
  return out;
}
