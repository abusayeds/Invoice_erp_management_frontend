/**
 * File: src/pages/goal/Goals.tsx
 * Manage Goals — matches the ERPGO reference (references/goal/*.png) in the
 * Qayd blue theme: list + grid, Create/Edit Goal modal (chart-of-account
 * select), Goal Details modal (Goal Information + Financial Progress).
 * Data persists in meta row `goal:goals` (lib/db/goal.ts).
 */

import React, { useMemo, useState } from "react";
import { showToast } from "../../utils/toast";
import { money } from "@/lib/db";
import {
  goalStore,
  goalCategoryStore,
  GOAL_TYPES,
  GOAL_PRIORITIES,
  CHART_OF_ACCOUNTS,
  goalUid,
  type GoalRec,
} from "@/lib/db/goal";
import { Field, inputCls, SearchSelect } from "../hrm/hrmShared";
import { ListShell, DeleteConfirm, ModalShell, chip, PRIORITY_CHIP, STATUS_CHIP } from "./goalShared";
import { ArrowUpDown, Eye, Edit, Trash2, CheckCircle2, X } from "lucide-react";

const emptyDraft = () => ({
  id: "",
  name: "",
  category: "",
  type: "savings",
  targetAmount: 0,
  currentAmount: 0,
  startDate: "",
  targetDate: "",
  priority: "Medium" as GoalRec["priority"],
  status: "Active" as GoalRec["status"],
  chartOfAccount: "",
  description: "",
});

const pct = (g: GoalRec) =>
  g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;

export const Goals: React.FC = () => {
  const goals = goalStore.use();
  const categories = goalCategoryStore.use();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [viewGoal, setViewGoal] = useState<GoalRec | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalRec | null>(null);

  const list = goals || [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = list.filter(
      (g) => (statusFilter === "All" || g.status === statusFilter) && g.name.toLowerCase().includes(q),
    );
    rows.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return rows;
  }, [list, search, statusFilter, sortAsc]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const submit = async () => {
    if (!draft.name || !(Number(draft.targetAmount) > 0) || !draft.startDate || !draft.targetDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (modal === "edit") {
      await goalStore.save(list.map((g) => (g.id === draft.id ? { ...g, ...draft, targetAmount: Number(draft.targetAmount), currentAmount: Number(draft.currentAmount) } : g)));
      showToast("Goal updated successfully", "success");
    } else {
      await goalStore.save([{ ...draft, id: goalUid(), targetAmount: Number(draft.targetAmount), currentAmount: Number(draft.currentAmount) }, ...list]);
      showToast("Goal created successfully", "success");
    }
    setModal(null);
  };

  const activate = async (g: GoalRec) => {
    await goalStore.save(list.map((r) => (r.id === g.id ? { ...r, status: "Active" } : r)));
    showToast("Goal activated", "success");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await goalStore.save(list.filter((g) => g.id !== deleteTarget.id));
    showToast("Goal deleted successfully", "success");
    setDeleteTarget(null);
  };

  const actions = (g: GoalRec) => (
    <div className="flex items-center gap-1.5">
      {g.status === "Draft" ? (
        <button onClick={() => activate(g)} className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50" title="Activate">
          <CheckCircle2 className="w-4 h-4" />
        </button>
      ) : (
        <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */
      )}
      <button onClick={() => setViewGoal(g)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="View">
        <Eye className="w-4 h-4" />
      </button>
      {g.status === "Draft" ? (
        <button
          onClick={() => {
            setDraft({ ...g });
            setModal("edit");
          }}
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </button>
      ) : (
        <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */
      )}
      <button onClick={() => setDeleteTarget(g)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const progressBar = (g: GoalRec) => (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct(g)}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8">{pct(g)}%</span>
    </div>
  );

  return (
    <>
      <ListShell
        module="Goal"
        current="Goals"
        title="Manage Goals"
        onCreate={() => {
          setDraft(emptyDraft());
          setModal("create");
        }}
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search Goals..."
        perPage={perPage}
        setPerPage={setPerPage}
        page={page}
        setPage={setPage}
        total={filtered.length}
        filterOptions={["Active", "Draft", "Completed"]}
        filterValue={statusFilter}
        setFilterValue={setStatusFilter}
        view={view}
        setView={setView}
      >
        {view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 hover:text-gray-900">
                      Goal Name <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  {["Category", "Type", "Target Amount", "Current Amount", "Progress", "Target Date", "Priority", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginated.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewGoal(g)}>
                    <td className="px-4 py-3.5 font-medium text-gray-900">{g.name}</td>
                    <td className="px-4 py-3.5 text-gray-600">{g.category}</td>
                    <td className="px-4 py-3.5 text-gray-600">{g.type}</td>
                    <td className="px-4 py-3.5 text-gray-900">{money(g.targetAmount)}</td>
                    <td className="px-4 py-3.5 text-gray-600">{money(g.currentAmount)}</td>
                    <td className="px-4 py-3.5">{progressBar(g)}</td>
                    <td className="px-4 py-3.5 text-gray-600">{g.targetDate}</td>
                    <td className="px-4 py-3.5">{chip(g.priority, PRIORITY_CHIP[g.priority])}</td>
                    <td className="px-4 py-3.5">{chip(g.status, STATUS_CHIP[g.status])}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>{actions(g)}</td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-500">No goals found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((g) => (
              <div key={g.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{g.name}</div>
                    <div className="text-xs text-gray-400">{g.category} · {g.type}</div>
                  </div>
                  {chip(g.status, STATUS_CHIP[g.status])}
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Target</span>
                  <span className="font-medium text-gray-900">{money(g.targetAmount)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Current</span>
                  <span className="text-gray-700">{money(g.currentAmount)}</span>
                </div>
                {progressBar(g)}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  {chip(g.priority, PRIORITY_CHIP[g.priority])}
                  {actions(g)}
                </div>
              </div>
            ))}
            {paginated.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">No goals found.</div>}
          </div>
        )}
      </ListShell>

      {/* create / edit modal */}
      {modal && (
        <ModalShell title={modal === "edit" ? "Edit Goal" : "Create Goal"} onClose={() => setModal(null)} onSubmit={submit} submitLabel={modal === "edit" ? "Update" : "Create"} wide>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <Field label="Goal Name" required>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Enter Goal Name" className={inputCls} />
            </Field>
            <Field label="Category">
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={`${inputCls} bg-white`}>
                <option value="">Select Category</option>
                {(categories || []).filter((c) => c.active).map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Goal Type">
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={`${inputCls} bg-white capitalize`}>
                {GOAL_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as GoalRec["priority"] })} className={`${inputCls} bg-white`}>
                {GOAL_PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Target Amount" required className="md:col-span-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={draft.targetAmount || ""} onChange={(e) => setDraft({ ...draft, targetAmount: Number(e.target.value) })} placeholder="0" className={`${inputCls} pl-7`} />
              </div>
            </Field>
            <Field label="Start Date" required>
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Target Date" required>
              <input type="date" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} className={inputCls} />
            </Field>
            {modal === "edit" && (
              <Field label="Status">
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as GoalRec["status"] })} className={`${inputCls} bg-white`}>
                  {["Active", "Draft", "Completed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Chart of Account" className={modal === "edit" ? "" : "md:col-span-2"}>
              <SearchSelect value={draft.chartOfAccount} onChange={(v) => setDraft({ ...draft, chartOfAccount: v })} options={CHART_OF_ACCOUNTS} placeholder="None" />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Enter Description" rows={3} className={inputCls} />
            </Field>
          </div>
        </ModalShell>
      )}

      {/* details modal */}
      {viewGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Goal Details - {viewGoal.name}</h3>
              <button onClick={() => setViewGoal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="border border-gray-200 rounded-xl px-5 py-4">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Goal Information</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  {(
                    [
                      ["Goal Name", viewGoal.name],
                      ["Category", viewGoal.category || "—"],
                      ["Goal Type", viewGoal.type],
                      ["Priority", null],
                      ["Status", null],
                      ["Chart of Account", viewGoal.chartOfAccount ? viewGoal.chartOfAccount.replace(/^\d+ - /, "") : "None"],
                      ["Start Date", viewGoal.startDate],
                      ["Target Date", viewGoal.targetDate],
                    ] as [string, string | null][]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-gray-500 mb-1">{k}</p>
                      {k === "Priority" ? chip(viewGoal.priority, PRIORITY_CHIP[viewGoal.priority])
                        : k === "Status" ? chip(viewGoal.status, STATUS_CHIP[viewGoal.status])
                        : <p className="font-semibold text-gray-900">{v}</p>}
                    </div>
                  ))}
                </div>
                {viewGoal.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-1.5">Description</p>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700">{viewGoal.description}</div>
                  </div>
                )}
              </div>
              <div className="border border-gray-200 rounded-xl px-5 py-4">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Financial Progress</h4>
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Target Amount</p>
                    <p className="text-2xl font-bold text-blue-600">{money(viewGoal.targetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Amount</p>
                    <p className="text-2xl font-bold text-green-600">{money(viewGoal.currentAmount)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-700">Progress</span>
                  <span className="text-gray-500">{((viewGoal.currentAmount / (viewGoal.targetAmount || 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct(viewGoal)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirm what="Goal" name={deleteTarget.name} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
};
