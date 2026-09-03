/**
 * File: src/pages/hrm/attendance/Attendances.tsx
 * Attendance Report — employee × calendar-day grid matching the ERPGO
 * reference (references/hrm/attendence/attendence/*.png) in the Qayd blue
 * theme: legend banner, expandable Employee/Month/Year filter panel, emoji
 * status cells (click → Edit Attendance modal), per-employee monthly total.
 * Cell states are generated deterministically (attendanceCell); manual edits
 * persist in meta row `hrm:attendanceEdits`.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../utils/toast";
import {
  useEmployees,
  attendanceCell,
  monthWorkingDays,
  useAttendanceEdits,
  saveAttendanceEdits,
  type AttendanceCell,
  type HrmEmployee,
} from "@/lib/db/hrm";
import { Avatar, Field, inputCls, HrmBreadcrumb, SearchSelect } from "../hrmShared";
import {
  Search,
  Filter,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Flag,
  Star,
  Ban,
  Minus,
  Loader,
  AlarmClock,
  ArrowLeftToLine,
  Clock,
} from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/* ── one grid cell ─────────────────────────────────────────────── */

function CellIcon({ cell }: { cell: AttendanceCell }) {
  const mods = (
    <span className="flex items-center justify-center gap-0.5 mt-0.5">
      {cell.late && <AlarmClock className="w-2.5 h-2.5 text-orange-500" />}
      {cell.early && <ArrowLeftToLine className="w-2.5 h-2.5 text-red-400" />}
      {cell.overtime && <Clock className="w-2.5 h-2.5 text-blue-500" />}
    </span>
  );
  switch (cell.status) {
    case "present":
      return (
        <span className="flex flex-col items-center">
          <Check className="w-4 h-4 text-green-500" strokeWidth={3} />
          {mods}
        </span>
      );
    case "absent":
      return <X className="w-4 h-4 text-red-500 mx-auto" strokeWidth={3} />;
    case "half":
      return (
        <span className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-yellow-500 leading-4">½</span>
          {mods}
        </span>
      );
    case "leave":
      return <Flag className="w-4 h-4 text-red-500 mx-auto" fill="currentColor" />;
    case "dayoff":
      return <Ban className="w-4 h-4 text-gray-300 mx-auto" />;
    case "future":
      return <Minus className="w-4 h-4 text-gray-300 mx-auto" />;
  }
}

/* ── Create Attendance modal (reference: hrm:crerate attendence) ── */

type AttendanceEditRec = { clockIn: string; clockOut: string; notes: string };

const CreateAttendanceModal: React.FC<{
  employees: HrmEmployee[];
  edits: Record<string, AttendanceEditRec>;
  onClose: () => void;
}> = ({ employees, edits, onClose }) => {
  const [employee, setEmployee] = useState("");
  const [date, setDate] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const create = async () => {
    const emp = employees.find((e) => e.name === employee);
    if (!emp) {
      showToast("Please select an employee", "error");
      return;
    }
    if (!date) {
      showToast("Please select a date", "error");
      return;
    }
    if (!clockIn) {
      showToast("Clock in time is required", "error");
      return;
    }
    await saveAttendanceEdits({ ...edits, [`${emp.id}:${date}`]: { clockIn, clockOut, notes } });
    showToast("Attendance created successfully", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Create Attendance</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Employee" required>
            <SearchSelect value={employee} onChange={setEmployee} options={employees.map((e) => e.name)} placeholder="Select Employee" />
          </Field>
          <Field label="Date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Clock In Time" required>
            <input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Clock Out Time">
            <input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Enter Notes" className={inputCls} />
          </Field>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button onClick={create} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── page ──────────────────────────────────────────────────────── */

export const Attendances: React.FC = () => {
  const navigate = useNavigate();
  const employees = useEmployees();
  useEffect(() => {
  }, [employees]);
  const edits = useAttendanceEdits();

  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState("All Employees");
  const [month, setMonth] = useState(7); // July
  const [year, setYear] = useState(2025);
  const [applied, setApplied] = useState({ employee: "All Employees", month: 7, year: 2025 });
  const [editCell, setEditCell] = useState<{ emp: HrmEmployee; date: string } | null>(null);
  const [draft, setDraft] = useState({ clockIn: "", clockOut: "", notes: "" });
  const [createOpen, setCreateOpen] = useState(false);

  const list = employees || [];
  const daysInMonth = new Date(applied.year, applied.month, 0).getDate();
  const workDays = monthWorkingDays(applied.year, applied.month);

  const visible = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return list.filter(
      (e) =>
        (applied.employee === "All Employees" || e.name === applied.employee) &&
        e.name.toLowerCase().includes(q),
    );
  }, [list, searchQuery, applied]);

  const totalFor = (emp: HrmEmployee) => {
    let t = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${applied.year}-${String(applied.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const c: AttendanceCell = (edits || {})[`${emp.id}:${dateStr}`]
        ? { status: "present" }
        : attendanceCell(emp.id, applied.year, applied.month, d);
      if (c.status === "present") t += 1;
      else if (c.status === "half") t += 0.5;
    }
    return t;
  };

  const openEdit = (emp: HrmEmployee, day: number) => {
    const date = `${applied.year}-${String(applied.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const existing = (edits || {})[`${emp.id}:${date}`];
    setDraft(existing || { clockIn: "06:00", clockOut: "14:00", notes: "Demo attendance record" });
    setEditCell({ emp, date });
  };

  const submitEdit = async () => {
    if (!editCell) return;
    if (!draft.clockIn) {
      showToast("Clock in time is required", "error");
      return;
    }
    await saveAttendanceEdits({
      ...(edits || {}),
      [`${editCell.emp.id}:${editCell.date}`]: { ...draft },
    });
    showToast("Attendance updated successfully", "success");
    setEditCell(null);
  };

  const legend: [React.ReactNode, string][] = [
    [<Check key="p" className="w-3.5 h-3.5 text-green-500" strokeWidth={3} />, "Present"],
    [<X key="a" className="w-3.5 h-3.5 text-red-500" strokeWidth={3} />, "Absent"],
    [<span key="h" className="text-xs font-bold text-yellow-500">½</span>, "Half Day"],
    [<Flag key="l" className="w-3.5 h-3.5 text-red-500" fill="currentColor" />, "On Leave"],
    [<Star key="ho" className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />, "Holiday"],
    [<Ban key="d" className="w-3.5 h-3.5 text-gray-400" />, "Day Off"],
    [<Minus key="f" className="w-3.5 h-3.5 text-gray-400" />, "Future"],
    [<Loader key="pe" className="w-3.5 h-3.5 text-gray-400" />, "Pending"],
    [<AlarmClock key="la" className="w-3.5 h-3.5 text-orange-500" />, "Late"],
    [<ArrowLeftToLine key="e" className="w-3.5 h-3.5 text-red-400" />, "Early"],
    [<Clock key="o" className="w-3.5 h-3.5 text-blue-500" />, "Overtime"],
  ];

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      <HrmBreadcrumb trail={[{ label: "Dashboard", to: "/" }, { label: "HRM" }]} current="Attendances" onNavigate={navigate} />

      {/* toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee name or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <button onClick={() => showToast("Search applied", "info")} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setFiltersOpen(!filtersOpen)} className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                <Filter className="w-4 h-4 text-gray-500" />
                <span>Filters</span>
                {filtersOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">2</span>
              </button>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              title="Create Attendance"
              className="w-9 h-9 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* expanded filter panel */}
        {filtersOpen && (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-64">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Employee</label>
              <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className={`${inputCls} bg-white`}>
                <option>All Employees</option>
                {list.map((e) => (
                  <option key={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputCls} bg-white`}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-36">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputCls} bg-white`}>
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setApplied({ employee: employeeFilter, month, year });
                showToast("Filters applied", "success");
              }}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setEmployeeFilter("All Employees");
                setMonth(7);
                setYear(2025);
                setApplied({ employee: "All Employees", month: 7, year: 2025 });
              }}
              className="px-5 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 text-gray-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* legend banner */}
      <div className="bg-blue-50/70 border-b border-blue-100 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-blue-700 tracking-wide uppercase">
          Attendance Report: {MONTHS[applied.month - 1]} {applied.year}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {legend.map(([icon, label]) => (
            <span key={label} className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              {icon} {label}
            </span>
          ))}
        </div>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-auto">
        <table className="text-sm border-collapse w-full">
          <thead className="sticky top-0 z-20">
            <tr className="bg-white border-b border-gray-300">
              <th className="sticky left-0 z-10 bg-white px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide min-w-[190px] border-r border-gray-100">
                Employee
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const dow = new Date(applied.year, applied.month - 1, d).getDay();
                const weekend = dow === 0 || dow === 6;
                return (
                  <th key={d} className={`px-1.5 py-2 text-center min-w-[38px] ${weekend ? "bg-gray-50" : "bg-white"}`}>
                    <div className="text-xs font-bold text-gray-900">{d}</div>
                    <div className="text-[9px] font-medium text-gray-400">{DOW[dow]}</div>
                  </th>
                );
              })}
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase bg-white min-w-[64px]">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {visible.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50/60">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={emp.name} size={8} />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-[13px] truncate">{emp.name}</div>
                      <div className="text-[11px] text-gray-400 truncate">{emp.designation}</div>
                    </div>
                  </div>
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const dateStr = `${applied.year}-${String(applied.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  // a created/edited record marks the day Present in the grid
                  const cell: AttendanceCell = (edits || {})[`${emp.id}:${dateStr}`]
                    ? { status: "present" }
                    : attendanceCell(emp.id, applied.year, applied.month, d);
                  const dow = new Date(applied.year, applied.month - 1, d).getDay();
                  const weekend = dow === 0 || dow === 6;
                  const clickable = cell.status !== "dayoff" && cell.status !== "future";
                  return (
                    <td
                      key={d}
                      onClick={() => clickable && openEdit(emp, d)}
                      className={`px-1 py-2 text-center align-middle ${weekend ? "bg-orange-50/40" : ""} ${clickable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                      title={clickable ? "Edit attendance" : undefined}
                    >
                      <CellIcon cell={cell} />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center">
                  <div className="text-sm font-bold text-blue-600">{totalFor(emp)}</div>
                  <div className="text-[10px] text-gray-400">/{workDays}</div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 2} className="px-4 py-12 text-center text-gray-500">No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">Showing 1 to {visible.length} of {visible.length} results</span>
        <div className="flex items-center gap-1">
          <button disabled className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 opacity-40">‹ Previous</button>
          <button className="w-8 h-8 rounded-md bg-blue-600 text-white">1</button>
          <button disabled className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 opacity-40">Next ›</button>
        </div>
      </div>

      {/* create attendance modal */}
      {createOpen && <CreateAttendanceModal employees={list} edits={edits || {}} onClose={() => setCreateOpen(false)} />}

      {/* edit attendance modal */}
      {editCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Attendance</h3>
              <button onClick={() => setEditCell(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Employee" required>
                <input value={editCell.emp.name} readOnly className={`${inputCls} bg-gray-50 text-gray-500`} />
              </Field>
              <Field label="Date" required>
                <input type="date" value={editCell.date} readOnly className={`${inputCls} bg-gray-50 text-gray-500`} />
              </Field>
              <Field label="Clock In Time" required>
                <input type="time" value={draft.clockIn} onChange={(e) => setDraft({ ...draft, clockIn: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Clock Out Time">
                <input type="time" value={draft.clockOut} onChange={(e) => setDraft({ ...draft, clockOut: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Notes" className="md:col-span-2">
                <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3} className={inputCls} />
              </Field>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setEditCell(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button onClick={submitEdit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
