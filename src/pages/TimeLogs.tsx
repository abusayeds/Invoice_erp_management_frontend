/**
 * File: src/pages/TimeLogs.tsx
 * Time Logs — master/detail layout matching the reference design.
 * Left: list (search, sort, Status/Customer/Date filters) with a "Timer"
 *       header row; logs grouped by month with per-group hour totals.
 * Right: "Time Log Details" — Hours/Date (+ Project/Task when set) + Notes,
 *        with a live start/pause/stop timer in the header.
 * Pencil → inline "Edit Time Log" form (big hh:mm display + In/Out picker,
 *        Date / Project / Task / Notes). FAB & Timer (+) → Create.
 * ⋮ → Mark as Invoiced / Duplicate / Delete.
 * Backend not wired (per request) — data is hardcoded to match the design.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { ListEmptyState } from "@/components/ListEmptyState";
import { ResizableListPanel } from "@/components/layout/ResizableListPanel";
import { useCollection, repo } from "@/lib/db";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Settings,
  Pencil,
  MoreVertical,
  Trash2,
  Copy,
  Play,
  Pause,
  Square,
  ClipboardList,
  Clock,
  Calendar,
  CheckCircle2,
} from "lucide-react";

/* ── Types & data ──────────────────────────────────────────────── */
interface TLog {
  id: number;
  email: string;
  project: string;
  task: string;
  hours: string; // "HH:MM"
  month: string; // group key, e.g. "Jun 2026"
  dateLabel: string; // detail Date value
  rowDate: string; // right-aligned date on a project row
  notes: string;
  invoiced: boolean;
}

const seed: TLog[] = [
  { id: 1, email: "info@inovoic.com", project: "Basia Johnson", task: "ef", hours: "23:00", month: "Jun 2026", dateLabel: "Today 10:16 PM", rowDate: "Today 10:16 PM", notes: "", invoiced: false },
  { id: 2, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Jun 2026", dateLabel: "Jun 19, 2026", rowDate: "", notes: "", invoiced: false },
  { id: 3, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Jun 2026", dateLabel: "Jun 18, 2026", rowDate: "", notes: "", invoiced: false },
  { id: 4, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Jun 2026", dateLabel: "Jun 17, 2026", rowDate: "", notes: "", invoiced: false },
  { id: 5, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Jun 2026", dateLabel: "Jun 15, 2026", rowDate: "", notes: "", invoiced: false },
  { id: 6, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Jun 2026", dateLabel: "Jun 12, 2026", rowDate: "", notes: "", invoiced: false },
  { id: 7, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Apr 2026", dateLabel: "Apr 28, 2026", rowDate: "", notes: "", invoiced: false },
  { id: 8, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Apr 2026", dateLabel: "Apr 20, 2026", rowDate: "", notes: "", invoiced: false },
  { id: 9, email: "info@inovoic.com", project: "", task: "", hours: "00:00", month: "Apr 2026", dateLabel: "Apr 11, 2026", rowDate: "", notes: "", invoiced: false },
];

const sortFields = ["Date", "Hours", "Customer"];
const statusList = ["All", "Invoiced", "Not Invoiced", "Trash"];
const projectList = ["Basia Johnson", "Acme Corp", "Internal", "Wayne Ltd"];
const taskList = ["ef", "Design", "Development", "Meeting", "Research"];

/* ── helpers ───────────────────────────────────────────────────── */
const parseHM = (s: string) => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const fmtHM = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const fmtHMS = (sec: number) => [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60].map((n) => String(n).padStart(2, "0")).join(":");

/* ── Outside-click dropdown ────────────────────────────────────── */
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClass?: string;
}> = ({ trigger, children, align = "left", panelClass = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div className={`absolute z-30 mt-2 min-w-[180px] bg-white border border-gray-200 rounded-md shadow-xl py-1 ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/* ── Modal shell ───────────────────────────────────────────────── */
const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full flex justify-center">{children}</div>
    </div>
  );
};

const SectionBar: React.FC<{ title: string }> = ({ title }) => (
  <div className="px-6 py-2.5 bg-gray-50 border-y border-gray-200 text-sm font-semibold text-gray-900">{title}</div>
);
const Stat: React.FC<{ label: string; value: string; big?: boolean }> = ({ label, value, big }) => (
  <div><div className="text-xs text-gray-500">{label}</div><div className={`font-semibold text-gray-900 mt-0.5 ${big ? "text-2xl" : "text-sm"}`}>{value}</div></div>
);

/* ── In / Out calendar picker ──────────────────────────────────── */
const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const InOutModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [mode, setMode] = useState<"In" | "Out">("In");
  const [view, setView] = useState({ y: 2026, m: 5 }); // June 2026 (0-based)
  const [day, setDay] = useState(21);
  const [time, setTime] = useState("10:15 PM");
  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const monthLong = new Date(view.y, view.m, 1).toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase();
  const monthShort = new Date(view.y, view.m, 1).toLocaleString("en-US", { month: "short" }).toUpperCase();
  const shift = (d: number) => setView((v) => { const nd = new Date(v.y, v.m + d, 1); return { y: nd.getFullYear(), m: nd.getMonth() }; });
  return (
    <Overlay onClose={onClose}>
      <div className="w-[420px] my-24 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {/* In/Out toggle + actions */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300">
          <div className="flex rounded-md overflow-hidden border border-blue-600">
            {(["In", "Out"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-6 py-1.5 text-sm font-medium ${mode === m ? "bg-blue-600 text-white" : "text-blue-600 bg-white"}`}>{m}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button onClick={onClose} className="px-5 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Save</button>
          </div>
        </div>
        {/* month nav */}
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-sm font-semibold text-gray-900">{monthLong} <ChevronDown className="inline w-4 h-4" /></span>
          <div className="flex items-center gap-1">
            <button onClick={() => shift(-1)} className="p-1 rounded-full hover:bg-gray-100 text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => shift(1)} className="p-1 rounded-full hover:bg-gray-100 text-gray-600"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        {/* weekdays */}
        <div className="grid grid-cols-7 px-5 mt-3 text-center text-xs text-gray-500">{WEEK.map((w) => <div key={w}>{w}</div>)}</div>
        <div className="px-5 mt-2 text-xs text-gray-500">{monthShort}</div>
        {/* days */}
        <div className="grid grid-cols-7 gap-y-2 px-5 py-2 text-center text-sm">
          {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1;
            return (
              <button key={d} onClick={() => setDay(d)} className={`mx-auto w-9 h-9 flex items-center justify-center rounded-full ${d === day ? "bg-blue-600 text-white" : "text-gray-800 hover:bg-gray-100"}`}>{d}</button>
            );
          })}
        </div>
        {/* time */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-center">
          <div className="relative w-48">
            <input value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600" />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>
    </Overlay>
  );
};

/* ── Edit / Create Time Log form (replaces detail) ─────────────── */
const TimeLogForm: React.FC<{ mode: "create" | "edit"; log?: TLog; onClose: () => void; onSave?: (d: any) => void }> = ({ mode, log, onClose, onSave }) => {
  const [inout, setInout] = useState(false);
  const init = (log?.hours ?? "00:00").split(":");
  const [hh] = useState(init[0] || "00");
  const [mm] = useState(init[1] || "00");
  const [project, setProject] = useState(log?.project ?? "");
  const [task, setTask] = useState(log?.task ?? "");
  const [notes, setNotes] = useState(log?.notes ?? "");
  const handleSave = () => { onSave?.({ project, task, notes, hours: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` }); onClose(); };
  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar bg-white border-l border-gray-300">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-300 sticky top-0 bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-900">{mode === "create" ? "Create Time Log" : "Edit Time Log"}</h1>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"><Settings className="w-4 h-4" /></button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={handleSave} className="px-5 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Save</button>
        </div>
      </div>

      {/* big hh:mm display + In/Out */}
      <div className="relative px-6 py-10 border-b border-gray-300">
        <div className="text-center">
          <div className="text-6xl font-light text-gray-900 tracking-wide">{hh} : {mm}</div>
          <div className="text-sm text-gray-500 mt-1">hh : mm</div>
        </div>
        <button onClick={() => setInout(true)} className="absolute right-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300">
          <Clock className="w-4 h-4" /> In/Out
        </button>
      </div>

      <SectionBar title="Details" />
      <div className="px-6 py-6 max-w-2xl space-y-6">
        <div className="relative fl-wrap">
          <label className="fl-label">Date *</label>
          <input defaultValue={mode === "edit" ? "6/21/2026" : "6/21/2026"} placeholder=" " className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600" />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>
        <div className="flex items-center gap-3">
          <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600" />
          <button className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-3">
          <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Task" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600" />
          <button className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"><Plus className="w-4 h-4" /></button>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full h-32 border border-gray-300 rounded-md p-3 text-sm text-gray-700 outline-none resize-none focus:ring-1 focus:ring-blue-600" />
      </div>

      {inout && <InOutModal onClose={() => setInout(false)} />}
    </section>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
export const TimeLogs: React.FC = () => {
  const dbLogs = useCollection<any>("timelogs");
  const logs: TLog[] = useMemo(() => [...dbLogs].sort((a, b) => b.id - a.id), [dbLogs]);
  const [selectedId, setSelectedId] = useState(2);
  const [sortBy, setSortBy] = useState("Date");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");

  // live timer: { id, sec, active }
  const [timer, setTimer] = useState<{ id: number; sec: number; active: boolean } | null>(null);
  useEffect(() => {
    if (!timer?.active) return;
    const t = setInterval(() => setTimer((p) => (p ? { ...p, sec: p.sec + 1 } : p)), 1000);
    return () => clearInterval(t);
  }, [timer?.active]);

  const selected = logs.find((l) => l.id === selectedId) || logs[0];

  const filtered = useMemo(() => {
    let list = logs.filter((l) => {
      if (statusFilter === "Invoiced" && !l.invoiced) return false;
      if (statusFilter === "Not Invoiced" && l.invoiced) return false;
      return search.trim() === "" || l.email.toLowerCase().includes(search.toLowerCase()) || l.project.toLowerCase().includes(search.toLowerCase());
    });
    if (sortBy === "Hours") list = [...list].sort((a, b) => parseHM(b.hours) - parseHM(a.hours));
    if (sortBy === "Customer") list = [...list].sort((a, b) => a.email.localeCompare(b.email));
    return list;
  }, [logs, sortBy, statusFilter, search]);

  // group by month, preserving first-seen order
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, TLog[]>();
    filtered.forEach((l) => { if (!map.has(l.month)) { map.set(l.month, []); order.push(l.month); } map.get(l.month)!.push(l); });
    return order.map((m) => ({ month: m, rows: map.get(m)!, total: fmtHM(map.get(m)!.reduce((s, l) => s + parseHM(l.hours), 0)) }));
  }, [filtered]);

  const grandTotal = fmtHM(logs.reduce((s, l) => s + parseHM(l.hours), 0));

  // timer state for the selected log
  const isThis = !!selected && timer && timer.id === selected.id;
  const active = !!isThis && timer!.active;
  const paused = !!isThis && !timer!.active;
  const detailHours = isThis ? fmtHMS(timer!.sec) : selected?.hours;

  const startTimer = (id: number) => setTimer((p) => (p && p.id === id ? { ...p, active: true } : { id, sec: p && p.id === id ? p.sec : 0, active: true }));
  const pauseTimer = () => setTimer((p) => (p ? { ...p, active: false } : p));
  const stopTimer = () => setTimer(null);

  const markInvoiced = () => { repo.update("timelogs", selectedId, { invoiced: true }); };

  const ctrlBtn = "w-7 h-7 flex items-center justify-center rounded-full text-white";

  if (!selected && mode !== "create") return <ListEmptyState title="No time logs yet" onCreate={() => setMode("create")} createLabel="New Time Log" />;

  return (
    <div className="flex h-full w-full bg-[#FAFBFC] overflow-hidden">
      {/* ════════ LIST PANEL ════════ */}
      <ResizableListPanel>
        {/* header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-300 bg-gray-100">
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">Time Logs</h2>
          <div className="flex items-center gap-0.5">
            <button className="p-1.5 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4 text-gray-500" /></button>
            <button onClick={() => setMode("create")} className="p-1.5 hover:bg-gray-100 rounded-md" title="New"><Pencil className="w-4 h-4 text-gray-500" /></button>
            <Dropdown align="right" trigger={<span className="p-1.5 hover:bg-gray-100 rounded-md inline-flex cursor-pointer"><MoreVertical className="w-4 h-4 text-gray-500" /></span>}>{(close) => (<><button onClick={(e) => { const t = (e.currentTarget.closest("aside")?.querySelector("h2")?.textContent || "Records").trim(); window.dispatchEvent(new CustomEvent("demo:import", { detail: t })); close(); }} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Import</button><button onClick={close} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">Export</button></>)}</Dropdown>
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-nowrap items-center gap-2 px-3 py-2 border-b border-gray-300 overflow-x-auto hover-scrollbar" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>
          <Dropdown trigger={<span className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-full px-3 py-1 whitespace-nowrap">Sort by | <span className="text-gray-800 font-medium">{sortBy}</span><ChevronDown className="w-3.5 h-3.5" /></span>}>
            {(close) => sortFields.map((o) => (
              <button key={o} onClick={() => { setSortBy(o); close(); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">{o} {o === sortBy && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <Dropdown trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400"><Plus className="w-3 h-3" />Status{statusFilter !== "All" ? ` | ${statusFilter}` : ""}</span>}>
            {(close) => statusList.map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s === "Trash" ? statusFilter : s); close(); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${s === "Trash" ? "text-red-500 border-t border-gray-200" : "text-gray-700"}`}>{s} {s === statusFilter && <Check className="w-4 h-4 text-blue-600" />}</button>
            ))}
          </Dropdown>
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400 cursor-pointer"><Plus className="w-3 h-3" />Customer | All</span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-2.5 py-1 whitespace-nowrap hover:border-gray-400 cursor-pointer"><Plus className="w-3 h-3" />Date</span>
        </div>

        {/* Timer header row */}
        <div className="border-b border-gray-300">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-semibold text-gray-900">Timer</span>
            <button onClick={() => setMode("create")} className="p-1 rounded-md hover:bg-gray-100 text-gray-600"><Plus className="w-4 h-4" /></button>
          </div>
          {timer && (() => {
            const tl = logs.find((l) => l.id === timer.id)!;
            return (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                <span className="text-sm text-gray-800 truncate">{tl.email}</span>
                <div className="flex items-center gap-2">
                  {timer.active
                    ? <button onClick={pauseTimer} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-700 text-white"><Pause className="w-3.5 h-3.5" /></button>
                    : <button onClick={() => startTimer(timer.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-700 text-white"><Play className="w-3.5 h-3.5" /></button>}
                  <button onClick={stopTimer} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-700 text-white"><Square className="w-3 h-3 fill-current" /></button>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmtHMS(timer.sec)}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* rows */}
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {groups.map((g) => (
            <div key={g.month}>
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-300">
                <span className="text-sm font-bold text-gray-900">{g.month} ({g.rows.length})</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{g.total}</span>
              </div>
              {g.rows.map((l) => {
                const activeRow = mode === "view" && l.id === selectedId;
                const liveHours = timer && timer.id === l.id ? fmtHMS(timer.sec) : l.hours;
                return (
                  <button key={l.id} onClick={() => { setSelectedId(l.id); setMode("view"); }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-300 transition-colors ${activeRow ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                    {l.project ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{l.project} - {l.task}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">{l.rowDate}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{l.email}</span>
                          <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">{liveHours}</span>
                        </div>
                        {l.invoiced && <div className="text-right text-xs text-gray-400 mt-0.5">Invoiced</div>}
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-800 truncate">{l.email}</span>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">{liveHours}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          </div>
          {/* FAB → Create */}
          <button onClick={() => setMode("create")} className="absolute bottom-6 right-6 z-20 flex w-12 h-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"><Plus className="w-6 h-6" /></button>
        </div>

        {/* footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-center bg-gray-50">
          <div className="text-sm font-semibold text-gray-900">{grandTotal} Hours</div>
          <div className="text-xs text-gray-500">{logs.length} Time Logs</div>
        </div>
      </ResizableListPanel>

      {/* ════════ RIGHT PANEL ════════ */}
      {mode === "create" ? (
        <TimeLogForm mode="create" onClose={() => setMode("view")} onSave={async (d) => { const id = await repo.add("timelogs", { customerId: null, projectId: null, taskId: null, project: d.project, task: d.task, hours: d.hours || "00:00", month: "Jun 2026", date: "Jun 22, 2026", ts: Date.now(), dateLabel: "Today", notes: d.notes, invoiced: false }); setSelectedId(id); }} />
      ) : mode === "edit" ? (
        <TimeLogForm mode="edit" log={selected} onClose={() => setMode("view")} onSave={async (d) => { await repo.update("timelogs", selected.id, { project: d.project, task: d.task, hours: d.hours, notes: d.notes }); }} />
      ) : (
        <section className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-white border-l border-gray-300">
          {/* detail header */}
          <div className="h-12 flex items-center justify-between px-6 border-b border-gray-300 bg-gray-100">
            <h1 className="text-base font-semibold text-gray-900 tracking-tight">Time Log Details</h1>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Settings"><Settings className="w-4 h-4" /></button>

              {/* timer controls */}
              {active ? (
                <button onClick={pauseTimer} className={`${ctrlBtn} bg-gray-700`} title="Pause"><Pause className="w-3.5 h-3.5" /></button>
              ) : (
                <button onClick={() => startTimer(selected.id)} className={`${ctrlBtn} bg-green-600`} title="Start"><Play className="w-3.5 h-3.5" /></button>
              )}
              {(active || paused) && (
                <button onClick={stopTimer} className={`${ctrlBtn} bg-red-600`} title="Stop"><Square className="w-3 h-3 fill-current" /></button>
              )}

              <button onClick={() => setMode("edit")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Edit"><Pencil className="w-4 h-4" /></button>
              {!isThis && <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500" title="Notes"><ClipboardList className="w-4 h-4" /></button>}

              <Dropdown align="right" trigger={<span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"><MoreVertical className="w-4 h-4" /></span>}>
                {(close) => (
                  <>
                    <button onClick={() => { markInvoiced(); close(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><CheckCircle2 className="w-4 h-4 text-gray-400" /> Mark as Invoiced</button>
                    <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"><Copy className="w-4 h-4 text-gray-400" /> Duplicate</button>
                    <button onClick={close} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 text-left border-t border-gray-200"><Trash2 className="w-4 h-4" /> Delete</button>
                  </>
                )}
              </Dropdown>
            </div>
          </div>

          {/* body */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
              {selected.project && <Stat label="Project" value={selected.project} />}
              {selected.project && <Stat label="Task" value={selected.task} />}
              <Stat label="Hours" value={detailHours} big />
              <Stat label="Date" value={selected.dateLabel} />
            </div>
            {selected.invoiced && <span className="inline-block mt-4 text-xs text-gray-500 border border-gray-300 rounded-full px-3 py-1">Invoiced</span>}
          </div>

          <SectionBar title="Notes" />
          <div className="px-6 py-5 text-sm text-gray-700">{selected.notes || "No Notes"}</div>
        </section>
      )}
    </div>
  );
};

export default TimeLogs;
