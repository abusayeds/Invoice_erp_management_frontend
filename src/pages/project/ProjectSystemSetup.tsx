/**
 * File: src/pages/project/ProjectSystemSetup.tsx
 * Project System Setup (ERPGo reference): Task Stage / Bug Stage editors.
 * Each is a reorderable (drag) list of coloured stages with create/edit/delete,
 * persisted in Dexie meta via projectStore's stage helpers.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Bug as BugIcon, Plus, Pencil, Trash2, GripVertical, X } from "lucide-react";
import { showToast } from "../../utils/toast";
import {
  useStages, saveStages, newStageId, type Stage, type StageKind,
} from "@/lib/db/projectStore";

const STAGE_COLORS = ["#3B82F6", "#60A5FA", "#7C3AED", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#374151", "#EC4899", "#14B8A6"];

/* ── Create / Edit stage modal ───────────────────────────────────── */
const StageModal: React.FC<{
  kind: StageKind; initial?: Stage | null; onClose: () => void; onSave: (s: Stage) => void;
}> = ({ kind, initial, onClose, onSave }) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#EF4444");
  const kindLabel = kind === "task" ? "Task Stage" : "Bug Stage";
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  const submit = () => {
    if (!name.trim()) return showToast("Please enter a name", "info");
    onSave({ id: initial?.id ?? newStageId(), name: name.trim(), color, isDone: initial?.isDone });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{initial ? `Edit ${kindLabel}` : `Create ${kindLabel}`}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${kind} stage name`} autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {STAGE_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-md border-2 ${color === c ? "border-blue-500 ring-2 ring-blue-500/30" : "border-transparent"}`} style={{ backgroundColor: c }} aria-label={c} />
              ))}
              <label className="w-8 h-8 rounded-md border border-gray-300 overflow-hidden cursor-pointer" title="Custom color">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 -m-1 cursor-pointer" />
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">{initial ? "Save" : "Create"}</button>
        </div>
      </div>
    </div>
  );
};

/* ── Stage list (per kind) ───────────────────────────────────────── */
const StageList: React.FC<{ kind: StageKind }> = ({ kind }) => {
  const stages = useStages(kind);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const title = kind === "task" ? "Task Stage" : "Bug Stage";
  const list = stages ?? [];

  const upsert = (s: Stage) => {
    const exists = list.some((x) => x.id === s.id);
    saveStages(kind, exists ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s]);
    showToast(exists ? "Stage updated" : "Stage created", "success");
  };
  const remove = (id: string) => {
    if (confirm("Delete this stage?")) saveStages(kind, list.filter((x) => x.id !== id));
  };
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveStages(kind, next);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <button onClick={() => { setEditStage(null); setModalOpen(true); }} className="w-9 h-9 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-5 h-5" /></button>
      </div>
      <div className="p-4 space-y-3">
        {list.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); }}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg border ${s.isDone ? "border-emerald-500/40" : "border-gray-200"} hover:bg-gray-50`}
          >
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0" />
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold flex-shrink-0">{i + 1}</span>
            <span className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: s.color }} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">{s.name}</div>
              {s.isDone && <div className="text-xs text-emerald-400">Done Stage</div>}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => { setEditStage(s); setModalOpen(true); }} className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(s.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="text-center text-sm text-gray-400 py-8">No stages yet.</div>}
      </div>
      {modalOpen && <StageModal kind={kind} initial={editStage} onClose={() => setModalOpen(false)} onSave={upsert} />}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
export const ProjectSystemSetup: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<StageKind>("task");

  const Tab: React.FC<{ id: StageKind; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
    <button onClick={() => setTab(id)} className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-left ${tab === id ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-gray-600 hover:bg-gray-50 border border-transparent"}`}>{icon}{label}</button>
  );

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button><span>›</span>
          <button onClick={() => navigate("/project/projects")} className="hover:text-gray-700">Project</button><span>›</span>
          <span className="text-gray-900 font-medium">System Setup</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">System Setup</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-2 h-fit">
            <Tab id="task" label="Task Stage" icon={<Tag className="w-4 h-4" />} />
            <Tab id="bug" label="Bug Stage" icon={<BugIcon className="w-4 h-4" />} />
          </div>
          <StageList key={tab} kind={tab} />
        </div>
      </div>
    </div>
  );
};

export default ProjectSystemSetup;
