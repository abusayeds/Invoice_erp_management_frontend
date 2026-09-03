/**
 * File: src/pages/performance/EmployeeGoals.tsx
 * Complete Employee Goals Management page with list view, create/edit modal, and details modal
 * Based on provided screenshots design
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  employeeGoalHooks,
  goalTypeHooks,
  type EmployeeGoal as ApiEmployeeGoal,
} from "@/services/performance";
import { employeeHooks } from "@/services/hrm";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  X,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeGoal {
  id: string;
  employeeId: string;
  employee: string;
  goalTypeId: string;
  goalType: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  startDate: string;
  endDate: string;
  status: "Not Started" | "In Progress" | "Completed" | "Overdue";
  createdAt: string;
}

// ─── Sample Data (offline fallback seed, API shape) ────────────────────────────

const sampleGoals: ApiEmployeeGoal[] = [
  { id: "1", employee_id: "emp1", goal_type_id: "gt1", title: "Implement New CRM System", description: "Deploy and configure new customer relationship management system", start_date: "2025-09-17", end_date: "2026-03-20", target: "108226", progress: 90, status: "in_progress" },
  { id: "2", employee_id: "emp2", goal_type_id: "gt2", title: "Create Employee Handbook", description: "Develop comprehensive employee handbook and policies", start_date: "2025-09-22", end_date: "2026-01-13", target: "80", progress: 62, status: "overdue" },
  { id: "3", employee_id: "emp2", goal_type_id: "gt3", title: "Optimize Database Performance", description: "Improve database query performance by 30%", start_date: "2025-08-18", end_date: "2026-04-21", target: "97", progress: 63, status: "in_progress" },
  { id: "4", employee_id: "emp3", goal_type_id: "gt4", title: "Achieve 100% Compliance Rate", description: "Ensure all customer service processes meet compliance standards", start_date: "2025-12-18", end_date: "2026-01-15", target: "54", progress: 100, status: "completed" },
  { id: "5", employee_id: "emp4", goal_type_id: "gt3", title: "Conduct Annual Team Building Event", description: "Organize and execute team building activities", start_date: "2026-02-17", end_date: "2026-11-19", target: "90", progress: 0, status: "not_started" },
];

// ─── API ↔ display mapping ─────────────────────────────────────────────────────

function mapStatus(raw: string): EmployeeGoal["status"] {
  const s = (raw ?? "not_started").toLowerCase();
  if (s === "in_progress") return "In Progress";
  if (s === "completed") return "Completed";
  if (s === "overdue") return "Overdue";
  return "Not Started";
}

function mapFromApi(p: any): EmployeeGoal {
  const empRaw = p.employee_id ?? p.employeeId;
  const empId = empRaw && typeof empRaw === "object" ? String(empRaw._id ?? empRaw.id ?? "") : String(empRaw ?? "");
  const empName = empRaw && typeof empRaw === "object" ? (empRaw.name ?? empRaw.user_id?.name ?? "") : "";

  const gtRaw = p.goal_type_id ?? p.goalTypeId;
  const gtId = gtRaw && typeof gtRaw === "object" ? String(gtRaw._id ?? gtRaw.id ?? "") : String(gtRaw ?? "");
  const gtName = gtRaw && typeof gtRaw === "object" ? (gtRaw.name ?? "") : "";

  return {
    id: String(p.id ?? p._id ?? ""),
    employeeId: empId,
    employee: empName,
    goalTypeId: gtId,
    goalType: gtName,
    title: p.title ?? "",
    description: p.description ?? "",
    target: Number(p.target ?? 0),
    progress: Number(p.progress ?? 0),
    startDate: (p.start_date ?? p.startDate ?? "").slice(0, 10),
    endDate: (p.end_date ?? p.endDate ?? "").slice(0, 10),
    status: mapStatus(p.status ?? "not_started"),
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

const staticEmployees = [
  "Daniel Thompson",
  "James Garcia",
  "Michael Brown",
  "Mark Allen",
  "Christopher Lee",
  "John Smith",
  "Anthony Walker",
  "Matthew Clark",
];

const staticGoalTypes = [
  "Strategic Objectives",
  "Leadership Growth",
  "Innovation & Creativity",
  "Customer Excellence",
  "Market Development",
  "Operational Efficiency",
  "Financial Targets",
];

const statuses = ["Not Started", "In Progress", "Completed", "Overdue"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatNumber = (num: number) => {
  return num.toLocaleString();
};

type SortField =
  | "title"
  | "employee"
  | "goalType"
  | "target"
  | "progress"
  | "startDate"
  | "endDate"
  | "status";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const EmployeeGoals: React.FC = () => {
  const navigate = useNavigate();
  const {
    items: rawGoals,
    create,
    update,
    remove,
  } = useResourceData(employeeGoalHooks, { seed: sampleGoals, params: { page: 1, limit: 100 } });
  const goals = useMemo(() => rawGoals.map(mapFromApi), [rawGoals]);

  // Dropdown options from API
  const gtQuery = goalTypeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const goalTypeOptions = useMemo(
    () =>
      (gtQuery.data ?? []).map((g: any) => ({
        id: String(g.id ?? g._id ?? ""),
        name: g.name ?? "",
      })),
    [gtQuery.data],
  );

  const empQuery = employeeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const employeeOptions = useMemo(
    () =>
      (empQuery.data ?? []).map((e: any) => ({
        id: String(e.id ?? e._id ?? ""),
        name:
          (typeof e.user_id === "object" ? e.user_id?.name : null) ??
          e.employee_id ??
          e.name ??
          "",
      })),
    [empQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<EmployeeGoal | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [goalFormData, setGoalFormData] = useState({
    employeeId: "",
    employee: "",
    goalTypeId: "",
    goalType: "",
    title: "",
    description: "",
    target: 0,
    progress: 0,
    startDate: "",
    endDate: "",
    status: "Not Started" as
      | "Not Started"
      | "In Progress"
      | "Completed"
      | "Overdue",
  });

  // ─── Sorting ────────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // ─── Filtered & Sorted ─────────────────────────────────────────────────────

  const filteredGoals = useMemo(() => {
    let result = [...goals];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.employee.toLowerCase().includes(q) ||
          g.goalType.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((g) => g.status === statusFilter);
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "target" || sortField === "progress") {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [goals, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredGoals.length / perPage);
  const paginatedGoals = filteredGoals.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetGoalForm = () => {
    setGoalFormData({
      employeeId: "",
      employee: "",
      goalTypeId: "",
      goalType: "",
      title: "",
      description: "",
      target: 0,
      progress: 0,
      startDate: "",
      endDate: "",
      status: "Not Started",
    });
  };

  const openCreateModal = () => {
    resetGoalForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (goal: EmployeeGoal) => {
    setSelectedGoal(goal);
    setGoalFormData({
      employeeId: goal.employeeId,
      employee: goal.employee,
      goalTypeId: goal.goalTypeId,
      goalType: goal.goalType,
      title: goal.title,
      description: goal.description,
      target: goal.target,
      progress: goal.progress,
      startDate: goal.startDate,
      endDate: goal.endDate,
      status: goal.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (goal: EmployeeGoal) => {
    setSelectedGoal(goal);
    setShowViewModal(true);
  };

  const openDeleteModal = (goal: EmployeeGoal) => {
    setSelectedGoal(goal);
    setShowDeleteModal(true);
  };

  const statusToApi = (s: string): ApiEmployeeGoal["status"] => {
    if (s === "In Progress") return "in_progress";
    if (s === "Completed") return "completed";
    if (s === "Overdue") return "overdue";
    return "not_started";
  };

  const handleSaveGoal = async () => {
    if (!goalFormData.employeeId && !goalFormData.employee) {
      showToast("Please select an employee", "info");
      return;
    }
    if (!goalFormData.goalTypeId && !goalFormData.goalType) {
      showToast("Please select goal type", "info");
      return;
    }
    if (!goalFormData.title) {
      showToast("Please enter title", "info");
      return;
    }
    if (!goalFormData.startDate) {
      showToast("Please select start date", "info");
      return;
    }
    if (!goalFormData.endDate) {
      showToast("Please select end date", "info");
      return;
    }
    if (goalFormData.startDate > goalFormData.endDate) {
      showToast("Start date cannot be after end date", "error");
      return;
    }

    const payload: Partial<ApiEmployeeGoal> = {
      employee_id: goalFormData.employeeId || goalFormData.employee,
      goal_type_id: goalFormData.goalTypeId || goalFormData.goalType,
      title: goalFormData.title,
      description: goalFormData.description,
      start_date: goalFormData.startDate,
      end_date: goalFormData.endDate,
      target: String(goalFormData.target),
      progress: goalFormData.progress,
      status: statusToApi(goalFormData.status),
    };

    try {
      if (isEditing && selectedGoal) {
        await update(selectedGoal.id, payload);
        showToast("Goal updated successfully!", "success");
        setShowEditModal(false);
      } else {
        await create(payload);
        showToast("Goal created successfully!", "success");
        setShowCreateModal(false);
      }
      resetGoalForm();
    } catch {
      showToast("Could not save goal. Please try again.", "error");
    }
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    try {
      await remove(selectedGoal.id);
      showToast("Goal deleted successfully!", "success");
    } catch {
      showToast("Could not delete goal.", "error");
    }
    setShowDeleteModal(false);
    setSelectedGoal(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "In Progress":
        return "bg-blue-100 text-blue-700";
      case "Not Started":
        return "bg-gray-100 text-gray-700";
      case "Overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="w-3 h-3" />;
      case "In Progress":
        return <TrendingUp className="w-3 h-3" />;
      case "Not Started":
        return <Clock className="w-3 h-3" />;
      case "Overdue":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // ─── Sort Header ────────────────────────────────────────────────────────────

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({
    field,
    label,
  }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-50 whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortField === field ? "text-gray-900" : "text-gray-400"}`}
        />
      </div>
    </th>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  const CreateEditModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Edit Employee Goal" : "Create Employee Goal"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update goal information"
                : "Add a new employee goal"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetGoalForm();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee *
            </label>
            <select
              value={goalFormData.employeeId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const opt = employeeOptions.find((em) => em.id === selectedId);
                setGoalFormData({
                  ...goalFormData,
                  employeeId: selectedId,
                  employee: opt?.name ?? selectedId,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select employee</option>
              {employeeOptions.length > 0
                ? employeeOptions.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.name}
                    </option>
                  ))
                : staticEmployees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Type *
            </label>
            <select
              value={goalFormData.goalTypeId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const opt = goalTypeOptions.find((g) => g.id === selectedId);
                setGoalFormData({
                  ...goalFormData,
                  goalTypeId: selectedId,
                  goalType: opt?.name ?? selectedId,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="">Select goal type</option>
              {goalTypeOptions.length > 0
                ? goalTypeOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))
                : staticGoalTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={goalFormData.title}
              onChange={(e) =>
                setGoalFormData({ ...goalFormData, title: e.target.value })
              }
              placeholder="Enter goal title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={goalFormData.description}
              onChange={(e) =>
                setGoalFormData({
                  ...goalFormData,
                  description: e.target.value,
                })
              }
              rows={3}
              placeholder="Enter goal description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={goalFormData.startDate}
                onChange={(e) =>
                  setGoalFormData({
                    ...goalFormData,
                    startDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={goalFormData.endDate}
                onChange={(e) =>
                  setGoalFormData({ ...goalFormData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target *
              </label>
              <input
                type="number"
                min={0}
                value={goalFormData.target || ""}
                onChange={(e) =>
                  setGoalFormData({
                    ...goalFormData,
                    target: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={goalFormData.progress || ""}
                onChange={(e) =>
                  setGoalFormData({
                    ...goalFormData,
                    progress: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={goalFormData.status}
              onChange={(e) =>
                setGoalFormData({
                  ...goalFormData,
                  status: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetGoalForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveGoal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isEditing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );

  const ViewModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Employee Goal Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedGoal?.title}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedGoal && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Title</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedGoal.title}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedGoal.status)}`}
              >
                {getStatusIcon(selectedGoal.status)}
                {selectedGoal.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm text-gray-600">{selectedGoal.employee}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Goal Type</p>
                <p className="text-sm text-gray-600">{selectedGoal.goalType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Target</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatNumber(selectedGoal.target)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Progress</p>
                <p className="text-sm font-medium text-blue-600">
                  {selectedGoal.progress}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedGoal.startDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedGoal.endDate)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-600">
                  {selectedGoal.description}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-500">Overall Progress</span>
                <span className="text-xs font-medium">
                  {selectedGoal.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${selectedGoal.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => setShowViewModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => {
              setShowViewModal(false);
              if (selectedGoal) openEditModal(selectedGoal);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Goal
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedGoal?.title}</span>? This
            action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteGoal}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => navigate("/")}
            className="hover:text-gray-700"
          >
            Dashboard
          </button>
          <span>›</span>
          <button
            onClick={() => navigate("/performance")}
            className="hover:text-gray-700"
          >
            Performance
          </button>
          <span>›</span>
          <span className="text-gray-900 font-medium">Employee Goals</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Employee Goals
          </h2>
          <button
            onClick={openCreateModal}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button
              onClick={() => showToast("Search applied", "info")}
              className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"
            >
              Search
            </button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">Filters</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showFilters && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500">
                      Status
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setStatusFilter("All");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Not Started");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Not Started
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("In Progress");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Completed");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Overdue");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Overdue
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="title" label="Title" />
                <SortHeader field="employee" label="Employee" />
                <SortHeader field="goalType" label="Goal Type" />
                <SortHeader field="target" label="Target" />
                <SortHeader field="progress" label="Progress" />
                <SortHeader field="startDate" label="Start Date" />
                <SortHeader field="endDate" label="End Date" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedGoals.map((goal) => (
                <tr
                  key={goal.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(goal)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {goal.title}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {goal.employee}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{goal.goalType}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(goal.target)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {goal.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(goal.startDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(goal.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}
                    >
                      {getStatusIcon(goal.status)}
                      {goal.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(goal)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(goal)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedGoals.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No employee goals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">
            Showing{" "}
            {filteredGoals.length === 0 ? 0 : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredGoals.length)} of{" "}
            {filteredGoals.length} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) pageNumber = i + 1;
              else if (currentPage <= 3) pageNumber = i + 1;
              else if (currentPage >= totalPages - 2)
                pageNumber = totalPages - 4 + i;
              else pageNumber = currentPage - 2 + i;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${currentPage === pageNumber ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};
