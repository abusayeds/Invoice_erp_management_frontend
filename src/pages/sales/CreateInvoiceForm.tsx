/**
 * File: src/pages/sales/CreateInvoiceForm.tsx
 * Full inline "Create Invoice" form (matches the reference design) — replaces
 * the detail panel. Customer finder (search + pencil → Create Contact modal),
 * live product/service line items, totals; Save persists to the datastore.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Settings, Pencil, ChevronDown, Calendar, X, Plus } from "lucide-react";
import { useCollection, repo, nextNumber, money, CreateContactModal } from "@/lib/db";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";

const TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
type DraftRow = { key: string; kind: "product" | "service"; name: string; description: string; qty: number; rate: number; taxId: number; discount: number };
const fcc = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600";

export const CreateInvoiceForm: React.FC<{ onClose: () => void; onSaved: (id: number) => void; invoice?: any }> = ({ onClose, onSaved, invoice }) => {
  const isEdit = !!invoice?.id;
  const customers = useCollection<any>("customers", "name");
  const products = useCollection<any>("products", "name");
  const services = useCollection<any>("services", "name");
  const catalog = useMemo(
    () => [
      ...products.map((p) => ({ key: "p" + p.id, kind: "product" as const, name: p.name, rate: p.price || 0, taxId: p.taxId || 1 })),
      ...services.map((s) => ({ key: "s" + s.id, kind: "service" as const, name: s.name, rate: s.price || 0, taxId: s.taxId || 1 })),
    ],
    [products, services],
  );

  const [custQuery, setCustQuery] = useState("");
  const [customerId, setCustomerId] = useState<number | "">(invoice?.customerId ?? "");
  const [custOpen, setCustOpen] = useState(false);
  const [addContact, setAddContact] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (cref.current && !cref.current.contains(e.target as Node)) setCustOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const matches = customers.filter((c) => c.name.toLowerCase().includes(custQuery.toLowerCase()));

  /* ── Address expander (mirrors the shared CreateDocForm / Proforma) ── */
  const emptyAddr = { street1: "", street2: "", city: "", state: "", zip: "", country: "" };
  const [addrOpen, setAddrOpen] = useState(false);
  const [billing, setBilling] = useState({ ...emptyAddr });
  const [shipping, setShipping] = useState({ ...emptyAddr });
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [updateToCustomer, setUpdateToCustomer] = useState(false);
  // Prefill from the selected customer (existing invoice's customer on edit).
  useEffect(() => {
    const p: any = customers.find((c) => c.id === customerId);
    if (!p) return;
    setBilling({ street1: p.street1 || "", street2: p.street2 || "", city: p.city || "", state: p.state || "", zip: p.zip || "", country: p.country || "" });
    setShipping({ street1: p.shipStreet1 || "", street2: p.shipStreet2 || "", city: p.shipCity || "", state: p.shipState || "", zip: p.shipZip || "", country: p.shipCountry || "" });
  }, [customerId, customers]);
  const shipVal = (k: keyof typeof emptyAddr) => (sameAsBilling ? billing[k] : shipping[k]);

  const [date, setDate] = useState(invoice?.date || "Jun 22, 2026");
  const [due, setDue] = useState(invoice?.due || "Jun 29, 2026");
  const [notes, setNotes] = useState(invoice?.notes ?? "Mollit fugiat elit");
  const [terms, setTerms] = useState(invoice?.terms ?? "Perferendis ad vero");
  const [rows, setRows] = useState<DraftRow[]>(
    invoice?.items?.length
      ? invoice.items.map((it: any) => ({ key: "", kind: "product" as const, name: it.name || "", description: it.description || "", qty: it.qty ?? 1, rate: it.rate ?? 0, taxId: it.taxId || 1, discount: it.discount || 0 }))
      : [{ key: "", kind: "product", name: "", description: "", qty: 1, rate: 0, taxId: 1, discount: 0 }],
  );
  /* ── type-ahead item picker (mirrors the shared CreateDocForm / Proforma) ── */
  const [sugRow, setSugRow] = useState<number | null>(null);
  const [sortRecent, setSortRecent] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const itemsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (itemsRef.current && !itemsRef.current.contains(e.target as Node)) setSugRow(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const addRow = (kind: "product" | "service") => {
    setRows((r) => [...r, { key: "", kind, name: "", description: "", qty: 1, rate: 0, taxId: 1, discount: 0 }]);
    setSugRow(rows.length);
  };
  const setRowName = (i: number, name: string) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, name, key: "" } : row)));
  const setRowDesc = (i: number, description: string) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, description } : row)));
  const pickSuggestion = (i: number, key: string) => {
    const it = catalog.find((c) => c.key === key);
    if (!it) return;
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, key, name: it.name, rate: it.rate, taxId: it.taxId } : row)));
    setRecent((p) => [key, ...p.filter((k) => k !== key)]);
    setSugRow(null);
  };
  const suggestionsFor = (row: DraftRow) => {
    const q = row.name.trim().toLowerCase();
    let list = catalog.filter((c) => c.kind === row.kind && (!q || c.name.toLowerCase().includes(q)));
    if (sortRecent) list = [...list].sort((a, b) => {
      const ia = recent.indexOf(a.key), ib = recent.indexOf(b.key);
      return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
    });
    return list;
  };
  const setQty = (i: number, qty: number) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, qty } : row)));
  const setRate = (i: number, rate: number) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, rate } : row)));
  const setDiscount = (i: number, discount: number) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, discount: Math.min(100, Math.max(0, discount)) } : row)));
  const lineAmount = (r: DraftRow) => r.qty * r.rate * (1 - (r.discount || 0) / 100);
  const removeRow = (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  const subTotal = rows.reduce((s, r) => s + lineAmount(r), 0);
  const inlineDiscount = rows.reduce((s, r) => s + r.qty * r.rate * ((r.discount || 0) / 100), 0);
  const taxTotal = rows.reduce((s, r) => s + lineAmount(r) * ((TAX_RATE[r.taxId] || 0) / 100), 0);
  const total = subTotal + taxTotal;

  const save = async (status: string) => {
    // Accept a picked suggestion OR free-typed text: if nothing is picked but a name
    // was typed, create the customer from that text so the invoice has a real contact.
    let cid: number | "" = customerId;
    if (cid === "" && custQuery.trim()) {
      cid = (await repo.add("customers", { name: custQuery.trim(), status: "Active", balance: 0 })) as number;
    }
    if (cid === "") return;
    const items = rows.filter((r) => r.name).map((r, i) => ({ id: i + 1, name: r.name, description: r.description, qty: r.qty, rate: r.rate, taxId: r.taxId, discount: r.discount || 0, amount: +lineAmount(r).toFixed(2) }));
    const common = {
      customerId: cid, date, due, status,
      items, subTotal: +subTotal.toFixed(2), tax: +taxTotal.toFixed(2), shipping: 0,
      total: +total.toFixed(2), amountPaid: status === "Paid" ? +total.toFixed(2) : 0,
      amountDue: status === "Paid" ? 0 : +total.toFixed(2), notes, terms,
      inlineDiscount: +inlineDiscount.toFixed(2),
      // billing + shipping captured from the address expander
      street1: billing.street1, street2: billing.street2, city: billing.city, state: billing.state, zip: billing.zip, country: billing.country,
      shipStreet1: shipVal("street1"), shipStreet2: shipVal("street2"), shipCity: shipVal("city"), shipState: shipVal("state"), shipZip: shipVal("zip"), shipCountry: shipVal("country"),
    };
    // "Update to customer" writes the edited addresses back onto the customer record.
    if (updateToCustomer) {
      await repo.update("customers", cid, {
        street1: billing.street1, street2: billing.street2, city: billing.city, state: billing.state, zip: billing.zip, country: billing.country,
        shipStreet1: shipVal("street1"), shipStreet2: shipVal("street2"), shipCity: shipVal("city"), shipState: shipVal("state"), shipZip: shipVal("zip"), shipCountry: shipVal("country"),
      });
    }
    let id: number;
    if (isEdit) {
      await repo.update("invoices", invoice.id, common);
      id = invoice.id;
    } else {
      const n = await nextNumber("invoices");
      id = (await repo.add("invoices", { number: "#" + n, ts: Date.now(), ...common })) as number;
    }
    onSaved(id);
    onClose();
  };

  const custName = customerId ? customers.find((c) => c.id === customerId)?.name || custQuery : custQuery;

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar m-2 bg-white border border-gray-300 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300 sticky top-0 bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Invoice" : "Create Invoice"}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} title="Settings" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={() => save("Draft")} disabled={customerId === "" && !custQuery.trim()} className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-40">Save as Draft</button>
          <button onClick={() => save(isEdit ? (invoice.status || "Paid") : "Paid")} disabled={customerId === "" && !custQuery.trim()} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40">{isEdit ? "Save" : "Save & Send"}</button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative fl-wrap" ref={cref}>
            <label className="fl-label">Customer *</label>
            <div className="relative">
              <input value={custName} onChange={(e) => { setCustQuery(e.target.value); setCustomerId(""); setCustOpen(true); }} onFocus={() => setCustOpen(true)} placeholder="Find or add a customer" className={fcc} />
              <button onClick={() => setAddContact(true)} title="Create Contact" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
            </div>
            {custOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                {matches.map((c) => <button key={c.id} onClick={() => { setCustomerId(c.id); setCustQuery(c.name); setCustOpen(false); }} className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left">{c.name}</button>)}
                {matches.length === 0 && <div className="px-3 py-2.5 text-sm text-gray-400">No customer found — click the pencil to add</div>}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-2 px-1 bg-white text-[11px] text-gray-500 z-10">Address</label>
            <button onClick={() => setAddrOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-500 hover:border-gray-400">
              <span /> <ChevronDown className={`w-4 h-4 transition-transform ${addrOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="relative fl-wrap"><label className="fl-label">Invoice #</label><input defaultValue={invoice?.number?.replace?.("#", "") || "17"} placeholder=" " className={fcc} /></div>
          <div className="relative fl-wrap"><label className="fl-label">Currency</label><input defaultValue="$ USD" placeholder=" " className={fcc} /></div>
        </div>

        {/* ── Address panel (Billing | Shipping — mirrored field alignment) ── */}
        {addrOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 border-b border-gray-300 pb-5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800"><input type="checkbox" defaultChecked className="accent-blue-600" /> Billing</label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={updateToCustomer} onChange={() => setUpdateToCustomer((v) => !v)} className="accent-blue-600" /> Update to customer</label>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800"><input type="checkbox" defaultChecked className="accent-blue-600" /> Shipping</label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={sameAsBilling} onChange={() => setSameAsBilling((v) => !v)} className="accent-blue-600" /> Same as Billing</label>
            </div>
            {/* Billing column */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">Street 1</label><input value={billing.street1} onChange={(e) => setBilling((b) => ({ ...b, street1: e.target.value }))} placeholder=" " className={fcc} /></div>
                <div className="relative"><input value={billing.street2} onChange={(e) => setBilling((b) => ({ ...b, street2: e.target.value }))} placeholder="Street 2" className={fcc} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">City</label><input value={billing.city} onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))} placeholder=" " className={fcc} /></div>
                <div className="relative"><input value={billing.state} onChange={(e) => setBilling((b) => ({ ...b, state: e.target.value }))} placeholder="State" className={fcc} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Zip Code</label><input value={billing.zip} onChange={(e) => setBilling((b) => ({ ...b, zip: e.target.value }))} placeholder=" " className={fcc} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Country</label><input value={billing.country} onChange={(e) => setBilling((b) => ({ ...b, country: e.target.value }))} placeholder=" " className={fcc} /></div>
              </div>
            </div>
            {/* Shipping column — mirrors billing when "Same as Billing" */}
            <div className={`space-y-3 ${sameAsBilling ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">Street 1</label><input value={shipVal("street1")} onChange={(e) => setShipping((s) => ({ ...s, street1: e.target.value }))} placeholder=" " className={fcc} /></div>
                <div className="relative"><input value={shipVal("street2")} onChange={(e) => setShipping((s) => ({ ...s, street2: e.target.value }))} placeholder="Street 2" className={fcc} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">City</label><input value={shipVal("city")} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} placeholder=" " className={fcc} /></div>
                <div className="relative"><input value={shipVal("state")} onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))} placeholder="State" className={fcc} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Zip Code</label><input value={shipVal("zip")} onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))} placeholder=" " className={fcc} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Country</label><input value={shipVal("country")} onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))} placeholder=" " className={fcc} /></div>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative fl-wrap"><label className="fl-label">Invoice date *</label><div className="relative"><input value={date} onChange={(e) => setDate(e.target.value)} placeholder=" " className={fcc} /><Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div></div>
          <div className="relative fl-wrap"><label className="fl-label">Due Date *</label><div className="relative"><input value={due} onChange={(e) => setDue(e.target.value)} placeholder=" " className={fcc} /><Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div></div>
          <input placeholder="Sub Title" className={fcc} />
          <div className="md:col-span-2"><input placeholder="Shipping Method" className={fcc} /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="accent-blue-600" /> Discount before tax</label>
        </div>

        {/* no overflow clipping here — it would hide the suggestion dropdown (top-full) */}
        <div ref={itemsRef} className="border border-gray-200 rounded-md">
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="bg-gray-50 text-gray-500 text-xs"><th className="text-left font-semibold px-4 py-2.5 w-14">Sr. No.</th><th className="text-left font-semibold px-2 py-2.5">Items</th><th className="text-right font-semibold px-2 py-2.5">Quantity</th><th className="text-right font-semibold px-2 py-2.5">Rate</th><th className="text-left font-semibold px-2 py-2.5">Tax</th><th className="text-right font-semibold px-2 py-2.5">Discount</th><th className="text-right font-semibold px-4 py-2.5">Amount</th><th className="w-8" /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-200 align-top">
                  <td className="px-4 py-3 text-gray-700">{i + 1}</td>
                  {/* type + auto-suggestion picker (matches Proforma / shared form) */}
                  <td className="px-2 py-2 relative">
                    <div className="text-[11px] text-gray-400 capitalize">{r.kind}</div>
                    <input value={r.name} onChange={(e) => { setRowName(i, e.target.value); setSugRow(i); }} onFocus={() => setSugRow(i)} placeholder={r.kind === "product" ? "Product" : "Service"} className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400" />
                    <input value={r.description} onChange={(e) => setRowDesc(i, e.target.value)} placeholder="Description" className="w-full bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400 mt-0.5" />
                    {sugRow === i && (
                      <div className="absolute left-2 right-0 top-full z-30 mt-1 max-w-xl bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden">
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {suggestionsFor(r).map((c) => (
                            <button key={c.key} onClick={() => pickSuggestion(i, c.key)} className="w-full flex items-center justify-between gap-6 px-4 py-2.5 text-sm hover:bg-gray-50 text-left">
                              <span className="text-gray-900 truncate">{c.name}</span>
                              <span className="text-gray-600 flex-shrink-0">{money(c.rate)}</span>
                            </button>
                          ))}
                          {suggestionsFor(r).length === 0 && (
                            <div className="px-4 py-2.5 text-sm text-gray-400">No matching {r.kind}s — keep typing to add a custom one</div>
                          )}
                        </div>
                        <label className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 border-t border-gray-200 cursor-pointer">
                          <input type="checkbox" checked={sortRecent} onChange={() => setSortRecent((v) => !v)} className="accent-blue-600" />
                          Sort by Recent Used
                        </label>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right"><input type="number" min={0} value={r.qty} onChange={(e) => setQty(i, Number(e.target.value))} className="w-14 bg-transparent text-sm text-right outline-none" /></td>
                  <td className="px-2 py-3 text-right"><input type="number" min={0} value={r.rate} onChange={(e) => setRate(i, Number(e.target.value))} className="w-20 bg-transparent text-sm text-right outline-none" /></td>
                  <td className="px-2 py-3 text-xs text-gray-500">{TAX_NAME[r.taxId]}</td>
                  <td className="px-2 py-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <input type="number" min={0} max={100} value={r.discount || ""} onChange={(e) => setDiscount(i, Number(e.target.value))} placeholder="Discount" className="w-16 bg-transparent text-sm text-right outline-none placeholder:text-gray-400" />
                      <span className="px-1 py-0.5 text-[10px] rounded bg-gray-200 text-gray-600">%</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{money(lineAmount(r))}</td>
                  <td className="px-2 py-3 text-right"><button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-200">
            <button onClick={() => addRow("product")} className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Product</button>
            <button onClick={() => addRow("service")} className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Service</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Terms &amp; Conditions</label><textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
            <div><label className="text-xs text-gray-500">Internal Notes</label><textarea placeholder="Internal Notes" className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
          </div>
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full h-20 border border-gray-200 rounded-md p-3 text-sm text-gray-700 outline-none resize-none" /></div>
          </div>
          <div className="border border-gray-200 rounded-md overflow-hidden self-start">
            <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{money(subTotal)}</span></div>
            {inlineDiscount > 0 && (
              <div className="flex justify-between px-4 py-2 text-xs text-gray-500"><span>Inline Discount</span><span>{money(inlineDiscount)}</span></div>
            )}
            <div className="flex justify-between px-4 py-2 text-sm"><span className="text-gray-600">Tax</span><span className="text-gray-700">{money(taxTotal)}</span></div>
            <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-200"><span className="text-gray-700">Total</span><span className="font-semibold text-gray-900">{money(total)}</span></div>
            <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-200"><span className="font-semibold text-gray-900">Amount Due</span><span className="font-semibold text-gray-900">{money(total)}</span></div>
          </div>
        </div>
      </div>

      {addContact && <CreateContactModal collection="customers" onClose={() => setAddContact(false)} onSaved={(id, name) => { setCustomerId(id); setCustQuery(name); }} />}
      {settingsOpen && <AppSettingsModal initialTab="Invoice" onClose={() => setSettingsOpen(false)} />}
    </section>
  );
};

export default CreateInvoiceForm;
