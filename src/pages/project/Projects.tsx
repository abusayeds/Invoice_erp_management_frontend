/**
 * File: src/pages/project/Projects.tsx
 * ERPGo-style Project module (redesigned per /Volumes/external_disk/projects
 * sections references) in the Qayd dark/blue theme, persisted in Dexie.
 *   Projects              -> list table (search, filters, actions, pagination)
 *   ProjectDetail (:id)   -> details, overview stats, team, clients, progress,
 *                            milestones, activity
 *   ProjectBugs (:id/bugs)-> drag-and-drop bug kanban (5 columns)
 * Modals: Create/Edit Project, Duplicate Project, Create Milestone,
 *         Team Member, Share To Client, Create Bug.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Search, Plus, Copy, Eye, Edit, Trash2, Filter, ChevronLeft, ChevronRight,
  ChevronDown, ArrowUpDown, X, Calendar, Users, Bug as BugIcon, ListChecks,
  Clock, DollarSign, Flag, Activity, CheckCircle2, Check,
} from "lucide-react";
import { useCollection, repo } from "@/lib/db";
import {
  normalizeProject, TEAM_POOL, BUG_STATUSES, newBugId,
  newMilestoneId, type ProjectRecord, type ProjectStatus, type Milestone,
  type Bug, type BugStatus, type BugPriority,
} from "@/lib/db/projectStore";
import { showToast } from "../../utils/toast";

/* ── helpers ─────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const AVA_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500"];
const avaColor = (name: string) => AVA_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVA_COLORS.length];

const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 28 }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full text-white font-medium ring-2 ring-[var(--surface,#1a212a)] ${avaColor(name)}`}
    style={{ width: size, height: size, fontSize: size * 0.4 }}
    title={name}
  >
    {initials(name)}
  </span>
);
const AvatarStack: React.FC<{ names: string[]; max?: number }> = ({ names, max = 3 }) => (
  <div className="flex items-center -space-x-2">
    {names.slice(0, max).map((n, i) => <Avatar key={i} name={n} />)}
    {names.length > max && (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs font-medium ring-2 ring-[var(--surface,#1a212a)]">
        +{names.length - max}
      </span>
    )}
    {names.length === 0 && <span className="text-xs text-gray-400">—</span>}
  </div>
);

const PROJECT_STATUS: ProjectStatus[] = ["Planning", "Ongoing", "Onhold", "Completed"];
const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Ongoing: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Onhold: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Planning: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return map[s] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
};
const priorityBadge = (p: string) => {
  const map: Record<string, string> = {
    High: "bg-red-500/15 text-red-400",
    Medium: "bg-amber-500/15 text-amber-400",
    Low: "bg-emerald-500/15 text-emerald-400",
  };
  return map[p] || "bg-gray-500/15 text-gray-400";
};
const BUG_COLUMN_TINT: Record<BugStatus, string> = {
  Unconfirmed: "text-blue-400",
  Confirmed: "text-purple-400",
  "In Progress": "text-cyan-400",
  Resolved: "text-emerald-400",
  Verified: "text-gray-400",
};
const BUG_COLUMN_BG: Record<BugStatus, string> = {
  Unconfirmed: "bg-blue-500/[0.06] border-blue-500/20",
  Confirmed: "bg-purple-500/[0.06] border-purple-500/20",
  "In Progress": "bg-cyan-500/[0.06] border-cyan-500/20",
  Resolved: "bg-emerald-500/[0.06] border-emerald-500/20",
  Verified: "bg-gray-500/[0.06] border-gray-500/20",
};

/* ── shared field styles ─────────────────────────────────────────── */
const field =
  "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600";
const label = "block text-sm font-medium text-gray-700 mb-1";

/* ── Modal shell ─────────────────────────────────────────────────── */
const Modal: React.FC<{
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}> = ({ title, onClose, children, footer, wide }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40" onMouseDown={onClose}>
      <div
        className={`bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] ${wide ? "max-w-2xl h-[560px]" : "max-w-md h-[440px]"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-300 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
};

const ModalFooter: React.FC<{ onClose: () => void; onSave: () => void; saveLabel: string }> = ({ onClose, onSave, saveLabel }) => (
  <>
    <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">Cancel</button>
    <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">{saveLabel}</button>
  </>
);

/* ── MultiSelect (users / clients / assignees) ───────────────────── */
const MultiSelect: React.FC<{
  options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder: string;
}> = ({ options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${field} flex items-center justify-between text-left`}>
        <span className={value.length ? "text-gray-900" : "text-gray-400"}>
          {value.length ? `${value.length} selected` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
              {v}
              <button type="button" onClick={() => toggle(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      {open && (
        // inline (in-flow) picker: the modal body scrolls to fit it, so the
        // modal itself never changes size and the pinned footer stays put
        <div className="mt-2 border border-gray-200 rounded-md overflow-hidden bg-white">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600" />
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto custom-scrollbar">
            {filtered.map((o) => (
              <button key={o} type="button" onClick={() => toggle(o)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                {o}
                {value.includes(o) && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-3 text-sm text-gray-400">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MODALS
   ══════════════════════════════════════════════════════════════════ */

const CreateProjectModal: React.FC<{
  initial?: ProjectRecord | null; onClose: () => void; onSaved: (id: number) => void;
}> = ({ initial, onClose, onSaved }) => {
  const clientPool = useCollection<any>("customers", "name").map((c) => c.name);
  const [name, setName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [budget, setBudget] = useState(String(initial?.budget ?? ""));
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? "Planning");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [members, setMembers] = useState<string[]>(initial?.members ?? []);
  const [clients, setClients] = useState<string[]>(initial?.clients ?? []);

  const save = async () => {
    if (!name.trim()) return showToast("Please enter a project name", "info");
    if (!startDate) return showToast("Please select a start date", "info");
    if (!endDate) return showToast("Please select an end date", "info");
    const patch = {
      name: name.trim(), startDate, endDate, budget: Number(budget) || 0, status, description,
      members, clients,
    };
    if (initial?.id) {
      await repo.update("projects", initial.id, patch);
      onSaved(initial.id);
      showToast("Project updated", "success");
    } else {
      const id = await repo.add("projects", {
        ...patch, milestones: [], bugs: [], totalTasks: 0,
        activities: [{ id: newBugId(), text: `Project "${patch.name}" created`, ts: Date.now() }],
      });
      onSaved(id);
      showToast("Project created", "success");
    }
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Project" : "Create Project"} onClose={onClose} wide footer={<ModalFooter onClose={onClose} onSave={save} saveLabel={initial ? "Save" : "Create"} />}>
      <div className="space-y-4">
        <div>
          <label className={label}>Project Name <span className="text-red-500">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter project name" className={field} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Start Date <span className="text-red-500">*</span></label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>End Date <span className="text-red-500">*</span></label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Budget</label>
            <div className="flex items-center border border-gray-300 rounded-md bg-white px-3 focus-within:ring-2 focus-within:ring-blue-600">
              <span className="text-sm text-gray-500">$</span>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="0.00" className="flex-1 py-2 pl-2 text-sm bg-transparent text-gray-900 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className={label}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={field}>
              {PROJECT_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>Team Members</label>
          <MultiSelect options={TEAM_POOL} value={members} onChange={setMembers} placeholder="Select team members" />
        </div>
        <div>
          <label className={label}>Clients</label>
          <MultiSelect options={clientPool} value={clients} onChange={setClients} placeholder="Select clients" />
        </div>
        <div>
          <label className={label}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Enter project description" className={`${field} resize-y`} />
        </div>
      </div>
    </Modal>
  );
};

const DUP_OPTIONS = ["Tasks", "Task Subtasks", "Task Comments", "Issues", "Issue Comments", "Activity", "Team Members", "Clients", "Milestones", "Project Files"];
const DuplicateProjectModal: React.FC<{ project: ProjectRecord; onClose: () => void; onDone: (id: number) => void }> = ({ project, onClose, onDone }) => {
  const [sel, setSel] = useState<Set<string>>(new Set(["Tasks", "Task Subtasks", "Task Comments", "Issues", "Issue Comments", "Team Members", "Clients", "Milestones"]));
  const toggle = (o: string) => setSel((p) => { const n = new Set(p); n.has(o) ? n.delete(o) : n.add(o); return n; });
  const all = DUP_OPTIONS.every((o) => sel.has(o));
  const duplicate = async () => {
    const id = await repo.add("projects", {
      name: `${project.name} (Copy)`, budget: project.budget, startDate: project.startDate,
      endDate: project.endDate, status: project.status, description: project.description,
      members: sel.has("Team Members") ? project.members : [],
      clients: sel.has("Clients") ? project.clients : [],
      milestones: sel.has("Milestones") ? project.milestones.map((m) => ({ ...m, id: newMilestoneId() })) : [],
      bugs: sel.has("Issues") ? project.bugs.map((b) => ({ ...b, id: newBugId() })) : [],
      totalTasks: sel.has("Tasks") ? project.totalTasks : 0,
      activities: [{ id: newBugId(), text: `Duplicated from "${project.name}"`, ts: Date.now() }],
    });
    showToast("Project duplicated", "success");
    onDone(id);
    onClose();
  };
  return (
    <Modal title={`Duplicate Project: ${project.name}`} onClose={onClose} wide footer={<ModalFooter onClose={onClose} onSave={duplicate} saveLabel="Duplicate" />}>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer">
          <input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(DUP_OPTIONS))} className="w-4 h-4 accent-blue-600" />
          All
        </label>
        <div className="pl-2 space-y-2">
          {DUP_OPTIONS.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={sel.has(o)} onChange={() => toggle(o)} className="w-4 h-4 accent-blue-600" />
              {o}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
};

const CreateMilestoneModal: React.FC<{ project: ProjectRecord; initial?: Milestone | null; onClose: () => void }> = ({ project, initial, onClose }) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cost, setCost] = useState(String(initial?.cost ?? ""));
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [status, setStatus] = useState(initial?.status ?? "Incomplete");
  const [progress, setProgress] = useState(String(initial?.progress ?? 0));
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const save = async () => {
    if (!title.trim()) return showToast("Please enter a milestone title", "info");
    if (!cost) return showToast("Please enter a cost", "info");
    if (!startDate || !endDate) return showToast("Please select start and end dates", "info");
    const m: Milestone = {
      id: initial?.id ?? newMilestoneId(), title: title.trim(), cost: Number(cost) || 0,
      startDate, endDate, status: status as any, progress: Number(progress) || 0, summary,
    };
    const list = initial
      ? project.milestones.map((x) => (x.id === initial.id ? m : x))
      : [...project.milestones, m];
    await repo.update("projects", project.id, { milestones: list });
    showToast(initial ? "Milestone updated" : "Milestone created", "success");
    onClose();
  };
  return (
    <Modal title={initial ? "Edit Milestone" : "Create Milestone"} onClose={onClose} wide footer={<ModalFooter onClose={onClose} onSave={save} saveLabel={initial ? "Save" : "Create"} />}>
      <div className="space-y-4">
        <div>
          <label className={label}>Milestone Title <span className="text-red-500">*</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter milestone title" className={field} autoFocus />
        </div>
        <div>
          <label className={label}>Milestone Cost <span className="text-red-500">*</span></label>
          <div className="flex items-center border border-gray-300 rounded-md bg-white px-3 focus-within:ring-2 focus-within:ring-blue-600">
            <span className="text-sm text-gray-500">$</span>
            <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="0.00" className="flex-1 py-2 pl-2 text-sm bg-transparent text-gray-900 focus:outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Start Date <span className="text-red-500">*</span></label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>End Date <span className="text-red-500">*</span></label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={field}>
              <option>Incomplete</option><option>Complete</option>
            </select>
          </div>
          <div>
            <label className={label}>Progress (%)</label>
            <input value={progress} onChange={(e) => setProgress(e.target.value)} inputMode="numeric" className={field} />
          </div>
        </div>
        <div>
          <label className={label}>Summary</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Enter summary" className={`${field} resize-y`} />
        </div>
      </div>
    </Modal>
  );
};

const TeamMemberModal: React.FC<{ project: ProjectRecord; onClose: () => void }> = ({ project, onClose }) => {
  const [users, setUsers] = useState<string[]>(project.members);
  const save = async () => {
    await repo.update("projects", project.id, { members: users });
    showToast("Team updated", "success");
    onClose();
  };
  return (
    <Modal title="Team Member" onClose={onClose} footer={<ModalFooter onClose={onClose} onSave={save} saveLabel="Save" />}>
      <div>
        <label className={label}>Users <span className="text-red-500">*</span></label>
        <MultiSelect options={TEAM_POOL} value={users} onChange={setUsers} placeholder="Select users" />
      </div>
    </Modal>
  );
};

const ShareToClientModal: React.FC<{ project: ProjectRecord; onClose: () => void }> = ({ project, onClose }) => {
  const clientPool = useCollection<any>("customers", "name").map((c) => c.name);
  const [clients, setClients] = useState<string[]>(project.clients);
  const save = async () => {
    await repo.update("projects", project.id, { clients });
    showToast("Shared with clients", "success");
    onClose();
  };
  return (
    <Modal title="Share To Client" onClose={onClose} footer={<ModalFooter onClose={onClose} onSave={save} saveLabel="Save" />}>
      <div>
        <label className={label}>Clients <span className="text-red-500">*</span></label>
        <MultiSelect options={clientPool} value={clients} onChange={setClients} placeholder="Select clients" />
      </div>
    </Modal>
  );
};

const CreateBugModal: React.FC<{ project: ProjectRecord; initialStatus?: BugStatus; onClose: () => void }> = ({ project, initialStatus, onClose }) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<BugPriority>("Medium");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [status, setStatus] = useState<BugStatus>(initialStatus ?? "Unconfirmed");
  const [description, setDescription] = useState("");
  const save = async () => {
    if (!title.trim()) return showToast("Please enter an issue title", "info");
    if (!description.trim()) return showToast("Please enter a description", "info");
    const bug: Bug = { id: newBugId(), title: title.trim(), priority, assignees, status, description: description.trim() };
    await repo.update("projects", project.id, { bugs: [...project.bugs, bug] });
    showToast("Issue created", "success");
    onClose();
  };
  return (
    <Modal title="Create Issue" onClose={onClose} footer={<ModalFooter onClose={onClose} onSave={save} saveLabel="Create" />}>
      <div className="space-y-4">
        <div>
          <label className={label}>Title <span className="text-red-500">*</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter issue title" className={field} autoFocus />
        </div>
        <div>
          <label className={label}>Priority <span className="text-red-500">*</span></label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as BugPriority)} className={field}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </div>
        <div>
          <label className={label}>Assign To</label>
          <MultiSelect options={project.members.length ? project.members : TEAM_POOL} value={assignees} onChange={setAssignees} placeholder="Select team members" />
        </div>
        <div>
          <label className={label}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as BugStatus)} className={field}>
            {BUG_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Description <span className="text-red-500">*</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Enter issue description" className={`${field} resize-y`} />
        </div>
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════ */
type SortField = "name" | "budget" | "startDate" | "endDate" | "status";

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const raw = useCollection<any>("projects", "name");
  const projects = useMemo(() => raw.map(normalizeProject), [raw]);

  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectRecord | null>(null);
  const [dupProject, setDupProject] = useState<ProjectRecord | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");

  const sortToggle = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("asc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let r = projects.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
    if (statusFilter !== "All") r = r.filter((p) => p.status === statusFilter);
    r = [...r].sort((a, b) => {
      let av: any = a[sortField], bv: any = b[sortField];
      if (typeof av === "string") { av = av.toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return r;
  }, [projects, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const del = async (p: ProjectRecord) => {
    if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
      await repo.remove("projects", p.id);
      showToast("Project deleted", "success");
    }
  };

  const SortH: React.FC<{ f: SortField; label: string; className?: string }> = ({ f, label, className }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap ${className || ""}`} onClick={() => sortToggle(f)}>
      <div className="flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${sortField === f ? "text-blue-500" : "text-gray-400"}`} /></div>
    </th>
  );

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button>
          <span>›</span><span className="text-gray-900 font-medium">Projects</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">Manage Projects</h1>
          <button onClick={() => setCreateOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700" title="Create Project"><Plus className="w-5 h-5" /></button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search projects..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center rounded-md border border-gray-300 overflow-hidden">
                <button onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}><ListChecks className="w-4 h-4" /></button>
                <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button>
              </div>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white">
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
              </select>
              <div className="relative">
                <button onClick={() => setShowFilters((s) => !s)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"><Filter className="w-4 h-4" /> Filters <ChevronDown className="w-3.5 h-3.5" /></button>
                {showFilters && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-xl z-20 py-1">
                    <div className="px-3 py-1.5 text-xs text-gray-500">Status</div>
                    {["All", ...PROJECT_STATUS].map((s) => (
                      <button key={s} onClick={() => { setStatusFilter(s); setPage(1); setShowFilters(false); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${statusFilter === s ? "text-blue-600" : "text-gray-700"}`}>{s}{statusFilter === s && <Check className="w-4 h-4" />}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {view === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>
                    <SortH f="name" label="Name" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Users</th>
                    <SortH f="budget" label="Budget" />
                    <SortH f="startDate" label="Start Date" />
                    <SortH f="endDate" label="End Date" />
                    <SortH f="status" label="Status" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paged.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3"><AvatarStack names={p.members} /></td>
                      <td className="px-4 py-3 text-gray-800">{fmt(p.budget)}</td>
                      <td className="px-4 py-3 text-gray-600">{p.startDate || "—"}</td>
                      <td className="px-4 py-3 text-red-400">{p.endDate || "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(p.status)}`}>{p.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDupProject(p)} title="Duplicate" className="p-1.5 rounded-md text-purple-400 hover:bg-purple-500/10"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => navigate(`/project/projects/${p.id}`)} title="View" className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setEditProject(p)} title="Edit" className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => del(p)} title="Delete" className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No projects found.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {paged.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <button onClick={() => navigate(`/project/projects/${p.id}`)} className="font-semibold text-gray-900 hover:text-blue-500 text-left">{p.name}</button>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(p.status)}`}>{p.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <AvatarStack names={p.members} />
                    <span className="text-gray-800 font-medium">{fmt(p.budget)}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{p.startDate} → <span className="text-red-400">{p.endDate}</span></div>
                  <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
                    <button onClick={() => setDupProject(p)} title="Duplicate" className="p-1.5 rounded-md text-purple-400 hover:bg-purple-500/10"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => navigate(`/project/projects/${p.id}`)} title="View" className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => setEditProject(p)} title="Edit" className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => del(p)} title="Delete" className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {paged.length === 0 && <div className="col-span-full px-4 py-12 text-center text-gray-500">No projects found.</div>}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length} results
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"><ChevronLeft className="w-4 h-4" />Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 text-sm rounded-md ${page === n ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>{n}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40">Next<ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {createOpen && <CreateProjectModal onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />}
      {editProject && <CreateProjectModal initial={editProject} onClose={() => setEditProject(null)} onSaved={() => setEditProject(null)} />}
      {dupProject && <DuplicateProjectModal project={dupProject} onClose={() => setDupProject(null)} onDone={(id) => navigate(`/project/projects/${id}`)} />}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   DETAIL
   ══════════════════════════════════════════════════════════════════ */
export const ProjectDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const raw = useCollection<any>("projects", "name");
  const project = useMemo(() => {
    const rec = raw.find((p) => String(p.id) === String(id));
    return rec ? normalizeProject(rec) : null;
  }, [raw, id]);

  const [editOpen, setEditOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);

  if (!project) return (
    <div className="flex-1 bg-[#FAFBFC] flex items-center justify-center text-gray-500">
      Project not found. <button onClick={() => navigate("/project/projects")} className="ml-2 text-blue-500">Back to projects</button>
    </div>
  );

  const daysLeft = project.endDate ? Math.max(0, Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000)) : 0;
  const bugCount = project.bugs.length;

  const removeMember = async (m: string) =>
    repo.update("projects", project.id, { members: project.members.filter((x) => x !== m) });
  const removeClient = async (c: string) =>
    repo.update("projects", project.id, { clients: project.clients.filter((x) => x !== c) });
  const removeMilestone = async (mid: string) =>
    repo.update("projects", project.id, { milestones: project.milestones.filter((x) => x.id !== mid) });

  const progressData = project.milestones.length
    ? project.milestones.map((m, i) => ({ name: `M${i + 1}`, value: m.progress }))
    : [{ name: "Start", value: 0 }, { name: "Now", value: 0 }];

  const StatTile: React.FC<{ value: string; label: string; tint: string; icon: React.ReactNode }> = ({ value, label, tint, icon }) => (
    <div className={`rounded-xl p-4 border ${tint} flex flex-col`}>
      <div className="flex items-start justify-between">
        <div className="text-2xl font-bold">{value}</div>
        {icon}
      </div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  );

  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className || ""}`}>{children}</div>
  );

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button><span>›</span>
          <button onClick={() => navigate("/project/projects")} className="hover:text-gray-700">Project</button><span>›</span>
          <span className="text-gray-900 font-medium">{project.name}</span>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/project/projects")} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /> Back</button>
            <button onClick={() => navigate(`/project/projects/${project.id}/bugs`)} title="Issue Board" className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700"><BugIcon className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Details + Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Flag className="w-4 h-4 text-blue-500" /> Project Details</h2>
              <button onClick={() => setEditOpen(true)} className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10"><Edit className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Status</span><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(project.status)}`}>{project.status}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Start Date</span><span className="text-gray-900">{project.startDate || "—"}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">End Date</span><span className="text-red-400">{project.endDate || "—"}</span></div>
              <div><div className="text-gray-500 mb-1">Description</div><div className="text-gray-800">{project.description || "—"}</div></div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-blue-500" /> Project Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatTile value={String(project.totalTasks)} label="Tasks" tint="bg-blue-500/10 border-blue-500/20 text-blue-300" icon={<ListChecks className="w-5 h-5 text-blue-400" />} />
              <StatTile value={String(bugCount)} label="Issue" tint="bg-red-500/10 border-red-500/20 text-red-300" icon={<BugIcon className="w-5 h-5 text-red-400" />} />
              <StatTile value={String(daysLeft)} label="Days Left" tint="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" icon={<Clock className="w-5 h-5 text-emerald-400" />} />
              <StatTile value={fmt(project.budget)} label="Budget" tint="bg-amber-500/10 border-amber-500/20 text-amber-300" icon={<DollarSign className="w-5 h-5 text-amber-400" />} />
            </div>
          </Card>
        </div>

        {/* Team / Clients / Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
              <button onClick={() => setTeamOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {project.members.map((m) => (
                <div key={m} className="flex items-center justify-between px-3 py-2 rounded-md border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-2"><Avatar name={m} size={24} /><span className="text-sm text-gray-800">{m}</span></div>
                  <button onClick={() => removeMember(m)} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {project.members.length === 0 && <div className="text-sm text-gray-400 py-2">No team members yet.</div>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Clients</h2>
              <button onClick={() => setClientOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {project.clients.map((c) => (
                <div key={c} className="flex items-center justify-between px-3 py-2 rounded-md border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-2"><Avatar name={c} size={24} /><span className="text-sm text-gray-800">{c}</span></div>
                  <button onClick={() => removeClient(c)} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {project.clients.length === 0 && <div className="text-sm text-gray-400 py-2">No clients yet.</div>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Progress</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
                  <XAxis dataKey="name" stroke="#8b96a5" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8b96a5" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#1a212a", border: "1px solid #2a333d", borderRadius: 8, color: "#fff" }} />
                  <Line type="monotone" dataKey="value" stroke="#007aff" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Milestones */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Milestones</h2>
            <button onClick={() => { setEditMilestone(null); setMilestoneOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  {["Title", "Cost", "Start Date", "End Date", "Status", "Progress", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.milestones.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
                    <td className="px-4 py-3 text-gray-800">{fmt(m.cost)}</td>
                    <td className="px-4 py-3 text-gray-600">{m.startDate}</td>
                    <td className="px-4 py-3 text-red-400">{m.endDate}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.status === "Complete" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>{m.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-gray-500/20 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${m.progress}%` }} /></div>
                        <span className="text-xs text-gray-500">{m.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditMilestone(m); setMilestoneOpen(true); }} className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => removeMilestone(m.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {project.milestones.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No milestones yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-blue-500" /> Recent Activity</h2>
          <div className="space-y-3">
            {project.activities.slice().reverse().map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-gray-700">{a.text}</span>
                <span className="text-xs text-gray-400 ml-auto">{new Date(a.ts).toLocaleDateString()}</span>
              </div>
            ))}
            {project.activities.length === 0 && <div className="text-sm text-gray-400">No activity yet.</div>}
          </div>
        </Card>
      </div>

      {editOpen && <CreateProjectModal initial={project} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />}
      {teamOpen && <TeamMemberModal project={project} onClose={() => setTeamOpen(false)} />}
      {clientOpen && <ShareToClientModal project={project} onClose={() => setClientOpen(false)} />}
      {milestoneOpen && <CreateMilestoneModal project={project} initial={editMilestone} onClose={() => setMilestoneOpen(false)} />}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   BUG KANBAN
   ══════════════════════════════════════════════════════════════════ */
export const ProjectBugs: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const raw = useCollection<any>("projects", "name");
  const project = useMemo(() => {
    const rec = raw.find((p) => String(p.id) === String(id));
    return rec ? normalizeProject(rec) : null;
  }, [raw, id]);

  const [createStatus, setCreateStatus] = useState<BugStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  if (!project) return (
    <div className="flex-1 bg-[#FAFBFC] flex items-center justify-center text-gray-500">
      Project not found. <button onClick={() => navigate("/project/projects")} className="ml-2 text-blue-500">Back</button>
    </div>
  );

  const moveBug = async (bugId: string, status: BugStatus) => {
    const bugs = project.bugs.map((b) => (b.id === bugId ? { ...b, status } : b));
    await repo.update("projects", project.id, { bugs });
  };
  const deleteBug = async (bugId: string) =>
    repo.update("projects", project.id, { bugs: project.bugs.filter((b) => b.id !== bugId) });

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-y-auto">
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/")} className="hover:text-gray-700">Dashboard</button><span>›</span>
          <button onClick={() => navigate("/project/projects")} className="hover:text-gray-700">Project</button><span>›</span>
          <button onClick={() => navigate(`/project/projects/${project.id}`)} className="hover:text-gray-700">{project.name}</button><span>›</span>
          <span className="text-gray-900 font-medium">Issue</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">{project.name} - Issue</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/project/projects/${project.id}`)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /> Back</button>
            <button onClick={() => setCreateStatus("Unconfirmed")} className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {BUG_STATUSES.map((col) => {
            const bugs = project.bugs.filter((b) => b.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) { moveBug(dragId, col); setDragId(null); } }}
                className={`rounded-xl border min-h-[420px] flex flex-col ${BUG_COLUMN_BG[col]}`}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${BUG_COLUMN_TINT[col]}`}>{col}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 text-xs">{bugs.length}</span>
                  </div>
                  <button onClick={() => setCreateStatus(col)} className="text-gray-400 hover:text-blue-500"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 p-3 space-y-3">
                  {bugs.map((b) => (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={() => setDragId(b.id)}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-gray-900 text-sm">{b.title}</div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityBadge(b.priority)}`}>{b.priority}</span>
                      </div>
                      {b.description && <div className="text-xs text-gray-500 mt-1">{b.description}</div>}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex -space-x-2">{b.assignees.map((a, i) => <Avatar key={i} name={a} size={22} />)}</div>
                        <button onClick={() => deleteBug(b.id)} className="text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {bugs.length === 0 && <div className="text-center text-xs text-gray-400 py-8">Drop tasks here</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {createStatus && <CreateBugModal project={project} initialStatus={createStatus} onClose={() => setCreateStatus(null)} />}
    </div>
  );
};

export default Projects;
