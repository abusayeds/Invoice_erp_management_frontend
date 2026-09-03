/**
 * File: src/pages/accounting/AccountsSystem.tsx
 * Accounting System Setup — Account Categories, Account Types, Revenue
 * Categories and Expense Categories.
 *
 * Endpoints (all under /account):
 *   Account Categories: GET account-categories/all, POST create, PATCH edit/:id, DELETE delete/:id
 *   Account Types:      GET account-types/all, POST create, PATCH edit/:id, DELETE delete/:id
 *   Revenue Categories: GET revenue-categories/all, POST create, PATCH edit/:id, DELETE delete/:id
 *   Expense Categories: GET expense-categories/all, POST create, PATCH edit/:id, DELETE delete/:id
 *
 * Account Types reference an account-category (category_id); Revenue/Expense
 * categories reference a GL account (gl_account_id) from the chart of accounts.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { api } from "../../lib/api/client";
import { ApiError } from "../../lib/api/ApiError";
import {
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Tag,
  DollarSign,
  FolderOpen,
  Layers,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountCategory {
  id: string;
  name: string;
  code: string;
  type: string; // asset | liability | equity | revenue | expense
  description: string;
  isActive: boolean;
}
interface AccountType {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  normalBalance: string; // debit | credit
  description: string;
  isActive: boolean;
}
interface RevenueCategory {
  id: string;
  name: string;
  code: string;
  glAccountId: string;
  description: string;
  isActive: boolean;
}
interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  glAccountId: string;
  description: string;
  isActive: boolean;
}
interface Coa {
  id: string;
  name: string;
  code: string;
}

const errMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;
const refId = (v: { _id: string } | string | null | undefined): string =>
  typeof v === "object" && v ? v._id : (v ?? "");

const ACCOUNT_TYPE_KINDS = ["asset", "liability", "equity", "revenue", "expense"];
const NORMAL_BALANCES = ["debit", "credit"];

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
  >
    {active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {active ? "Active" : "Inactive"}
  </span>
);

type Tab = "categories" | "types" | "revenue" | "expense";

// ─── Component ────────────────────────────────────────────────────────────────

export const AccountingSystem: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [coa, setCoa] = useState<Coa[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Which modal + editing id
  const [modal, setModal] = useState<"" | Tab>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    code: "",
    type: "asset",
    description: "",
    is_active: true,
  });
  const [typeForm, setTypeForm] = useState({
    category_id: "",
    name: "",
    code: "",
    normal_balance: "debit",
    description: "",
    is_active: true,
  });
  const [revenueForm, setRevenueForm] = useState({
    category_name: "",
    category_code: "",
    description: "",
    gl_account_id: "",
    is_active: true,
  });
  const [expenseForm, setExpenseForm] = useState({
    category_name: "",
    category_code: "",
    description: "",
    gl_account_id: "",
    is_active: true,
  });

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, typ, rev, exp, coaRes] = await Promise.allSettled([
        api.get<any[]>("/account/account-categories/all"),
        api.get<any[]>("/account/account-types/all"),
        api.get<any[]>("/account/revenue-categories/all"),
        api.get<any[]>("/account/expense-categories/all"),
        api.get<any[]>("/account/chart-of-accounts/all", {
          params: { page: 1, limit: 1000 },
        }),
      ]);
      if (cat.status === "fulfilled" && Array.isArray(cat.value))
        setAccountCategories(
          cat.value.map((c) => ({
            id: c._id,
            name: c.name ?? "",
            code: c.code ?? "",
            type: c.type ?? "",
            description: c.description ?? "",
            isActive: c.is_active ?? true,
          })),
        );
      if (typ.status === "fulfilled" && Array.isArray(typ.value))
        setAccountTypes(
          typ.value.map((t) => ({
            id: t._id,
            categoryId: refId(t.category_id),
            name: t.name ?? "",
            code: t.code ?? "",
            normalBalance: t.normal_balance ?? "",
            description: t.description ?? "",
            isActive: t.is_active ?? true,
          })),
        );
      if (rev.status === "fulfilled" && Array.isArray(rev.value))
        setRevenueCategories(
          rev.value.map((r) => ({
            id: r._id,
            name: r.category_name ?? "",
            code: r.category_code ?? "",
            glAccountId: refId(r.gl_account_id),
            description: r.description ?? "",
            isActive: r.is_active ?? true,
          })),
        );
      if (exp.status === "fulfilled" && Array.isArray(exp.value))
        setExpenseCategories(
          exp.value.map((e) => ({
            id: e._id,
            name: e.category_name ?? "",
            code: e.category_code ?? "",
            glAccountId: refId(e.gl_account_id),
            description: e.description ?? "",
            isActive: e.is_active ?? true,
          })),
        );
      if (coaRes.status === "fulfilled" && Array.isArray(coaRes.value))
        setCoa(
          coaRes.value.map((a) => ({
            id: a._id,
            name: a.account_name ?? "",
            code: a.account_code ?? "",
          })),
        );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const categoryNameById = (id: string) =>
    accountCategories.find((c) => c.id === id)?.name || id || "—";
  const coaLabel = (id: string) => {
    const a = coa.find((x) => x.id === id);
    return a ? `${a.code} · ${a.name}` : id || "—";
  };

  // ─── Open modals ───────────────────────────────────────────────────────────
  const openCategory = (item?: AccountCategory) => {
    setEditingId(item?.id ?? null);
    setCategoryForm(
      item
        ? { name: item.name, code: item.code, type: item.type || "asset", description: item.description, is_active: item.isActive }
        : { name: "", code: "", type: "asset", description: "", is_active: true },
    );
    setModal("categories");
  };
  const openType = (item?: AccountType) => {
    setEditingId(item?.id ?? null);
    setTypeForm(
      item
        ? { category_id: item.categoryId, name: item.name, code: item.code, normal_balance: item.normalBalance || "debit", description: item.description, is_active: item.isActive }
        : { category_id: "", name: "", code: "", normal_balance: "debit", description: "", is_active: true },
    );
    setModal("types");
  };
  const openRevenue = (item?: RevenueCategory) => {
    setEditingId(item?.id ?? null);
    setRevenueForm(
      item
        ? { category_name: item.name, category_code: item.code, description: item.description, gl_account_id: item.glAccountId, is_active: item.isActive }
        : { category_name: "", category_code: "", description: "", gl_account_id: "", is_active: true },
    );
    setModal("revenue");
  };
  const openExpense = (item?: ExpenseCategory) => {
    setEditingId(item?.id ?? null);
    setExpenseForm(
      item
        ? { category_name: item.name, category_code: item.code, description: item.description, gl_account_id: item.glAccountId, is_active: item.isActive }
        : { category_name: "", category_code: "", description: "", gl_account_id: "", is_active: true },
    );
    setModal("expense");
  };

  // ─── Generic save / delete ─────────────────────────────────────────────────
  const save = async (base: string, payload: object, validate: () => string | null) => {
    const msg = validate();
    if (msg) return showToast(msg, "info");
    setSaving(true);
    try {
      if (editingId) await api.patch(`/account/${base}/edit/${editingId}`, payload);
      else await api.post(`/account/${base}/create`, payload);
      showToast(`${editingId ? "Updated" : "Created"} successfully!`, "success");
      setModal("");
      await loadAll();
    } catch (err) {
      showToast(errMessage(err, "Couldn't save."), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (base: string, id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete this ${label}?`)) return;
    try {
      await api.delete(`/account/${base}/delete/${id}`);
      showToast(`${label} deleted successfully!`, "success");
      await loadAll();
    } catch (err) {
      showToast(errMessage(err, "Couldn't delete."), "error");
    }
  };

  // ─── Reusable table shell ──────────────────────────────────────────────────
  const TableCard: React.FC<{
    title: string;
    onCreate: () => void;
    headers: string[];
    children: React.ReactNode;
    colSpan: number;
    rows: number;
  }> = ({ title, onCreate, headers, children, colSpan, rows }) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          onClick={onCreate}
          className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                </td>
              </tr>
            ) : rows === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const RowActions: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => (
    <div className="flex items-center gap-2">
      <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600">
        <Edit className="w-4 h-4" />
      </button>
      <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "categories", label: "Account Categories", icon: Layers },
    { key: "types", label: "Account Types", icon: FolderOpen },
    { key: "revenue", label: "Revenue Categories", icon: DollarSign },
    { key: "expense", label: "Expense Categories", icon: Tag },
  ];

  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-auto">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">
            Dashboard
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Accounting · System Setup</span>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">System Setup</h1>
            <p className="text-sm text-gray-500 mt-1">
              Account categories, types and revenue / expense categories
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 rounded-t-lg">
            <div className="flex gap-6 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === t.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <t.icon className="w-4 h-4 inline mr-2" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mt-6">
            {activeTab === "categories" && (
              <TableCard
                title="Account Categories"
                onCreate={() => openCategory()}
                headers={["Name", "Code", "Type", "Description", "Active", "Action"]}
                colSpan={6}
                rows={accountCategories.length}
              >
                {accountCategories.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.code}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{item.type || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{item.description || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge active={item.isActive} /></td>
                    <td className="px-4 py-3">
                      <RowActions
                        onEdit={() => openCategory(item)}
                        onDelete={() => remove("account-categories", item.id, "account category")}
                      />
                    </td>
                  </tr>
                ))}
              </TableCard>
            )}

            {activeTab === "types" && (
              <TableCard
                title="Account Types"
                onCreate={() => openType()}
                headers={["Name", "Code", "Normal Balance", "Category", "Active", "Action"]}
                colSpan={6}
                rows={accountTypes.length}
              >
                {accountTypes.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.code}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${item.normalBalance === "debit" ? "text-blue-600" : "text-green-600"}`}>
                        {item.normalBalance || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{categoryNameById(item.categoryId)}</td>
                    <td className="px-4 py-3"><StatusBadge active={item.isActive} /></td>
                    <td className="px-4 py-3">
                      <RowActions
                        onEdit={() => openType(item)}
                        onDelete={() => remove("account-types", item.id, "account type")}
                      />
                    </td>
                  </tr>
                ))}
              </TableCard>
            )}

            {activeTab === "revenue" && (
              <TableCard
                title="Revenue Categories"
                onCreate={() => openRevenue()}
                headers={["Name", "Code", "GL Account", "Description", "Active", "Action"]}
                colSpan={6}
                rows={revenueCategories.length}
              >
                {revenueCategories.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.code}</td>
                    <td className="px-4 py-3 text-gray-600">{coaLabel(item.glAccountId)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{item.description || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge active={item.isActive} /></td>
                    <td className="px-4 py-3">
                      <RowActions
                        onEdit={() => openRevenue(item)}
                        onDelete={() => remove("revenue-categories", item.id, "revenue category")}
                      />
                    </td>
                  </tr>
                ))}
              </TableCard>
            )}

            {activeTab === "expense" && (
              <TableCard
                title="Expense Categories"
                onCreate={() => openExpense()}
                headers={["Name", "Code", "GL Account", "Description", "Active", "Action"]}
                colSpan={6}
                rows={expenseCategories.length}
              >
                {expenseCategories.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.code}</td>
                    <td className="px-4 py-3 text-gray-600">{coaLabel(item.glAccountId)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{item.description || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge active={item.isActive} /></td>
                    <td className="px-4 py-3">
                      <RowActions
                        onEdit={() => openExpense(item)}
                        onDelete={() => remove("expense-categories", item.id, "expense category")}
                      />
                    </td>
                  </tr>
                ))}
              </TableCard>
            )}
          </div>
        </div>
      </div>

      {/* ── Account Category Modal ── */}
      {modal === "categories" && (
        <ModalShell
          title={`${editingId ? "Edit" : "Create"} Account Category`}
          onClose={() => setModal("")}
          onSave={() =>
            save(
              "account-categories",
              {
                name: categoryForm.name.trim(),
                code: categoryForm.code.trim(),
                type: categoryForm.type,
                description: categoryForm.description,
                is_active: categoryForm.is_active,
              },
              () =>
                !categoryForm.name.trim()
                  ? "Please enter a name"
                  : !categoryForm.code.trim()
                    ? "Please enter a code"
                    : null,
            )
          }
          saving={saving}
          editing={!!editingId}
        >
          <Field label="Name *">
            <input className={inputCls} value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
          </Field>
          <Field label="Code *">
            <input className={inputCls} value={categoryForm.code} onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })} />
          </Field>
          <Field label="Type">
            <select className={inputCls} value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}>
              {ACCOUNT_TYPE_KINDS.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
          </Field>
          <ActiveCheck checked={categoryForm.is_active} onChange={(v) => setCategoryForm({ ...categoryForm, is_active: v })} />
        </ModalShell>
      )}

      {/* ── Account Type Modal ── */}
      {modal === "types" && (
        <ModalShell
          title={`${editingId ? "Edit" : "Create"} Account Type`}
          onClose={() => setModal("")}
          onSave={() =>
            save(
              "account-types",
              {
                category_id: typeForm.category_id,
                name: typeForm.name.trim(),
                code: typeForm.code.trim(),
                normal_balance: typeForm.normal_balance,
                description: typeForm.description,
                is_active: typeForm.is_active,
              },
              () =>
                !typeForm.name.trim()
                  ? "Please enter a name"
                  : !typeForm.code.trim()
                    ? "Please enter a code"
                    : !typeForm.category_id
                      ? "Please select a category"
                      : null,
            )
          }
          saving={saving}
          editing={!!editingId}
        >
          <Field label="Category *">
            <select className={inputCls} value={typeForm.category_id} onChange={(e) => setTypeForm({ ...typeForm, category_id: e.target.value })}>
              <option value="">Select Category</option>
              {accountCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Name *">
            <input className={inputCls} value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
          </Field>
          <Field label="Code *">
            <input className={inputCls} value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} />
          </Field>
          <Field label="Normal Balance">
            <select className={inputCls} value={typeForm.normal_balance} onChange={(e) => setTypeForm({ ...typeForm, normal_balance: e.target.value })}>
              {NORMAL_BALANCES.map((b) => (
                <option key={b} value={b} className="capitalize">{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} />
          </Field>
          <ActiveCheck checked={typeForm.is_active} onChange={(v) => setTypeForm({ ...typeForm, is_active: v })} />
        </ModalShell>
      )}

      {/* ── Revenue Category Modal ── */}
      {modal === "revenue" && (
        <ModalShell
          title={`${editingId ? "Edit" : "Create"} Revenue Category`}
          onClose={() => setModal("")}
          onSave={() =>
            save(
              "revenue-categories",
              {
                category_name: revenueForm.category_name.trim(),
                category_code: revenueForm.category_code.trim(),
                description: revenueForm.description,
                gl_account_id: revenueForm.gl_account_id || undefined,
                is_active: revenueForm.is_active,
              },
              () =>
                !revenueForm.category_name.trim()
                  ? "Please enter a category name"
                  : !revenueForm.category_code.trim()
                    ? "Please enter a category code"
                    : null,
            )
          }
          saving={saving}
          editing={!!editingId}
        >
          <Field label="Category Name *">
            <input className={inputCls} value={revenueForm.category_name} onChange={(e) => setRevenueForm({ ...revenueForm, category_name: e.target.value })} />
          </Field>
          <Field label="Category Code *">
            <input className={inputCls} value={revenueForm.category_code} onChange={(e) => setRevenueForm({ ...revenueForm, category_code: e.target.value })} />
          </Field>
          <Field label="GL Account">
            <select className={inputCls} value={revenueForm.gl_account_id} onChange={(e) => setRevenueForm({ ...revenueForm, gl_account_id: e.target.value })}>
              <option value="">Select GL Account</option>
              {coa.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={revenueForm.description} onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })} />
          </Field>
          <ActiveCheck checked={revenueForm.is_active} onChange={(v) => setRevenueForm({ ...revenueForm, is_active: v })} />
        </ModalShell>
      )}

      {/* ── Expense Category Modal ── */}
      {modal === "expense" && (
        <ModalShell
          title={`${editingId ? "Edit" : "Create"} Expense Category`}
          onClose={() => setModal("")}
          onSave={() =>
            save(
              "expense-categories",
              {
                category_name: expenseForm.category_name.trim(),
                category_code: expenseForm.category_code.trim(),
                description: expenseForm.description,
                gl_account_id: expenseForm.gl_account_id || undefined,
                is_active: expenseForm.is_active,
              },
              () =>
                !expenseForm.category_name.trim()
                  ? "Please enter a category name"
                  : !expenseForm.category_code.trim()
                    ? "Please enter a category code"
                    : null,
            )
          }
          saving={saving}
          editing={!!editingId}
        >
          <Field label="Category Name *">
            <input className={inputCls} value={expenseForm.category_name} onChange={(e) => setExpenseForm({ ...expenseForm, category_name: e.target.value })} />
          </Field>
          <Field label="Category Code *">
            <input className={inputCls} value={expenseForm.category_code} onChange={(e) => setExpenseForm({ ...expenseForm, category_code: e.target.value })} />
          </Field>
          <Field label="GL Account">
            <select className={inputCls} value={expenseForm.gl_account_id} onChange={(e) => setExpenseForm({ ...expenseForm, gl_account_id: e.target.value })}>
              <option value="">Select GL Account</option>
              {coa.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
          </Field>
          <ActiveCheck checked={expenseForm.is_active} onChange={(v) => setExpenseForm({ ...expenseForm, is_active: v })} />
        </ModalShell>
      )}
    </div>
  );
};

// ─── Small shared UI bits ──────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white resize-y";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const ActiveCheck: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 text-blue-600 rounded border-gray-300"
    />
    <span className="text-sm text-gray-700">Is Active</span>
  </label>
);

const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  editing: boolean;
  children: React.ReactNode;
}> = ({ title, onClose, onSave, saving, editing, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="p-6 space-y-4">{children}</div>
      <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
        <button onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2 disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {editing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  </div>
);
