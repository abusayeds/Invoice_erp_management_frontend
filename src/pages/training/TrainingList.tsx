/**
 * File: src/pages/training/TrainingList.tsx
 * Manage Training List – full CRUD for trainings and tasks
 * Includes: training table, edit training modal, tasks sub‑page, create/edit task modal
 * Design matches EmployeeGoals and TrainingTypesSetup components
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import { useResourceData } from "@/hooks/useResourceData";
import {
  trainingHooks,
  trainingTypeHooks,
  trainerHooks,
  trainingTasks as trainingTasksApi,
  type Training as ApiTraining,
  type TrainingTask as ApiTrainingTask,
} from "@/services/training";
import { branchHooks, departmentHooks } from "@/services/hrm";
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
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  ArrowLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Training {
  id: string;
  title: string;
  trainingTypeId: string;
  trainingTypeName: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  branchName: string;
  departmentId: string;
  departmentName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  description: string;
  cost: number;
  status: "Scheduled" | "Completed" | "Cancelled" | "Ongoing";
  createdAt: string;
}

interface Task {
  id: string;
  trainingId: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed";
  description: string;
  createdAt: string;
}

// ─── Sample Data (API snake_case seed) ────────────────────────────────────────

const sampleTrainings: ApiTraining[] = [
  {
    id: "1",
    title: "Artificial Intelligence and Machine Learning Applications",
    training_type_id: "1",
    trainer_id: "1",
    branch_id: "5",
    department_id: "1",
    start_date: "2026-02-05",
    end_date: "2026-02-08",
    start_time: "10:00",
    end_time: "18:00",
    location: "AI and ML Research Center",
    max_participants: 15,
    description: "AI fundamentals and machine learning training.",
    cost: 200,
    status: "scheduled",
  },
  {
    id: "2",
    title: "Risk Management and Business Continuity",
    training_type_id: "2",
    trainer_id: "2",
    branch_id: "4",
    department_id: "2",
    start_date: "2026-01-30",
    end_date: "2026-02-01",
    start_time: "09:00",
    end_time: "17:00",
    location: "Risk Management Institute",
    max_participants: 20,
    description: "Comprehensive risk assessment and business continuity planning.",
    cost: 250,
    status: "completed",
  },
  {
    id: "3",
    title: "International Business and Global Trade",
    training_type_id: "3",
    trainer_id: "3",
    branch_id: "3",
    department_id: "3",
    start_date: "2026-01-24",
    end_date: "2026-01-26",
    start_time: "10:00",
    end_time: "16:00",
    location: "International Business Center",
    max_participants: 12,
    description: "Global trade regulations, cross-cultural management.",
    cost: 300,
    status: "scheduled",
  },
];

// ─── API ↔ display mapping ─────────────────────────────────────────────────────

function mapFromApi(p: any): Training {
  const trainingType = p.training_type_id ?? p.trainingTypeId;
  const trainer = p.trainer_id ?? p.trainerId;
  const branch = p.branch_id ?? p.branchId;
  const dept = p.department_id ?? p.departmentId;
  const rawStatus = (p.status ?? "scheduled").toLowerCase();
  const statusMap: Record<string, Training["status"]> = {
    scheduled: "Scheduled",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return {
    id: String(p.id ?? p._id ?? ""),
    title: p.title ?? "",
    trainingTypeId: typeof trainingType === "object" ? String(trainingType?._id ?? trainingType?.id ?? "") : String(trainingType ?? ""),
    trainingTypeName: typeof trainingType === "object" ? (trainingType?.name ?? trainingType?.title ?? "") : "",
    trainerId: typeof trainer === "object" ? String(trainer?._id ?? trainer?.id ?? "") : String(trainer ?? ""),
    trainerName: typeof trainer === "object" ? (trainer?.name ?? "") : "",
    branchId: typeof branch === "object" ? String(branch?._id ?? branch?.id ?? "") : String(branch ?? ""),
    branchName: typeof branch === "object" ? (branch?.branch_name ?? branch?.name ?? "") : "",
    departmentId: typeof dept === "object" ? String(dept?._id ?? dept?.id ?? "") : String(dept ?? ""),
    departmentName: typeof dept === "object" ? (dept?.department_name ?? dept?.name ?? "") : "",
    startDate: (p.start_date ?? p.startDate ?? "").slice(0, 10),
    endDate: (p.end_date ?? p.endDate ?? "").slice(0, 10),
    startTime: p.start_time ?? p.startTime ?? "",
    endTime: p.end_time ?? p.endTime ?? "",
    location: p.location ?? "",
    maxParticipants: Number(p.max_participants ?? p.maxParticipants ?? 0),
    description: p.description ?? "",
    cost: Number(p.cost ?? 0),
    status: statusMap[rawStatus] ?? "Scheduled",
    createdAt: (p.createdAt ?? p.created_at ?? "").slice(0, 10),
  };
}

function mapTaskFromApi(t: any): Task {
  const assignedTo = t.assigned_to ?? t.assignedTo;
  const rawStatus = (t.status ?? "pending").toLowerCase();
  const statusMap: Record<string, Task["status"]> = {
    pending: "Pending",
    "in progress": "In Progress",
    completed: "Completed",
  };
  return {
    id: String(t.id ?? t._id ?? ""),
    trainingId: String(t.training_id ?? t.trainingId ?? ""),
    title: t.title ?? "",
    assignedTo: typeof assignedTo === "object" ? (assignedTo?.name ?? "") : (assignedTo ?? ""),
    dueDate: (t.due_date ?? t.dueDate ?? "").slice(0, 10),
    status: statusMap[rawStatus] ?? "Pending",
    description: t.description ?? "",
    createdAt: (t.createdAt ?? t.created_at ?? "").slice(0, 10),
  };
}

type SortField =
  | "title"
  | "trainingTypeName"
  | "trainerName"
  | "startDate"
  | "endDate"
  | "status"
  | "branchName"
  | "location";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const TrainingList: React.FC = () => {
  const navigate = useNavigate();

  const {
    items: raw,
    update,
  } = useResourceData(trainingHooks, {
    seed: sampleTrainings,
    params: { page: 1, limit: 100 },
  });
  const trainings = useMemo(() => raw.map(mapFromApi), [raw]);

  // Load dropdown options
  const trainingTypeQuery = trainingTypeHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const trainingTypeOptions = useMemo(
    () => (trainingTypeQuery.data ?? []).map((t: any) => ({ id: String(t.id ?? t._id ?? ""), name: t.name ?? "" })),
    [trainingTypeQuery.data],
  );
  const trainerQuery = trainerHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const trainerOptions = useMemo(
    () => (trainerQuery.data ?? []).map((t: any) => ({ id: String(t.id ?? t._id ?? ""), name: t.name ?? "" })),
    [trainerQuery.data],
  );
  const branchQuery = branchHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const branchOptions = useMemo(
    () => (branchQuery.data ?? []).map((b: any) => ({ id: String(b.id ?? b._id ?? ""), name: b.branch_name ?? b.name ?? "" })),
    [branchQuery.data],
  );
  const departmentQuery = departmentHooks.useList({ page: 1, limit: 100 }, { retry: 0 });
  const departmentOptions = useMemo(
    () =>
      (departmentQuery.data ?? []).map((d: any) => ({
        id: String(d.id ?? d._id ?? ""),
        name: d.department_name ?? d.name ?? "",
        branchId: String(typeof d.branch_id === "object" ? (d.branch_id?._id ?? d.branch_id?.id ?? "") : (d.branch_id ?? "")),
      })),
    [departmentQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("startDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // View states
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [showTasksView, setShowTasksView] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Tasks state (loaded per-training from API)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Form states
  const [editFormData, setEditFormData] = useState({
    title: "",
    trainingTypeId: "",
    trainerId: "",
    branchId: "",
    departmentId: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    maxParticipants: 0,
    description: "",
    cost: 0,
    status: "Scheduled" as Training["status"],
  });

  const [taskFormData, setTaskFormData] = useState({
    title: "",
    assignedTo: "",
    dueDate: "",
    status: "Pending" as Task["status"],
    description: "",
  });

  // ─── Load tasks when entering tasks view ──────────────────────────────────

  const loadTasks = useCallback(async (trainingId: string) => {
    setTasksLoading(true);
    try {
      const data = await trainingTasksApi.listByTraining(trainingId, { page: 1, limit: 100 });
      setTasks((data as any[]).map(mapTaskFromApi));
    } catch {
      // keep empty on error; user can still create
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showTasksView && selectedTraining) {
      loadTasks(selectedTraining.id);
    }
  }, [showTasksView, selectedTraining, loadTasks]);

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filteredTrainings = useMemo(() => {
    let result = [...trainings];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.trainingTypeName.toLowerCase().includes(q) ||
          t.trainerName.toLowerCase().includes(q) ||
          t.branchName.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All") {
      result = result.filter((t) => t.status === statusFilter);
    }
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [trainings, searchQuery, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredTrainings.length / perPage);
  const paginatedTrainings = filteredTrainings.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // Tasks for current training
  const trainingTasksList = tasks;

  // ─── Training CRUD ─────────────────────────────────────────────────────────

  const openEditModal = (training: Training) => {
    setSelectedTraining(training);
    setEditFormData({
      title: training.title,
      trainingTypeId: training.trainingTypeId,
      trainerId: training.trainerId,
      branchId: training.branchId,
      departmentId: training.departmentId,
      startDate: training.startDate,
      endDate: training.endDate,
      startTime: training.startTime,
      endTime: training.endTime,
      location: training.location,
      maxParticipants: training.maxParticipants,
      description: training.description,
      cost: training.cost,
      status: training.status,
    });
    setShowEditModal(true);
  };

  const handleUpdateTraining = async () => {
    if (!selectedTraining) return;
    const payload: Partial<ApiTraining> = {
      title: editFormData.title,
      training_type_id: editFormData.trainingTypeId,
      trainer_id: editFormData.trainerId,
      branch_id: editFormData.branchId,
      department_id: editFormData.departmentId,
      start_date: editFormData.startDate,
      end_date: editFormData.endDate,
      start_time: editFormData.startTime,
      end_time: editFormData.endTime,
      location: editFormData.location,
      max_participants: editFormData.maxParticipants,
      description: editFormData.description,
      cost: editFormData.cost,
      status: editFormData.status.toLowerCase() as ApiTraining["status"],
    };
    try {
      await update(selectedTraining.id, payload);
      showToast("Training updated successfully!", "success");
      setShowEditModal(false);
    } catch {
      showToast("Could not update training. Please try again.", "error");
    }
  };

  // ─── Task CRUD ─────────────────────────────────────────────────────────────

  const openCreateTaskModal = () => {
    setTaskFormData({
      title: "",
      assignedTo: "",
      dueDate: "",
      status: "Pending",
      description: "",
    });
    setShowCreateTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setSelectedTask(task);
    setTaskFormData({
      title: task.title,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      status: task.status,
      description: task.description,
    });
    setShowEditTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskFormData.title.trim()) {
      showToast("Please enter task title", "info");
      return;
    }
    if (!taskFormData.dueDate) {
      showToast("Please select due date", "info");
      return;
    }
    if (!taskFormData.assignedTo) {
      showToast("Please select assignee", "info");
      return;
    }

    const body: Partial<ApiTrainingTask> = {
      title: taskFormData.title,
      description: taskFormData.description,
      due_date: taskFormData.dueDate,
      assigned_to: taskFormData.assignedTo,
    };

    try {
      if (selectedTask) {
        await trainingTasksApi.edit(selectedTask.id, body);
        showToast("Task updated successfully!", "success");
        setShowEditTaskModal(false);
        setSelectedTask(null);
      } else {
        await trainingTasksApi.create(selectedTraining!.id, body);
        showToast("Task created successfully!", "success");
        setShowCreateTaskModal(false);
      }
      // Reload tasks
      if (selectedTraining) await loadTasks(selectedTraining.id);
    } catch {
      showToast("Could not save task. Please try again.", "error");
    }

    setTaskFormData({
      title: "",
      assignedTo: "",
      dueDate: "",
      status: "Pending",
      description: "",
    });
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    try {
      await trainingTasksApi.remove(selectedTask.id);
      showToast("Task deleted successfully!", "success");
      if (selectedTraining) await loadTasks(selectedTraining.id);
    } catch {
      showToast("Could not delete task.", "error");
    }
    setShowDeleteTaskModal(false);
    setSelectedTask(null);
  };

  const handleCompleteTask = async (task: { id: string }) => {
    try {
      await trainingTasksApi.complete(task.id);
      showToast("Task marked complete!", "success");
      if (selectedTraining) await loadTasks(selectedTraining.id);
    } catch {
      showToast("Could not complete task.", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-700";
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      case "Ongoing":
        return "bg-yellow-100 text-yellow-700";
      case "Pending":
        return "bg-orange-100 text-orange-700";
      case "In Progress":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="w-3 h-3" />;
      case "Scheduled":
        return <Calendar className="w-3 h-3" />;
      case "Cancelled":
        return <XCircle className="w-3 h-3" />;
      case "Ongoing":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Departments filtered by selected branch
  const availableDepts = departmentOptions.filter(
    (d) => d.branchId === editFormData.branchId,
  );

  // Sort header component
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

  const EditTrainingModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Training List
            </h2>
            <p className="text-sm text-gray-500">Update training details</p>
          </div>
          <button
            onClick={() => setShowEditModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Training Type *
              </label>
              <select
                value={editFormData.trainingTypeId}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    trainingTypeId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">Select type</option>
                {trainingTypeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trainer *
              </label>
              <select
                value={editFormData.trainerId}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    trainerId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">Select trainer</option>
                {trainerOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
              </label>
              <select
                value={editFormData.branchId}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    branchId: e.target.value,
                    departmentId: "",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">Select branch</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <select
                value={editFormData.departmentId}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    departmentId: e.target.value,
                  })
                }
                disabled={!editFormData.branchId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100"
              >
                <option value="">
                  {editFormData.branchId
                    ? "Select department"
                    : "Select branch first"}
                </option>
                {availableDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={editFormData.startDate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    startDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={editFormData.endDate}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={editFormData.startTime}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    startTime: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={editFormData.endTime}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, endTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={editFormData.location}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Participants
              </label>
              <input
                type="number"
                value={editFormData.maxParticipants}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    maxParticipants: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={editFormData.cost}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    cost: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    status: e.target.value as Training["status"],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Ongoing">Ongoing</option>
              </select>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => setShowEditModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateTraining}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );

  const CreateTaskModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Task</h2>
          <button
            onClick={() => setShowCreateTaskModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={taskFormData.title}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, title: e.target.value })
              }
              placeholder="Enter task title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              value={taskFormData.dueDate}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, dueDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To *
            </label>
            <input
              type="text"
              value={taskFormData.assignedTo}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, assignedTo: e.target.value })
              }
              placeholder="Enter assignee name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={taskFormData.status}
              onChange={(e) =>
                setTaskFormData({
                  ...taskFormData,
                  status: e.target.value as Task["status"],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={taskFormData.description}
              onChange={(e) =>
                setTaskFormData({
                  ...taskFormData,
                  description: e.target.value,
                })
              }
              placeholder="Enter task description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => setShowCreateTaskModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTask}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );

  const EditTaskModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
          <button
            onClick={() => setShowEditTaskModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={taskFormData.title}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              value={taskFormData.dueDate}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, dueDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To *
            </label>
            <input
              type="text"
              value={taskFormData.assignedTo}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, assignedTo: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={taskFormData.status}
              onChange={(e) =>
                setTaskFormData({
                  ...taskFormData,
                  status: e.target.value as Task["status"],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={taskFormData.description}
              onChange={(e) =>
                setTaskFormData({
                  ...taskFormData,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => setShowEditTaskModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTask}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteTaskModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Task
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedTask?.title}</span>? This
            action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteTask}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteTaskModal(false)}
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
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (showTasksView && selectedTraining) {
    return (
      <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button
                onClick={() => navigate("/")}
                className="hover:text-gray-700"
              >
                Dashboard
              </button>
              <span>›</span>
              <button
                onClick={() => navigate("/training")}
                className="hover:text-gray-700"
              >
                Training
              </button>
              <span>›</span>
              <button
                onClick={() => setShowTasksView(false)}
                className="hover:text-gray-700"
              >
                Training List
              </button>
              <span>›</span>
              <span className="text-gray-900 font-medium">
                {selectedTraining.title} - Tasks
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
              <Globe className="w-4 h-4" />
              <span>GB English</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {selectedTraining.title} - Tasks
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage tasks for this training
                </p>
              </div>
              <button
                onClick={() => setShowTasksView(false)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50/40">
                <h2 className="font-semibold text-gray-900">Tasks</h2>
                <button
                  onClick={openCreateTaskModal}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> Create Task
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tasksLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          Loading tasks…
                        </td>
                      </tr>
                    ) : trainingTasksList.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {task.title}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {task.assignedTo}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {task.dueDate}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
                          >
                            {getStatusIcon(task.status)}
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {task.status !== "Completed" ? (
                              <button
                                onClick={() => handleCompleteTask(task)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                title="Mark complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="w-7 h-7" /> /* fixed slot keeps action columns aligned */
                            )}
                            <button
                              onClick={() => openEditTaskModal(task)}
                              className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setShowDeleteTaskModal(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!tasksLoading && trainingTasksList.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-gray-500"
                        >
                          No tasks found. Click "Create Task" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {showCreateTaskModal && CreateTaskModal()}
        {showEditTaskModal && EditTaskModal()}
        {showDeleteTaskModal && DeleteTaskModal()}
      </div>
    );
  }

  // Main training list view
  return (
    <div className="flex-1 m-2 bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button
              onClick={() => navigate("/")}
              className="hover:text-gray-700"
            >
              Dashboard
            </button>
            <span>›</span>
            <button
              onClick={() => navigate("/training")}
              className="hover:text-gray-700"
            >
              Training
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">Training List</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>GB English</span>
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Training List
          </h2>
          <button
            onClick={() =>
              showToast("Add training feature coming soon", "info")
            }
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trainings..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={() => showToast("Search applied", "info")}
              className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"
            >
              Search
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
                <span>Filters</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showFilters && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
                    Status
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
                      setStatusFilter("Scheduled");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Scheduled
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
                      setStatusFilter("Cancelled");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Cancelled
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Ongoing");
                      setCurrentPage(1);
                      setShowFilters(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Ongoing
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="title" label="Title" />
                <SortHeader field="trainingTypeName" label="Training Type" />
                <SortHeader field="trainerName" label="Trainer" />
                <SortHeader field="startDate" label="Start Date" />
                <SortHeader field="endDate" label="End Date" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="branchName" label="Branch" />
                <SortHeader field="location" label="Location" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedTrainings.map((training) => (
                <tr
                  key={training.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedTraining(training);
                    setShowTasksView(true);
                  }}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {training.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {training.trainingTypeName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {training.trainerName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {training.startDate}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {training.endDate}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(training.status)}`}
                    >
                      {getStatusIcon(training.status)}
                      {training.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {training.branchName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {training.location}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(training)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTrainings.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No trainings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">
            Showing{" "}
            {filteredTrainings.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredTrainings.length)} of{" "}
            {filteredTrainings.length} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
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
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {showEditModal && EditTrainingModal()}
    </div>
  );
};

export default TrainingList;
