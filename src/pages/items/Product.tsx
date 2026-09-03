/**
 * File: src/pages/items/Product.tsx
 * Product — master/detail layout matching the reference design.
 * Left: list (search, sort, status/category filters, selection mode); rows
 *       show price + colored Stock line (red=0, green>0).
 * Right: sectioned read-only view (Details / Quantity / Pricing & Tax /
 *        Stock Status / Description) with an Update Stock button + ⋮ menu.
 *        Pencil → inline Edit Product form; FAB → Create Product.
 * Modals: Update Stock (vendor / qty / buy price + history), Add Variation.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo, money, parseMoney, db } from "@/lib/db";
import { showToast } from "@/utils/toast";
import { api } from "../../lib/api/client";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  Settings,
  Pencil,
  MoreVertical,
  X,
  Trash2,
  Copy,
  Archive,
  Barcode,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Layers,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
interface Product {
  id: number;
  image?: string | null;
  name: string;
  category: string;
  note: string;
  price: string;
  stock: number | null; // null = no inventory tracking (no Stock line)
  sku: string;
  qty: string;
  unit: string;
  buyPrice: string;
  buyTax: string;
  sellTax: string;
  onHand: string;
  committed: string;
  available: string;
  toInvoiced: string;
  toBilled: string;
}

const D = { buyTax: "Test Tax", sellTax: "Test Tax", onHand: "0.00", committed: "0.00", available: "0.00", toInvoiced: "0.00", toBilled: "0.00" };
const products: Product[] = [
  { id: 1, name: "cat", category: "Advisers", note: "No Notes", price: "$321.00", stock: 0, sku: "3213", qty: "1", unit: "box", buyPrice: "$54.00", buyTax: "new test tax", sellTax: "Test Tax", onHand: "0.00", committed: "-1.00", available: "1.00", toInvoiced: "-1.00", toBilled: "0.00" },
  { id: 2, name: "Drive", category: "Bookkeepers", note: "hi products , this is drive", price: "$236.00", stock: 167, sku: "5245", qty: "11", unit: "cm", buyPrice: "$236.00", ...D, onHand: "167.00", committed: "-22.00", available: "189.00", toInvoiced: "-22.00", toBilled: "189.00" },
  { id: 3, name: "dwccwc", category: "No Category", note: "No Notes", price: "$2.00", stock: null, sku: "—", qty: "0", unit: "pcs", buyPrice: "$2.00", ...D },
  { id: 4, name: "dwccwc", category: "No Category", note: "No Notes", price: "$2.00", stock: 0, sku: "—", qty: "0", unit: "pcs", buyPrice: "$2.00", ...D },
  { id: 5, name: "hi", category: "No Category", note: "No Notes", price: "$0.00", stock: null, sku: "—", qty: "0", unit: "pcs", buyPrice: "$0.00", ...D },
  { id: 6, name: "hi", category: "No Category", note: "No Notes", price: "$0.00", stock: 0, sku: "—", qty: "0", unit: "pcs", buyPrice: "$0.00", ...D },
  { id: 7, name: "pen", category: "Accountants", note: "No Notes", price: "$0.00", stock: 0, sku: "—", qty: "0", unit: "pcs", buyPrice: "$0.00", ...D },
  { id: 8, name: "Pen drive", category: "Advisers", note: "hi this is pen drive product", price: "$98.00", stock: 24, sku: "—", qty: "1", unit: "box", buyPrice: "$98.00", ...D, onHand: "24.00", committed: "0.00", available: "24.00", toInvoiced: "0.00", toBilled: "24.00" },
  { id: 9, name: "Product 1", category: "Websites", note: "this is product 1", price: "$25.00", stock: 12, sku: "—", qty: "1", unit: "pcs", buyPrice: "$25.00", ...D, onHand: "12.00", committed: "0.00", available: "12.00", toInvoiced: "0.00", toBilled: "12.00" },
  { id: 10, name: "Product 1", category: "Websites", note: "this is product 1", price: "$25.00", stock: 12, sku: "—", qty: "1", unit: "pcs", buyPrice: "$25.00", ...D, onHand: "12.00", committed: "0.00", available: "12.00", toInvoiced: "0.00", toBilled: "12.00" },
  { id: 11, name: "Product 2", category: "Websites", note: "No Notes", price: "$25.00", stock: 8, sku: "—", qty: "1", unit: "pcs", buyPrice: "$25.00", ...D, onHand: "8.00", committed: "0.00", available: "8.00", toInvoiced: "0.00", toBilled: "8.00" },
  { id: 12, name: "test", category: "No Category", note: "No Notes", price: "$0.00", stock: 0, sku: "—", qty: "0", unit: "pcs", buyPrice: "$0.00", ...D },
  { id: 13, name: "xyz", category: "No Category", note: "No Notes", price: "$0.00", stock: null, sku: "—", qty: "0", unit: "pcs", buyPrice: "$0.00", ...D },
];

const sortFields = ["Name", "Price", "Stock", "Category", "Created On"];
const statusList = ["All", "Active", "Archived", "Trash"];
const categoryList = ["Advisers", "Bookkeepers", "Accountants", "Websites", "No Category"];
const unitTypes = ["box", "cm", "kg", "pcs", "ft"];
const taxList = ["Test Tax", "new test tax", "VAT", "GST"];

/* ── Outside-click dropdown ────────────────────────────────────── */
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClass?: string;
}> = ({ trigger, children, align = "left", panelClass = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className={`absolute z-30 mt-2 min-w-[180px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/* ── Modal shell ───────────────────────────────────────────────── */
const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full flex justify-center">{children}</div>
    </div>
  );
};

/* ── Section header bar ─────────────────────────────────────────── */
const SectionBar: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
  <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 border-y border-gray-200">
    <span className="text-sm font-semibold text-gray-900">{title}</span>
    {right}
  </div>
);
const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><div className="text-xs text-gray-500">{label}</div><div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div></div>
);

const fieldCls = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";
const FloatField: React.FC<{ label?: string; value?: string; placeholder?: string; icon?: React.ReactNode; onChange?: (v: string) => void }> = ({ label, value, placeholder, icon, onChange }) => (
  <div className="relative fl-wrap">
    {label && <label className="fl-label">{label}</label>}
    <div className="relative">
      <input
        {...(onChange ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : { defaultValue: value })}
        placeholder={placeholder && placeholder !== label ? placeholder : " "} className={fieldCls}
      />
      {icon && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
    </div>
  </div>
);
const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button onClick={onChange} className={`w-9 h-5 rounded-full transition-colors relative ${on ? "bg-blue-600" : "bg-gray-300"}`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
  </button>
);

/* ── Update Stock modal — vendor type-ahead + add rows (references:
   Desktop/update stock*.png). Each added row bumps the product's stock and
   auto-generates a Purchase Order; rows persist in meta `stock:updates:<id>`. */
interface StockRow { id: string; vendor: string; qty: number; unit: string; buyPrice: number; poId?: number }

const UpdateStockModal: React.FC<{ onClose: () => void; product: Product }> = ({ onClose, product }) => {
  const vendors = useCollection<any>("vendors", "name");
  const metaKey = `stock:updates:${product.id}`;
  const [rows, setRows] = useState<StockRow[]>([]);
  useEffect(() => {
    db.meta.get(metaKey).then((r) => { if (r?.value) setRows(r.value as StockRow[]); });
  }, [metaKey]);
  const saveRows = (list: StockRow[]) => { setRows(list); db.meta.put({ key: metaKey, value: list }); };

  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [venOpen, setVenOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [buyPrice, setBuyPrice] = useState(product.buyPrice.replace(/[^0-9.]/g, ""));
  const [unit, setUnit] = useState(product.unit);
  const venRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (venRef.current && !venRef.current.contains(e.target as Node)) setVenOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const vendorMatches = vendors.filter((v) => v.name.toLowerCase().includes(vendorQuery.toLowerCase()));
  const exactMatch = vendors.some((v) => v.name.toLowerCase() === vendorQuery.trim().toLowerCase());
  const vendorEmpty = !vendorQuery.trim();
  const labelText = !vendorEmpty && !exactMatch ? "New Vendor" : "Vendor";

  const add = async () => {
    if (vendorEmpty) { showToast("Vendor is required", "warning"); return; }
    const qtyN = parseMoney(qty);
    if (qtyN <= 0) { showToast("Enter a quantity greater than 0", "warning"); return; }
    const priceN = parseMoney(buyPrice);
    // resolve or create the vendor from the typed name
    let vid = vendorId;
    if (vid == null) {
      const found = vendors.find((v) => v.name.toLowerCase() === vendorQuery.trim().toLowerCase());
      vid = found ? found.id : ((await repo.add("vendors", { name: vendorQuery.trim(), status: "Active", payable: 0 })) as number);
    }
    const vendorName = vendors.find((v) => v.id === vid)?.name || vendorQuery.trim();
    // auto-generate the Purchase Order for this stock addition
    const total = +(qtyN * priceN).toFixed(2);
    const n = await repo.nextNumber("purchaseOrders");
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const poId = (await repo.add("purchaseOrders", {
      number: "#" + n, vendorId: vid, date, due: date, ts: Date.now(), status: "Draft", billStatus: "Not Billed",
      items: [{ id: 1, name: product.name, description: "Stock update", qty: qtyN, rate: priceN, taxId: 1, discount: 0, amount: total }],
      subTotal: total, tax: 0, total, amountPaid: 0, amountDue: total, notes: `Auto-generated by Update Stock (${product.name})`,
    })) as number;
    // bump the product's stock
    await repo.update("products", product.id, { stock: (product.stock ?? 0) + qtyN, buyPrice: priceN, unit });
    saveRows([...rows, { id: Math.random().toString(36).slice(2, 8), vendor: vendorName, qty: qtyN, unit, buyPrice: priceN, poId }]);
    showToast(`Stock updated — Purchase Order #${n} generated`, "success");
    setVendorQuery(""); setVendorId(null); setQty("1");
  };

  const removeRow = async (row: StockRow) => {
    const current = (await repo.getOne("products", product.id))?.stock ?? 0;
    await repo.update("products", product.id, { stock: Math.max(0, current - row.qty) });
    if (row.poId) await repo.remove("purchaseOrders", row.poId);
    saveRows(rows.filter((r) => r.id !== row.id));
    showToast("Stock entry removed", "info");
  };

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-2xl my-12 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Update Stock</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* vendor type-ahead (red until a vendor is typed/picked, per reference) */}
          <div className="relative fl-wrap" ref={venRef}>
            <label className={`fl-label ${vendorEmpty ? "text-red-500" : "text-gray-500"}`}>{labelText}</label>
            <input
              value={vendorQuery}
              onChange={(e) => { setVendorQuery(e.target.value); setVendorId(null); setVenOpen(true); }}
              onFocus={() => setVenOpen(true)}
              placeholder="Vendor"
              className={`${fieldCls} ${vendorEmpty ? "border-red-400 placeholder-red-400" : ""}`}
            />
            {venOpen && vendorMatches.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-52 overflow-y-auto custom-scrollbar">
                {vendorMatches.map((v) => (
                  <button key={v.id} onClick={() => { setVendorId(v.id); setVendorQuery(v.name); setVenOpen(false); }} className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{v.name}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-end gap-3">
            <FloatField label="Quantity" value={qty} onChange={setQty} />
            <FloatField label="Buy Price" value={buyPrice} onChange={setBuyPrice} />
            <div className="relative fl-wrap min-w-[120px]">
              <label className="fl-label">Unit Type</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={fieldCls}>{unitTypes.map((u) => <option key={u}>{u}</option>)}</select>
            </div>
            <button onClick={add} title="Add stock" className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-gray-500 italic">A Purchase Order will be generated automatically when you add stock.</p>
          {rows.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-200 text-gray-500 text-xs">
                  <th className="text-left font-semibold py-2">Vendor</th>
                  <th className="text-left font-semibold py-2">Qty (Unit)</th>
                  <th className="text-left font-semibold py-2">Buy Price</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-300">
                    <td className="py-3 text-gray-800">{r.vendor}</td>
                    <td className="py-3 text-gray-800">{r.qty} {r.unit}</td>
                    <td className="py-3 text-gray-800">{money(r.buyPrice)}</td>
                    <td className="py-3 text-right"><button onClick={() => removeRow(r)} title="Remove stock entry" className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"><X className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Overlay>
  );
};

/* ── Product form sections (shared by Edit / Add Variation) ────── */
/** Read a picked file, downscale to ≤400px and return a JPEG data URL
 *  (kept small so IndexedDB records stay light). */
const readImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

const ImageBlock: React.FC<{
  editable?: boolean;
  image?: string | null;
  onChange?: (dataUrl: string | null) => void;
}> = ({ editable, image, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!f) return;
    try {
      onChange?.(await readImageFile(f));
    } catch {
      showToast("Could not read that image", "error");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button
          type="button"
          disabled={!editable}
          onClick={() => fileRef.current?.click()}
          title={editable ? "Choose product photo" : undefined}
          className={`w-20 h-20 rounded-md border border-gray-300 bg-blue-50 flex items-center justify-center text-blue-500 overflow-hidden ${editable ? "hover:border-blue-400 cursor-pointer" : "cursor-default"}`}
        >
          {image ? <img src={image} alt="Product" className="w-full h-full object-cover" /> : <ImageIcon className="w-7 h-7" />}
        </button>
        {editable && image && (
          <button type="button" title="Remove photo" onClick={() => onChange?.(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-600 text-white flex items-center justify-center hover:bg-red-500"><X className="w-3 h-3" /></button>
        )}
      </div>
      {editable && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50"><Upload className="w-4 h-4" /> Upload Photo</button>
          <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50"><Sparkles className="w-4 h-4" /> Generate Image with AI</button>
        </>
      )}
    </div>
  );
};

/* ── type-ahead suggestion field (floating label + option dropdown) ── */
const SuggestField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const q = value.trim().toLowerCase();
  const matches = options.filter((o) => o.toLowerCase().includes(q));
  return (
    <div className="relative fl-wrap" ref={ref}>
      <label className="fl-label">{label}</label>
      <input
        value={value}
        placeholder=" "
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        className={fieldCls}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-56 overflow-y-auto custom-scrollbar">
          {matches.map((o) => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductForm: React.FC<{ mode: "create" | "edit" | "variation"; product?: Product; title: string; asModal?: boolean; onClose: () => void; onSave?: (data: any) => void }> = ({ mode, product, title, asModal, onClose, onSave }) => {
  const [inv, setInv] = useState(true);
  const [serial, setSerial] = useState(false);
  const [batch, setBatch] = useState(false);
  const isVariation = mode === "variation";
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product && product.category !== "No Category" ? product.category : "");
  const [sku, setSku] = useState(product && product.sku !== "—" ? product.sku : "");
  const [qty, setQty] = useState(product?.qty ?? "1");
  const [unit, setUnit] = useState(product?.unit ?? "box");
  const [buyPrice, setBuyPrice] = useState(product ? product.buyPrice.replace(/[^0-9.]/g, "") : "0");
  const [sellPrice, setSellPrice] = useState(product ? product.price.replace(/[^0-9.]/g, "") : "0");
  const [note, setNote] = useState(product && product.note !== "No Notes" ? product.note : "");
  const [image, setImage] = useState<string | null>(product?.image ?? null);
  const [buyTax, setBuyTax] = useState(product?.buyTax ?? "");
  const [sellTax, setSellTax] = useState(product?.sellTax ?? "");
  const [onHand, setOnHand] = useState(product?.onHand ?? "0.00");
  const [committed, setCommitted] = useState(product?.committed ?? "0.00");
  const [available, setAvailable] = useState(product?.available ?? "0.00");
  const [toInvoiced, setToInvoiced] = useState(product?.toInvoiced ?? "0.00");
  const [toBilled, setToBilled] = useState(product?.toBilled ?? "0.00");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // suggestion sources: local Dexie collections + system-setup API categories
  const dbCategories = useCollection<any>("categories", "name");
  const dbUnits = useCollection<any>("units", "name");
  const dbTaxes = useCollection<any>("taxes", "name");
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  useEffect(() => {
    // system setup categories: [{ _id, category }]
    api.get<any[]>("/category/all")
      .then((d) => setApiCategories((d || []).map((c: any) => c.category ?? c.name).filter(Boolean)))
      .catch(() => {}); // offline/front-end-only → local list still works
  }, []);
  const categoryOptions = useMemo(
    () => [...new Set([...apiCategories, ...dbCategories.map((c) => c.name).filter(Boolean)])].sort((a, b) => a.localeCompare(b)),
    [apiCategories, dbCategories],
  );
  const unitOptions = useMemo(() => dbUnits.map((u) => u.name).filter(Boolean), [dbUnits]);
  const taxOptions = dbTaxes.length > 0 ? dbTaxes : taxList.map((name) => ({ name }));

  const handleSave = () => { onSave?.({ name, category, sku, qty, unit, buyPrice, sellPrice, note, image, buyTax, sellTax, onHand, committed, available, toInvoiced, toBilled }); onClose(); };
  const body = (
    <>
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300 sticky top-0 bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} title="Product Settings" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={handleSave} className="px-5 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Save</button>
        </div>
      </div>

      {/* Details */}
      <SectionBar title="Details" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5 px-6 py-5">
        <div className="space-y-5">
          {!isVariation && <FloatField label="Product Name *" value={name} onChange={setName} placeholder="Product Name" />}
          {!isVariation && <SuggestField label="Category" value={category} onChange={setCategory} options={categoryOptions} />}
          <FloatField label="SKU" value={sku} onChange={setSku} placeholder="SKU" icon={<Barcode className="w-4 h-4" />} />
          {isVariation && <FloatField label="Variant Size" placeholder="Variant Size" />}
        </div>
        <div className="space-y-4">
          <ImageBlock editable image={image} onChange={setImage} />
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={inv} onChange={() => setInv((v) => !v)} className="accent-blue-600" /> Inventory</label>
        </div>
      </div>
      {!isVariation && (
        <div className="flex items-center gap-10 px-6 pb-5">
          <div className="flex items-center gap-3"><span className="text-sm text-gray-700">Enable Serialization</span><Toggle on={serial} onChange={() => setSerial((v) => !v)} /></div>
          <div className="flex items-center gap-3"><span className="text-sm text-gray-700">Enable Batching</span><Toggle on={batch} onChange={() => setBatch((v) => !v)} /></div>
        </div>
      )}

      {/* Quantity */}
      <SectionBar title="Quantity" right={<span className="text-xs text-gray-500">Type: Standard</span>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5 px-6 py-5">
        <FloatField label="Quantity" value={qty} onChange={setQty} />
        <SuggestField label="Unit Type" value={unit} onChange={setUnit} options={unitOptions} />
      </div>

      {/* Pricing & Tax */}
      <SectionBar title="Pricing & Tax" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5 px-6 py-5">
        <FloatField label="Buy Price" value={buyPrice} onChange={setBuyPrice} />
        <div className="relative fl-wrap">
          <label className="fl-label">Buy Price Tax</label>
          <select value={buyTax} onChange={(e) => setBuyTax(e.target.value)} className={fieldCls}>
            <option value="">No Tax</option>
            {taxOptions.map((t: any) => <option key={t.id ?? t.name} value={t.name}>{t.rate != null ? `${t.name} (${t.rate}%)` : t.name}</option>)}
          </select>
        </div>
        <FloatField label="Sell Price" value={sellPrice} onChange={setSellPrice} />
        <div className="relative fl-wrap">
          <label className="fl-label">Sell Price Tax</label>
          <select value={sellTax} onChange={(e) => setSellTax(e.target.value)} className={fieldCls}>
            <option value="">No Tax</option>
            {taxOptions.map((t: any) => <option key={t.id ?? t.name} value={t.name}>{t.rate != null ? `${t.name} (${t.rate}%)` : t.name}</option>)}
          </select>
        </div>
        <FloatField label="Currency" value="$ USD" />
      </div>

      {/* Stock Status — editable, persisted on the product record */}
      <SectionBar title="Stock Status" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-5">
        <FloatField label="On Hand Stock" value={onHand} onChange={setOnHand} />
        <FloatField label="Committed Stock" value={committed} onChange={setCommitted} />
        <FloatField label="Available for Sale" value={available} onChange={setAvailable} />
        <FloatField label="To Be Invoiced" value={toInvoiced} onChange={setToInvoiced} />
        <FloatField label="To Be Billed" value={toBilled} onChange={setToBilled} />
      </div>

      {/* Description */}
      <SectionBar title="Description" />
      <div className="px-6 py-5">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Description" className="w-full h-28 border border-gray-300 rounded-md p-3 text-sm text-gray-700 outline-none resize-none focus:ring-1 focus:ring-blue-600" />
      </div>

      {settingsOpen && <AppSettingsModal initialTab="Product" onClose={() => setSettingsOpen(false)} />}
    </>
  );

  if (asModal) {
    return (
      <Overlay onClose={onClose}>
        <div className="w-full max-w-4xl my-8 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">{body}</div>
      </Overlay>
    );
  }
  return <section className="flex-1 overflow-y-auto custom-scrollbar bg-white border-l border-gray-300">{body}</section>;
};

/* ── Component ──────────────────────────────────────────────────── */
export const Product: React.FC = () => {
  const [selectedId, setSelectedId] = useState(1);
  const [sortBy, setSortBy] = useState("Name");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [modal, setModal] = useState<null | "stock" | "variation" | "settings">(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  // live from the shared datastore
  const dbProducts = useCollection<any>("products", "name");
  const products: Product[] = useMemo(
    () => dbProducts.map((p) => ({
      id: p.id, image: p.image || null, name: p.name, category: p.category || "No Category", note: p.note || "No Notes",
      price: money(p.price), stock: p.stock ?? null, sku: p.sku || "—",
      qty: String(p.qty ?? p.stock ?? "0"), unit: p.unit || "pcs",
      buyPrice: money(p.buyPrice), buyTax: p.buyTax || "Test Tax", sellTax: p.sellTax || "Test Tax",
      // stored stock-status fields win; otherwise derive from stock as before
      onHand: p.onHand ?? Number(p.stock ?? 0).toFixed(2), committed: p.committed ?? "0.00", available: p.available ?? Number(p.stock ?? 0).toFixed(2),
      toInvoiced: p.toInvoiced ?? "0.00", toBilled: p.toBilled ?? Number(p.stock ?? 0).toFixed(2),
    })),
    [dbProducts],
  );

  const filtered = useMemo(() => {
    const toNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
    let list = products.filter(
      (i) =>
        (categoryFilter === null || i.category === categoryFilter) &&
        (search.trim() === "" || i.name.toLowerCase().includes(search.toLowerCase())),
    );
    list = [...list].sort((a, b) => {
      if (sortBy === "Price") return toNum(b.price) - toNum(a.price);
      if (sortBy === "Stock") return (b.stock ?? -1) - (a.stock ?? -1);
      if (sortBy === "Category") return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [products, sortBy, categoryFilter, search]);

  const selected = products.find((i) => i.id === selectedId) || products[0];

  const allSelected = filtered.length > 0 && filtered.every((i) => checked.has(i.id));
  const exitSelect = () => { setSelectMode(false); setChecked(new Set()); };
  const toggleRow = (id: number) => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => (allSelected ? exitSelect() : setChecked(new Set(filtered.map((i) => i.id))));
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && selectMode && exitSelect();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [selectMode]);

  if (!selected && mode !== "create") return <ListEmptyState title="No products yet" onCreate={() => setMode("create")} createLabel="New Product" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {selectMode ? (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
            <button onClick={toggleAll} className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{allSelected && <Check className="w-3.5 h-3.5 text-white" />}</button>
            <div className="flex items-center gap-0.5">
              {[Archive, Copy, Trash2].map((Ic, i) => (
                <button key={i} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Ic className="w-4 h-4" /></button>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Products</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setSelectMode(true)} className="p-1.5 hover:bg-gray-100 rounded-md" title="Select"><Pencil className="w-4 h-4 text-gray-500" /></button>
              <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
            </div>
          </div>
        )}

        {/* search */}
        <div className="px-3 py-2 border-b border-gray-300">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-nowrap items-center gap-2 px-3 py-2 border-b border-gray-300 overflow-x-auto hover-scrollbar" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
            {(close) => sortFields.map((o) => (
              <button key={o} onClick={() => { setSortBy(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>
            {(close) => statusList.map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s === "Trash" ? statusFilter : s); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${s === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>{s} {s === statusFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <Dropdown align="right" trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Category{categoryFilter ? ` | ${categoryFilter}` : " | All"}<ChevronDown className="w-3 h-3" /></span>}>
            {(close) => (
              <>
                <button onClick={() => { setCategoryFilter(null); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">All {categoryFilter === null && <Check className="w-4 h-4 text-blue-600" />}</button>
                {categoryList.map((c) => (
                  <button key={c} onClick={() => { setCategoryFilter(c); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{c} {categoryFilter === c && <Check className="w-4 h-4 text-blue-600" />}</button>
                ))}
              </>
            )}
          </Dropdown>
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((p) => {
            const active = !selectMode && mode === "view" && p.id === selectedId;
            const isChecked = checked.has(p.id);
            return (
              <button key={p.id} onClick={() => (selectMode ? toggleRow(p.id) : (setSelectedId(p.id), setMode("view")))}
                className={`w-full text-left px-4 py-3 border-b border-gray-300 flex items-start gap-3 transition-colors ${active || (selectMode && isChecked) ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                {selectMode && (
                  <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-[5px] border flex items-center justify-center ${isChecked ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}>{isChecked && <Check className="w-3.5 h-3.5 text-white" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.category}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{p.note}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{p.price}</span>
                  {p.stock !== null && (
                    <span className={`text-xs font-medium mt-1 ${p.stock > 0 ? "text-green-600" : "text-red-500"}`}>Stock: {p.stock.toFixed(2)}</span>
                  )}
                </div>
              </button>
            );
          })}
          </div>
          {/* FAB → Create Product */}
          {!selectMode && (
            <button onClick={() => setMode("create")} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-xs text-gray-500">{filtered.length} Products</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {selectMode ? (
        <section className="flex-1 flex items-center justify-center bg-white border-l border-gray-300">
          <div className="text-center">
            <h2 className="text-2xl font-normal text-gray-900">{checked.size} {checked.size === 1 ? "Product" : "Products"} Selected</h2>
          </div>
        </section>
      ) : mode === "create" ? (
        <ProductForm mode="create" title="Create Product" onClose={() => setMode("view")} onSave={async (d) => { await repo.add("products", { name: d.name || "Untitled", category: d.category, sku: d.sku, note: d.note, image: d.image ?? null, price: parseMoney(d.sellPrice), buyPrice: parseMoney(d.buyPrice), stock: parseMoney(d.qty) || 0, qty: parseMoney(d.qty) || 1, unit: d.unit, buyTax: d.buyTax, sellTax: d.sellTax, onHand: d.onHand, committed: d.committed, available: d.available, toInvoiced: d.toInvoiced, toBilled: d.toBilled, taxId: 1, status: "Active" }); }} />
      ) : mode === "edit" ? (
        <ProductForm mode="edit" product={selected} title="Edit Product" onClose={() => setMode("view")} onSave={async (d) => { await repo.update("products", selected.id, { name: d.name, category: d.category, sku: d.sku, note: d.note, image: d.image ?? null, price: parseMoney(d.sellPrice), buyPrice: parseMoney(d.buyPrice), stock: parseMoney(d.qty) || 0, qty: parseMoney(d.qty) || 1, unit: d.unit, buyTax: d.buyTax, sellTax: d.sellTax, onHand: d.onHand, committed: d.committed, available: d.available, toInvoiced: d.toInvoiced, toBilled: d.toBilled }); }} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-white border-l border-gray-300">
          {/* detail header */}
          <div className="h-12 flex items-center justify-between px-6 border-b border-gray-300 bg-gray-100">
            <h1 className="text-base font-semibold text-gray-900 tracking-tight truncate">{selected.name}</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setModal("stock")} className="px-4 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Update Stock</button>
              <button onClick={() => setModal("settings")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Settings"><Settings className="w-4 h-4" /></button>
              <button onClick={() => setMode("edit")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Edit"><Pencil className="w-4 h-4" /></button>
              <Dropdown align="right" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><MoreVertical className="w-4 h-4" /></span>}>
                {(close) => (
                  <>
                    <button onClick={() => { setModal("variation"); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><Layers className="w-4 h-4 text-gray-400" /> Add Variation</button>
                    <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><Copy className="w-4 h-4 text-gray-400" /> Duplicate</button>
                    <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-gray-50 text-left"><Archive className="w-4 h-4" /> Archive</button>
                    <button onClick={async () => { await repo.remove("products", selected.id); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200"><Trash2 className="w-4 h-4" /> Delete</button>
                  </>
                )}
              </Dropdown>
            </div>
          </div>

          {/* ── Details ── */}
          <SectionBar title="Details" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5 px-6 py-5">
            <div className="space-y-5">
              <Stat label="Product Name *" value={selected.name} />
              <Stat label="Category" value={selected.category} />
              <Stat label="SKU" value={selected.sku} />
            </div>
            <div className="space-y-4">
              <ImageBlock image={selected.image} />
              <label className="flex items-center gap-2 text-sm text-gray-500"><input type="checkbox" checked readOnly className="accent-blue-600" /> Inventory</label>
            </div>
          </div>

          {/* ── Quantity ── */}
          <SectionBar title="Quantity" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5 px-6 py-5">
            <Stat label="Quantity" value={selected.qty} />
            <Stat label="Unit Type" value={selected.unit} />
          </div>

          {/* ── Pricing & Tax ── */}
          <SectionBar title="Pricing & Tax" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5 px-6 py-5">
            <Stat label="Buy Price" value={`$ ${selected.buyPrice.replace("$", "")}`} />
            <Stat label="Buy Price Tax" value={selected.buyTax} />
            <Stat label="Sell Price" value={`$ ${selected.price.replace("$", "")}`} />
            <Stat label="Sell Price Tax" value={selected.sellTax} />
            <Stat label="Currency" value="$ USD" />
            <Stat label="Stock" value={(selected.stock ?? 0).toFixed(2)} />
          </div>

          {/* ── Stock Status ── */}
          <SectionBar title="Stock Status" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-5">
            <Stat label="On Hand Stock" value={selected.onHand} />
            <Stat label="Committed Stock" value={selected.committed} />
            <Stat label="Available for Sale" value={selected.available} />
            <Stat label="To Be Invoiced" value={selected.toInvoiced} />
            <Stat label="To Be Billed" value={selected.toBilled} />
          </div>

          {/* ── Description ── */}
          <SectionBar title="Description" />
          <div className="px-6 py-5">
            <div className="text-xs text-gray-500">Notes</div>
            <div className="text-sm text-gray-800 mt-1">{selected.note === "No Notes" ? "" : selected.note}</div>
          </div>
        </section>
      )}

      {/* ════════ MODALS ════════ */}
      {modal === "stock" && <UpdateStockModal onClose={() => setModal(null)} product={selected} />}
      {modal === "variation" && <ProductForm mode="variation" product={selected} title={selected.name} asModal onClose={() => setModal(null)} />}
      {modal === "settings" && <AppSettingsModal initialTab="Product" onClose={() => setModal(null)} />}
    </div>
  );
};

export default Product;
