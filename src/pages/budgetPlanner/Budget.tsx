/**
 * File: src/pages/budgetPlanner/Budget.tsx
 * Manage Budget — matches references/budget planner/budget/* in the Qayd
 * blue theme. Persists in meta row `budget:budgets`. A budget's Amount shows
 * its stored amount, or the live sum of its allocations when unset.
 */

import React, { useMemo, useState } from "react";
import { showToast } from "../../utils/toast";
import { money } from "@/lib/db";
import {
  budgetStore,
  budgetPeriodStore,
  budgetAllocationStore,
  budgetUid,
  type BudgetRec,
} from "@/lib/db/budget";
import { Field, inputCls } from "../hrm/hrmShared";
import { ListShell, DeleteConfirm, ModalShell, chip } from "../goal/goalShared";
import { ArrowUpDown, Edit, Trash2, CheckCircle2 } from "lucide-react";

const STATUS_CHIP: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Active: "bg-blue-100 text-blue-700",
  Closed: "bg-red-100 text-red-600",
};
const TYPE_CHIP: Record<string, string> = {
  Capital: "bg-orange-100 text-orange-600",
  Operational: "bg-purple-100 text-purple-700",
};

const emptyDraft = () => ({ id: "", name: "", period: "", type: "" as any });

export const Budget: React.FC = () => {
  const budgets = budgetStore.use();
  const periods = budgetPeriodStore.use();
  const allocations = budgetAllocationStore.use();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState<any>(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<BudgetRec | null>(null);

  const list = budgets || [];
  const amountOf = (b: BudgetRec) =>
    b.amount > 0
      ? b.amount
      : (allocations || []).filter((a) => a.budget === b.name).reduce((s, a) => s + a.allocated, 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = list.filter(
      (b) => (statusFilter === "All" || b.status === statusFilter) && b.name.toLowerCase().includes(q),
    );
    rows.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return rows;
  }, [list, search, statusFilter, sortAsc]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const submit = async () => {
    if (!draft.name || !draft.period || !draft.type) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (modal === "edit") {
      await budgetStore.save(list.map((b) => (b.id === draft.id ? { ...b, name: draft.name, period: draft.period, type: draft.type } : b)));
      showToast("Budget updated successfully", "success");
    } else {
      await budgetStore.save([{ id: budgetUid(), name: draft.name, period: draft.period, type: draft.type, amount: 0, status: "Draft", approvedBy: "" }, ...list]);
      showToast("Budget created successfully", "success");
    }
    setModal(null);
  };

  const approve = async (b: BudgetRec) => {
    await budgetStore.save(list.map((r) => (r.id === b.id ? { ...r, status: "Active", approvedBy: "Company" } : r)));
    showToast("Budget approved", "success");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await budgetStore.save(list.filter((b) => b.id !== deleteTarget.id));
    showToast("Budget deleted successfully", "success");
    setDeleteTarget(null);
  };

  return (
    <>
      <ListShell
        module="Budget Planner"
        current="Budget"
        title="Manage Budget"
        onCreate={() => {
          setDraft(emptyDraft());
          setModal("create");
        }}
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search Budgets..."
        perPage={perPage}
        setPerPage={setPerPage}
        page={page}
        setPage={setPage}
        total={filtered.length}
        filterOptions={["Draft", "Active", "Closed"]}
        filterValue={statusFilter}
        setFilterValue={setStatusFilter}
      >
        <table className="w-full text-sm min-w-[950px]">
          <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 hover:text-gray-900">
                  Budget Name <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              {["Period", "Type", "Amount", "Status", "Approved By", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginated.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{b.name}</td>
                <td className="px-4 py-3.5 text-gray-600">{b.period}</td>
                <td className="px-4 py-3.5">{chip(b.type, TYPE_CHIP[b.type])}</td>
                <td className="px-4 py-3.5 text-gray-900">{money(amountOf(b))}</td>
                <td className="px-4 py-3.5">{chip(b.status, STATUS_CHIP[b.status])}</td>
                <td className="px-4 py-3.5 text-gray-600">{b.approvedBy || "-"}</td>
                <td className="px-4 py-3.5">
                  {b.status === "Draft" && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => approve(b)} className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50" title="Approve">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDraft({ id: b.id, name: b.name, period: b.period, type: b.type });
                          setModal("edit");
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No budgets found.</td></tr>
            )}
          </tbody>
        </table>
      </ListShell>

      {modal && (
        <ModalShell title={modal === "edit" ? "Edit Budget" : "Create Budget"} onClose={() => setModal(null)} onSubmit={submit} submitLabel={modal === "edit" ? "Update" : "Create"}>
          <div className="space-y-4">
            <Field label="Budget Name" required>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Enter Budget Name" className={inputCls} />
            </Field>
            <Field label="Budget Period" required>
              <select value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} className={`${inputCls} bg-white`}>
                <option value="">Select Budget Period</option>
                {(periods || []).map((p) => (
                  <option key={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Budget Type" required>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={`${inputCls} bg-white`}>
                <option value="">Select Budget Type</option>
                <option>Capital</option>
                <option>Operational</option>
              </select>
            </Field>
          </div>
        </ModalShell>
      )}

      {deleteTarget && (
        <DeleteConfirm what="Budget" name={deleteTarget.name} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
};
