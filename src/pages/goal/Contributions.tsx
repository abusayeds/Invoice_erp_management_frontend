/**
 * File: src/pages/goal/Contributions.tsx
 * Manage Contributions — matches references/goal/contribute/*.png in the
 * Qayd blue theme. Persists in meta row `goal:contributions`; creating a
 * contribution also bumps the goal's current amount (cross-page liveQuery).
 */

import React, { useMemo, useState } from "react";
import { showToast } from "../../utils/toast";
import { money } from "@/lib/db";
import {
  goalContributionStore,
  goalStore,
  goalUid,
  type GoalContribution,
} from "@/lib/db/goal";
import { Field, inputCls, SearchSelect } from "../hrm/hrmShared";
import { ListShell, DeleteConfirm, ModalShell, chip, STATUS_CHIP } from "./goalShared";
import { ArrowUpDown, Edit, Trash2 } from "lucide-react";

const emptyDraft = () => ({
  id: "",
  goal: "",
  date: "",
  amount: 0,
  type: "Manual" as GoalContribution["type"],
  notes: "",
});

export const Contributions: React.FC = () => {
  const contributions = goalContributionStore.use();
  const goals = goalStore.use();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<GoalContribution | null>(null);

  const list = contributions || [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = list.filter(
      (c) => (typeFilter === "All" || c.type === typeFilter) && c.goal.toLowerCase().includes(q),
    );
    rows.sort((a, b) => (sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
    return rows;
  }, [list, search, typeFilter, sortAsc]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const submit = async () => {
    if (!draft.goal || !draft.date || !(Number(draft.amount) > 0)) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const amount = Number(draft.amount);
    if (modal === "edit") {
      await goalContributionStore.save(list.map((c) => (c.id === draft.id ? { ...c, ...draft, amount } : c)));
      showToast("Contribution updated successfully", "success");
    } else {
      await goalContributionStore.save([...list, { ...draft, amount, id: goalUid() }]);
      // bump the goal's current amount so Goals/Details reflect it live
      await goalStore.save(
        (goals || []).map((g) => (g.name === draft.goal ? { ...g, currentAmount: g.currentAmount + amount } : g)),
      );
      showToast("Contribution created successfully", "success");
    }
    setModal(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await goalContributionStore.save(list.filter((c) => c.id !== deleteTarget.id));
    showToast("Contribution deleted successfully", "success");
    setDeleteTarget(null);
  };

  const actions = (c: GoalContribution) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => {
          setDraft({ ...c });
          setModal("edit");
        }}
        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
        title="Edit"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <>
      <ListShell
        module="Goal"
        current="Contributions"
        title="Manage Contributions"
        onCreate={() => {
          setDraft(emptyDraft());
          setModal("create");
        }}
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search Contributions..."
        perPage={perPage}
        setPerPage={setPerPage}
        page={page}
        setPage={setPage}
        total={filtered.length}
        filterOptions={["Manual", "Automatic"]}
        filterValue={typeFilter}
        setFilterValue={setTypeFilter}
        filterLabel="Type"
        view={view}
        setView={setView}
      >
        {view === "list" ? (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Goal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 hover:text-gray-900">
                    Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                {["Amount", "Type", "Notes", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginated.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{c.goal}</td>
                  <td className="px-4 py-3.5 text-gray-600">{c.date}</td>
                  <td className="px-4 py-3.5 text-gray-900">{money(c.amount)}</td>
                  <td className="px-4 py-3.5">{chip(c.type, STATUS_CHIP[c.type])}</td>
                  <td className="px-4 py-3.5 text-gray-600">{c.notes}</td>
                  <td className="px-4 py-3.5">{actions(c)}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No contributions found.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{c.goal}</div>
                    <div className="text-xs text-gray-400">{c.date}</div>
                  </div>
                  {chip(c.type, STATUS_CHIP[c.type])}
                </div>
                <p className="text-xl font-bold text-blue-600 mb-1">{money(c.amount)}</p>
                <p className="text-sm text-gray-500 mb-2">{c.notes}</p>
                <div className="flex justify-end border-t border-gray-100 pt-2">{actions(c)}</div>
              </div>
            ))}
            {paginated.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">No contributions found.</div>}
          </div>
        )}
      </ListShell>

      {modal && (
        <ModalShell title={modal === "edit" ? "Edit Contribution" : "Create Contribution"} onClose={() => setModal(null)} onSubmit={submit} submitLabel={modal === "edit" ? "Update" : "Create"}>
          <div className="space-y-4">
            <Field label="Goal" required>
              <SearchSelect value={draft.goal} onChange={(v) => setDraft({ ...draft, goal: v })} options={(goals || []).map((g) => g.name)} placeholder="Select Goal" />
            </Field>
            <Field label="Date" required>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Amount" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={draft.amount || ""} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} placeholder="0" className={`${inputCls} pl-7`} />
              </div>
            </Field>
            <Field label="Notes">
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Enter notes..." rows={3} className={inputCls} />
            </Field>
          </div>
        </ModalShell>
      )}

      {deleteTarget && (
        <DeleteConfirm what="Contribution" name={`${deleteTarget.goal} · ${money(deleteTarget.amount)}`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
};
