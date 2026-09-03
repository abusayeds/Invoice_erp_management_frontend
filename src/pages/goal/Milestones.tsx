/**
 * File: src/pages/goal/Milestones.tsx
 * Manage Milestones — matches references/goal/milestones/*.png in the Qayd
 * blue theme. Persists in meta row `goal:milestones`.
 */

import React, { useMemo, useState } from "react";
import { showToast } from "../../utils/toast";
import { money } from "@/lib/db";
import {
  goalMilestoneStore,
  goalStore,
  goalUid,
  type GoalMilestone,
} from "@/lib/db/goal";
import { Field, inputCls, SearchSelect } from "../hrm/hrmShared";
import { ListShell, DeleteConfirm, ModalShell, chip, STATUS_CHIP } from "./goalShared";
import { ArrowUpDown, Edit, Trash2 } from "lucide-react";

const emptyDraft = () => ({
  id: "",
  goal: "",
  name: "",
  targetAmount: 0,
  achievedAmount: 0,
  achievedDate: "",
  targetDate: "",
  status: "Pending" as GoalMilestone["status"],
  description: "",
});

export const Milestones: React.FC = () => {
  const milestones = goalMilestoneStore.use();
  const goals = goalStore.use();

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortAsc, setSortAsc] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<GoalMilestone | null>(null);

  const list = milestones || [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = list.filter(
      (m) =>
        (statusFilter === "All" || m.status === statusFilter) &&
        (m.name.toLowerCase().includes(q) || m.goal.toLowerCase().includes(q)),
    );
    rows.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return rows;
  }, [list, search, statusFilter, sortAsc]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const submit = async () => {
    if (!draft.goal || !draft.name || !(Number(draft.targetAmount) > 0) || !draft.targetDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const rec: GoalMilestone = {
      ...draft,
      targetAmount: Number(draft.targetAmount),
      achievedAmount: Number(draft.achievedAmount),
      status: Number(draft.achievedAmount) >= Number(draft.targetAmount) ? "Achieved" : draft.status,
    };
    if (modal === "edit") {
      await goalMilestoneStore.save(list.map((m) => (m.id === rec.id ? { ...m, ...rec } : m)));
      showToast("Milestone updated successfully", "success");
    } else {
      await goalMilestoneStore.save([...list, { ...rec, id: goalUid() }]);
      showToast("Milestone created successfully", "success");
    }
    setModal(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await goalMilestoneStore.save(list.filter((m) => m.id !== deleteTarget.id));
    showToast("Milestone deleted successfully", "success");
    setDeleteTarget(null);
  };

  return (
    <>
      <ListShell
        module="Goal"
        current="Milestones"
        title="Manage Milestones"
        onCreate={() => {
          setDraft(emptyDraft());
          setModal("create");
        }}
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search Milestones..."
        perPage={perPage}
        setPerPage={setPerPage}
        page={page}
        setPage={setPage}
        total={filtered.length}
        filterOptions={["Achieved", "Pending"]}
        filterValue={statusFilter}
        setFilterValue={setStatusFilter}
      >
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Goal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 hover:text-gray-900">
                  Milestone Name <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              {["Target Amount", "Achieved Amount", "Achieved Date", "Target Date", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginated.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{m.goal}</td>
                <td className="px-4 py-3.5 text-gray-700">{m.name}</td>
                <td className="px-4 py-3.5 text-gray-900">{money(m.targetAmount)}</td>
                <td className="px-4 py-3.5 text-gray-600">{money(m.achievedAmount)}</td>
                <td className="px-4 py-3.5 text-gray-600">{m.achievedDate || "-"}</td>
                <td className="px-4 py-3.5 text-gray-600">{m.targetDate}</td>
                <td className="px-4 py-3.5">{chip(m.status, STATUS_CHIP[m.status])}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setDraft({ ...m, description: m.description || "" });
                        setModal("edit");
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No milestones found.</td></tr>
            )}
          </tbody>
        </table>
      </ListShell>

      {modal && (
        <ModalShell title={modal === "edit" ? "Edit Milestone" : "Create Milestone"} onClose={() => setModal(null)} onSubmit={submit} submitLabel={modal === "edit" ? "Update" : "Create"}>
          <div className="space-y-4">
            <Field label="Goal" required>
              <SearchSelect value={draft.goal} onChange={(v) => setDraft({ ...draft, goal: v })} options={(goals || []).map((g) => g.name)} placeholder="Select Goal" />
            </Field>
            <Field label="Milestone Name" required>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Enter Milestone Name" className={inputCls} />
            </Field>
            <Field label="Target Amount" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={draft.targetAmount || ""} onChange={(e) => setDraft({ ...draft, targetAmount: Number(e.target.value) })} placeholder="0" className={`${inputCls} pl-7`} />
              </div>
            </Field>
            {modal === "edit" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Achieved Amount">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min={0} value={draft.achievedAmount || ""} onChange={(e) => setDraft({ ...draft, achievedAmount: Number(e.target.value) })} placeholder="0" className={`${inputCls} pl-7`} />
                  </div>
                </Field>
                <Field label="Achieved Date">
                  <input type="date" value={draft.achievedDate} onChange={(e) => setDraft({ ...draft, achievedDate: e.target.value })} className={inputCls} />
                </Field>
              </div>
            )}
            <Field label="Target Date" required>
              <input type="date" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Enter Description" rows={3} className={inputCls} />
            </Field>
          </div>
        </ModalShell>
      )}

      {deleteTarget && (
        <DeleteConfirm what="Milestone" name={deleteTarget.name} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
};
