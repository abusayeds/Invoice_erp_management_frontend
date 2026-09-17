/**
 * File: src/pages/sales/CreateInvoiceForm.tsx
 * Inline create form for Invoice / Proforma / Estimate — shared SS layout.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, Pencil, ChevronDown, Calendar, X, Plus, Check, Info } from "lucide-react";
import { useCollection, repo, nextNumber, CreateContactModal } from "@/lib/db";
import { db } from "@/lib/db/db";
import { AppSettingsModal } from "@/components/modals/AppSettingsModal";
import { PaymentMethodsModal } from "@/components/modals/PaymentMethodsModal";
import { CurrencyCombobox } from "@/components/forms/CurrencyCombobox";
import { DocAttachmentField } from "@/components/ui/DocAttachmentField";
import { DocumentCreateHeader, type SendMenuAction } from "@/components/documents/DocumentCreateHeader";
import { DocumentSendEmailModal } from "@/components/documents/DocumentSendEmailModal";
import { DOC_FIELD, RECURRING_OPTIONS, isRecurringActive } from "@/components/documents/documentCreateShared";
import { PdfPreviewModal } from "@/lib/db/PdfPreviewModal";
import { printServerPdf } from "@/lib/db/serverPdf";
import { fetchCustomer, fetchCustomers } from "@/services/customersApi";
import { fetchPaymentMethods } from "@/services/paymentMethodsApi";
import type { EmailNavKey } from "@/services/emailTemplatesApi";

const TAX_RATE: Record<number, number> = { 1: 58, 2: 72, 3: 15, 4: 5 };
const TAX_NAME: Record<number, string> = { 1: "new test tax", 2: "Test Tax", 3: "VAT", 4: "GST" };
type DraftRow = { key: string; kind: "product" | "service"; name: string; description: string; qty: number; rate: number; mrp: number; taxId: number; discount: number };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const formatCurrencyValue = (amount: number, currencyCode: string) => {
  const code = text(currencyCode).toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  } catch {
    return `${code} ${(amount || 0).toFixed(2)}`;
  }
};
const mapAddr = (address?: { address_line_1?: string; address_line_2?: string; city?: string; state?: string; zip_code?: string; country?: string }) => ({
  street1: text(address?.address_line_1),
  street2: text(address?.address_line_2),
  city: text(address?.city),
  state: text(address?.state),
  zip: text(address?.zip_code),
  country: text(address?.country),
});

const EMAIL_NAV: Record<string, EmailNavKey> = {
  invoice: "invoice",
  proforma: "proforma_invoice",
  estimate: "estimate",
};

export const CreateInvoiceForm: React.FC<{
  onClose: () => void;
  onSaved: (id: number) => void;
  invoice?: any;
  mode?: "invoice" | "proforma" | "estimate";
}> = ({ onClose, onSaved, invoice, mode = "invoice" }) => {
  const isEdit = !!invoice?.id;
  const isProforma = mode === "proforma";
  const isEstimate = mode === "estimate";
  const isInvoice = mode === "invoice";
  const collection = isProforma ? "proformas" : isEstimate ? "estimates" : "invoices";
  const docLabel = isProforma ? "Proforma Invoice" : isEstimate ? "Estimate" : "Invoice";
  const pdfDocType = isProforma ? "proformaInvoice" : isEstimate ? "estimate" : "invoice";

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
  const [customerBackendId, setCustomerBackendId] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [custOpen, setCustOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addContact, setAddContact] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ id: number; number: string; backendId?: string } | null>(null);
  const cref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (cref.current && !cref.current.contains(e.target as Node)) setCustOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const customerSearch = useQuery({
    queryKey: ["invoice-form-customers", custQuery],
    queryFn: () => fetchCustomers({ page: 1, limit: 50, searchTerm: custQuery.trim() || undefined }),
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
  const matches = useMemo(() => {
    const remoteRows = customerSearch.data?.rows ?? [];
    if (remoteRows.length > 0 || custQuery.trim()) return remoteRows;
    return customers.map((c) => ({ id: c.id, _id: c._id || String(c.id), name: c.name, contact: "", email: c.email || "", amount: 0, status: "Active" }));
  }, [customerSearch.data, custQuery, customers]);

  const emptyAddr = { street1: "", street2: "", city: "", state: "", zip: "", country: "" };
  const [addrOpen, setAddrOpen] = useState(false);
  const [billing, setBilling] = useState({ ...emptyAddr });
  const [shipping, setShipping] = useState({ ...emptyAddr });
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [updateToCustomer, setUpdateToCustomer] = useState(false);
  const { data: paymentMethodOptions = [] } = useQuery({
    queryKey: ["invoice-form-payment-methods"],
    queryFn: fetchPaymentMethods,
    staleTime: 60_000,
  });
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(invoice?.payment_method ?? invoice?.paymentMethod ?? []);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);

  useEffect(() => {
    const p: any = customers.find((c) => c.id === customerId);
    if (!p) return;
    setBilling({ street1: p.street1 || "", street2: p.street2 || "", city: p.city || "", state: p.state || "", zip: p.zip || "", country: p.country || "" });
    setShipping({ street1: p.shipStreet1 || "", street2: p.shipStreet2 || "", city: p.shipCity || "", state: p.shipState || "", zip: p.shipZip || "", country: p.shipCountry || "" });
    if (p.email) setCustomerEmail(String(p.email));
  }, [customerId, customers]);
  useEffect(() => {
    if (!customerBackendId) return;
    let active = true;
    fetchCustomer(customerBackendId).then(async (doc) => {
      if (!active || !doc) return;
      const billingAddr = mapAddr(doc.businessProfile?.billing_address);
      const shippingAddr = mapAddr(doc.businessProfile?.shipping_address);
      setBilling(billingAddr);
      setShipping(shippingAddr);
      if (doc.email) setCustomerEmail(doc.email);
      const existingLocal = customers.find((item) => item._id === doc._id);
      if (existingLocal) {
        setCustomerId(existingLocal.id);
        if (existingLocal.email) setCustomerEmail(String(existingLocal.email));
        return;
      }
      const localId = await repo.add("customers", {
        _id: doc._id,
        name: doc.businessProfile?.companyName || doc.name || "(No name)",
        contact: doc.name || "",
        email: doc.email || "",
        street1: billingAddr.street1,
        street2: billingAddr.street2,
        city: billingAddr.city,
        state: billingAddr.state,
        zip: billingAddr.zip,
        country: billingAddr.country,
        shipStreet1: shippingAddr.street1,
        shipStreet2: shippingAddr.street2,
        shipCity: shippingAddr.city,
        shipState: shippingAddr.state,
        shipZip: shippingAddr.zip,
        shipCountry: shippingAddr.country,
      });
      setCustomerId(localId as number);
    });
    return () => { active = false; };
  }, [customerBackendId, customers]);
  const shipVal = (k: keyof typeof emptyAddr) => (sameAsBilling ? billing[k] : shipping[k]);

  const [date, setDate] = useState(invoice?.date || new Date().toLocaleDateString("en-US"));
  const [due, setDue] = useState(invoice?.due || new Date().toLocaleDateString("en-US"));
  const [notes, setNotes] = useState(invoice?.notes ?? "Mollit fugiat elit");
  const [terms, setTerms] = useState(invoice?.terms ?? "Perferendis ad vero");
  const [internalNotes, setInternalNotes] = useState(invoice?.internalNotes ?? "");
  const [currency, setCurrency] = useState(invoice?.currency || "BDT");
  const [subTitle, setSubTitle] = useState(invoice?.subTitle ?? "");
  const [poNumber, setPoNumber] = useState(invoice?.poNumber ?? "");
  const [shippingMethod, setShippingMethod] = useState(invoice?.shippingMethod ?? "");
  const [discountBeforeTax, setDiscountBeforeTax] = useState(!!invoice?.discountBeforeTax);
  const [recurring, setRecurring] = useState(invoice?.recurring ?? "None");
  const [recurringUntil, setRecurringUntil] = useState(invoice?.recurringUntil ?? new Date().toLocaleDateString("en-US"));
  const [deposit, setDeposit] = useState(invoice?.deposit ?? "");
  const [docDiscount, setDocDiscount] = useState(invoice?.docDiscount ?? "");
  const [shippingCost, setShippingCost] = useState(String(invoice?.shipping ?? ""));
  const [attachment, setAttachment] = useState(invoice?.Attachment || invoice?.attachments || "");

  const [rows, setRows] = useState<DraftRow[]>(
    invoice?.items?.length
      ? invoice.items.map((it: any) => ({ key: "", kind: "product" as const, name: it.name || "", description: it.description || "", qty: it.qty ?? 1, rate: it.rate ?? 0, mrp: it.mrp ?? 0, taxId: it.taxId || 1, discount: it.discount || 0 }))
      : [
          { key: "", kind: "product", name: "", description: "", qty: 1, rate: 0, mrp: 0, taxId: 1, discount: 0 },
          { key: "", kind: "service", name: "", description: "", qty: 1, rate: 0, mrp: 0, taxId: 1, discount: 0 },
        ],
  );
  const [sugRow, setSugRow] = useState<number | null>(null);
  const [sortRecent, setSortRecent] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [cols, setCols] = useState({ qty: true, mrp: true, tax: true, discount: false, autoFit: true });
  const colMenuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (itemsRef.current && !itemsRef.current.contains(e.target as Node)) setSugRow(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addRow = (kind: "product" | "service") => {
    setRows((r) => [...r, { key: "", kind, name: "", description: "", qty: 1, rate: 0, mrp: 0, taxId: 1, discount: 0 }]);
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
  const setMrp = (i: number, mrp: number) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, mrp } : row)));
  const setTaxId = (i: number, taxId: number) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, taxId } : row)));
  const setDiscount = (i: number, discount: number) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, discount: Math.min(100, Math.max(0, discount)) } : row)));
  const lineAmount = (r: DraftRow) => r.qty * r.rate * (1 - (r.discount || 0) / 100);
  const removeRow = (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  const subTotal = rows.reduce((s, r) => s + lineAmount(r), 0);
  const inlineDiscount = rows.reduce((s, r) => s + r.qty * r.rate * ((r.discount || 0) / 100), 0);
  const taxTotal = rows.reduce((s, r) => s + lineAmount(r) * ((TAX_RATE[r.taxId] || 0) / 100), 0);
  const shippingNum = parseFloat(shippingCost) || 0;
  const total = subTotal + taxTotal + shippingNum;
  const moneyWithCurrency = (amount: number) => formatCurrencyValue(amount, currency);
  const custDisabled = customerId === "" && !custQuery.trim();

  const persist = async (): Promise<{ id: number; number: string; backendId?: string } | null> => {
    let cid: number | "" = customerId;
    if (cid === "" && custQuery.trim()) {
      cid = (await repo.add("customers", { name: custQuery.trim(), status: "Active", balance: 0 })) as number;
    }
    if (cid === "") return null;
    const items = rows.filter((r) => r.name).map((r, i) => ({
      id: i + 1, name: r.name, description: r.description, qty: r.qty, rate: r.rate, mrp: r.mrp,
      taxId: r.taxId, discount: r.discount || 0, amount: +lineAmount(r).toFixed(2),
    }));
    const common = {
      customerId: cid, date, due, status: "Draft" as const,
      items, subTotal: +subTotal.toFixed(2), tax: +taxTotal.toFixed(2), shipping: shippingNum,
      total: +total.toFixed(2), amountPaid: 0, amountDue: +total.toFixed(2),
      notes, terms, internalNotes, currency,
      subTitle, poNumber, shippingMethod, discountBeforeTax, recurring,
      recurringUntil: isRecurringActive(recurring) ? recurringUntil : "",
      deposit, docDiscount, shippingCost,
      paymentMethod: isInvoice ? selectedPaymentMethods : [],
      payment_method: isInvoice ? selectedPaymentMethods : [],
      inlineDiscount: +inlineDiscount.toFixed(2),
      Attachment: attachment, attachments: attachment,
      street1: billing.street1, street2: billing.street2, city: billing.city, state: billing.state, zip: billing.zip, country: billing.country,
      shipStreet1: shipVal("street1"), shipStreet2: shipVal("street2"), shipCity: shipVal("city"), shipState: shipVal("state"), shipZip: shipVal("zip"), shipCountry: shipVal("country"),
    };
    if (updateToCustomer) {
      await repo.update("customers", cid, {
        street1: billing.street1, street2: billing.street2, city: billing.city, state: billing.state, zip: billing.zip, country: billing.country,
        shipStreet1: shipVal("street1"), shipStreet2: shipVal("street2"), shipCity: shipVal("city"), shipState: shipVal("state"), shipZip: shipVal("zip"), shipCountry: shipVal("country"),
      });
    }
    let id: number;
    let numStr: string;
    let backendId = invoice?._id ? String(invoice._id) : "";
    if (isEdit) {
      numStr = invoice.number || "";
      await repo.update(collection, invoice.id, common);
      id = invoice.id;
    } else {
      const n = await nextNumber(collection);
      numStr = "#" + n;
      id = (await repo.add(collection, { number: numStr, ts: Date.now(), ...common })) as number;
    }
    try {
      const row = await (db as any)[collection].get(id);
      if (row?._id) backendId = String(row._id);
    } catch {
      /* ignore */
    }
    return { id, number: numStr, backendId: backendId || undefined };
  };

  const finishSave = (id: number, closeAfter = true) => {
    onSaved(id);
    if (closeAfter) onClose();
  };

  const saveDraft = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await persist();
      if (saved) finishSave(saved.id);
    } catch {
      /* keep form open on backend failure */
    } finally {
      setSaving(false);
    }
  };

  const saveAndSend = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      onSaved(saved.id);
      setLastSaved(saved);
      setEmailOpen(true);
    } catch {
      /* keep form open on backend failure */
    } finally {
      setSaving(false);
    }
  };

  const handleSendMenu = async (action: SendMenuAction) => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      onSaved(saved.id);
      setLastSaved(saved);
      if (action === "preview") {
        setPreviewOpen(true);
        return;
      }
      if (action === "print") {
        void printServerPdf(pdfDocType, saved.id, saved.backendId).catch(() => undefined);
        finishSave(saved.id);
        return;
      }
      if (action === "new") {
        finishSave(saved.id, false);
        setCustomerId("");
        setCustQuery("");
        setCustomerEmail("");
        setRows([
          { key: "", kind: "product", name: "", description: "", qty: 1, rate: 0, mrp: 0, taxId: 1, discount: 0 },
          { key: "", kind: "service", name: "", description: "", qty: 1, rate: 0, mrp: 0, taxId: 1, discount: 0 },
        ]);
      }
    } catch {
      /* keep form open on backend failure */
    } finally {
      setSaving(false);
    }
  };

  const custRecord = customerId ? customers.find((c) => c.id === customerId) : null;
  const custName = custRecord?.name || custQuery;
  const custEmail = (customerEmail || custRecord?.email || "").trim();
  const docNumber = invoice?.number?.replace?.("#", "") || "80";
  const formTitle = isEdit ? `Edit ${docLabel}` : `Create ${docLabel}`;

  return (
    <section className="module-detail-panel custom-scrollbar flex-1 overflow-y-auto">
      <DocumentCreateHeader
        title={formTitle}
        onSettings={() => setSettingsOpen(true)}
        onCancel={onClose}
        onSaveDraft={() => void saveDraft()}
        onSaveAndSend={() => void saveAndSend()}
        saveDisabled={custDisabled || saving}
        enableSendDropdown={isInvoice}
        onSendMenu={(a) => void handleSendMenu(a)}
      />

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative fl-wrap" ref={cref}>
            <label className="fl-label">Customer *</label>
            <div className="relative">
              <input value={custName} onChange={(e) => { setCustQuery(e.target.value); setCustomerId(""); setCustomerEmail(""); setCustOpen(true); }} onFocus={() => setCustOpen(true)} placeholder="Find or add a customer" className={DOC_FIELD} />
              <button type="button" onClick={() => setAddContact(true)} title="Create Contact" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500"><Pencil className="w-4 h-4" /></button>
            </div>
            {custOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-xl py-1 max-h-60 overflow-y-auto custom-scrollbar">
                {matches.map((c) => <button key={c._id} type="button" onClick={() => { setCustomerBackendId(c._id); setCustomerId(customers.find((item) => item._id === c._id)?.id ?? ""); setCustQuery(c.name); setCustomerEmail(("email" in c && c.email) ? String(c.email) : ""); setCustOpen(false); setAddrOpen(true); }} className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 text-left">{c.name}</button>)}
                {matches.length === 0 && <div className="px-3 py-2.5 text-sm text-gray-400">No customer found — click the pencil to add</div>}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-2 px-1 bg-white text-[11px] text-gray-500 z-10">Address</label>
            <button type="button" onClick={() => setAddrOpen((o) => !o)} className={`w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-500 hover:border-gray-400 bg-white`}>
              <span /> <ChevronDown className={`w-4 h-4 transition-transform ${addrOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="relative fl-wrap">
            <label className="fl-label">{docLabel} #</label>
            <div className="relative">
              <input readOnly value={docNumber} placeholder=" " className={DOC_FIELD} />
              <Info className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <CurrencyCombobox value={currency} onChange={setCurrency} />
          <div className="relative fl-wrap">
            <label className="fl-label">{docLabel} date *</label>
            <div className="relative">
              <input value={date} onChange={(e) => setDate(e.target.value)} placeholder=" " className={DOC_FIELD} />
              <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

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
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">Street 1</label><input value={billing.street1} onChange={(e) => setBilling((b) => ({ ...b, street1: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
                <div className="relative"><input value={billing.street2} onChange={(e) => setBilling((b) => ({ ...b, street2: e.target.value }))} placeholder="Street 2" className={DOC_FIELD} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">City</label><input value={billing.city} onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
                <div className="relative"><input value={billing.state} onChange={(e) => setBilling((b) => ({ ...b, state: e.target.value }))} placeholder="State" className={DOC_FIELD} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Zip Code</label><input value={billing.zip} onChange={(e) => setBilling((b) => ({ ...b, zip: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Country</label><input value={billing.country} onChange={(e) => setBilling((b) => ({ ...b, country: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
              </div>
            </div>
            <div className={`space-y-3 ${sameAsBilling ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">Street 1</label><input value={shipVal("street1")} onChange={(e) => setShipping((s) => ({ ...s, street1: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
                <div className="relative"><input value={shipVal("street2")} onChange={(e) => setShipping((s) => ({ ...s, street2: e.target.value }))} placeholder="Street 2" className={DOC_FIELD} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative fl-wrap"><label className="fl-label">City</label><input value={shipVal("city")} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
                <div className="relative"><input value={shipVal("state")} onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))} placeholder="State" className={DOC_FIELD} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Zip Code</label><input value={shipVal("zip")} onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
                <div className="relative fl-wrap"><label className="fl-label">Country</label><input value={shipVal("country")} onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))} placeholder=" " className={DOC_FIELD} /></div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="Sub Title" className={DOC_FIELD} />
          <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO #" className={DOC_FIELD} />
          <div className="md:col-span-2">
            <input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} placeholder="Shipping Method" className={DOC_FIELD} />
          </div>
          {isInvoice ? (
            <div className="md:col-span-2 relative">
              <label className="absolute -top-2 left-2 px-1 bg-white text-[11px] text-gray-500 z-10">Payment Methods</label>
              <button type="button" onClick={() => setPaymentMethodsOpen(true)} className="flex min-h-[46px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2.5 text-left hover:border-gray-400">
                <div className="flex min-w-0 flex-wrap gap-2">
                  {selectedPaymentMethods.length > 0 ? selectedPaymentMethods.map((name) => (
                    <span key={name} className="rounded-full border border-blue-600 bg-blue-50 px-3 py-1 text-xs text-blue-700">{name}</span>
                  )) : (
                    <span className="text-sm text-gray-400">Select payment methods</span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-gray-600"><Pencil className="w-4 h-4" /></span>
              </button>
            </div>
          ) : (
            <div className="md:col-span-2 min-h-[46px] rounded-md border border-gray-300 bg-white flex items-center px-3 text-sm text-gray-400">Payment Methods</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
            <input type="checkbox" checked={discountBeforeTax} onChange={() => setDiscountBeforeTax((v) => !v)} className="accent-blue-600" />
            Discount before tax
          </label>
          <div className="relative fl-wrap">
            <label className="fl-label">Recurring</label>
            <select value={recurring} onChange={(e) => setRecurring(e.target.value)} className={DOC_FIELD}>
              {RECURRING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {isRecurringActive(recurring) ? (
            <div className="relative fl-wrap">
              <label className="fl-label">Up to</label>
              <div className="relative">
                <input value={recurringUntil} onChange={(e) => setRecurringUntil(e.target.value)} placeholder=" " className={DOC_FIELD} />
                <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="hidden md:block" aria-hidden />
          )}
        </div>

        <div ref={itemsRef} className="border border-gray-300 rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="bg-gray-100 text-gray-500 text-xs"><th className="text-left font-semibold px-4 py-2.5 w-14">Sr. No.</th><th className="text-left font-semibold px-2 py-2.5">Items</th>{cols.qty && <th className="text-right font-semibold px-2 py-2.5">Quantity</th>}{cols.mrp && <th className="text-right font-semibold px-2 py-2.5">MRP</th>}<th className="text-right font-semibold px-2 py-2.5">Rate</th>{cols.tax && <th className="text-left font-semibold px-2 py-2.5">Tax</th>}{cols.discount && <th className="text-right font-semibold px-2 py-2.5">Discount</th>}<th className="text-right font-semibold px-4 py-2.5">Amount</th><th className="w-8" /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-300 align-top">
                  <td className="px-4 py-3 text-gray-700">{i + 1}</td>
                  <td className="px-2 py-2 relative">
                    <div className="text-[11px] text-gray-400 capitalize">{r.kind}</div>
                    <input value={r.name} onChange={(e) => { setRowName(i, e.target.value); setSugRow(i); }} onFocus={() => setSugRow(i)} placeholder={r.kind === "product" ? "Product" : "Service"} className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400" />
                    <input value={r.description} onChange={(e) => setRowDesc(i, e.target.value)} placeholder="Description" className="w-full bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400 mt-0.5" />
                    {sugRow === i && (
                      <div className="absolute left-2 right-0 top-full z-30 mt-1 max-w-xl bg-white border border-gray-300 rounded-md shadow-xl overflow-hidden">
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {suggestionsFor(r).map((c) => (
                            <button key={c.key} type="button" onClick={() => pickSuggestion(i, c.key)} className="w-full flex items-center justify-between gap-6 px-4 py-2.5 text-sm hover:bg-gray-100 text-left">
                              <span className="text-gray-900 truncate">{c.name}</span>
                              <span className="text-gray-600 flex-shrink-0">{moneyWithCurrency(c.rate)}</span>
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 border-t border-gray-300 cursor-pointer">
                          <input type="checkbox" checked={sortRecent} onChange={() => setSortRecent((v) => !v)} className="accent-blue-600" />
                          Sort by Recent Used
                        </label>
                      </div>
                    )}
                  </td>
                  {cols.qty && <td className="px-2 py-3 text-right"><input type="number" min={0} value={r.qty} onChange={(e) => setQty(i, Number(e.target.value))} className="w-14 bg-transparent text-sm text-right outline-none" /></td>}
                  {cols.mrp && <td className="px-2 py-3 text-right"><input type="number" min={0} value={r.mrp || ""} onChange={(e) => setMrp(i, Number(e.target.value))} className="w-16 bg-transparent text-sm text-right outline-none" /></td>}
                  <td className="px-2 py-3 text-right"><input type="number" min={0} value={r.rate} onChange={(e) => setRate(i, Number(e.target.value))} className="w-20 bg-transparent text-sm text-right outline-none" /></td>
                  {cols.tax && (
                    <td className="px-2 py-3">
                      <select value={r.taxId} onChange={(e) => setTaxId(i, Number(e.target.value))} className="text-xs bg-transparent border-0 outline-none text-gray-600 max-w-[120px]">
                        {Object.entries(TAX_NAME).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                      </select>
                    </td>
                  )}
                  {cols.discount && (
                    <td className="px-2 py-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <input type="number" min={0} max={100} value={r.discount || ""} onChange={(e) => setDiscount(i, Number(e.target.value))} placeholder="Discount" className="w-16 bg-transparent text-sm text-right outline-none placeholder:text-gray-400" />
                        <span className="px-1 py-0.5 text-[10px] rounded bg-gray-200 text-gray-600">%</span>
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{moneyWithCurrency(lineAmount(r))}</td>
                  <td className="px-2 py-3 text-right"><button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-300">
            <button type="button" onClick={() => addRow("product")} className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Product</button>
            <button type="button" onClick={() => addRow("service")} className="flex items-center gap-1.5 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Service</button>
            <div className="relative ml-auto" ref={colMenuRef}>
              <button type="button" title="Columns" onClick={() => setColMenuOpen((o) => !o)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600"><Settings className="w-4 h-4" /></button>
              {colMenuOpen && (
                <div className="absolute right-0 bottom-full z-40 mb-1 min-w-[180px] bg-white border border-gray-300 rounded-md shadow-xl py-1">
                  {([["qty", "Quantity"], ["mrp", "MRP"], ["tax", "Tax"], ["discount", "Discount"]] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setCols((c) => ({ ...c, [k]: !c[k] }))} className="w-full flex items-center justify-between gap-6 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 text-left">
                      {label} {cols[k] && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Terms &amp; Conditions</label><textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1 w-full h-20 border border-gray-300 rounded-md p-3 text-sm text-gray-700 outline-none resize-none bg-white" /></div>
            <div><label className="text-xs text-gray-500">Internal Notes</label><textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Internal Notes" className="mt-1 w-full h-20 border border-gray-300 rounded-md p-3 text-sm text-gray-700 outline-none resize-none bg-white" /></div>
          </div>
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full h-20 border border-gray-300 rounded-md p-3 text-sm text-gray-700 outline-none resize-none bg-white" /></div>
            <DocAttachmentField compact value={attachment} onChange={(p) => setAttachment(p)} />
          </div>
          <div className="border border-gray-300 rounded-md overflow-hidden self-start bg-white">
            <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-700">Sub Total</span><span className="font-semibold text-gray-900">{moneyWithCurrency(subTotal)}</span></div>
            <div className="flex justify-between items-center px-4 py-2 text-sm gap-2"><span className="text-gray-700">Deposit</span><input value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="30 or 30%" className="w-28 text-right text-sm border border-gray-300 rounded px-2 py-1 bg-white" /></div>
            <div className="flex justify-between items-center px-4 py-2 text-sm gap-2"><span className="text-gray-700">Discount</span><input value={docDiscount} onChange={(e) => setDocDiscount(e.target.value)} placeholder="30 or 30%" className="w-28 text-right text-sm border border-gray-300 rounded px-2 py-1 bg-white" /></div>
            <div className="flex justify-between items-center px-4 py-2 text-sm gap-2"><span className="text-gray-700">Shipping Cost</span><input value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="Shipping Cost" className="w-28 text-right text-sm border border-gray-300 rounded px-2 py-1 bg-white" /></div>
            <div className="flex justify-between px-4 py-2.5 text-sm border-t border-gray-300"><span className="text-gray-700">Total</span><span className="font-semibold text-gray-900">{moneyWithCurrency(total)}</span></div>
            <div className="flex justify-between px-4 py-3 bg-gray-100 border-t border-gray-300"><span className="font-semibold text-gray-900">Amount Due</span><span className="font-semibold text-gray-900">{moneyWithCurrency(total)}</span></div>
          </div>
        </div>
      </div>

      {addContact && <CreateContactModal collection="customers" onClose={() => setAddContact(false)} onSaved={(id, name) => { setCustomerId(id); setCustQuery(name); }} />}
      {settingsOpen && <AppSettingsModal initialTab={docLabel} onClose={() => setSettingsOpen(false)} />}
      {paymentMethodsOpen && <PaymentMethodsModal selectedNames={selectedPaymentMethods} onSaveSelection={setSelectedPaymentMethods} onClose={() => setPaymentMethodsOpen(false)} />}
      <DocumentSendEmailModal
        open={emailOpen}
        onClose={() => { setEmailOpen(false); onClose(); }}
        title={`${docLabel} #: ${lastSaved?.number || docNumber} from info`}
        toEmail={custEmail}
        subject={`${docLabel} #: ${lastSaved?.number || docNumber} from info`}
        fromEmail="info@inovoic.com"
        bodyText={`Dear ${custName}\n\n${docLabel} #: ${lastSaved?.number || docNumber}\nTotal: ${moneyWithCurrency(total)}`}
        attachmentLabel={lastSaved ? `${docLabel} ${lastSaved.number}` : undefined}
        emailNav={EMAIL_NAV[mode]}
      />
      {previewOpen && lastSaved && (
        <PdfPreviewModal
          docType={pdfDocType}
          recordId={lastSaved.id}
          backendId={lastSaved.backendId}
          title={`${docLabel} `}
          onClose={() => { setPreviewOpen(false); onClose(); }}
        />
      )}
    </section>
  );
};

export default CreateInvoiceForm;
