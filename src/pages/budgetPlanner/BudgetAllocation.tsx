/**
 * File: src/pages/budgetPlanner/BudgetAllocation.tsx
 * Manage Budget Allocations — matches references/budget planner/budgett
 * allowcations/* in the Qayd blue theme. Persists in meta row
 * `budget:allocations`; Remaining is computed (allocated − spent).
 */

import React, { useMemo, useState } from "react";
import { showToast } from "../../utils/toast";
import { money } from "@/lib/db";
import {
  budgetAllocationStore,
  budgetStore,
  budgetAccountStore,
  budgetUid,
  type BudgetAllocation as AllocationRec,
} from "@/lib/db/budget";
import { Field, inputCls } from "../hrm/hrmShared";
import { ListShell, DeleteConfirm, ModalShell } from "../goal/goalShared";
import { Edit, Trash2 } from "lucide-react";

const emptyDraft = () => ({ id: "", budget: "", account: "", allocated: 0, spent: 0 });

export const BudgetAllocations: React.FC = () => {
  const allocations = budgetAllocationStore.use();
  const budgets = budgetStore.use();
  const accounts = budgetAccountStore.use() || [];

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [budgetFilter, setBudgetFilter] = useState("All");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState<any>(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<AllocationRec | null>(null);

  const list = allocations || [];
  const budgetNames = useMemo(() => Array.from(new Set((budgets || []).map((b) => b.name))), [budgets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter(
      (a) =>
        (budgetFilter === "All" || a.budget === budgetFilter) &&
        (a.budget.toLowerCase().includes(q) || a.account.toLowerCase().includes(q)),
    );
  }, [list, search, budgetFilter]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const submit = async () => {
    if (!draft.budget || !draft.account || !(Number(draft.allocated) > 0)) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const rec: AllocationRec = {
      id: draft.id || budgetUid(),
      budget: draft.budget,
      account: draft.account,
      allocated: Number(draft.allocated),
      spent: Number(draft.spent) || 0,
    };
    if (modal === "edit") {
      await budgetAllocationStore.save(list.map((a) => (a.id === rec.id ? rec : a)));
      showToast("Budget allocation updated successfully", "success");
    } else {
      await budgetAllocationStore.save([...list, rec]);
      showToast("Budget allocation created successfully", "success");
    }
    setModal(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await budgetAllocationStore.save(list.filter((a) => a.id !== deleteTarget.id));
    showToast("Budget allocation deleted successfully", "success");
    setDeleteTarget(null);
  };

  return (
    <>
      <ListShell
        module="Budget Planner"
        current="Budget Allocations"
        title="Manage Budget Allocations"
        onCreate={() => {
          setDraft(emptyDraft());
          setModal("create");
        }}
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search Budget Allocations..."
        perPage={perPage}
        setPerPage={setPerPage}
        page={page}
        setPage={setPage}
        total={filtered.length}
        filterOptions={budgetNames}
        filterValue={budgetFilter}
        setFilterValue={setBudgetFilter}
        filterLabel="Budget"
      >
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
            <tr>
              {["Budget", "Account", "Allocated Amount", "Spent Amount", "Remaining Amount", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginated.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{a.budget}</td>
                <td className="px-4 py-3.5 text-gray-600">{a.account}</td>
                <td className="px-4 py-3.5 text-gray-900">{money(a.allocated)}</td>
                <td className="px-4 py-3.5 text-gray-600">{money(a.spent)}</td>
                <td className="px-4 py-3.5 text-gray-900 font-medium">{money(a.allocated - a.spent)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setDraft({ ...a });
                        setModal("edit");
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No budget allocations found.</td></tr>
            )}
          </tbody>
        </table>
      </ListShell>

      {modal && (
        <ModalShell title={modal === "edit" ? "Edit Budget Allocation" : "Create Budget Allocation"} onClose={() => setModal(null)} onSubmit={submit} submitLabel={modal === "edit" ? "Update" : "Create"}>
          <div className="space-y-4">
            <Field label="Budget" required>
              <select value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} className={`${inputCls} bg-white`}>
                <option value="">Select Budget</option>
                {budgetNames.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Account" required>
              <select value={draft.account} onChange={(e) => setDraft({ ...draft, account: e.target.value })} className={`${inputCls} bg-white`}>
                <option value="">Select Account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Allocated Amount" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={draft.allocated || ""} onChange={(e) => setDraft({ ...draft, allocated: Number(e.target.value) })} placeholder="0.00" className={`${inputCls} pl-7`} />
              </div>
            </Field>
            {modal === "edit" && (
              <Field label="Spent Amount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min={0} value={draft.spent || ""} onChange={(e) => setDraft({ ...draft, spent: Number(e.target.value) })} placeholder="0.00" className={`${inputCls} pl-7`} />
                </div>
              </Field>
            )}
          </div>
        </ModalShell>
      )}

      {deleteTarget && (
        <DeleteConfirm what="Budget Allocation" name={`${deleteTarget.budget} · ${deleteTarget.account}`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
};
