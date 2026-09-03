/**
 * File: src/pages/pos/AddPos.tsx
 * Add POS — matches references/pos/add pos*.png in the Qayd blue theme:
 * product grid fed by the shared Items > Products collection (name, SKU,
 * price, stock all come from there), category chips, customer/warehouse
 * selects, add-to-cart-by-SKU, shopping cart sidebar with GST 18% +
 * discount, Process Payment modal and the receipt modal after Complete
 * Sale. Completed sales persist in meta row `pos:orders` and product
 * stock is decremented in the products collection.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { money, useCollection, repo } from "@/lib/db";
import {
  posOrderStore,
  SEED_POS_ORDERS,
  PosOrder,
  PosItem,
  POS_WAREHOUSES,
  GST_RATE,
  orderSubtotal,
  orderTax,
  orderTotal,
  nextPosNumber,
  posUid,
  warehouseShort,
} from "@/lib/db/pos";
import { BANK_ACCOUNTS } from "@/lib/db/hrm";
import { showToast } from "../../utils/toast";
import {
  Home,
  Search,
  Barcode,
  ShoppingCart,
  Package,
  Trash2,
  Minus,
  Plus,
  X,
  CreditCard,
  CheckCircle2,
  Download,
  Printer,
} from "lucide-react";

const QAYD_ADDRESS = ["B-102, Orbit Heights, Lakeview Lane", "Ahmedabad, Gujarat", "India - 380015"];

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  image?: string | null;
}

export const AddPos: React.FC = () => {
  const navigate = useNavigate();
  const products = useCollection<ProductRow>("products");
  const customers = useCollection<{ id: number; name: string }>("customers");
  const orders = posOrderStore.use();
  useEffect(() => {
    if (orders === null) posOrderStore.save(SEED_POS_ORDERS);
  }, [orders]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customer, setCustomer] = useState("Walk-in Customer");
  const [warehouse, setWarehouse] = useState(POS_WAREHOUSES[0]);
  const [bankAccount, setBankAccount] = useState("");
  const [sku, setSku] = useState("");
  const [cart, setCart] = useState<PosItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [modal, setModal] = useState<"payment" | "receipt" | null>(null);
  const [receipt, setReceipt] = useState<PosOrder | null>(null);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products],
  );
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.status !== "Inactive" &&
        (category === "All" || p.category === category) &&
        (p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)),
    );
  }, [products, search, category]);

  const addToCart = (p: ProductRow) => {
    if ((p.stock ?? 0) <= 0) {
      showToast(`${p.name} is out of stock`, "error");
      return;
    }
    setCart((prev) => {
      const found = prev.find((i) => i.productId === p.id);
      if (found) {
        if (found.qty >= p.stock) {
          showToast(`Only ${p.stock} in stock for ${p.name}`, "error");
          return prev;
        }
        return prev.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { productId: p.id, name: p.name, sku: p.sku || "", qty: 1, price: p.price, taxRate: GST_RATE }];
    });
  };

  const addBySku = () => {
    const p = products.find((x) => (x.sku || "").toLowerCase() === sku.trim().toLowerCase());
    if (!p) {
      showToast(`No product with SKU "${sku.trim()}"`, "error");
      return;
    }
    addToCart(p);
    setSku("");
  };

  const setQty = (productId: number, qty: number) => {
    const p = products.find((x) => x.id === productId);
    if (p && qty > p.stock) {
      showToast(`Only ${p.stock} in stock for ${p.name}`, "error");
      return;
    }
    setCart((prev) => (qty <= 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => (i.productId === productId ? { ...i, qty } : i))));
  };

  const draft = { items: cart, discount };
  const subtotal = orderSubtotal(draft);
  const tax = orderTax(draft);
  const total = orderTotal(draft);
  const posNumber = nextPosNumber(orders || []);
  const today = new Date().toISOString().slice(0, 10);

  const checkout = () => {
    if (cart.length === 0) {
      showToast("Your cart is empty", "error");
      return;
    }
    if (!bankAccount) {
      showToast("Select a bank account first", "error");
      return;
    }
    setModal("payment");
  };

  const completeSale = async () => {
    const order: PosOrder = {
      id: posUid(),
      number: posNumber,
      date: today,
      customer,
      warehouse,
      bankAccount,
      items: cart,
      discount,
      status: "Completed",
      createdAt: Date.now(),
    };
    await posOrderStore.create(order);
    for (const i of cart) {
      const p = products.find((x) => x.id === i.productId);
      if (p) await repo.update("products", p.id, { stock: Math.max(0, (p.stock ?? 0) - i.qty) });
    }
    setReceipt(order);
    setModal("receipt");
    setCart([]);
    setDiscount(0);
  };

  const inputCls = "px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30";

  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-hidden flex">
      {/* ── product side ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* toolbar */}
        <div className="bg-white border-b border-gray-300 px-4 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate("/")} title="Home" className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50">
            <Home className="w-4 h-4" />
          </button>
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className={`${inputCls} w-full pl-9`} />
          </div>
          <select value={customer} onChange={(e) => setCustomer(e.target.value)} className={`${inputCls} min-w-40`}>
            <option>Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className={`${inputCls} min-w-52`}>
            {POS_WAREHOUSES.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
          <div className="relative min-w-44">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBySku()}
              placeholder="Add To Cart by SKU"
              className={`${inputCls} w-full pl-9`}
            />
          </div>
        </div>

        {/* category chips */}
        <div className="bg-white border-b border-gray-300 px-4 py-3 flex items-center gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg border ${
                category === c ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {visible.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md text-left overflow-hidden transition-all"
              >
                <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-12 h-12 text-blue-200" />}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{p.sku || "—"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-blue-600">{money(p.price)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock > 0 ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-600"}`}>
                      {p.stock ?? 0}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {visible.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-16">No products match your search.</div>
          )}
        </div>
      </div>

      {/* ── cart sidebar ── */}
      <div className="w-80 xl:w-96 bg-white border-l border-gray-200 flex flex-col shrink-0">
        <div className="px-4 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Account <span className="text-red-500">*</span>
          </label>
          <select value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className={`${inputCls} w-full`}>
            <option value="">Select Bank Account</option>
            {BANK_ACCOUNTS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 mt-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">Shopping Cart</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs flex items-center justify-center font-medium">
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} title="Clear cart" className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <ShoppingCart className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-700">Your cart is empty</p>
              <p className="text-xs text-gray-400 mt-1">Add products to get started</p>
            </div>
          ) : (
            cart.map((i) => (
              <div key={i.productId} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {(() => {
                      const img = products.find((x) => x.id === i.productId)?.image;
                      return img ? <img src={img} alt={i.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-blue-300" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{i.name}</p>
                    <p className="text-xs text-blue-600">{money(i.price)} each</p>
                  </div>
                  <button onClick={() => setQty(i.productId, 0)} title={`Remove ${i.name}`} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(i.productId, i.qty - 1)} className="w-7 h-7 border border-gray-300 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{i.qty}</span>
                    <button onClick={() => setQty(i.productId, i.qty + 1)} className="w-7 h-7 border border-gray-300 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{money(i.qty * i.price)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* totals */}
        <div className="border-t border-gray-200 px-4 py-4 space-y-2 text-sm">
          <div className="flex items-center justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="text-gray-900">{money(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>GST ({GST_RATE.toFixed(2)}%)</span>
            <span className="text-gray-900">{money(tax)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Discount</span>
            <input
              type="number"
              min={0}
              value={discount || ""}
              placeholder="0"
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 px-2 py-1 text-right text-sm border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-blue-600">{money(total)}</span>
          </div>
          <button
            onClick={checkout}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <CreditCard className="w-4 h-4" /> Checkout
          </button>
        </div>
      </div>

      {/* ── process payment modal ── */}
      {modal === "payment" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Process Payment</h3>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto">
              <div className="flex justify-between gap-6 text-sm">
                <div className="space-y-1.5">
                  <p><span className="text-gray-500">POS Number:</span> <span className="font-semibold text-gray-900">{posNumber}</span></p>
                  <p><span className="text-gray-500">Date:</span> <span className="text-gray-900">{today}</span></p>
                  <p><span className="text-gray-500">Customer:</span> <span className="text-gray-900">{customer}</span></p>
                  <p><span className="text-gray-500">Warehouse:</span> <span className="text-gray-900">{warehouseShort(warehouse)}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-gray-900">Qayd</p>
                  {QAYD_ADDRESS.map((l) => (
                    <p key={l} className="text-gray-500">{l}</p>
                  ))}
                </div>
              </div>

              <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-300">
                    <tr>
                      {["Product", "Qty", "Price", "Taxes", "Tax Amount", "Total"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cart.map((i) => {
                      const lineTax = +(i.qty * i.price * i.taxRate / 100).toFixed(2);
                      return (
                        <tr key={i.productId}>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-gray-900">{i.name}</p>
                            <p className="text-xs text-gray-400">{i.sku}</p>
                          </td>
                          <td className="px-3 py-2.5 text-gray-900">{i.qty}</td>
                          <td className="px-3 py-2.5 text-gray-900">{money(i.price)}</td>
                          <td className="px-3 py-2.5 text-gray-600">GST ({i.taxRate.toFixed(2)}%)</td>
                          <td className="px-3 py-2.5 text-gray-900">{money(lineTax)}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-900">{money(i.qty * i.price + lineTax)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 border border-gray-200 rounded-lg px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="text-gray-900">{money(subtotal)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Tax:</span><span className="text-gray-900">{money(tax)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Discount:</span><span className="text-gray-900">-{money(discount)}</span></div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-base font-semibold text-gray-900">Total:</span>
                  <span className="text-base font-bold text-blue-600">{money(total)}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={completeSale} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Complete Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* ── receipt modal ── */}
      {modal === "receipt" && receipt && <ReceiptModal order={receipt} onClose={() => setModal(null)} />}
    </div>
  );
};

/* ── receipt modal (also used after Complete Sale) ─────────────── */

export function ReceiptModal({ order, onClose }: { order: PosOrder; onClose: () => void }) {
  const subtotal = orderSubtotal(order);
  const tax = orderTax(order);
  const total = orderTotal(order);

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: [80, 160 + order.items.length * 30] });
    let y = 10;
    const c = (t: string, size = 9, bold = false) => {
      doc.setFont("courier", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.text(t, 40, y, { align: "center" });
      y += size * 0.55;
    };
    const lr = (l: string, r: string, bold = false) => {
      doc.setFont("courier", bold ? "bold" : "normal");
      doc.setFontSize(8);
      doc.text(l, 6, y);
      doc.text(r, 74, y, { align: "right" });
      y += 4.5;
    };
    const hr = () => { c("-".repeat(32), 8); };
    c("Qayd", 12, true);
    QAYD_ADDRESS.forEach((l) => c(l, 8));
    hr();
    lr("Receipt:", order.number, true);
    lr("Date:", order.date);
    lr("Customer:", order.customer.replace(" Customer", ""));
    hr();
    for (const i of order.items) {
      lr(i.name, "", true);
      lr("Qty:", String(i.qty));
      lr("Price:", money(i.price));
      lr("Tax:", `GST (${i.taxRate.toFixed(2)}%)`);
      lr("Tax Amount:", money(+(i.qty * i.price * i.taxRate / 100).toFixed(2)));
      lr("Sub Total:", money(i.qty * i.price), true);
      y += 1.5;
    }
    hr();
    lr("Subtotal:", money(subtotal));
    lr("Tax:", money(tax));
    lr("Discount:", `-${money(order.discount)}`);
    lr("Total:", money(total), true);
    hr();
    c("* Thank you for your business! *", 8);
    doc.save(`${order.number.replace("#", "")}-receipt.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="m-2 bg-white border border-gray-300 shadow-sm rounded-xl border border-gray-200 shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="text-base font-semibold text-green-600">Sale Completed Successfully!</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto">
          <div className="rounded-lg border border-gray-200 px-4 py-3 text-center mb-4">
            <p className="text-sm text-gray-700">Your transaction has been processed successfully.</p>
            <p className="text-sm font-semibold text-green-700 mt-1">Receipt Number: {order.number}</p>
          </div>
          <div className="border border-gray-200 rounded-lg px-5 py-4 font-mono text-xs text-gray-800 space-y-0.5">
            <p className="text-center font-bold text-sm">Qayd</p>
            {QAYD_ADDRESS.map((l) => (
              <p key={l} className="text-center">{l}</p>
            ))}
            <p className="text-center text-gray-400">{"-".repeat(34)}</p>
            <div className="flex justify-between"><span>Receipt:</span><span className="font-bold">{order.number}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{order.date}</span></div>
            <div className="flex justify-between"><span>Customer:</span><span>{order.customer.replace(" Customer", "")}</span></div>
            <p className="text-center text-gray-400">{"-".repeat(34)}</p>
            {order.items.map((i) => (
              <div key={i.productId} className="pt-1">
                <p className="font-bold">{i.name}</p>
                <div className="flex justify-between"><span>Qty:</span><span>{i.qty}</span></div>
                <div className="flex justify-between"><span>Price:</span><span>{money(i.price)}</span></div>
                <div className="flex justify-between"><span>Tax:</span><span>GST ({i.taxRate.toFixed(2)}%)</span></div>
                <div className="flex justify-between"><span>Tax Amount:</span><span>{money(+(i.qty * i.price * i.taxRate / 100).toFixed(2))}</span></div>
                <div className="flex justify-between font-bold"><span>Sub Total:</span><span>{money(i.qty * i.price)}</span></div>
              </div>
            ))}
            <p className="text-center text-gray-400">{"-".repeat(34)}</p>
            <div className="flex justify-between"><span>Discount:</span><span>-{money(order.discount)}</span></div>
            <div className="flex justify-between font-bold text-sm pt-1"><span>Total:</span><span>{money(total)}</span></div>
            <p className="text-center text-gray-400">{"-".repeat(34)}</p>
            <p className="text-center">* Thank you for your business! *</p>
            <p className="text-center text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-center gap-3">
          <button onClick={downloadPdf} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}
