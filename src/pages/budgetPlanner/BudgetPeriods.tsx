/**
 * File: src/pages/budgetPlanner/BudgetPeriods.tsx
 * Manage Budget Periods — matches references/budget planner/budget periods/*
 * in the Qayd blue theme. Persists in meta row `budget:periods`. Closing a
 * period also closes its budgets (reference toast: "Budget period and all
 * associated budgets closed successfully.").
 */

import React, { useMemo, useState } from "react";
import { showToast } from "../../utils/toast";
import {
  budgetPeriodStore,
  budgetStore,
  budgetUid,
  type BudgetPeriod,
} from "@/lib/db/budget";
import { Field, inputCls } from "../hrm/hrmShared";
import { ListShell, DeleteConfirm, ModalShell, chip } from "../goal/goalShared";
import { ArrowUpDown, Edit, Trash2, CheckCircle2, X } from "lucide-react";

const STATUS_CHIP: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Active: "bg-blue-100 text-blue-700",
  Closed: "bg-red-100 text-red-600",
};

const emptyDraft = () => ({ id: "", name: "", financialYear: "", startDate: "", endDate: "" });

export const BudgetPeriods: React.FC = () => {
  const periods = budgetPeriodStore.use();
  const budgets = budgetStore.use();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState<"name" | "financialYear">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<BudgetPeriod | null>(null);

  const list = periods || [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = list.filter(
      (p) => (statusFilter === "All" || p.status === statusFilter) && p.name.toLowerCase().includes(q),
    );
    rows.sort((a, b) => (sortAsc ? a[sortField].localeCompare(b[sortField]) : b[sortField].localeCompare(a[sortField])));
    return rows;
  }, [list, search, statusFilter, sortField, sortAsc]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (f: "name" | "financialYear") => {
    if (sortField === f) setSortAsc(!sortAsc);
    else {
      setSortField(f);
      setSortAsc(true);
    }
  };

  const submit = async () => {
    if (!draft.name || !draft.financialYear || !draft.startDate || !draft.endDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (modal === "edit") {
      await budgetPeriodStore.save(list.map((p) => (p.id === draft.id ? { ...p, ...draft } : p)));
      showToast("Budget period updated successfully", "success");
    } else {
      await budgetPeriodStore.save([{ ...draft, id: budgetUid(), status: "Draft", approvedBy: "" }, ...list]);
      showToast("Budget period created successfully", "success");
    }
    setModal(null);
  };

  const approve = async (p: BudgetPeriod) => {
    await budgetPeriodStore.save(list.map((r) => (r.id === p.id ? { ...r, status: "Active", approvedBy: "Company" } : r)));
    showToast("Budget period approved", "success");
  };

  const closePeriod = async (p: BudgetPeriod) => {
    await budgetPeriodStore.save(list.map((r) => (r.id === p.id ? { ...r, status: "Closed" } : r)));
    await budgetStore.save((budgets || []).map((b) => (b.period === p.name ? { ...b, status: "Closed" } : b)));
    showToast("Budget period and all associated budgets closed successfully.", "success");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await budgetPeriodStore.save(list.filter((p) => p.id !== deleteTarget.id));
    showToast("Budget period deleted successfully", "success");
    setDeleteTarget(null);
  };

  return (
    <>
      <ListShell
        module="Budget Planner"
        current="Budget Periods"
        title="Manage Budget Periods"
        onCreate={() => {
          setDraft(emptyDraft());
          setModal("create");
        }}
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search Budget Periods..."
        perPage={perPage}
        setPerPage={setPerPage}
        page={page}
        setPage={setPage}
        total={filtered.length}
        filterOptions={["Draft", "Active", "Closed"]}
        filterValue={statusFilter}
        setFilterValue={setStatusFilter}
      >
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-gray-900">
                  Period Name <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                <button onClick={() => toggleSort("financialYear")} className="flex items-center gap-1 hover:text-gray-900">
                  Financial Year <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              {["Start Date", "End Date", "Status", "Approved By", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginated.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3.5 text-gray-600">{p.financialYear}</td>
                <td className="px-4 py-3.5 text-gray-600">{p.startDate}</td>
                <td className="px-4 py-3.5 text-gray-600">{p.endDate}</td>
                <td className="px-4 py-3.5">{chip(p.status, STATUS_CHIP[p.status])}</td>
                <td className="px-4 py-3.5 text-gray-600">{p.approvedBy || "-"}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {p.status === "Draft" && (
                      <>
                        <button onClick={() => approve(p)} className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50" title="Approve">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDraft({ id: p.id, name: p.name, financialYear: p.financialYear, startDate: p.startDate, endDate: p.endDate });
                            setModal("edit");
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {p.status === "Active" && (
                      <button onClick={() => closePeriod(p)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Close period">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No budget periods found.</td></tr>
            )}
          </tbody>
        </table>
      </ListShell>

      {modal && (
        <ModalShell title={modal === "edit" ? "Edit Budget Period" : "Create Budget Period"} onClose={() => setModal(null)} onSubmit={submit} submitLabel={modal === "edit" ? "Update" : "Create"}>
          <div className="space-y-4">
            <Field label="Period Name" required>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Enter Period Name" className={inputCls} />
            </Field>
            <Field label="Financial Year" required>
              <input value={draft.financialYear} onChange={(e) => setDraft({ ...draft, financialYear: e.target.value })} placeholder="Enter Financial Year" className={inputCls} />
            </Field>
            <Field label="Start Date" required>
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="End Date" required>
              <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </ModalShell>
      )}

      {deleteTarget && (
        <DeleteConfirm what="Budget Period" name={deleteTarget.name} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
};
